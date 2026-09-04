from django.utils import timezone

from rest_framework import (
    permissions,
    status,
)

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    SOSEvent,
    TrustedContact,
)

from .serializers import (
    SOSEventSerializer,
    TrustedContactSerializer,
)

from .services import (
    send_sos_to_contacts,
)


# ============================================================
# TRUSTED CONTACTS
# ============================================================

class TrustedContactsView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def get(
        self,
        request,
    ):

        contacts = (
            TrustedContact.objects
            .filter(
                user=request.user,
                is_active=True,
            )
            .order_by(
                "-created_at"
            )
        )


        serializer = (
            TrustedContactSerializer(
                contacts,
                many=True,
            )
        )


        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


    def post(
        self,
        request,
    ):

        count = (
            TrustedContact.objects
            .filter(
                user=request.user,
                is_active=True,
            )
            .count()
        )


        if count >= 3:

            return Response(
                {
                    "detail":
                        "You can add up to 3 trusted contacts."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


        serializer = (
            TrustedContactSerializer(
                data=request.data
            )
        )


        serializer.is_valid(
            raise_exception=True
        )


        contact = (
            serializer.save(
                user=request.user
            )
        )


        return Response(
            TrustedContactSerializer(
                contact
            ).data,
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# DELETE TRUSTED CONTACT
# ============================================================

class TrustedContactDeleteView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def delete(
        self,
        request,
        contact_id,
    ):

        try:

            contact = (
                TrustedContact.objects
                .get(
                    id=contact_id,
                    user=request.user,
                )
            )


        except TrustedContact.DoesNotExist:

            return Response(
                {
                    "detail":
                        "Trusted contact not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )


        contact.delete()


        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# ============================================================
# CREATE SOS + SEND SMS
# ============================================================

# ============================================================
# CREATE / RETRY SOS + SEND SMS AND WHATSAPP
# ============================================================

class SOSCreateView(APIView):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def post(self, request):

        # ====================================================
        # 1. GET TRUSTED CONTACTS
        # ====================================================

        trusted_contacts = list(
            TrustedContact.objects
            .filter(
                user=request.user,
                is_active=True,
            )
            .order_by("id")
        )

        if not trusted_contacts:
            return Response(
                {
                    "detail":
                        "Add at least one trusted contact "
                        "before activating SOS."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ====================================================
        # 2. CHECK FOR EXISTING ACTIVE SOS
        # ====================================================

        existing_sos = (
            SOSEvent.objects
            .filter(
                user=request.user,
                status="active",
            )
            .order_by("-activated_at")
            .first()
        )

        # ====================================================
        # 3. UPDATE EXISTING SOS OR CREATE NEW ONE
        # ====================================================

        if existing_sos:

            serializer = SOSEventSerializer(
                existing_sos,
                data=request.data,
                partial=True,
            )

            serializer.is_valid(
                raise_exception=True
            )

            sos_event = serializer.save()

            response_status = status.HTTP_200_OK

        else:

            serializer = SOSEventSerializer(
                data=request.data
            )

            serializer.is_valid(
                raise_exception=True
            )

            sos_event = serializer.save(
                user=request.user,
                status="active",
            )

            response_status = status.HTTP_201_CREATED

        # ====================================================
        # 4. SEND SMS + WHATSAPP
        # ====================================================

        try:

            delivery = send_sos_to_contacts(
                user=request.user,
                sos_event=sos_event,
                contacts=trusted_contacts,
            )

        except Exception as exc:

            # Don't lose the SOS record just because
            # an external provider failed.

            print(
                "SOS DELIVERY ERROR:",
                repr(exc)
            )

            delivery = {
                "sms_results": [
                    {
                        "success": False,
                        "error": str(exc),
                    }
                    for _ in trusted_contacts
                ],
                "whatsapp_results": [
                    {
                        "success": False,
                        "error": str(exc),
                    }
                    for _ in trusted_contacts
                ],
            }

        # ====================================================
        # 5. READ DELIVERY RESULTS
        # ====================================================

        sms_results = delivery.get(
            "sms_results",
            [],
        )

        whatsapp_results = delivery.get(
            "whatsapp_results",
            [],
        )

        # ====================================================
        # 6. COUNT SMS RESULTS
        # ====================================================

        sms_sent = sum(
            1
            for item in sms_results
            if item.get("success")
        )

        sms_failed = sum(
            1
            for item in sms_results
            if not item.get("success")
        )

        # ====================================================
        # 7. COUNT WHATSAPP RESULTS
        # ====================================================

        whatsapp_sent = sum(
            1
            for item in whatsapp_results
            if item.get("success")
        )

        whatsapp_failed = sum(
            1
            for item in whatsapp_results
            if not item.get("success")
        )

        # ====================================================
        # 8. USER-FACING MESSAGE
        # ====================================================

        if (
            sms_sent > 0
            and whatsapp_sent > 0
        ):

            detail = (
                "SOS activated. SMS and WhatsApp "
                "alerts were submitted to your "
                "trusted contacts."
            )

        elif sms_sent > 0:

            detail = (
                "SOS activated. SMS alerts were "
                "submitted, but WhatsApp delivery "
                "could not be started."
            )

        elif whatsapp_sent > 0:

            detail = (
                "SOS activated. WhatsApp alerts were "
                "submitted, but SMS delivery could "
                "not be started."
            )

        else:

            detail = (
                "SOS was recorded, but neither SMS "
                "nor WhatsApp delivery could be started."
            )

        # ====================================================
        # 9. RESPONSE
        # ====================================================

        return Response(
            {
                "id": sos_event.id,

                "status": sos_event.status,

                "latitude": sos_event.latitude,

                "longitude": sos_event.longitude,

                "location_accuracy":
                    sos_event.location_accuracy,

                "activated_at":
                    sos_event.activated_at,

                "trusted_contacts_count":
                    len(trusted_contacts),

                # Existing frontend compatibility
                "sms_started":
                    sms_sent,

                "sms_sent":
                    sms_sent,

                "sms_failed":
                    sms_failed,

                "whatsapp_sent":
                    whatsapp_sent,

                "whatsapp_failed":
                    whatsapp_failed,

                "detail":
                    detail,

                # Useful while debugging provider problems
                "delivery": {
                    "sms": sms_results,
                    "whatsapp": whatsapp_results,
                },
            },
            status=response_status,
        )
# ============================================================
# ACTIVE SOS
# ============================================================

class ActiveSOSView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def get(
        self,
        request,
    ):

        sos = (
            SOSEvent.objects
            .filter(
                user=request.user,
                status="active",
            )
            .order_by(
                "-activated_at"
            )
            .first()
        )


        if not sos:

            return Response(
                {
                    "active":
                        False,

                    "sos":
                        None,
                },
                status=status.HTTP_200_OK,
            )


        return Response(
            {
                "active":
                    True,

                "sos":
                    SOSEventSerializer(
                        sos
                    ).data,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# MARK SAFE
# ============================================================

class SOSCreateView(APIView):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def post(self, request):

        # ====================================================
        # 1. GET TRUSTED CONTACTS
        # ====================================================

        trusted_contacts = list(
            TrustedContact.objects
            .filter(
                user=request.user,
                is_active=True,
            )
            .order_by("id")
        )


        if not trusted_contacts:

            return Response(
                {
                    "detail":
                        "Add at least one trusted contact "
                        "before activating SOS."
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        # ====================================================
        # 2. CHECK FOR EXISTING ACTIVE SOS
        # ====================================================

        existing_sos = (
            SOSEvent.objects
            .filter(
                user=request.user,
                status="active",
            )
            .order_by(
                "-activated_at"
            )
            .first()
        )


        # ====================================================
        # 3. UPDATE EXISTING SOS OR CREATE NEW ONE
        # ====================================================

        if existing_sos:

            serializer = SOSEventSerializer(
                existing_sos,
                data=request.data,
                partial=True,
            )

            serializer.is_valid(
                raise_exception=True
            )

            sos_event = serializer.save()

            response_status = (
                status.HTTP_200_OK
            )


        else:

            serializer = SOSEventSerializer(
                data=request.data
            )

            serializer.is_valid(
                raise_exception=True
            )

            sos_event = serializer.save(
                user=request.user,
                status="active",
            )

            response_status = (
                status.HTTP_201_CREATED
            )


        # ====================================================
        # 4. SEND SMS
        # ====================================================

        try:

            delivery = send_sos_to_contacts(
                user=request.user,
                sos_event=sos_event,
                contacts=trusted_contacts,
            )


        except Exception as exc:

            print(
                "SOS SMS DELIVERY ERROR:",
                repr(exc)
            )


            delivery = {
                "sms_results": [
                    {
                        "success": False,
                        "error": str(exc),
                    }
                    for _ in trusted_contacts
                ],
            }


        # ====================================================
        # 5. READ SMS RESULTS
        # ====================================================

        sms_results = delivery.get(
            "sms_results",
            [],
        )


        # ====================================================
        # 6. COUNT SMS RESULTS
        # ====================================================

        sms_sent = sum(
            1
            for item in sms_results
            if item.get(
                "success"
            )
        )


        sms_failed = sum(
            1
            for item in sms_results
            if not item.get(
                "success"
            )
        )


        # ====================================================
        # 7. USER-FACING MESSAGE
        # ====================================================

        if sms_sent > 0:

            if sms_failed == 0:

                detail = (
                    "SOS activated. Emergency SMS alerts "
                    "were sent to all trusted contacts."
                )

            else:

                detail = (
                    f"SOS activated. {sms_sent} SMS alert"
                    f"{'s' if sms_sent != 1 else ''} sent, "
                    f"but {sms_failed} failed."
                )


        else:

            detail = (
                "SOS was recorded, but the emergency "
                "SMS alert could not be sent."
            )


        # ====================================================
        # 8. RESPONSE
        # ====================================================

        return Response(
            {
                "id":
                    sos_event.id,

                "status":
                    sos_event.status,

                "latitude":
                    sos_event.latitude,

                "longitude":
                    sos_event.longitude,

                "location_accuracy":
                    sos_event.location_accuracy,

                "activated_at":
                    sos_event.activated_at,

                "trusted_contacts_count":
                    len(
                        trusted_contacts
                    ),

                # Keep this if frontend still uses it
                "sms_started":
                    sms_sent,

                "sms_sent":
                    sms_sent,

                "sms_failed":
                    sms_failed,

                "detail":
                    detail,

                # Helpful for debugging
                "delivery": {
                    "sms":
                        sms_results,
                },
            },
            status=
                response_status,
        )
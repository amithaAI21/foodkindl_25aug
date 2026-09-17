from django.db.models import Q
from django.utils import timezone

from rest_framework import (
    permissions,
    status,
    viewsets,
)
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    CookTogether,
    CookTogetherRequest,
)
from .permissions import (
    IsHostOrPublishedReadOnly,
)
from .serializers import (
    CookTogetherSerializer,
    JoinRequestSerializer,
)


class CookTogetherViewSet(
    viewsets.ModelViewSet
):
    serializer_class = (
        CookTogetherSerializer
    )

    permission_classes = [
        permissions.IsAuthenticated,
        IsHostOrPublishedReadOnly,
    ]

    def get_permissions(self):
        if self.action in (
            "list",
            "retrieve",
        ):
            return [
                permissions.AllowAny(),
                IsHostOrPublishedReadOnly(),
            ]

        return super().get_permissions()

    def get_queryset(self):
        queryset = (
            CookTogether.objects
            .select_related("host")
            .prefetch_related(
                "invited_members",
                "join_requests",
                "join_requests__guest",
            )
        )

        user = self.request.user

        if user.is_authenticated:
            return (
                queryset.filter(
                    Q(
                        status=(
                            CookTogether
                            .Status
                            .PUBLISHED
                        )
                    )
                    | Q(host=user)
                    | Q(
                        join_requests__guest=user,
                        join_requests__invitation_type=(
                            CookTogetherRequest
                            .InvitationType
                            .HOST_INVITE
                        ),
                    )
                )
                .distinct()
            )

        return queryset.filter(
            status=(
                CookTogether
                .Status
                .PUBLISHED
            )
        )

    def perform_create(self, serializer):
        serializer.save(
            host=self.request.user
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def publish(
        self,
        request,
        pk=None,
    ):
        invite = self.get_object()

        if invite.host_id != request.user.id:
            return Response(
                {
                    "detail": (
                        "Only the host can "
                        "publish this invite."
                    )
                },
                status=(
                    status.HTTP_403_FORBIDDEN
                ),
            )

        required_fields = (
            "dish",
            "event_date",
            "start_time",
            "location_name",
        )

        missing = [
            field
            for field in required_fields
            if not getattr(invite, field)
        ]

        if missing:
            return Response(
                {
                    "detail": (
                        "Complete before "
                        "publishing: "
                        + ", ".join(missing)
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        invite.status = (
            CookTogether.Status.PUBLISHED
        )

        invite.published_at = timezone.now()

        invite.save(
            update_fields=[
                "status",
                "published_at",
                "updated_at",
            ]
        )

        invited_ids = list(
            invite.invited_members.exclude(
                id=invite.host_id
            ).values_list(
                "id",
                flat=True,
            )
        )

        for member_id in invited_ids:
            CookTogetherRequest.objects.update_or_create(
                cook_together=invite,
                guest_id=member_id,
                defaults={
                    "status": (
                        CookTogetherRequest
                        .Status
                        .PENDING
                    ),
                    "invitation_type": (
                        CookTogetherRequest
                        .InvitationType
                        .HOST_INVITE
                    ),
                    "note": "",
                },
            )

        return Response(
            self.get_serializer(
                invite
            ).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[
            permissions.IsAuthenticated,
        ],
        url_path="my-invitations",
    )
    def my_invitations(self, request):
        queryset = (
            CookTogether.objects
            .select_related("host")
            .prefetch_related(
                "invited_members",
                "join_requests",
                "join_requests__guest",
            )
            .filter(
                status=(
                    CookTogether
                    .Status
                    .PUBLISHED
                ),
                join_requests__guest=request.user,
                join_requests__invitation_type=(
                    CookTogetherRequest
                    .InvitationType
                    .HOST_INVITE
                ),
            )
            .distinct()
            .order_by(
                "event_date",
                "start_time",
            )
        )

        invitation_status = (
            request.query_params.get(
                "status"
            )
        )

        valid_statuses = {
            CookTogetherRequest
            .Status
            .PENDING,
            CookTogetherRequest
            .Status
            .APPROVED,
            CookTogetherRequest
            .Status
            .DECLINED,
        }

        if invitation_status in valid_statuses:
            queryset = queryset.filter(
                join_requests__guest=(
                    request.user
                ),
                join_requests__status=(
                    invitation_status
                ),
                join_requests__invitation_type=(
                    CookTogetherRequest
                    .InvitationType
                    .HOST_INVITE
                ),
            ).distinct()

        page = self.paginate_queryset(
            queryset
        )

        if page is not None:
            serializer = self.get_serializer(
                page,
                many=True,
            )

            return (
                self.get_paginated_response(
                    serializer.data
                )
            )

        serializer = self.get_serializer(
            queryset,
            many=True,
        )

        return Response(
            serializer.data
        )

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[
            permissions.IsAuthenticated,
        ],
        url_path="created-by-me",
    )
    def created_by_me(self, request):
        queryset = (
            CookTogether.objects
            .select_related("host")
            .prefetch_related(
                "invited_members",
                "join_requests",
            )
            .filter(host=request.user)
            .order_by("-created_at")
        )

        serializer = self.get_serializer(
            queryset,
            many=True,
        )

        return Response(
            serializer.data
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            permissions.IsAuthenticated,
        ],
        url_path="request-to-join",
    )
    def request_to_join(
        self,
        request,
        pk=None,
    ):
        invite = self.get_object()

        if (
            invite.status
            != CookTogether.Status.PUBLISHED
        ):
            return Response(
                {
                    "detail": (
                        "This Cook Together "
                        "is not available."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        if invite.host_id == request.user.id:
            return Response(
                {
                    "detail": (
                        "Hosts cannot request "
                        "to join their own invite."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        approved_count = (
            invite.join_requests.filter(
                status=(
                    CookTogetherRequest
                    .Status
                    .APPROVED
                )
            ).count()
        )

        if (
            approved_count
            >= invite.maximum_guests
        ):
            return Response(
                {
                    "detail": (
                        "This Cook Together "
                        "is full."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        join_request, created = (
            CookTogetherRequest
            .objects
            .get_or_create(
                cook_together=invite,
                guest=request.user,
                defaults={
                    "note": (
                        request.data.get(
                            "note",
                            "",
                        )
                    ),
                    "invitation_type": (
                        CookTogetherRequest
                        .InvitationType
                        .JOIN_REQUEST
                    ),
                },
            )
        )

        return Response(
            JoinRequestSerializer(
                join_request,
                context={
                    "request": request
                },
            ).data,
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            permissions.IsAuthenticated,
        ],
        url_path="accept-invitation",
    )
    def accept_invitation(
        self,
        request,
        pk=None,
    ):
        invite = self.get_object()

        invitation = (
            CookTogetherRequest.objects
            .filter(
                cook_together=invite,
                guest=request.user,
                invitation_type=(
                    CookTogetherRequest
                    .InvitationType
                    .HOST_INVITE
                ),
            )
            .first()
        )

        if not invitation:
            return Response(
                {
                    "detail": (
                        "You do not have an "
                        "invitation for this event."
                    )
                },
                status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )

        approved_count = (
            invite.join_requests.filter(
                status=(
                    CookTogetherRequest
                    .Status
                    .APPROVED
                )
            )
            .exclude(id=invitation.id)
            .count()
        )

        if (
            approved_count
            >= invite.maximum_guests
        ):
            return Response(
                {
                    "detail": (
                        "This Cook Together "
                        "is already full."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        invitation.status = (
            CookTogetherRequest
            .Status
            .APPROVED
        )

        invitation.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            JoinRequestSerializer(
                invitation,
                context={
                    "request": request
                },
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            permissions.IsAuthenticated,
        ],
        url_path="decline-invitation",
    )
    def decline_invitation(
        self,
        request,
        pk=None,
    ):
        invite = self.get_object()

        invitation = (
            CookTogetherRequest.objects
            .filter(
                cook_together=invite,
                guest=request.user,
                invitation_type=(
                    CookTogetherRequest
                    .InvitationType
                    .HOST_INVITE
                ),
            )
            .first()
        )

        if not invitation:
            return Response(
                {
                    "detail": (
                        "You do not have an "
                        "invitation for this event."
                    )
                },
                status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )

        invitation.status = (
            CookTogetherRequest
            .Status
            .DECLINED
        )

        invitation.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            JoinRequestSerializer(
                invitation,
                context={
                    "request": request
                },
            ).data
        )


class JoinRequestViewSet(
    viewsets.ReadOnlyModelViewSet
):
    serializer_class = (
        JoinRequestSerializer
    )

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            CookTogetherRequest.objects
            .select_related(
                "guest",
                "cook_together",
                "cook_together__host",
            )
            .filter(
                cook_together__host=(
                    self.request.user
                )
            )
            .order_by("-created_at")
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def approve(
        self,
        request,
        pk=None,
    ):
        item = self.get_object()
        invite = item.cook_together

        if (
            item.invitation_type
            != CookTogetherRequest
            .InvitationType
            .JOIN_REQUEST
        ):
            return Response(
                {
                    "detail": (
                        "Host invitations must "
                        "be accepted by the "
                        "invited member."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        approved_count = (
            invite.join_requests.filter(
                status=(
                    CookTogetherRequest
                    .Status
                    .APPROVED
                )
            )
            .exclude(id=item.id)
            .count()
        )

        if (
            approved_count
            >= invite.maximum_guests
        ):
            return Response(
                {
                    "detail": (
                        "Maximum guest count "
                        "reached."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        item.status = (
            CookTogetherRequest
            .Status
            .APPROVED
        )

        item.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(item).data
        )

    @action(
        detail=True,
        methods=["post"],
    )
    def decline(
        self,
        request,
        pk=None,
    ):
        item = self.get_object()

        if (
            item.invitation_type
            != CookTogetherRequest
            .InvitationType
            .JOIN_REQUEST
        ):
            return Response(
                {
                    "detail": (
                        "Host invitations must "
                        "be declined by the "
                        "invited member."
                    )
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        item.status = (
            CookTogetherRequest
            .Status
            .DECLINED
        )

        item.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        return Response(
            self.get_serializer(item).data
        )
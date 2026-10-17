
"""
FoodKindl restaurant table bookings and visit verification.

Flow:
Dine Out -> Guest acceptance -> Table request
-> Partner confirmation -> Host check-in
-> Partner verifies arrival -> Referral fee recorded.

Referral fees are recorded as amounts due, not payments received.
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone

from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from dineout.models import DineOut, DineOutResponse

from .models import Restaurant, RestaurantBooking, RestaurantVisit

# Fee is per verified group visit, not per guest.
# Only activate after partner agreement.
VISIT_REFERRAL_FEE = Decimal("10.00")

# Host can check in from 2 hours before the reservation
# until 6 hours after it.
CHECKIN_EARLY = timedelta(hours=2)
CHECKIN_LATE = timedelta(hours=6)


# ============================================================
# SERIALIZER
# ============================================================

class TableBookingSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(
        source="restaurant.name",
        read_only=True,
    )

    member_name = serializers.SerializerMethodField()

    dine_out_id = serializers.IntegerField(read_only=True)
    bill_paid = serializers.SerializerMethodField()
    bill_paid_at = serializers.SerializerMethodField()
    referral_amount = serializers.SerializerMethodField()
    referral_status = serializers.SerializerMethodField()

    class Meta:
        model = RestaurantBooking

        fields = (
            "id",
            "restaurant",
            "restaurant_name",
            "member_name",
            "dine_out_id",
            "booking_date",
            "booking_time",
            "guest_count",
            "special_request",
            "status",
            "booking_reference",
            "created_at",
            "visit_status",
            "member_checked_in_at",
            "partner_verified_at",
            "actual_guest_count",
            "commission_amount",
            "commission_status",
            "bill_paid",
            "bill_paid_at",
            "referral_amount",
            "referral_status",
        )

        read_only_fields = fields

    def get_member_name(self, obj):
        return (
            obj.user.get_full_name()
            or obj.user.username
        )

    def _visit(self, obj):
        # OneToOne reverse lookup is cached by select_related.
        try:
            return obj.visit_record
        except RestaurantVisit.DoesNotExist:
            return None

    def get_bill_paid(self, obj):
        visit = self._visit(obj)
        return bool(visit and visit.bill_paid)

    def get_bill_paid_at(self, obj):
        visit = self._visit(obj)
        return visit.bill_paid_at if visit else None

    def get_referral_amount(self, obj):
        visit = self._visit(obj)
        return str(visit.referral_amount) if visit else "0.00"

    def get_referral_status(self, obj):
        visit = self._visit(obj)
        return visit.referral_status if visit else "not_due"


# ============================================================
# HELPERS
# ============================================================

def get_validation_message(error):
    detail = error.detail

    if isinstance(detail, dict):
        detail = detail.get("detail", detail)

    if isinstance(detail, list):
        return " ".join(str(item) for item in detail)

    return str(detail)


def validation_response(error):
    return Response(
        {"detail": get_validation_message(error)},
        status=status.HTTP_400_BAD_REQUEST,
    )


def get_partner_restaurant(dine_out):
    external_id = str(
        dine_out.restaurant_external_id or ""
    ).strip()

    prefix = "foodkindl-"

    if not external_id.startswith(prefix):
        raise serializers.ValidationError({
            "detail": "Select a registered FoodKindl Partner."
        })

    # foodkindl-1 -> database restaurant ID 1
    restaurant_id = external_id[len(prefix):]

    if not restaurant_id.isdigit():
        raise serializers.ValidationError({
            "detail": "Invalid partner restaurant ID."
        })

    restaurant = Restaurant.objects.filter(
        pk=int(restaurant_id),
        is_active=True,
        is_foodkindl_partner=True,
    ).first()

    if not restaurant:
        raise serializers.ValidationError({
            "detail": "FoodKindl Partner restaurant not found."
        })

    if not restaurant.accepts_foodkindl_booking:
        raise serializers.ValidationError({
            "detail": "Restaurant is not accepting bookings."
        })

    return restaurant


def accepted_guest_count(dine_out):
    return DineOutResponse.objects.filter(
        dine_out=dine_out,
        status=DineOutResponse.Status.ACCEPTED,
    ).exclude(
        guest_id=dine_out.host_id
    ).count()


def booking_eligibility(dine_out, user):
    if dine_out.host_id != user.pk:
        raise serializers.ValidationError({
            "detail": "Only the host can book a table."
        })

    if dine_out.status != DineOut.Status.PUBLISHED:
        raise serializers.ValidationError({
            "detail": "Invitation is not published."
        })

    if (
        not dine_out.starts_at
        or dine_out.starts_at <= timezone.now()
    ):
        raise serializers.ValidationError({
            "detail": "The Dine Out time has passed."
        })

    restaurant = get_partner_restaurant(dine_out)

    if restaurant.owner_id == user.pk:
        raise serializers.ValidationError({
            "detail": "Cannot book your own restaurant."
        })

    accepted = accepted_guest_count(dine_out)

    if accepted < 1:
        raise serializers.ValidationError({
            "detail": "Wait for at least one accepted guest."
        })

    party_size = accepted + 1

    if (
        party_size > 20
        or party_size > dine_out.maximum_guests + 1
    ):
        raise serializers.ValidationError({
            "detail": "The group exceeds the allowed size."
        })

    if (
        restaurant.seating_capacity
        and party_size > restaurant.seating_capacity
    ):
        raise serializers.ValidationError({
            "detail": "Group exceeds restaurant capacity."
        })

    local_start = timezone.localtime(
        dine_out.starts_at
    )

    return restaurant, accepted, party_size, local_start


def get_booking_start(booking):
    """Return an aware datetime using the Django timezone."""
    value = datetime.combine(booking.booking_date, booking.booking_time)
    if timezone.is_aware(value):
        return value
    return timezone.make_aware(value, timezone.get_current_timezone())


def serialize_booking(booking):
    return TableBookingSerializer(booking).data


def get_visit(booking):
    """Get/create one visit per booking, preserving earlier booking evidence."""
    visit, _ = RestaurantVisit.objects.get_or_create(
        booking=booking,
        defaults={
            "status": "checked_in" if booking.member_checked_in_at else "checked_in",
            "member_checked_in_at": booking.member_checked_in_at,
            "restaurant_confirmed_at": booking.partner_verified_at,
        },
    )
    changes = []
    if booking.member_checked_in_at and not visit.member_checked_in_at:
        visit.member_checked_in_at = booking.member_checked_in_at
        changes.append("member_checked_in_at")
    if booking.partner_verified_at and not visit.restaurant_confirmed_at:
        visit.restaurant_confirmed_at = booking.partner_verified_at
        changes.append("restaurant_confirmed_at")
    if changes:
        visit.save(update_fields=changes + ["updated_at"])
    return visit


def verify_visit_if_complete(booking, visit):
    """
    Must be called inside a transaction while
    the booking record is locked.

    Referral is recorded only when:
    1. Host checked in.
    2. Restaurant confirmed arrival.
    3. Restaurant confirmed dining bill was paid.
    """

    if visit.status in ("no_show", "disputed"):
        return False

    if (
        not visit.member_checked_in_at
        or not visit.restaurant_confirmed_at
        or not visit.bill_paid
    ):
        return False

    if visit.status == "verified":
        return True

    visit.status = "verified"
    visit.verified_at = timezone.now()
    visit.referral_amount = Decimal("10.00")
    visit.referral_status = "due"

    visit.save(update_fields=[
        "status",
        "verified_at",
        "referral_amount",
        "referral_status",
        "updated_at",
    ])

    booking.visit_status = "verified"
    booking.commission_amount = Decimal("10.00")
    booking.commission_status = "due"

    booking.save(update_fields=[
        "visit_status",
        "commission_amount",
        "commission_status",
        "updated_at",
    ])

    return True



# ============================================================
# ELIGIBILITY API
# ============================================================

class DineOutBookingEligibilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, dine_out_id):
        dine_out = DineOut.objects.filter(
            pk=dine_out_id,
            host=request.user,
        ).first()

        if not dine_out:
            return Response(
                {"detail": "Dine Out not found."},
                status=404,
            )

        accepted = accepted_guest_count(dine_out)

        existing = (
            RestaurantBooking.objects
            .filter(dine_out=dine_out)
            .select_related("restaurant", "user", "visit_record")
            .first()
        )

        if existing:
            return Response({
                "can_book": False,
                "accepted_guests": accepted,
                "guest_count": accepted + 1,
                "booking": serialize_booking(existing),
                "detail": "Booking already exists.",
            })

        try:
            restaurant, accepted, count, local_start = (
                booking_eligibility(dine_out, request.user)
            )
        except serializers.ValidationError as error:
            return Response({
                "can_book": False,
                "accepted_guests": accepted,
                "guest_count": accepted + 1,
                "booking": None,
                "detail": get_validation_message(error),
            })

        return Response({
            "can_book": True,
            "accepted_guests": accepted,
            "guest_count": count,
            "restaurant_name": restaurant.name,
            "restaurant_id": restaurant.pk,
            "booking_date": str(local_start.date()),
            "booking_time": local_start.strftime("%H:%M"),
            "booking": None,
        })


# ============================================================
# MEMBER BOOKING LIST / CREATE
# ============================================================

class MemberTableBookingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = (
            RestaurantBooking.objects
            .filter(user=request.user)
            .select_related("restaurant", "user", "visit_record")
            .order_by("-created_at")
        )

        return Response(
            TableBookingSerializer(bookings, many=True).data
        )

    @transaction.atomic
    def post(self, request):
        try:
            dine_out_id = int(
                request.data.get("dine_out_id")
            )
        except (TypeError, ValueError):
            return Response(
                {"detail": "Valid dine_out_id required."},
                status=400,
            )

        dine_out = (
            DineOut.objects
            .select_for_update()
            .filter(
                pk=dine_out_id,
                host=request.user,
            )
            .first()
        )

        if not dine_out:
            return Response(
                {"detail": "Dine Out not found."},
                status=404,
            )

        if RestaurantBooking.objects.filter(
            dine_out=dine_out
        ).exists():
            return Response(
                {"detail": "Booking already exists."},
                status=409,
            )

        try:
            restaurant, accepted, count, local_start = (
                booking_eligibility(dine_out, request.user)
            )
        except serializers.ValidationError as error:
            return validation_response(error)

        booking = RestaurantBooking.objects.create(
            restaurant=restaurant,
            user=request.user,
            dine_out=dine_out,
            booking_date=local_start.date(),
            booking_time=local_start.time().replace(
                tzinfo=None
            ),
            guest_count=count,
            special_request=str(
                request.data.get("special_request") or ""
            ).strip()[:2000],
            status="pending",
        )

        return Response(
            serialize_booking(booking),
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# MEMBER CANCELS BOOKING
# ============================================================

class MemberCancelTableBookingView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, booking_id):
        booking = (
            RestaurantBooking.objects
            .select_for_update()
            .select_related("restaurant", "user", "visit_record")
            .filter(
                pk=booking_id,
                user=request.user,
            )
            .first()
        )

        if not booking:
            return Response(
                {"detail": "Booking not found."},
                status=404,
            )

        if booking.status not in (
            "pending",
            "confirmed",
        ):
            return Response(
                {"detail": "Cannot cancel this booking."},
                status=400,
            )

        if booking.visit_status != "not_started":
            return Response(
                {"detail": "Visit verification has started."},
                status=400,
            )

        if booking.partner_verified_at is not None:
            return Response(
                {"detail": "Restaurant reported arrival."},
                status=400,
            )

        booking.status = "cancelled"
        booking.save(update_fields=[
            "status",
            "updated_at",
        ])

        return Response(serialize_booking(booking))


# ============================================================
# PARTNER BOOKING LIST
# ============================================================

class PartnerTableBookingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = (
            RestaurantBooking.objects
            .filter(restaurant__owner=request.user)
            .select_related("restaurant", "user", "visit_record")
            .order_by("-created_at")
        )

        return Response(
            TableBookingSerializer(bookings, many=True).data
        )


# ============================================================
# PARTNER CONFIRMS / REJECTS BOOKING
# ============================================================

class PartnerBookingDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, booking_id):
        booking = (
            RestaurantBooking.objects
            .select_for_update()
            .select_related("restaurant", "user", "visit_record")
            .filter(
                pk=booking_id,
                restaurant__owner=request.user,
            )
            .first()
        )

        if not booking:
            return Response(
                {"detail": "Booking not found."},
                status=404,
            )

        decision = request.data.get("status")

        if decision not in ("confirmed", "rejected"):
            return Response(
                {"detail": "Use confirmed or rejected."},
                status=400,
            )

        if booking.status != "pending":
            return Response(
                {"detail": "Only pending bookings can be decided."},
                status=400,
            )

        if (
            decision == "confirmed"
            and (
                not booking.restaurant.is_active
                or not booking.restaurant.accepts_foodkindl_booking
            )
        ):
            return Response(
                {"detail": "Restaurant bookings are disabled."},
                status=400,
            )

        booking.status = decision
        booking.save(update_fields=[
            "status",
            "updated_at",
        ])

        return Response(serialize_booking(booking))


# ============================================================
# HOST CHECK-IN
# ============================================================


class MemberCheckInView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, booking_id):
        booking = (RestaurantBooking.objects.select_for_update()
                   .select_related("restaurant", "user")
                   .filter(pk=booking_id, user=request.user).first())
        if not booking:
            return Response({"detail": "Booking not found."}, status=404)
        if booking.status != "confirmed":
            return Response({"detail": "Booking must be confirmed."}, status=400)
        if booking.visit_status in ("no_show", "disputed"):
            return Response({"detail": "Visit requires review."}, status=409)

        visit = get_visit(booking)
        if visit.status in ("no_show", "disputed"):
            return Response({"detail": "Visit requires review."}, status=409)
        if visit.member_checked_in_at:
            verify_visit_if_complete(booking, visit)
            booking.refresh_from_db()
            return Response({"detail": "Already checked in.", "booking": serialize_booking(booking)})

        now = timezone.now()
        starts_at = get_booking_start(booking)
        if not starts_at - CHECKIN_EARLY <= now <= starts_at + CHECKIN_LATE:
            return Response({"detail": "Check-in is open from 2 hours before to 6 hours after the reservation."}, status=400)

        visit.member_checked_in_at = now
        visit.status = "checked_in"
        visit.save(update_fields=["member_checked_in_at", "status", "updated_at"])
        booking.member_checked_in_at = now
        booking.visit_status = "checked_in"
        booking.save(update_fields=["member_checked_in_at", "visit_status", "updated_at"])
        verify_visit_if_complete(booking, visit)
        return Response({"detail": "Arrival recorded.", "booking": serialize_booking(booking)})


# ============================================================
# BOOKING VISIT STATUS
# ============================================================

class BookingVisitStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        booking = (
            RestaurantBooking.objects
            .select_related("restaurant", "user", "visit_record")
            .filter(pk=booking_id)
            .first()
        )

        if not booking:
            return Response(
                {"detail": "Booking not found."},
                status=404,
            )

        is_member = booking.user_id == request.user.pk
        is_partner = (
            booking.restaurant.owner_id == request.user.pk
        )

        if not (is_member or is_partner):
            return Response(
                {"detail": "Not authorized."},
                status=403,
            )

        return Response({
            "booking": serialize_booking(booking),
            "visit_status": booking.visit_status,
            "member_checked_in": bool(
                booking.member_checked_in_at
            ),
            "restaurant_verified": bool(
                booking.partner_verified_at
            ),
            "actual_guest_count": booking.actual_guest_count,
        })


# ============================================================
# PARTNER VERIFY VISIT
# ============================================================

class PartnerVisitVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, booking_id):
        booking = (RestaurantBooking.objects.select_for_update()
                   .select_related("restaurant", "user")
                   .filter(pk=booking_id, restaurant__owner=request.user).first())
        if not booking:
            return Response({"detail": "Booking not found."}, status=404)
        if booking.status != "confirmed":
            return Response({"detail": "Only confirmed bookings can be verified."}, status=400)

        action = request.data.get("action")
        if action not in ("arrived", "no_show", "disputed"):
            return Response({"detail": "Use arrived, no_show, or disputed."}, status=400)

        visit = get_visit(booking)
        if visit.status == "verified" or booking.visit_status == "verified":
            return Response({"detail": "Visit already verified."}, status=409)
        if visit.status in ("no_show", "disputed") or booking.visit_status in ("no_show", "disputed"):
            return Response({"detail": "Visit requires admin review."}, status=409)

        now = timezone.now()
        starts_at = get_booking_start(booking)
        if action == "arrived":
            if visit.restaurant_confirmed_at:
                return Response(serialize_booking(booking))
            if not starts_at - CHECKIN_EARLY <= now <= starts_at + CHECKIN_LATE:
                return Response({"detail": "Arrival verification is only available near the booking time."}, status=400)
            try:
                count = int(request.data.get("actual_guest_count"))
            except (TypeError, ValueError):
                return Response({"detail": "Enter a valid guest count."}, status=400)
            if count < 1 or count > 20:
                return Response({"detail": "Guest count must be 1 to 20."}, status=400)

            visit.restaurant_confirmed_at = now
            visit.actual_guest_count = count
            visit.save(update_fields=["restaurant_confirmed_at", "actual_guest_count", "updated_at"])
            booking.partner_verified_at = now
            booking.actual_guest_count = count
            booking.save(update_fields=["partner_verified_at", "actual_guest_count", "updated_at"])
            verify_visit_if_complete(booking, visit)

        elif action == "no_show":
            if now < starts_at + timedelta(hours=1):
                return Response({"detail": "No-show can be reported one hour after the booking time."}, status=400)
            value = "disputed" if visit.member_checked_in_at or visit.bill_paid else "no_show"
            visit.status = value
            visit.save(update_fields=["status", "updated_at"])
            booking.visit_status = value
            booking.save(update_fields=["visit_status", "updated_at"])
        else:
            visit.status = "disputed"
            visit.save(update_fields=["status", "updated_at"])
            booking.visit_status = "disputed"
            booking.save(update_fields=["visit_status", "updated_at"])

        return Response(serialize_booking(booking))


class DailyReferralSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_text = request.query_params.get("date")

        try:
            selected_date = (
                date.fromisoformat(date_text)
                if date_text
                else timezone.localdate()
            )
        except ValueError:
            return Response(
                {"detail": "Use YYYY-MM-DD date format."},
                status=400,
            )

        # Partners see only their own restaurant's referrals.
        # Staff can see all restaurant referrals.
        visits = RestaurantVisit.objects.filter(
            status="verified",
            verified_at__gte=timezone.make_aware(datetime.combine(selected_date, time.min)),
            verified_at__lt=timezone.make_aware(datetime.combine(selected_date + timedelta(days=1), time.min)),
        )

        if not request.user.is_staff:
            visits = visits.filter(
                booking__restaurant__owner=request.user
            )

        totals = visits.aggregate(
            verified_visits=Count("id"),
            total_referral=Sum("referral_amount"),
        )

        entries = visits.select_related(
            "booking__restaurant"
        ).order_by("-verified_at")

        return Response({
            "date": selected_date.isoformat(),
            "verified_visits": totals["verified_visits"] or 0,
            "total_referral": str(
                totals["total_referral"]
                or Decimal("0.00")
            ),
            "currency": "INR",
            "entries": [
                {
                    "booking_reference":
                        item.booking.booking_reference,
                    "restaurant":
                        item.booking.restaurant.name,
                    "verified_at":
                        item.verified_at,
                    "guest_count":
                        item.actual_guest_count,
                    "referral_amount":
                        str(item.referral_amount),
                    "referral_status":
                        item.referral_status,
                }
                for item in entries
            ],
        })
        

class PartnerBillPaidView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, booking_id):
        booking = (RestaurantBooking.objects.select_for_update()
                   .select_related("restaurant", "user")
                   .filter(pk=booking_id, restaurant__owner=request.user,
                           status="confirmed").first())
        if not booking:
            return Response({"detail": "Confirmed booking not found."}, status=404)

        visit = get_visit(booking)
        if visit.status in ("no_show", "disputed") or booking.visit_status in ("no_show", "disputed"):
            return Response({"detail": "This visit requires review."}, status=409)
        if not visit.restaurant_confirmed_at:
            return Response({"detail": "Confirm guests arrived before marking the bill paid."}, status=400)
        if visit.bill_paid:
            verify_visit_if_complete(booking, visit)
            return Response({"detail": "Bill already recorded as paid.", "booking": serialize_booking(booking)})

        raw_amount = request.data.get("bill_amount")
        amount = None
        if raw_amount not in (None, ""):
            try:
                amount = Decimal(str(raw_amount))
            except (InvalidOperation, TypeError, ValueError):
                return Response({"detail": "Invalid bill amount."}, status=400)
            if not amount.is_finite() or not Decimal("0") < amount < Decimal("100000000"):
                return Response({"detail": "Bill amount must be positive and below ₹10 crore."}, status=400)
            if amount.as_tuple().exponent < -2:
                return Response({"detail": "Bill amount allows at most two decimal places."}, status=400)

        now = timezone.now()
        visit.bill_paid = True
        visit.bill_paid_at = now
        if amount is not None:
            visit.bill_amount = amount
        visit.bill_payment_reference = str(request.data.get("payment_reference") or "").strip()[:100]
        visit.save()
        verify_visit_if_complete(booking, visit)
        return Response({
            "detail": "Guest bill marked paid. ₹10 is due only after host and restaurant arrival verification.",
            "booking": serialize_booking(booking),
        })

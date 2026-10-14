import re
import secrets
from datetime import timedelta

import requests

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from django.db import IntegrityError, transaction
from django.utils import timezone

from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile, MobileOTPChallenge
from .serializers import UserSerializer

import logging

logger = logging.getLogger(__name__)

User = get_user_model()

OTP_TTL = 300
MAX_ATTEMPTS = 5
COOLDOWN = 60
MAX_REQUESTS_PER_HOUR = 5

INVALID = {
    "detail": "Invalid or expired verification code."
}

GENERIC = {
    "detail": (
        "If this number is linked to an active account, "
        "an OTP will be sent."
    ),
    "resend_after": COOLDOWN,
}


def normalize_mobile(value):
    mobile = re.sub(
        r"[\s()-]",
        "",
        str(value or ""),
    )

    if mobile.startswith("+91"):
        mobile = mobile[3:]
    elif len(mobile) == 12 and mobile.startswith("91"):
        mobile = mobile[2:]

    if not re.fullmatch(r"[6-9][0-9]{9}", mobile):
        raise ValidationError({
            "mobile": "Enter a valid Indian 10-digit mobile number."
        })

    return mobile


def send_sms(mobile, code):
    api_key = getattr(settings, "FAST2SMS_API_KEY", "")

    if not api_key:
        raise RuntimeError("SMS service is not configured.")

    response = requests.post(
        "https://www.fast2sms.com/dev/bulkV2",
        headers={
            "authorization": api_key,
        },
        json={
            "route": "otp",
            "variables_values": code,
            "numbers": mobile,
        },
        timeout=(5, 15),
    )

    response.raise_for_status()

    if response.json().get("return") is not True:
        raise RuntimeError("SMS provider rejected the request.")


def request_code(mobile, purpose, user_id):
    now = timezone.now()

    with transaction.atomic():
        MobileOTPChallenge.objects.get_or_create(
            mobile=mobile
        )

        challenge = (
            MobileOTPChallenge.objects
            .select_for_update()
            .get(mobile=mobile)
        )

        if challenge.last_sent_at:
            next_allowed = (
                challenge.last_sent_at
                + timedelta(seconds=COOLDOWN)
            )

            if now < next_allowed:
                remaining = max(
                    1,
                    int((next_allowed - now).total_seconds()) + 1,
                )

                return Response(
                    {
                        "detail": (
                            "Please wait before requesting another OTP."
                        ),
                        "resend_after": remaining,
                    },
                    status=429,
                    headers={
                        "Retry-After": str(remaining),
                    },
                )

        if (
            not challenge.window_started_at
            or now >= (
                challenge.window_started_at
                + timedelta(hours=1)
            )
        ):
            challenge.window_started_at = now
            challenge.requests_in_window = 0

        if (
            challenge.requests_in_window
            >= MAX_REQUESTS_PER_HOUR
        ):
            return Response(
                {
                    "detail": (
                        "OTP request limit reached. Try again later."
                    )
                },
                status=429,
            )

        challenge.requests_in_window += 1
        challenge.last_sent_at = now
        challenge.user_id = user_id
        challenge.purpose = purpose
        challenge.attempts = 0
        challenge.expires_at = (
            now + timedelta(seconds=OTP_TTL)
        )

        code = f"{secrets.randbelow(1000000):06d}"

        challenge.code_hash = make_password(code)
        challenge.save()

        # Unknown login numbers receive the same generic response,
        # but no SMS is sent.
        if user_id is not None:
            try:
                send_sms(mobile, code)
            except (
                requests.RequestException,
                ValueError,
                RuntimeError,
            ):
                challenge.code_hash = ""
                challenge.save(update_fields=["code_hash"])

                return Response(
                    {
                        "detail": (
                            "Unable to send SMS. "
                            "Please try again later."
                        )
                    },
                    status=503,
                )

        if purpose == "login":
            return Response(GENERIC)

        return Response({
            "detail": "OTP sent to your mobile number.",
            "resend_after": COOLDOWN,
        })


class RequestOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "mobile_otp_request"

    def post(self, request):
        mobile = normalize_mobile(
            request.data.get("mobile")
        )

        profile = Profile.objects.filter(
            phone_number=mobile,
            phone_verified_at__isnull=False,
            user__is_active=True,
        ).first()

        return request_code(
            mobile=mobile,
            purpose="login",
            user_id=profile.user_id if profile else None,
        )


class LinkMobileRequestView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "mobile_otp_request"

    def post(self, request):
        mobile = normalize_mobile(
            request.data.get("mobile")
        )

        if Profile.objects.filter(
            user=request.user,
            phone_verified_at__isnull=False,
        ).exists():
            return Response(
                {
                    "detail": (
                        "Your account already has "
                        "a verified login number."
                    )
                },
                status=400,
            )

        if Profile.objects.filter(
            phone_number=mobile
        ).exists():
            return Response(
                {
                    "detail": (
                        "This number cannot be linked "
                        "to this account."
                    )
                },
                status=400,
            )

        return request_code(
            mobile=mobile,
            purpose="link",
            user_id=request.user.pk,
        )


def verify_code(request, purpose):
    mobile = normalize_mobile(
        request.data.get("mobile")
    )
    code = str(
        request.data.get("otp") or ""
    ).strip()

    if not re.fullmatch(r"[0-9]{6}", code):
        raise ValidationError({
            "otp": "Enter a valid 6-digit code."
        })

    with transaction.atomic():
        challenge = (
            MobileOTPChallenge.objects
            .select_for_update()
            .filter(mobile=mobile)
            .first()
        )

        if (
            not challenge
            or challenge.purpose != purpose
            or not challenge.code_hash
            or not challenge.expires_at
            or challenge.expires_at <= timezone.now()
            or challenge.attempts >= MAX_ATTEMPTS
        ):
            return Response(INVALID, status=400)

        if (
            purpose == "link"
            and challenge.user_id != request.user.pk
        ):
            return Response(INVALID, status=400)

        challenge.attempts += 1

        if not check_password(code, challenge.code_hash):
            if challenge.attempts >= MAX_ATTEMPTS:
                challenge.code_hash = ""

            challenge.save(
                update_fields=["attempts", "code_hash"]
            )

            return Response(INVALID, status=400)

        user = User.objects.filter(
            pk=challenge.user_id,
            is_active=True,
        ).first()

        if not user:
            challenge.code_hash = ""
            challenge.save(update_fields=["code_hash"])
            return Response(INVALID, status=400)

        # Consume the code while holding the database row lock.
        challenge.code_hash = ""
        challenge.save(
            update_fields=["code_hash", "attempts"]
        )

        if purpose == "link":
            try:
                with transaction.atomic():
                    Profile.objects.get_or_create(user=user)

                    profile = (
                        Profile.objects
                        .select_for_update()
                        .get(user=user)
                    )

                    if profile.phone_verified_at:
                        return Response(
                            {
                                "detail": (
                                    "Your account already "
                                    "has a verified phone."
                                )
                            },
                            status=400,
                        )

                    profile.phone_number = mobile
                    profile.phone_verified_at = timezone.now()

                    profile.save(
                        update_fields=[
                            "phone_number",
                            "phone_verified_at",
                            "is_verified",
                        ]
                    )

            except IntegrityError:
                return Response(
                    {
                        "detail": (
                            "This number or account "
                            "is already linked."
                        )
                    },
                    status=400,
                )

            return Response({
                "detail": (
                    "Mobile verified. You can now "
                    "log in using SMS OTP."
                )
            })

        if not Profile.objects.filter(
            user=user,
            phone_number=mobile,
            phone_verified_at__isnull=False,
        ).exists():
            return Response(INVALID, status=400)

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(
                user,
                context={"request": request},
            ).data,
        })


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "mobile_otp_verify"

    def post(self, request):
        return verify_code(request, "login")


class LinkMobileVerifyView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "mobile_otp_verify"

    def post(self, request):
        return verify_code(request, "link")
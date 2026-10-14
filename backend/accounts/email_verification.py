
import logging

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail
from django.urls import reverse

logger = logging.getLogger(__name__)

EMAIL_VERIFICATION_SALT = "accounts.email-verification"


def send_verification_email(user):
    if not user.email:
        raise ValueError("User email address is missing.")

    # Generate verification token
    token = signing.dumps(
        {
            "user_id": user.pk,
            "email": user.email,
        },
        salt=EMAIL_VERIFICATION_SALT,
    )

    # Generate verification URL
    backend_url = settings.PUBLIC_BACKEND_URL.rstrip("/")

    try:
        verification_path = reverse(
            "verify-email",
            kwargs={"token": token},
        )
    except Exception:
        logger.exception(
            "FoodKindl verification URL generation failed"
        )
        raise

    verification_url = f"{backend_url}{verification_path}"

    # Compose verification email
    subject = "Verify your FoodKindl email"

    message = (
        f"Hi {user.first_name or 'there'},\n\n"
        "Welcome to FoodKindl!\n\n"
        "Click the link below to verify your email:\n\n"
        f"{verification_url}\n\n"
        "This link expires in 24 hours.\n\n"
        "After verification, log in using your email "
        "and password.\n\n"
        "If you did not create this account, "
        "please ignore this email.\n\n"
        "Regards,\n"
        "Team FoodKindl"
    )

    try:
        sent = send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        if sent != 1:
            raise RuntimeError(
                "Email backend did not accept the message."
            )

        logger.info(
            "Verification email submitted for user_id=%s",
            user.pk,
        )

        return True

    except Exception:
        logger.exception(
            "FoodKindl verification email sending failed "
            "for user_id=%s",
            user.pk,
        )
        raise

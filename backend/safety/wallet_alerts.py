from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .fast2sms_wallet import (
    get_fast2sms_balance,
)

from .models import (
    AdminSystemAlert,
)


def get_balance_level(
    balance,
):

    if balance <= 50:
        return (
            "critical",
            "Fast2SMS balance critical",
        )

    if balance <= 100:
        return (
            "urgent",
            "Fast2SMS balance urgent",
        )

    if balance <= 200:
        return (
            "warning",
            "Fast2SMS balance low",
        )

    return (
        None,
        None,
    )


def recently_alerted(
    level,
):

    cutoff = (
        timezone.now()
        -
        timedelta(
            hours=12
        )
    )

    return (
        AdminSystemAlert.objects
        .filter(
            source="fast2sms",
            level=level,
            created_at__gte=cutoff,
        )
        .exists()
    )


def check_fast2sms_wallet():

    result = (
        get_fast2sms_balance()
    )


    if not result.get(
        "success"
    ):

        return {
            "success": False,
            "detail":
                result.get(
                    "error"
                ),
        }


    balance = float(
        result["balance"]
    )


    level, title = (
        get_balance_level(
            balance
        )
    )


    # Balance is healthy.
    if not level:

        return {
            "success": True,
            "balance":
                balance,
            "alert_created":
                False,
        }


    # Avoid sending the same warning
    # every few minutes.
    if recently_alerted(
        level
    ):

        return {
            "success": True,
            "balance":
                balance,
            "alert_created":
                False,
            "detail":
                "Recent alert already exists.",
        }


    message = (
        f"Fast2SMS wallet balance is ₹{balance:.2f}. "
        "Please recharge the wallet so FoodKindl "
        "SOS SMS delivery does not stop."
    )


    AdminSystemAlert.objects.create(
        source="fast2sms",
        level=level,
        title=title,
        message=message,
        balance=balance,
    )


    admin_email = getattr(
        settings,
        "FOODKINDL_ADMIN_EMAIL",
        "",
    )


    if admin_email:

        try:

            send_mail(
                subject=(
                    f"[FoodKindl] {title}"
                ),

                message=message,

                from_email=
                    settings.DEFAULT_FROM_EMAIL,

                recipient_list=[
                    admin_email,
                ],

                fail_silently=False,
            )

        except Exception as exc:

            print(
                "FAST2SMS LOW BALANCE "
                "EMAIL ERROR:",
                repr(exc)
            )


    return {
        "success": True,
        "balance":
            balance,
        "alert_created":
            True,
        "level":
            level,
    }
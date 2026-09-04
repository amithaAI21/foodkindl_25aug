from datetime import timedelta
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .fast2sms_wallet import get_fast2sms_balance
from .models import AdminSystemAlert


logger = logging.getLogger(__name__)


# ============================================================
# BALANCE ALERT LEVEL
# ============================================================

def get_balance_level(balance):
    """
    Decide which alert level should be used
    based on the Fast2SMS wallet balance.

    <= ₹50   : Critical
    <= ₹100  : Urgent
    <= ₹200  : Warning
    >  ₹200  : No alert
    """

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


# ============================================================
# CHECK FOR RECENT DUPLICATE ALERT
# ============================================================

def recently_alerted(level):
    """
    Prevent the same alert level from being
    created repeatedly within 12 hours.
    """

    cutoff = (
        timezone.now()
        - timedelta(hours=12)
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


# ============================================================
# SEND ADMIN EMAIL
# ============================================================

def send_admin_balance_email(
    title,
    message,
):
    """
    Send an email to the FoodKindl administrator
    if FOODKINDL_ADMIN_EMAIL is configured.
    """

    admin_email = getattr(
        settings,
        "FOODKINDL_ADMIN_EMAIL",
        "",
    )

    if not admin_email:
        logger.warning(
            "FOODKINDL_ADMIN_EMAIL is not configured. "
            "Django admin alert was created, but no email was sent."
        )

        return False

    try:

        send_mail(
            subject=f"[FoodKindl] {title}",
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[
                admin_email,
            ],
            fail_silently=False,
        )

        logger.info(
            "Fast2SMS low-balance email sent to %s",
            admin_email,
        )

        return True

    except Exception:
        logger.exception(
            "Fast2SMS low-balance email could not be sent."
        )

        return False


# ============================================================
# MAIN FAST2SMS WALLET CHECK
# ============================================================

def check_fast2sms_wallet():
    """
    Fetch Fast2SMS wallet balance and create an
    AdminSystemAlert when the balance is low.
    """

    logger.info(
        "Starting Fast2SMS wallet balance check."
    )

    # --------------------------------------------------------
    # 1. FETCH BALANCE
    # --------------------------------------------------------

    try:
        result = get_fast2sms_balance()

    except Exception as exc:

        logger.exception(
            "Fast2SMS wallet API call failed."
        )

        return {
            "success": False,
            "error": str(exc),
            "alert_created": False,
        }


    logger.info(
        "Fast2SMS wallet result: %s",
        result,
    )


    # --------------------------------------------------------
    # 2. CHECK API RESULT
    # --------------------------------------------------------

    if not result.get("success"):

        error_message = (
            result.get("error")
            or result.get("detail")
            or "Unable to retrieve Fast2SMS wallet balance."
        )

        logger.error(
            "Fast2SMS wallet check failed: %s",
            error_message,
        )

        return {
            "success": False,
            "detail": error_message,
            "alert_created": False,
        }


    # --------------------------------------------------------
    # 3. CONVERT BALANCE
    # --------------------------------------------------------

    try:

        balance = float(
            result["balance"]
        )

    except (
        KeyError,
        TypeError,
        ValueError,
    ):

        logger.exception(
            "Fast2SMS returned an invalid balance: %s",
            result,
        )

        return {
            "success": False,
            "detail": "Fast2SMS returned an invalid wallet balance.",
            "alert_created": False,
        }


    logger.info(
        "Fast2SMS wallet balance: ₹%.2f",
        balance,
    )


    # --------------------------------------------------------
    # 4. DETERMINE ALERT LEVEL
    # --------------------------------------------------------

    level, title = get_balance_level(
        balance
    )


    logger.info(
        "Fast2SMS alert level: %s",
        level or "healthy",
    )


    # --------------------------------------------------------
    # 5. HEALTHY BALANCE
    # --------------------------------------------------------

    if not level:

        logger.info(
            "Fast2SMS wallet balance is healthy. "
            "No alert required."
        )

        return {
            "success": True,
            "balance": balance,
            "alert_created": False,
            "level": None,
            "detail": "Wallet balance is healthy.",
        }


    # --------------------------------------------------------
    # 6. CHECK FOR DUPLICATE ALERT
    # --------------------------------------------------------

    if recently_alerted(level):

        logger.info(
            "Fast2SMS %s alert already exists "
            "within the last 12 hours.",
            level,
        )

        return {
            "success": True,
            "balance": balance,
            "alert_created": False,
            "level": level,
            "detail": "Recent alert already exists.",
        }


    # --------------------------------------------------------
    # 7. BUILD ALERT MESSAGE
    # --------------------------------------------------------

    message = (
        f"Fast2SMS wallet balance is ₹{balance:.2f}. "
        f"Alert level: {level.upper()}. "
        "Please recharge the Fast2SMS wallet so "
        "FoodKindl SOS SMS delivery does not stop."
    )


    # --------------------------------------------------------
    # 8. CREATE DJANGO ADMIN ALERT
    # --------------------------------------------------------

    try:

        alert = (
            AdminSystemAlert.objects.create(
                source="fast2sms",
                level=level,
                title=title,
                message=message,
                balance=balance,
                is_read=False,
            )
        )

    except Exception as exc:

        logger.exception(
            "Could not create Fast2SMS AdminSystemAlert."
        )

        return {
            "success": False,
            "balance": balance,
            "alert_created": False,
            "detail": str(exc),
        }


    logger.warning(
        "Fast2SMS admin alert created. "
        "Alert ID=%s Balance=₹%.2f Level=%s",
        alert.pk,
        balance,
        level,
    )


    # --------------------------------------------------------
    # 9. SEND EMAIL TO ADMIN
    # --------------------------------------------------------

    email_sent = send_admin_balance_email(
        title=title,
        message=message,
    )


    # --------------------------------------------------------
    # 10. RETURN RESULT
    # --------------------------------------------------------

    return {
        "success": True,
        "balance": balance,
        "alert_created": True,
        "alert_id": alert.pk,
        "level": level,
        "title": title,
        "email_sent": email_sent,
    }
import logging

import requests

from django.conf import settings

from .wallet_alerts import (
    check_fast2sms_wallet,
)


logger = logging.getLogger(
    __name__
)


FAST2SMS_URL = (
    "https://www.fast2sms.com/dev/bulkV2"
)


# ============================================================
# NORMALIZE INDIAN PHONE NUMBER
# ============================================================

def normalize_indian_number(
    phone_number,
):
    """
    Convert Indian phone numbers into the
    10-digit format required by Fast2SMS.

    Supported examples:

    +91 98765 43210
    919876543210
    9876543210
    """

    if not phone_number:
        return ""

    number = (
        str(phone_number)
        .strip()
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )


    # +91xxxxxxxxxx
    if (
        number.startswith("+91")
        and
        len(number) == 13
    ):

        number = number[3:]


    # 91xxxxxxxxxx
    elif (
        number.startswith("91")
        and
        len(number) == 12
    ):

        number = number[2:]


    # Must finally be exactly 10 digits
    if (
        not number.isdigit()
        or
        len(number) != 10
    ):

        return ""


    return number


# ============================================================
# USER DISPLAY NAME
# ============================================================

def get_user_name(
    user,
):
    """
    Return a readable FoodKindl member name
    for the emergency SMS.
    """

    full_name = (
        user.get_full_name()
        .strip()
    )


    return (
        full_name
        or user.first_name
        or "A FoodKindl member"
    )


# ============================================================
# LOCATION LINK
# ============================================================

def build_location_url(
    sos_event,
):
    """
    Build a Google Maps location URL when
    latitude and longitude are available.
    """

    if (
        sos_event.latitude is not None
        and
        sos_event.longitude is not None
    ):

        return (
            "https://maps.google.com/?q="
            f"{sos_event.latitude},"
            f"{sos_event.longitude}"
        )


    return "Location unavailable."


# ============================================================
# BUILD SOS MESSAGE
# ============================================================

def build_sos_message(
    *,
    user,
    sos_event,
):
    """
    Build the emergency SMS sent to the
    user's trusted contacts.
    """

    user_name = (
        get_user_name(
            user
        )
    )


    location_url = (
        build_location_url(
            sos_event
        )
    )


    return (
        "FOODKINDL SOS ALERT: "
        f"{user_name} may be in danger and needs help. "
        "Please contact them immediately. "
        f"Location: {location_url}"
    )


# ============================================================
# SEND SMS THROUGH FAST2SMS
# ============================================================

def send_fast2sms(
    *,
    phone_number,
    message,
):
    """
    Send one emergency SMS using the
    Fast2SMS Quick SMS route.

    Current route:
        GET /dev/bulkV2
        route=q

    NOTE:
    This is currently the Quick SMS route.
    """

    api_key = getattr(
        settings,
        "FAST2SMS_API_KEY",
        "",
    )


    # ========================================================
    # CHECK API KEY
    # ========================================================

    if not api_key:

        logger.error(
            "FAST2SMS_API_KEY is not configured."
        )

        return {
            "success":
                False,

            "error":
                "FAST2SMS_API_KEY is not configured.",
        }


    # ========================================================
    # NORMALIZE PHONE NUMBER
    # ========================================================

    number = (
        normalize_indian_number(
            phone_number
        )
    )


    if not number:

        logger.error(
            "Invalid trusted contact phone number: %s",
            phone_number,
        )

        return {
            "success":
                False,

            "error":
                "Invalid Indian phone number.",
        }


    # ========================================================
    # FAST2SMS HEADERS
    # ========================================================

    headers = {
        "Authorization":
            api_key,

        "Accept":
            "application/json",
    }


    # ========================================================
    # FAST2SMS PARAMETERS
    # ========================================================

    params = {
        "route":
            "q",

        "message":
            message,

        "numbers":
            number,

        "sms_details":
            "1",
    }


    # ========================================================
    # SEND REQUEST
    # ========================================================

    try:

        response = requests.get(
            FAST2SMS_URL,
            headers=headers,
            params=params,
            timeout=15,
        )


        # ====================================================
        # READ PROVIDER RESPONSE
        # ====================================================

        try:

            response_data = (
                response.json()
            )

        except ValueError:

            response_data = {
                "raw":
                    response.text[:1000]
            }


        # ====================================================
        # SUCCESS
        # ====================================================

        provider_return = None

        if isinstance(
            response_data,
            dict,
        ):

            provider_return = (
                response_data.get(
                    "return"
                )
            )


        if (
            response.ok
            and
            provider_return is not False
        ):

            logger.info(
                "Fast2SMS SOS accepted. "
                "number=%s response=%s",
                number,
                response_data,
            )


            return {
                "success":
                    True,

                "number":
                    number,

                "status_code":
                    response.status_code,

                "provider_response":
                    response_data,
            }


        # ====================================================
        # PROVIDER REJECTED REQUEST
        # ====================================================

        logger.error(
            "Fast2SMS rejected SOS. "
            "status=%s number=%s response=%s",
            response.status_code,
            number,
            response_data,
        )


        return {
            "success":
                False,

            "number":
                number,

            "status_code":
                response.status_code,

            "error":
                response_data,

            "provider_response":
                response_data,
        }


    # ========================================================
    # NETWORK / REQUEST ERROR
    # ========================================================

    except requests.RequestException as exc:

        logger.exception(
            "Fast2SMS request failed. "
            "number=%s",
            number,
        )


        return {
            "success":
                False,

            "number":
                number,

            "error":
                str(exc),
        }


# ============================================================
# SEND SOS SMS TO TRUSTED CONTACTS
# ============================================================

def send_sos_to_contacts(
    *,
    user,
    sos_event,
    contacts,
):
    """
    Send the SOS SMS to every active
    trusted contact.

    WhatsApp is intentionally disabled.

    After SMS sending finishes, check the
    Fast2SMS wallet balance and create an
    admin alert if the balance is low.
    """

    # ========================================================
    # BUILD MESSAGE ONCE
    # ========================================================

    sms_message = (
        build_sos_message(
            user=user,
            sos_event=sos_event,
        )
    )


    sms_results = []


    # ========================================================
    # SEND TO ALL TRUSTED CONTACTS
    # ========================================================

    for contact in contacts:

        try:

            sms_result = (
                send_fast2sms(
                    phone_number=
                        contact.phone_number,

                    message=
                        sms_message,
                )
            )


        except Exception as exc:

            logger.exception(
                "Unexpected SMS error for "
                "trusted contact id=%s",
                contact.id,
            )


            sms_result = {
                "success":
                    False,

                "error":
                    str(exc),
            }


        sms_results.append({
            "contact_id":
                contact.id,

            "contact_name":
                contact.name,

            **sms_result,
        })


    # ========================================================
    # CHECK WALLET BALANCE
    # ========================================================

    try:

        wallet_result = (
            check_fast2sms_wallet()
        )


        logger.info(
            "Fast2SMS wallet check after SOS: %s",
            wallet_result,
        )


    except Exception:

        # IMPORTANT:
        # Wallet checking must never break
        # the actual SOS response.

        logger.exception(
            "Unable to check Fast2SMS "
            "wallet after SOS."
        )


    # ========================================================
    # RETURN SMS RESULTS
    # ========================================================

    return {
        "sms_results":
            sms_results,
    }
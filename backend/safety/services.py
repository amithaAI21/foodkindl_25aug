import logging

import requests

from django.conf import settings


logger = logging.getLogger(__name__)


FAST2SMS_URL = (
    "https://www.fast2sms.com/dev/bulkV2"
)


# ============================================================
# NORMALIZE INDIAN PHONE NUMBER FOR SMS
# ============================================================

def normalize_indian_number(
    phone_number,
):

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

    if (
        number.startswith("+91")
        and len(number) == 13
    ):
        number = number[3:]

    elif (
        number.startswith("91")
        and len(number) == 12
    ):
        number = number[2:]

    if (
        not number.isdigit()
        or len(number) != 10
    ):
        return ""

    return number


# ============================================================
# NORMALIZE PHONE NUMBER FOR WHATSAPP
# WhatsApp expects country code without "+"
# Example: 919876543210
# ============================================================

def normalize_whatsapp_number(
    phone_number,
):

    if not phone_number:
        return ""

    number = (
        str(phone_number)
        .strip()
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
        .replace("+", "")
    )

    if len(number) == 10:
        number = f"91{number}"

    if (
        not number.isdigit()
        or len(number) < 11
        or len(number) > 15
    ):
        return ""

    return number


# ============================================================
# USER DISPLAY NAME
# ============================================================

def get_user_name(
    user,
):

    return (
        user.get_full_name().strip()
        or user.first_name
        or "A FoodKindl member"
    )


# ============================================================
# LOCATION LINK
# ============================================================

def build_location_url(
    sos_event,
):

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

    return "Location was unavailable."


# ============================================================
# BUILD SMS MESSAGE
# ============================================================

def build_sos_message(
    *,
    user,
    sos_event,
):

    user_name = get_user_name(
        user
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

    api_key = getattr(
        settings,
        "FAST2SMS_API_KEY",
        "",
    )

    if not api_key:
        return {
            "success": False,
            "error":
                "FAST2SMS_API_KEY is not configured.",
        }

    number = (
        normalize_indian_number(
            phone_number
        )
    )

    if not number:
        return {
            "success": False,
            "error":
                "Invalid Indian phone number.",
        }

    headers = {
        "Authorization": api_key,
        "Accept": "application/json",
    }

    # Fast2SMS Quick SMS is documented as GET /dev/bulkV2
    # with route/message/numbers as query parameters.
    params = {
        "route": "q",
        "message": message,
        "numbers": number,
        "sms_details": "1",
    }

    try:
        response = requests.get(
            FAST2SMS_URL,
            headers=headers,
            params=params,
            timeout=15,
        )

        try:
            response_data = (
                response.json()
            )
        except ValueError:
            response_data = {
                "raw": response.text
            }

        if (
            response.ok
            and response_data.get(
                "return"
            ) is not False
        ):
            return {
                "success": True,
                "number": number,
            }

        logger.error(
            "Fast2SMS rejected SOS. "
            "status=%s response=%s",
            response.status_code,
            response_data,
        )

        return {
                            "success": False,
                            "number": number,
                            "status_code":
                                response.status_code,
                            "error":
                                response_data,
                            "provider_response":
                                response_data,
                        }

    except requests.RequestException as exc:
        logger.exception(
            "Fast2SMS request failed."
        )

        return {
            "success": False,
            "number": number,
            "error": str(exc),
        }


# ============================================================
# SEND WHATSAPP TEMPLATE THROUGH META CLOUD API
# ============================================================

def send_whatsapp_sos(
    *,
    phone_number,
    user,
    sos_event,
):

    access_token = getattr(
        settings,
        "WHATSAPP_ACCESS_TOKEN",
        "",
    )

    phone_number_id = getattr(
        settings,
        "WHATSAPP_PHONE_NUMBER_ID",
        "",
    )

    template_name = getattr(
        settings,
        "WHATSAPP_TEMPLATE_NAME",
        "foodkindl_sos_alert",
    )

    template_language = getattr(
        settings,
        "WHATSAPP_TEMPLATE_LANGUAGE",
        "en",
    )

    api_version = getattr(
        settings,
        "WHATSAPP_API_VERSION",
        "v23.0",
    )

    if (
        not access_token
        or not phone_number_id
    ):
        return {
            "success": False,
            "error":
                "WhatsApp Cloud API is not configured.",
        }

    number = (
        normalize_whatsapp_number(
            phone_number
        )
    )

    if not number:
        return {
            "success": False,
            "error":
                "Invalid WhatsApp phone number.",
        }

    user_name = get_user_name(
        user
    )

    location_url = (
        build_location_url(
            sos_event
        )
    )

    url = (
        f"https://graph.facebook.com/"
        f"{api_version}/"
        f"{phone_number_id}/messages"
    )

    headers = {
        "Authorization":
            f"Bearer {access_token}",
        "Content-Type":
            "application/json",
    }

    # IMPORTANT: the number of body parameters must match the
    # approved WhatsApp template exactly. Your template screenshot
    # visibly contains {{1}}. Set this to 2 only if the template also
    # contains {{2}} for the location URL.
    parameter_count = getattr(
        settings,
        "WHATSAPP_TEMPLATE_BODY_PARAMETER_COUNT",
        1,
    )

    try:
        parameter_count = int(parameter_count)
    except (TypeError, ValueError):
        parameter_count = 1

    body_parameters = [
        {
            "type": "text",
            "text": user_name,
        },
    ]

    if parameter_count >= 2:
        body_parameters.append({
            "type": "text",
            "text": location_url,
        })

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": number,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {
                "code": template_language,
            },
            "components": [
                {
                    "type": "body",
                    "parameters": body_parameters,
                },
            ],
        },
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=12,
        )

        try:
            response_data = (
                response.json()
            )
        except ValueError:
            response_data = {
                "raw": response.text
            }

        if (
            response.ok
            and response_data.get(
                "messages"
            )
        ):
            message_id = (
                response_data["messages"][0]
                .get("id")
            )

            return {
                "success": True,
                "number": number,
                "message_id": message_id,
            }

        logger.error(
            "WhatsApp rejected SOS. "
            "status=%s response=%s",
            response.status_code,
            response_data,
        )

        error_obj = (
            response_data.get("error", {})
            if isinstance(response_data, dict)
            else {}
        )

        return {
            "success": False,
            "number": number,
            "status_code": response.status_code,
            "error_code": error_obj.get("code"),
            "error": (
                error_obj.get("message")
                or response_data
            ),
            "provider_response": response_data,
        }

    except requests.RequestException as exc:
        logger.exception(
            "WhatsApp SOS request failed."
        )

        return {
            "success": False,
            "number": number,
            "error": str(exc),
        }


# ============================================================
# SEND BOTH SMS AND WHATSAPP
# ============================================================

def send_sos_to_contacts(
    *,
    user,
    sos_event,
    contacts,
):

    sms_message = (
        build_sos_message(
            user=user,
            sos_event=sos_event,
        )
    )

    sms_results = []
    whatsapp_results = []

    for contact in contacts:

        sms_result = (
            send_fast2sms(
                phone_number=
                    contact.phone_number,

                message=
                    sms_message,
            )
        )

        sms_results.append({
            "contact_id":
                contact.id,

            "contact_name":
                contact.name,

            **sms_result,
        })

        whatsapp_result = (
            send_whatsapp_sos(
                phone_number=
                    contact.phone_number,

                user=
                    user,

                sos_event=
                    sos_event,
            )
        )

        whatsapp_results.append({
            "contact_id":
                contact.id,

            "contact_name":
                contact.name,

            **whatsapp_result,
        })

    return {
        "sms_results":
            sms_results,

        "whatsapp_results":
            whatsapp_results,
    }
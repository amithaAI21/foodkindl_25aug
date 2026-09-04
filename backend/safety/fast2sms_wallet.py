import logging

import requests

from django.conf import settings


logger = logging.getLogger(
    __name__
)


FAST2SMS_WALLET_URL = (
    "https://www.fast2sms.com/dev/wallet"
)


def get_fast2sms_balance():

    api_key = getattr(
        settings,
        "FAST2SMS_API_KEY",
        "",
    )

    if not api_key:

        return {
            "success": False,
            "balance": None,
            "error":
                "FAST2SMS_API_KEY is not configured.",
        }


    headers = {
        "Authorization":
            api_key,

        "Accept":
            "application/json",
    }


    try:

        response = requests.post(
            FAST2SMS_WALLET_URL,
            headers=headers,
            timeout=15,
        )


        try:

            data = response.json()

        except ValueError:

            data = {
                "raw":
                    response.text[:1000]
            }


        if not response.ok:

            logger.error(
                "Fast2SMS wallet API failed. "
                "status=%s response=%s",
                response.status_code,
                data,
            )

            return {
                "success": False,
                "balance": None,
                "error": data,
            }


        # Fast2SMS responses may expose
        # wallet balance using different keys.
        raw_balance = (
            data.get("wallet")
            or data.get("balance")
            or data.get("wallet_balance")
        )


        try:

            balance = float(
                raw_balance
            )

        except (
            TypeError,
            ValueError,
        ):

            return {
                "success": False,
                "balance": None,
                "error":
                    (
                        "Fast2SMS returned an "
                        "unexpected wallet response."
                    ),
                "provider_response":
                    data,
            }


        return {
            "success": True,
            "balance": balance,
            "provider_response":
                data,
        }


    except requests.RequestException as exc:

        logger.exception(
            "Unable to check "
            "Fast2SMS wallet."
        )

        return {
            "success": False,
            "balance": None,
            "error":
                str(exc),
        }
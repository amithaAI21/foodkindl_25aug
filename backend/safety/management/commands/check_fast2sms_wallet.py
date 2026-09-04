from django.core.management.base import (
    BaseCommand,
)

from safety.wallet_alerts import (
    check_fast2sms_wallet,
)


class Command(
    BaseCommand
):

    help = (
        "Check Fast2SMS wallet balance "
        "and notify FoodKindl admin."
    )


    def handle(
        self,
        *args,
        **options,
    ):

        self.stdout.write(
            "Checking Fast2SMS wallet..."
        )


        try:

            result = (
                check_fast2sms_wallet()
            )

        except Exception as exc:

            self.stderr.write(
                self.style.ERROR(
                    (
                        "Fast2SMS wallet checker "
                        f"crashed: {exc}"
                    )
                )
            )

            return


        # ====================================================
        # SHOW RAW RESULT
        # ====================================================

        self.stdout.write(
            f"Wallet checker result: {result}"
        )


        # ====================================================
        # CHECK FAILURE
        # ====================================================

        if not result.get(
            "success"
        ):

            error_message = (
                result.get(
                    "detail"
                )
                or result.get(
                    "error"
                )
                or "Unknown wallet check error."
            )

            self.stderr.write(
                self.style.ERROR(
                    str(
                        error_message
                    )
                )
            )

            return


        # ====================================================
        # BALANCE
        # ====================================================

        balance = (
            result.get(
                "balance"
            )
        )


        self.stdout.write(
            self.style.SUCCESS(
                (
                    "Fast2SMS wallet "
                    f"balance: ₹{balance}"
                )
            )
        )


        # ====================================================
        # ALERT CREATED
        # ====================================================

        if result.get(
            "alert_created"
        ):

            level = (
                result.get(
                    "level"
                )
                or "unknown"
            )

            alert_id = (
                result.get(
                    "alert_id"
                )
            )

            self.stdout.write(
                self.style.WARNING(
                    (
                        "Admin low balance "
                        "alert created. "
                        f"Level: {level}. "
                        f"Alert ID: {alert_id}"
                    )
                )
            )


            if result.get(
                "email_sent"
            ):

                self.stdout.write(
                    self.style.SUCCESS(
                        "Admin email sent."
                    )
                )

            else:

                self.stdout.write(
                    self.style.WARNING(
                        (
                            "Admin alert was created, "
                            "but email was not sent."
                        )
                    )
                )


        # ====================================================
        # NO NEW ALERT
        # ====================================================

        else:

            detail = (
                result.get(
                    "detail"
                )
                or
                "No new alert was required."
            )

            self.stdout.write(
                self.style.WARNING(
                    (
                        "No new admin alert created. "
                        f"Reason: {detail}"
                    )
                )
            )
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

        result = (
            check_fast2sms_wallet()
        )


        if not result.get(
            "success"
        ):

            self.stderr.write(
                self.style.ERROR(
                    str(
                        result.get(
                            "detail"
                        )
                    )
                )
            )

            return


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


        if result.get(
            "alert_created"
        ):

            self.stdout.write(
                self.style.WARNING(
                    "Admin low balance "
                    "alert created."
                )
            )
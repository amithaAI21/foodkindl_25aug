import uuid

from django.conf import settings
from django.db import models


class GroceryPartner(models.Model):
    """
    Stores grocery partners such as:

    - Blinkit
    - Swiggy Instamart
    - Amazon
    """

    name = models.CharField(
        max_length=100
    )

    slug = models.SlugField(
        unique=True
    )

    base_url = models.URLField()

    affiliate_id = models.CharField(
        max_length=255,
        blank=True
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name


class GroceryPartnerClick(models.Model):
    """
    One record is created every time a FoodKindl
    user clicks a grocery partner.

    Example:

    FK-BLINKIT-7F39A2BC91
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="grocery_partner_clicks",
    )

    partner = models.ForeignKey(
        GroceryPartner,
        on_delete=models.CASCADE,
        related_name="clicks",
    )

    tracking_code = models.CharField(
        max_length=100,
        unique=True,
        blank=True,
        editable=False,
    )

    recipe_title = models.CharField(
        max_length=255,
        blank=True
    )

    grocery_items = models.JSONField(
        default=list,
        blank=True
    )

    clicked_at = models.DateTimeField(
        auto_now_add=True
    )

    converted = models.BooleanField(
        default=False
    )

    partner_order_id = models.CharField(
        max_length=255,
        blank=True
    )

    order_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )

    commission_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )

    conversion_recorded_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def generate_tracking_code(self):
        """
        Example:

        FK-BLINKIT-7F39A2BC91
        """

        unique_part = (
            uuid.uuid4()
            .hex[:10]
            .upper()
        )

        partner_name = (
            self.partner.slug
            .upper()
            .replace("-", "")
        )

        return (
            f"FK-"
            f"{partner_name}-"
            f"{unique_part}"
        )

    def save(
        self,
        *args,
        **kwargs
    ):

        if not self.tracking_code:
            self.tracking_code = (
                self.generate_tracking_code()
            )

        super().save(
            *args,
            **kwargs
        )

    def __str__(self):
        return (
            f"{self.partner.name} - "
            f"{self.tracking_code}"
        )
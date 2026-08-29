from rest_framework import serializers

from .models import (
    GroceryPartner,
    GroceryPartnerClick,
)


class GroceryPartnerSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = GroceryPartner

        fields = [
            "id",
            "name",
            "slug",
            "base_url",
            "is_active",
        ]


class GroceryPartnerClickSerializer(
    serializers.ModelSerializer
):

    partner_name = serializers.CharField(
        source="partner.name",
        read_only=True
    )

    partner_slug = serializers.CharField(
        source="partner.slug",
        read_only=True
    )

    class Meta:
        model = GroceryPartnerClick

        fields = [
            "id",
            "tracking_code",
            "partner_name",
            "partner_slug",
            "recipe_title",
            "grocery_items",
            "clicked_at",
            "converted",
            "partner_order_id",
            "order_value",
            "commission_amount",
            "conversion_recorded_at",
        ]
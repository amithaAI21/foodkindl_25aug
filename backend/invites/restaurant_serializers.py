
from rest_framework import serializers

from .models import Restaurant


class RestaurantPartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant

        fields = [
            "id",
            "name",
            "restaurant_type",
            "description",
            "cuisine",
            "phone_number",
            "email",
            "website",
            "address",
            "locality",
            "city",
            "pincode",
            "latitude",
            "longitude",
            "rating",
            "price_range",
            "average_cost_for_two",
            "opening_time",
            "closing_time",
            "seating_capacity",
            "has_parking",
            "has_wifi",
            "accepts_cards",
            "family_friendly",
            "outdoor_seating",
            "wheelchair_accessible",
            "serves_vegetarian",
            "serves_non_vegetarian",
            "image_url",
            "is_foodkindl_partner",
            "accepts_foodkindl_booking",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "latitude",
            "longitude",
            "rating",
            "is_foodkindl_partner",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Restaurant name is required."
            )

        return value

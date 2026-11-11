from rest_framework import serializers

from .models import Restaurant, RestaurantImage


class PartnerRestaurantImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantImage
        fields = (
            "id",
            "image_url",
            "caption",
            "sort_order",
        )
        read_only_fields = fields


class RestaurantPartnerSerializer(serializers.ModelSerializer):
    images = serializers.SerializerMethodField()

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
            "images",
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
            "image_url",
            "images",
            "is_foodkindl_partner",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_images(self, restaurant):
        return PartnerRestaurantImageSerializer(
            restaurant.images.filter(is_active=True).order_by(
                "sort_order",
                "id",
            ),
            many=True,
            context=self.context,
        ).data

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Restaurant name is required."
            )

        return value
from rest_framework import serializers

from .models import (
    Restaurant,
    RestaurantImage,
    RestaurantMenuItem,
)


# ============================================================
# RESTAURANT IMAGE
# ============================================================

class PartnerRestaurantImageSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = RestaurantImage

        fields = (
            "id",

            "image_url",
            "image_blob_key",
            "image_original_name",
            "image_content_type",

            "caption",
            "sort_order",
            "is_active",

            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",

            "image_url",
            "image_blob_key",
            "image_original_name",
            "image_content_type",

            "created_at",
            "updated_at",
        )


# ============================================================
# MENU ITEM
# ============================================================

class PartnerMenuItemSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = RestaurantMenuItem

        fields = (
            "id",

            "name",
            "description",

            "category",
            "food_type",

            "price",

            "image_url",
            "image_blob_key",
            "image_original_name",
            "image_content_type",

            "is_popular",
            "is_available",

            "sort_order",

            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",

            "image_url",
            "image_blob_key",
            "image_original_name",
            "image_content_type",

            "created_at",
            "updated_at",
        )


    # ========================================================
    # PRICE VALIDATION
    # ========================================================

    def validate_price(
        self,
        value,
    ):

        if value is None:

            raise serializers.ValidationError(
                "Price is required."
            )


        if value < 0:

            raise serializers.ValidationError(
                "Price cannot be negative."
            )


        return value


# ============================================================
# RESTAURANT
# ============================================================

class PartnerRestaurantSerializer(
    serializers.ModelSerializer
):

    images = (
        PartnerRestaurantImageSerializer(
            many=True,
            read_only=True,
        )
    )


    menu_items = (
        PartnerMenuItemSerializer(
            many=True,
            read_only=True,
        )
    )


    class Meta:

        model = Restaurant

        fields = (

            "id",

            # -----------------------------------------------
            # BASIC
            # -----------------------------------------------

            "name",
            "restaurant_type",
            "description",
            "cuisine",

            # -----------------------------------------------
            # CONTACT
            # -----------------------------------------------

            "phone_number",
            "email",
            "website",

            # -----------------------------------------------
            # LOCATION
            # -----------------------------------------------

            "address",
            "locality",
            "city",
            "pincode",

            "latitude",
            "longitude",

            # -----------------------------------------------
            # DETAILS
            # -----------------------------------------------

            "rating",

            "price_range",
            "average_cost_for_two",

            "opening_time",
            "closing_time",

            "seating_capacity",

            # -----------------------------------------------
            # FACILITIES
            # -----------------------------------------------

            "has_parking",
            "has_wifi",

            "accepts_cards",
            "family_friendly",

            "outdoor_seating",
            "wheelchair_accessible",

            "serves_vegetarian",
            "serves_non_vegetarian",

            # -----------------------------------------------
            # MAIN IMAGE
            # -----------------------------------------------

            "image_url",
            "image_blob_key",
            "image_original_name",
            "image_content_type",

            # -----------------------------------------------
            # FOODKINDL
            # -----------------------------------------------

            "is_foodkindl_partner",
            "accepts_foodkindl_booking",
            "is_active",

            # -----------------------------------------------
            # RELATED
            # -----------------------------------------------

            "images",
            "menu_items",

            # -----------------------------------------------
            # TIMESTAMPS
            # -----------------------------------------------

            "created_at",
            "updated_at",
        )


        read_only_fields = (

            "id",

            "latitude",
            "longitude",

            "image_url",
            "image_blob_key",
            "image_original_name",
            "image_content_type",

            "is_foodkindl_partner",

            "created_at",
            "updated_at",
        )
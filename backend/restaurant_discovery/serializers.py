from rest_framework import serializers

from invites.models import (
    Restaurant,
    RestaurantMenuItem,
)


class RestaurantMenuItemDiscoverySerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = RestaurantMenuItem

        fields = [
            "id",
            "name",
            "category",
            "food_type",
            "price",
            "is_popular",
            "is_available",
        ]


class RestaurantDiscoverySerializer(
    serializers.ModelSerializer
):

    menu_items = (
        RestaurantMenuItemDiscoverySerializer(
            many=True,
            read_only=True,
        )
    )


    recommendation_reason = (
        serializers.SerializerMethodField()
    )


    matched_dishes = (
        serializers.SerializerMethodField()
    )


    match_score = (
        serializers.SerializerMethodField()
    )


    class Meta:

        model = Restaurant

        fields = [

            "id",

            "name",

            "restaurant_type",

            "cuisine",

            "locality",

            "city",

            "latitude",

            "longitude",

            "rating",

            "average_cost_for_two",

            "is_foodkindl_partner",

            "accepts_foodkindl_booking",

            "is_active",

            "menu_items",

            "recommendation_reason",

            "matched_dishes",

            "match_score",
        ]


    def get_recommendation_reason(
        self,
        obj,
    ):

        return getattr(
            obj,
            "_recommendation_reason",
            "",
        )


    def get_matched_dishes(
        self,
        obj,
    ):

        return getattr(
            obj,
            "_matched_dishes",
            [],
        )


    def get_match_score(
        self,
        obj,
    ):

        return getattr(
            obj,
            "_match_score",
            0,
        )
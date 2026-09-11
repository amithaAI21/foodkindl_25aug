from rest_framework import serializers


class RestaurantDiscoverySerializer(
    serializers.Serializer
):
    id = serializers.CharField()

    source = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    source_id = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    fsq_place_id = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    name = serializers.CharField()

    restaurant_type = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    primary_type = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    primary_type_label = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    types = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    categories = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )

    main_cuisine = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    cuisine = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    cuisines = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    locality = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    city = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    latitude = serializers.FloatField()

    longitude = serializers.FloatField()

    distance_from_search_km = serializers.FloatField(
        required=False,
        allow_null=True,
    )

    distance_from_route_km = serializers.FloatField(
        required=False,
        allow_null=True,
    )

    route_position = serializers.FloatField(
        required=False,
        allow_null=True,
    )

    rating = serializers.FloatField(
        required=False,
        allow_null=True,
    )

    review_count = serializers.IntegerField(
        required=False,
        allow_null=True,
    )

    average_cost_for_two = serializers.FloatField(
        required=False,
        allow_null=True,
    )

    price_level = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    opening_hours = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    website = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    address = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    photo_url = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    image = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    photo = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    image_url = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    photos = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    is_foodkindl_partner = serializers.BooleanField(
        required=False,
        default=False,
    )

    accepts_foodkindl_booking = serializers.BooleanField(
        required=False,
        default=False,
    )

    is_active = serializers.BooleanField(
        required=False,
        default=True,
    )

    menu_items = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )

    recommendation_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    matched_dishes = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    popular_dishes = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    match_score = serializers.FloatField(
        required=False,
        default=0,
    )

    matches_preference = serializers.BooleanField(
        required=False,
        default=False,
    )

    matched_fields = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    preference_match_strength = serializers.IntegerField(
        required=False,
        default=0,
    )

    vegetarian = serializers.BooleanField(
        required=False,
        default=False,
    )

    vegan = serializers.BooleanField(
        required=False,
        default=False,
    )

    halal = serializers.BooleanField(
        required=False,
        default=False,
    )

    osm_tags = serializers.DictField(
        required=False,
        default=dict,
    )

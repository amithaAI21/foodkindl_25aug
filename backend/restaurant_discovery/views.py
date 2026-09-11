import requests

from rest_framework.permissions import (
    IsAuthenticated,
)

from rest_framework.response import (
    Response,
)

from rest_framework.views import (
    APIView,
)

from rest_framework import status

from .serializers import (
    RestaurantDiscoverySerializer,
)

from .services import (
    discover_nearby_restaurants,
    discover_restaurants,
    discover_restaurants_along_route,
)

def parse_float(
    value,
    *,
    name,
    required=False,
):
    if value in (
        None,
        "",
    ):
        if required:
            raise ValueError(
                f"{name} is required."
            )

        return None

    try:
        return float(
            value
        )

    except (
        TypeError,
        ValueError,
    ):
        raise ValueError(
            f"{name} must be a valid number."
        )


def parse_bool(
    value,
):
    return str(
        value or ""
    ).strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


class RestaurantRecommendationView(
    APIView
):

    permission_classes = [
        IsAuthenticated,
    ]

    def get(
        self,
        request,
    ):
        try:
            latitude = parse_float(
                request.query_params.get(
                    "latitude"
                ),
                name="latitude",
                required=True,
            )

            longitude = parse_float(
                request.query_params.get(
                    "longitude"
                ),
                name="longitude",
                required=True,
            )

            radius_km = parse_float(
                request.query_params.get(
                    "radius_km",
                    4,
                ),
                name="radius_km",
                required=False,
            ) or 4

        except ValueError as exc:
            return Response(
                {
                    "detail":
                        str(exc),
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        search_query = (
            request.query_params
            .get(
                "query",
                "",
            )
            .strip()
        )

        cuisine = (
            request.query_params
            .get(
                "cuisine",
                "",
            )
            .strip()
        )

        restaurant_type = (
            request.query_params
            .get(
                "type",
                "",
            )
            .strip()
        )

        dietary_preference = (
            request.query_params
            .get(
                "dietary_preference",
                "",
            )
            .strip()
        )

        try:
            limit = int(
                request.query_params.get(
                    "limit",
                    40,
                )
            )

        except (
            TypeError,
            ValueError,
        ):
            limit = 40

        limit = max(
            1,
            min(
                limit,
                100,
            ),
        )

        try:
            result = (
                discover_nearby_restaurants(
                    latitude=
                        latitude,

                    longitude=
                        longitude,

                    food_query=
                        search_query,

                    cuisine=
                        cuisine,

                    restaurant_type=
                        restaurant_type,

                    dietary_preference=
                        dietary_preference,

                    radius_km=
                        radius_km,

                    limit=
                        limit,
                )
            )

        except requests.exceptions.RequestException as exc:
            print(
                "DINE OUT FOURSQUARE ERROR:",
                repr(exc),
            )

            return Response(
                {
                    "detail":
                        "Foursquare restaurant discovery is temporarily unavailable.",

                    "technical_detail":
                        str(exc),
                },
                status=
                    status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception as exc:
            print(
                "DINE OUT UNEXPECTED ERROR:",
                repr(exc),
            )

            return Response(
                {
                    "detail":
                        "Restaurant discovery failed.",

                    "technical_detail":
                        str(exc),
                },
                status=
                    status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = (
            RestaurantDiscoverySerializer(
                result[
                    "restaurants"
                ],
                many=True,
            )
        )

        return Response(
            {
                "center":
                    result[
                        "center"
                    ],

                "radius_km":
                    result[
                        "radius_km"
                    ],

                "provider":
                    result.get(
                        "provider",
                        "foursquare",
                    ),

                "details_enriched_count":
                    result.get(
                        "details_enriched_count",
                        0,
                    ),

                "photos_per_place":
                    result.get(
                        "photos_per_place",
                        0,
                    ),

                "count":
                    len(
                        serializer.data
                    ),

                "results":
                    serializer.data,
            }
        )


class FoodWalkRecommendationView(
    APIView
):
    """
    Route-based Food Walk discovery using OpenStreetMap / Overpass.

    IMPORTANT:
    The frontend should send coordinates selected by autocomplete.
    We deliberately do NOT geocode free-text place names here.

    Example:
    /api/restaurants/food-walk/
        ?start_lat=13.045
        &start_lng=77.512
        &destination_lat=12.9698
        &destination_lng=77.7500
        &travel_mode=car
        &food_query=dosa
        &max_detour_km=3
        &limit=30
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(
        self,
        request,
    ):
        try:
            start_lat = parse_float(
                request.query_params.get(
                    "start_lat"
                ),
                name=
                    "start_lat",
                required=
                    True,
            )

            start_lng = parse_float(
                request.query_params.get(
                    "start_lng"
                ),
                name=
                    "start_lng",
                required=
                    True,
            )

            destination_lat = (
                parse_float(
                    request.query_params.get(
                        "destination_lat"
                    ),
                    name=
                        "destination_lat",
                    required=
                        True,
                )
            )

            destination_lng = (
                parse_float(
                    request.query_params.get(
                        "destination_lng"
                    ),
                    name=
                        "destination_lng",
                    required=
                        True,
                )
            )

            max_detour_km = (
                parse_float(
                    request.query_params.get(
                        "max_detour_km",
                        3,
                    ),
                    name=
                        "max_detour_km",
                    required=
                        False,
                )
                or
                3
            )

        except ValueError as exc:
            return Response(
                {
                    "detail":
                        str(
                            exc
                        ),
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        travel_mode = (
            request.query_params
            .get(
                "travel_mode",
                "car",
            )
            .strip()
        )

        food_query = (
            request.query_params
            .get(
                "food_query",
                request.query_params.get(
                    "query",
                    "",
                ),
            )
            .strip()
        )

        cuisine = (
            request.query_params
            .get(
                "cuisine",
                "",
            )
            .strip()
        )

        restaurant_type = (
            request.query_params
            .get(
                "type",
                "",
            )
            .strip()
        )

        highly_rated = parse_bool(
            request.query_params.get(
                "highly_rated"
            )
        )

        hidden_gems = parse_bool(
            request.query_params.get(
                "hidden_gems"
            )
        )

        try:
            limit = int(
                request.query_params.get(
                    "limit",
                    30,
                )
            )

        except (
            TypeError,
            ValueError,
        ):
            limit = 30

        # Food Walk should return at least 20 when enough OSM places exist.
        limit = max(
            20,
            min(
                limit,
                50,
            ),
        )

        try:
            result = (
                discover_restaurants_along_route(
                    start_lat=
                        start_lat,
                    start_lng=
                        start_lng,
                    destination_lat=
                        destination_lat,
                    destination_lng=
                        destination_lng,
                    travel_mode=
                        travel_mode,
                    food_query=
                        food_query,
                    cuisine=
                        cuisine,
                    restaurant_type=
                        restaurant_type,
                    max_detour_km=
                        max_detour_km,
                    highly_rated=
                        highly_rated,
                    hidden_gems=
                        hidden_gems,
                    limit=
                        limit,
                )
            )

        except requests.exceptions.RequestException as exc:
            return Response(
                {
                    "detail":
                        "OpenStreetMap routing/place service is temporarily unavailable.",
                    "technical_detail":
                        str(
                            exc
                        ),
                },
                status=
                    status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except ValueError as exc:
            return Response(
                {
                    "detail":
                        str(
                            exc
                        ),
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )

        serializer = (
            RestaurantDiscoverySerializer(
                result[
                    "restaurants"
                ],
                many=True,
            )
        )

        return Response(
            {
                "start": {
                    "latitude":
                        start_lat,
                    "longitude":
                        start_lng,
                },
                "destination": {
                    "latitude":
                        destination_lat,
                    "longitude":
                        destination_lng,
                },
                "travel_mode":
                    travel_mode,
                "food_query":
                    food_query,
                "route_distance_km":
                    result[
                        "route_distance_km"
                    ],
                "route_duration_minutes":
                    result[
                        "route_duration_minutes"
                    ],
                "candidate_count":
                    result[
                        "candidate_count"
                    ],
                "restaurant_count":
                    len(
                        serializer.data
                    ),
                "restaurants":
                    serializer.data,
            }
        )

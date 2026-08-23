import math

from django.core.exceptions import (
    ValidationError as DjangoValidationError,
)

from django.db import transaction

from django.db.models import (
    Case,
    IntegerField,
    Q,
    Value,
    When,
)

from django.utils import timezone


from rest_framework import (
    generics,
    permissions,
    status,
)

from rest_framework.exceptions import (
    ValidationError as DRFValidationError,
)

from rest_framework.parsers import (
    FormParser,
    JSONParser,
)

from rest_framework.response import Response

from rest_framework.views import APIView


from .geocoding import (
    geocode_place,
    geocode_restaurant,
)


from .models import (
    FoodInvite,
    FoodInviteParticipant,
    InviteStatus,
    ParticipantStatus,
    Restaurant,
    RestaurantBooking,
)


from .serializers import (
    FoodInviteSerializer,
    RestaurantBookingSerializer,
    RestaurantSerializer,
)


# ============================================================
# FOOD INVITE LIST + CREATE
# ============================================================

class FoodInviteListCreateView(
    generics.ListCreateAPIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = (
        FoodInviteSerializer
    )


    def get_queryset(
        self,
    ):

        user_id = (
            self.request.user.id
        )


        queryset = (

            FoodInvite.objects

            .filter(

                Q(
                    creator_user_id=
                        user_id
                )

                |

                Q(
                    participants__user_id=
                        user_id
                )
            )

            .distinct()

            .prefetch_related(
                "participants"
            )

            .order_by(
                "start_at"
            )
        )


        # ====================================================
        # FILTER BY TYPE
        # ====================================================

        filter_type = (
            self.request
            .query_params
            .get(
                "type",
                "",
            )
            .strip()
        )


        if filter_type:

            queryset = (
                queryset.filter(
                    invite_type=
                        filter_type
                )
            )


        # ====================================================
        # FILTER BY STATUS
        # ====================================================

        filter_status = (
            self.request
            .query_params
            .get(
                "status",
                "",
            )
            .strip()
        )


        if filter_status:

            queryset = (
                queryset.filter(
                    status=
                        filter_status
                )
            )


        return queryset


# ============================================================
# FOOD INVITE DETAIL
# ============================================================

class FoodInviteDetailView(
    generics.RetrieveAPIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = (
        FoodInviteSerializer
    )

    lookup_field = (
        "id"
    )


    def get_queryset(
        self,
    ):

        user_id = (
            self.request.user.id
        )


        return (

            FoodInvite.objects

            .filter(

                Q(
                    creator_user_id=
                        user_id
                )

                |

                Q(
                    participants__user_id=
                        user_id
                )
            )

            .distinct()

            .prefetch_related(
                "participants"
            )
        )


# ============================================================
# FOOD INVITE ACCEPT / DECLINE
# ============================================================

class FoodInviteRespondView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    @transaction.atomic
    def post(
        self,
        request,
        invite_id,
    ):

        response_value = (
            request.data.get(
                "response"
            )
        )


        if (
            response_value
            not in
            (
                ParticipantStatus.ACCEPTED,
                ParticipantStatus.DECLINED,
            )
        ):

            return Response(
                {
                    "detail":
                        (
                            "Response must be "
                            "'accepted' or 'declined'."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        try:

            participant = (

                FoodInviteParticipant.objects

                .select_for_update()

                .get(
                    invite_id=
                        invite_id,

                    user_id=
                        request.user.id,
                )
            )


        except FoodInviteParticipant.DoesNotExist:

            return Response(
                {
                    "detail":
                        (
                            "You are not invited "
                            "to this Food Invite."
                        )
                },

                status=
                    status.HTTP_404_NOT_FOUND,
            )


        try:

            invite = (

                FoodInvite.objects

                .select_for_update()

                .get(
                    id=
                        participant.invite_id
                )
            )


        except FoodInvite.DoesNotExist:

            return Response(
                {
                    "detail":
                        "Food Invite not found."
                },

                status=
                    status.HTTP_404_NOT_FOUND,
            )


        if (
            invite.status ==
            InviteStatus.CANCELLED
        ):

            return Response(
                {
                    "detail":
                        (
                            "This Food Invite "
                            "has been cancelled."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        if (
            invite.status ==
            InviteStatus.COMPLETED
        ):

            return Response(
                {
                    "detail":
                        (
                            "This Food Invite "
                            "has already been completed."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        participant.status = (
            response_value
        )


        participant.responded_at = (
            timezone.now()
        )


        participant.save(
            update_fields=(
                "status",
                "responded_at",
            )
        )


        accepted_count = (

            FoodInviteParticipant.objects

            .filter(
                invite=
                    invite,

                status=
                    ParticipantStatus.ACCEPTED,
            )

            .count()
        )


        pending_count = (

            FoodInviteParticipant.objects

            .filter(
                invite=
                    invite,

                status=
                    ParticipantStatus.INVITED,
            )

            .count()
        )


        if accepted_count > 0:

            invite.status = (
                InviteStatus.CONFIRMED
            )


        elif pending_count > 0:

            invite.status = (
                InviteStatus.OPEN
            )


        else:

            invite.status = (
                InviteStatus.OPEN
            )


        invite.save(
            update_fields=(
                "status",
                "updated_at",
            )
        )


        serializer = (
            FoodInviteSerializer(
                invite,
                context={
                    "request":
                        request
                },
            )
        )


        return Response(
            {
                "detail":
                    (
                        "Food Invite accepted."
                        if response_value ==
                        ParticipantStatus.ACCEPTED
                        else
                        "Food Invite declined."
                    ),

                "response":
                    response_value,

                "invite":
                    serializer.data,
            },

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# FOOD INVITE CANCEL
# ============================================================

class FoodInviteCancelView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    @transaction.atomic
    def post(
        self,
        request,
        invite_id,
    ):

        try:

            invite = (

                FoodInvite.objects

                .select_for_update()

                .get(
                    id=
                        invite_id,

                    creator_user_id=
                        request.user.id,
                )
            )


        except FoodInvite.DoesNotExist:

            return Response(
                {
                    "detail":
                        (
                            "Food Invite not found "
                            "or you are not the creator."
                        )
                },

                status=
                    status.HTTP_404_NOT_FOUND,
            )


        if (
            invite.status ==
            InviteStatus.CANCELLED
        ):

            return Response(
                {
                    "detail":
                        (
                            "Food Invite is "
                            "already cancelled."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        if (
            invite.status ==
            InviteStatus.COMPLETED
        ):

            return Response(
                {
                    "detail":
                        (
                            "Completed Food Invites "
                            "cannot be cancelled."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        invite.status = (
            InviteStatus.CANCELLED
        )


        invite.save(
            update_fields=(
                "status",
                "updated_at",
            )
        )


        serializer = (
            FoodInviteSerializer(
                invite,
                context={
                    "request":
                        request
                },
            )
        )


        return Response(
            {
                "detail":
                    "Food Invite cancelled.",

                "invite":
                    serializer.data,
            },

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# FOOD INVITE COMPLETE
# ============================================================

class FoodInviteCompleteView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    @transaction.atomic
    def post(
        self,
        request,
        invite_id,
    ):

        try:

            invite = (

                FoodInvite.objects

                .select_for_update()

                .get(
                    id=
                        invite_id,

                    creator_user_id=
                        request.user.id,
                )
            )


        except FoodInvite.DoesNotExist:

            return Response(
                {
                    "detail":
                        (
                            "Food Invite not found "
                            "or you are not the creator."
                        )
                },

                status=
                    status.HTTP_404_NOT_FOUND,
            )


        if (
            invite.status ==
            InviteStatus.CANCELLED
        ):

            return Response(
                {
                    "detail":
                        (
                            "Cancelled Food Invites "
                            "cannot be completed."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        if (
            invite.status ==
            InviteStatus.COMPLETED
        ):

            return Response(
                {
                    "detail":
                        (
                            "Food Invite is "
                            "already completed."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        invite.status = (
            InviteStatus.COMPLETED
        )


        invite.save(
            update_fields=(
                "status",
                "updated_at",
            )
        )


        serializer = (
            FoodInviteSerializer(
                invite,
                context={
                    "request":
                        request
                },
            )
        )


        return Response(
            {
                "detail":
                    (
                        "Food Invite marked "
                        "as completed."
                    ),

                "invite":
                    serializer.data,
            },

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# RESTAURANT GEOLOCATION MIXIN
# ============================================================

class RestaurantGeocodeMixin:

    LOCATION_FIELDS = (
        "name",
        "address",
        "locality",
        "city",
        "pincode",
    )


    def location_data_changed(
        self,
    ):

        return any(
            field
            in self.request.data

            for field
            in self.LOCATION_FIELDS
        )


    def geocode_and_save(
        self,
        restaurant,
    ):

        try:

            coordinates = (
                geocode_restaurant(
                    restaurant
                )
            )


        except DjangoValidationError as exc:

            raise DRFValidationError(
                {
                    "location":
                        (
                            "FoodKindl could not determine "
                            "the restaurant coordinates. "
                            f"{exc}"
                        )
                }
            )


        restaurant.latitude = (
            coordinates[
                "latitude"
            ]
        )


        restaurant.longitude = (
            coordinates[
                "longitude"
            ]
        )


        restaurant.save(
            update_fields=(
                "latitude",
                "longitude",
                "updated_at",
            )
        )


        return coordinates


# ============================================================
# FOOD WALK GEO HELPERS
# ============================================================

EARTH_RADIUS_KM = (
    6371.0088
)


def _to_radians(
    value,
):

    return math.radians(
        float(
            value
        )
    )


# ============================================================
# DISTANCE BETWEEN TWO COORDINATES
# ============================================================

def _haversine_km(
    lat1,
    lon1,
    lat2,
    lon2,
):

    lat1 = (
        _to_radians(
            lat1
        )
    )

    lon1 = (
        _to_radians(
            lon1
        )
    )

    lat2 = (
        _to_radians(
            lat2
        )
    )

    lon2 = (
        _to_radians(
            lon2
        )
    )


    delta_lat = (
        lat2 -
        lat1
    )


    delta_lon = (
        lon2 -
        lon1
    )


    value = (

        math.sin(
            delta_lat / 2
        ) ** 2

        +

        math.cos(
            lat1
        )

        *

        math.cos(
            lat2
        )

        *

        math.sin(
            delta_lon / 2
        ) ** 2
    )


    value = min(
        1.0,
        value,
    )


    return (

        2

        *

        EARTH_RADIUS_KM

        *

        math.asin(
            math.sqrt(
                value
            )
        )
    )


# ============================================================
# PROJECT LAT/LON TO APPROX KM COORDINATES
# ============================================================

def _project_point(
    latitude,
    longitude,
    reference_latitude,
):

    latitude = float(
        latitude
    )

    longitude = float(
        longitude
    )


    reference_latitude = (
        math.radians(
            float(
                reference_latitude
            )
        )
    )


    x = (

        longitude

        *

        111.320

        *

        math.cos(
            reference_latitude
        )
    )


    y = (

        latitude

        *

        110.574
    )


    return (
        x,
        y,
    )


# ============================================================
# DISTANCE OF RESTAURANT FROM FOOD WALK ROUTE
#
# route_position:
#
# 0.0 = start
# 0.5 = middle
# 1.0 = destination
# ============================================================

def _distance_from_route(
    restaurant_lat,
    restaurant_lon,
    start_lat,
    start_lon,
    destination_lat,
    destination_lon,
):

    reference_latitude = (

        (
            float(
                start_lat
            )

            +

            float(
                destination_lat
            )
        )

        /

        2
    )


    start_x, start_y = (
        _project_point(
            start_lat,
            start_lon,
            reference_latitude,
        )
    )


    end_x, end_y = (
        _project_point(
            destination_lat,
            destination_lon,
            reference_latitude,
        )
    )


    point_x, point_y = (
        _project_point(
            restaurant_lat,
            restaurant_lon,
            reference_latitude,
        )
    )


    dx = (
        end_x -
        start_x
    )


    dy = (
        end_y -
        start_y
    )


    segment_length_squared = (
        dx * dx
        +
        dy * dy
    )


    if (
        segment_length_squared
        ==
        0
    ):

        distance = math.sqrt(

            (
                point_x -
                start_x
            ) ** 2

            +

            (
                point_y -
                start_y
            ) ** 2
        )


        return (
            distance,
            0.0,
        )


    route_position = (

        (
            (
                point_x -
                start_x
            )
            *
            dx
        )

        +

        (
            (
                point_y -
                start_y
            )
            *
            dy
        )

    ) / segment_length_squared


    route_position = max(
        0.0,
        min(
            1.0,
            route_position,
        ),
    )


    nearest_x = (
        start_x
        +
        route_position
        *
        dx
    )


    nearest_y = (
        start_y
        +
        route_position
        *
        dy
    )


    distance = math.sqrt(

        (
            point_x -
            nearest_x
        ) ** 2

        +

        (
            point_y -
            nearest_y
        ) ** 2
    )


    return (
        distance,
        route_position,
    )


# ============================================================
# FOOD WALK RECOMMENDATIONS
#
# Example:
#
# GET
#
# /restaurants/food-walk/
# ?start=Nagasandra
# &destination=Indiranagar
# &cuisine=Kerala
# &max_detour_km=2
# ============================================================

class FoodWalkRestaurantRecommendationView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    def get(
        self,
        request,
    ):

        # ====================================================
        # START
        # ====================================================

        start = (
            request.query_params
            .get(
                "start",
                "",
            )
            .strip()
        )


        # ====================================================
        # DESTINATION
        # ====================================================

        destination = (
            request.query_params
            .get(
                "destination",
                "",
            )
            .strip()
        )


        # ====================================================
        # CUISINE
        # ====================================================

        cuisine = (
            request.query_params
            .get(
                "cuisine",
                "",
            )
            .strip()
        )


        # ====================================================
        # DETOUR
        # ====================================================

        try:

            max_detour_km = float(

                request.query_params
                .get(
                    "max_detour_km",
                    2.0,
                )
            )


        except (
            ValueError,
            TypeError,
        ):

            max_detour_km = (
                2.0
            )


        # Minimum 300 metres
        # Maximum 5 km

        max_detour_km = max(
            0.3,
            min(
                max_detour_km,
                5.0,
            ),
        )


        # ====================================================
        # VALIDATION
        # ====================================================

        if not start:

            return Response(
                {
                    "detail":
                        (
                            "Starting point "
                            "is required."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        if not destination:

            return Response(
                {
                    "detail":
                        (
                            "Destination "
                            "is required."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        # ====================================================
        # GEOCODE START
        # ====================================================

        try:

            start_location = (
                geocode_place(
                    start
                )
            )


        except DjangoValidationError as exc:

            return Response(
                {
                    "detail":
                        (
                            "Could not locate "
                            f"starting point: {exc}"
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        # ====================================================
        # GEOCODE DESTINATION
        # ====================================================

        try:

            destination_location = (
                geocode_place(
                    destination
                )
            )


        except DjangoValidationError as exc:

            return Response(
                {
                    "detail":
                        (
                            "Could not locate "
                            f"destination: {exc}"
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        start_lat = (
            start_location[
                "latitude"
            ]
        )


        start_lon = (
            start_location[
                "longitude"
            ]
        )


        destination_lat = (
            destination_location[
                "latitude"
            ]
        )


        destination_lon = (
            destination_location[
                "longitude"
            ]
        )


        # ====================================================
        # DIRECT DISTANCE
        # ====================================================

        route_distance_km = (
            _haversine_km(

                start_lat,
                start_lon,

                destination_lat,
                destination_lon,
            )
        )


        # ====================================================
        # FOODKINDL PARTNER RESTAURANTS
        # ====================================================

        queryset = (

            Restaurant.objects

            .filter(
                is_active=True,

                is_foodkindl_partner=True,

                accepts_foodkindl_booking=True,

                latitude__isnull=False,

                longitude__isnull=False,
            )

            .prefetch_related(
                "images",
                "menu_items",
            )
        )


        restaurants = []


        # ====================================================
        # CHECK EACH RESTAURANT
        # ====================================================

        for restaurant in queryset:

            (
                distance_from_route,
                route_position,
            ) = (
                _distance_from_route(

                    restaurant.latitude,
                    restaurant.longitude,

                    start_lat,
                    start_lon,

                    destination_lat,
                    destination_lon,
                )
            )


            # =================================================
            # TOO FAR FROM ROUTE
            # =================================================

            if (
                distance_from_route
                >
                max_detour_km
            ):

                continue


            # =================================================
            # CUISINE MATCH
            # =================================================

            cuisine_match = (
                False
            )


            if cuisine:

                cuisine_match = (

                    cuisine.lower()

                    in

                    (
                        restaurant.cuisine
                        or ""
                    ).lower()
                )


            # =================================================
            # RECOMMENDATION SCORE
            # =================================================

            score = (
                0.0
            )


            # FoodKindl partner

            if (
                restaurant
                .is_foodkindl_partner
            ):

                score += (
                    40
                )


            # FoodKindl booking

            if (
                restaurant
                .accepts_foodkindl_booking
            ):

                score += (
                    20
                )


            # =================================================
            # ROUTE DISTANCE SCORE
            # =================================================

            if (
                distance_from_route
                <=
                0.5
            ):

                score += (
                    30
                )


            elif (
                distance_from_route
                <=
                1.0
            ):

                score += (
                    20
                )


            elif (
                distance_from_route
                <=
                2.0
            ):

                score += (
                    10
                )


            # =================================================
            # CUISINE SCORE
            # =================================================

            if cuisine_match:

                score += (
                    25
                )


            # =================================================
            # RATING SCORE
            # =================================================

            if restaurant.rating:

                try:

                    rating = float(
                        restaurant.rating
                    )


                    score += (
                        rating
                        *
                        3
                    )


                except (
                    ValueError,
                    TypeError,
                ):

                    pass


            # =================================================
            # STORE
            # =================================================

            restaurants.append(
                {
                    "restaurant":
                        restaurant,

                    "distance_from_route_km":
                        round(
                            distance_from_route,
                            2,
                        ),

                    "route_position":
                        round(
                            route_position,
                            4,
                        ),

                    "recommendation_score":
                        round(
                            score,
                            2,
                        ),

                    "cuisine_match":
                        cuisine_match,
                }
            )


        # ====================================================
        # ORDER BY POSITION ALONG ROUTE
        #
        # Example:
        #
        # Nagasandra
        # ↓
        # Rajajinagar
        # ↓
        # MG Road
        # ↓
        # Indiranagar
        # ====================================================

        restaurants.sort(
            key=lambda item: (

                item[
                    "route_position"
                ],

                -
                item[
                    "recommendation_score"
                ],
            )
        )


        # ====================================================
        # SERIALIZE
        # ====================================================

        output = []


        for item in restaurants[:20]:

            restaurant_data = (
                RestaurantSerializer(

                    item[
                        "restaurant"
                    ],

                    context={
                        "request":
                            request,
                    },
                )
                .data
            )


            restaurant_data[
                "distance_from_route_km"
            ] = (
                item[
                    "distance_from_route_km"
                ]
            )


            restaurant_data[
                "route_position"
            ] = (
                item[
                    "route_position"
                ]
            )


            restaurant_data[
                "recommendation_score"
            ] = (
                item[
                    "recommendation_score"
                ]
            )


            restaurant_data[
                "cuisine_match"
            ] = (
                item[
                    "cuisine_match"
                ]
            )


            output.append(
                restaurant_data
            )


        # ====================================================
        # ROUTE TYPE
        # ====================================================

        if route_distance_km <= 5:

            route_type = (
                "food_walk"
            )


        else:

            route_type = (
                "food_trail"
            )


        # ====================================================
        # RESPONSE
        # ====================================================

        return Response(
            {

                "start": {

                    "name":
                        start,

                    "latitude":
                        start_lat,

                    "longitude":
                        start_lon,

                    "matched_location":
                        start_location.get(
                            "display_name",
                            "",
                        ),
                },


                "destination": {

                    "name":
                        destination,

                    "latitude":
                        destination_lat,

                    "longitude":
                        destination_lon,

                    "matched_location":
                        destination_location.get(
                            "display_name",
                            "",
                        ),
                },


                "route_type":
                    route_type,


                "route_distance_km":
                    round(
                        route_distance_km,
                        2,
                    ),


                "max_detour_km":
                    max_detour_km,


                "restaurant_count":
                    len(
                        output
                    ),


                "restaurants":
                    output,
            },

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# RECOMMENDED FOODKINDL RESTAURANTS
# ============================================================

class RecommendedRestaurantListView(
    generics.ListAPIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = (
        RestaurantSerializer
    )


    def get_queryset(
        self,
    ):

        locality = (
            self.request
            .query_params
            .get(
                "locality",
                "",
            )
            .strip()
        )


        cuisine = (
            self.request
            .query_params
            .get(
                "cuisine",
                "",
            )
            .strip()
        )


        restaurant_type = (
            self.request
            .query_params
            .get(
                "type",
                "",
            )
            .strip()
        )


        queryset = (

            Restaurant.objects

            .filter(
                is_active=True,
                is_foodkindl_partner=True,
                accepts_foodkindl_booking=True,
            )

            .prefetch_related(
                "images",
                "menu_items",
            )
        )


        if (
            restaurant_type
            in
            (
                "restaurant",
                "cafe",
            )
        ):

            queryset = (
                queryset.filter(
                    restaurant_type=
                        restaurant_type
                )
            )


        if locality:

            queryset = (
                queryset.annotate(

                    locality_score=Case(

                        When(
                            locality__iexact=
                                locality,

                            then=
                                Value(5),
                        ),

                        When(
                            locality__icontains=
                                locality,

                            then=
                                Value(4),
                        ),

                        When(
                            city__iexact=
                                locality,

                            then=
                                Value(3),
                        ),

                        When(
                            city__icontains=
                                locality,

                            then=
                                Value(2),
                        ),

                        default=
                            Value(0),

                        output_field=
                            IntegerField(),
                    )
                )
            )


        else:

            queryset = (
                queryset.annotate(

                    locality_score=
                        Value(
                            0,
                            output_field=
                                IntegerField(),
                        )
                )
            )


        if cuisine:

            queryset = (
                queryset.annotate(

                    cuisine_score=Case(

                        When(
                            cuisine__iexact=
                                cuisine,

                            then=
                                Value(4),
                        ),

                        When(
                            cuisine__icontains=
                                cuisine,

                            then=
                                Value(3),
                        ),

                        default=
                            Value(0),

                        output_field=
                            IntegerField(),
                    )
                )
            )


        else:

            queryset = (
                queryset.annotate(

                    cuisine_score=
                        Value(
                            0,
                            output_field=
                                IntegerField(),
                        )
                )
            )


        return (
            queryset
            .order_by(
                "-locality_score",
                "-cuisine_score",
                "-rating",
                "name",
            )[:10]
        )


# ============================================================
# RESTAURANT DETAIL
# ============================================================

class RestaurantDetailView(
    generics.RetrieveAPIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = (
        RestaurantSerializer
    )

    lookup_field = (
        "id"
    )


    def get_queryset(
        self,
    ):

        return (

            Restaurant.objects

            .filter(
                is_active=True,
                is_foodkindl_partner=True,
                accepts_foodkindl_booking=True,
            )

            .prefetch_related(
                "images",
                "menu_items",
            )
        )


# ============================================================
# RESTAURANT CREATE
# ============================================================

class RestaurantCreateView(
    RestaurantGeocodeMixin,
    generics.CreateAPIView,
):

    permission_classes = [
        permissions.IsAdminUser,
    ]

    serializer_class = (
        RestaurantSerializer
    )

    queryset = (
        Restaurant.objects.all()
    )


    parser_classes = [
        JSONParser,
        FormParser,
    ]


    @transaction.atomic
    def perform_create(
        self,
        serializer,
    ):

        restaurant = (
            serializer.save()
        )


        self.geocode_and_save(
            restaurant
        )


# ============================================================
# RESTAURANT UPDATE / DELETE
# ============================================================

class RestaurantUpdateView(
    RestaurantGeocodeMixin,
    generics.RetrieveUpdateDestroyAPIView,
):

    permission_classes = [
        permissions.IsAdminUser,
    ]

    serializer_class = (
        RestaurantSerializer
    )

    lookup_field = (
        "id"
    )


    parser_classes = [
        JSONParser,
        FormParser,
    ]


    def get_queryset(
        self,
    ):

        return (

            Restaurant.objects

            .prefetch_related(
                "images",
                "menu_items",
            )
        )


    @transaction.atomic
    def perform_update(
        self,
        serializer,
    ):

        should_geocode = (
            self.location_data_changed()
        )


        restaurant = (
            serializer.save()
        )


        if should_geocode:

            self.geocode_and_save(
                restaurant
            )


# ============================================================
# MANUAL RESTAURANT GEOCODE
# ============================================================

class RestaurantGeocodeView(
    APIView
):

    permission_classes = [
        permissions.IsAdminUser,
    ]


    @transaction.atomic
    def post(
        self,
        request,
        restaurant_id,
    ):

        try:

            restaurant = (
                Restaurant.objects.get(
                    id=
                        restaurant_id
                )
            )


        except Restaurant.DoesNotExist:

            return Response(
                {
                    "detail":
                        "Restaurant not found."
                },

                status=
                    status.HTTP_404_NOT_FOUND,
            )


        try:

            coordinates = (
                geocode_restaurant(
                    restaurant
                )
            )


        except DjangoValidationError as exc:

            return Response(
                {
                    "detail":
                        str(exc),
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        restaurant.latitude = (
            coordinates[
                "latitude"
            ]
        )


        restaurant.longitude = (
            coordinates[
                "longitude"
            ]
        )


        restaurant.save(
            update_fields=(
                "latitude",
                "longitude",
                "updated_at",
            )
        )


        serializer = (
            RestaurantSerializer(
                restaurant,
                context={
                    "request":
                        request
                },
            )
        )


        return Response(
            {
                "detail":
                    (
                        "Restaurant coordinates "
                        "updated successfully."
                    ),

                "matched_location":
                    coordinates.get(
                        "display_name",
                        "",
                    ),

                "latitude":
                    str(
                        restaurant.latitude
                    ),

                "longitude":
                    str(
                        restaurant.longitude
                    ),

                "restaurant":
                    serializer.data,
            },

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# RESTAURANT BOOKING LIST + CREATE
# ============================================================

class RestaurantBookingListCreateView(
    generics.ListCreateAPIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = (
        RestaurantBookingSerializer
    )


    def get_queryset(
        self,
    ):

        return (

            RestaurantBooking.objects

            .filter(
                user=
                    self.request.user
            )

            .select_related(
                "restaurant",
                "user",
            )

            .order_by(
                "-created_at"
            )
        )


# ============================================================
# RESTAURANT BOOKING DETAIL
# ============================================================

class RestaurantBookingDetailView(
    generics.RetrieveAPIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = (
        RestaurantBookingSerializer
    )

    lookup_field = (
        "id"
    )


    def get_queryset(
        self,
    ):

        return (

            RestaurantBooking.objects

            .filter(
                user=
                    self.request.user
            )

            .select_related(
                "restaurant",
                "user",
            )
        )


# ============================================================
# RESTAURANT BOOKING CANCEL
# ============================================================

class RestaurantBookingCancelView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    @transaction.atomic
    def post(
        self,
        request,
        booking_id,
    ):

        try:

            booking = (

                RestaurantBooking.objects

                .select_for_update()

                .select_related(
                    "restaurant",
                    "user",
                )

                .get(
                    id=
                        booking_id,

                    user=
                        request.user,
                )
            )


        except RestaurantBooking.DoesNotExist:

            return Response(
                {
                    "detail":
                        "Booking not found."
                },

                status=
                    status.HTTP_404_NOT_FOUND,
            )


        if (
            booking.status ==
            "cancelled"
        ):

            return Response(
                {
                    "detail":
                        (
                            "Booking is "
                            "already cancelled."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        if (
            booking.status ==
            "completed"
        ):

            return Response(
                {
                    "detail":
                        (
                            "A completed booking "
                            "cannot be cancelled."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        booking.status = (
            "cancelled"
        )


        booking.save(
            update_fields=(
                "status",
                "updated_at",
            )
        )


        serializer = (
            RestaurantBookingSerializer(
                booking,
                context={
                    "request":
                        request
                },
            )
        )


        return Response(
            {
                "detail":
                    "Booking cancelled.",

                "booking":
                    serializer.data,
            },

            status=
                status.HTTP_200_OK,
        )


# ============================================================
# RESTAURANT BOOKING STATUS
# ============================================================

class RestaurantBookingStatusView(
    APIView
):

    permission_classes = [
        permissions.IsAdminUser,
    ]


    @transaction.atomic
    def post(
        self,
        request,
        booking_id,
    ):

        booking_status = (
            str(
                request.data.get(
                    "status",
                    "",
                )
            )
            .strip()
            .lower()
        )


        allowed_statuses = (
            "confirmed",
            "rejected",
            "completed",
        )


        if (
            booking_status
            not in
            allowed_statuses
        ):

            return Response(
                {
                    "detail":
                        (
                            "Status must be "
                            "'confirmed', "
                            "'rejected' or "
                            "'completed'."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        try:

            booking = (

                RestaurantBooking.objects

                .select_for_update()

                .select_related(
                    "restaurant",
                    "user",
                )

                .get(
                    id=
                        booking_id
                )
            )


        except RestaurantBooking.DoesNotExist:

            return Response(
                {
                    "detail":
                        "Booking not found."
                },

                status=
                    status.HTTP_404_NOT_FOUND,
            )


        if (
            booking.status ==
            "cancelled"
        ):

            return Response(
                {
                    "detail":
                        (
                            "A cancelled booking "
                            "cannot be updated."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        if (
            booking.status ==
            "completed"
        ):

            return Response(
                {
                    "detail":
                        (
                            "A completed booking "
                            "cannot be updated."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        booking.status = (
            booking_status
        )


        booking.save(
            update_fields=(
                "status",
                "updated_at",
            )
        )


        serializer = (
            RestaurantBookingSerializer(
                booking,
                context={
                    "request":
                        request
                },
            )
        )


        return Response(
            {
                "detail":
                    (
                        f"Booking "
                        f"{booking_status}."
                    ),

                "booking":
                    serializer.data,
            },

            status=
                status.HTTP_200_OK,
        )
import math
import os
import requests
import re
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.conf import settings

from django.core.exceptions import (
    ValidationError as DjangoValidationError,
)

from rest_framework.exceptions import (
    PermissionDenied,
    ValidationError as DRFValidationError,
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
    RestaurantSubmission,
)

from .serializers import (
    FoodInviteSerializer,
    RestaurantBookingSerializer,
    RestaurantSerializer,
    RestaurantSubmissionSerializer,
)

from rest_framework.permissions import AllowAny

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

# ============================================================
# FOOD INVITE DETAIL
# ============================================================

class FoodInviteDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = (
        FoodInviteSerializer
    )

    lookup_field = "id"


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


    def perform_update(
        self,
        serializer,
    ):

        instance = (
            self.get_object()
        )

        if (
            instance.creator_user_id
            !=
            self.request.user.id
        ):

            raise PermissionDenied(
                "Only the creator can edit this Food Invite."
            )

        serializer.save()


    @transaction.atomic
    def perform_destroy(
        self,
        instance,
    ):

        if (
            instance.creator_user_id
            !=
            self.request.user.id
        ):

            raise PermissionDenied(
                "Only the creator can delete this Food Invite."
            )

        instance.delete()

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
            or
            request.data.get(
                "action"
            )
            or
            ""
        )


        response_value = (
            str(
                response_value
            )
            .strip()
            .lower()
        )


        # Frontend may send:
        #   {"action": "accept"}
        #   {"action": "decline"}
        #
        # Backend participant statuses are:
        #   accepted / declined

        if (
            response_value
            ==
            "accept"
        ):

            response_value = (
                ParticipantStatus.ACCEPTED
            )


        elif (
            response_value
            ==
            "decline"
        ):

            response_value = (
                ParticipantStatus.DECLINED
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

# ============================================================
# FOURSQUARE PLACES
# ============================================================

FOURSQUARE_SEARCH_URL = (
    "https://places-api.foursquare.com/places/search"
)

FOURSQUARE_API_VERSION = (
    "2025-06-17"
)


def _get_foursquare_api_key():
    """
    Read the Foursquare Places Service Key from Django settings.

    Render environment variable:
        FOURSQUARE_API_KEY=...
    """

    return str(
        getattr(
            settings,
            "FOURSQUARE_API_KEY",
            "",
        )
        or ""
    ).strip()


def _safe_foursquare_number(
    value,
    default=0,
):
    try:
        return float(
            value
        )
    except (
        TypeError,
        ValueError,
    ):
        return default


def _is_food_category(
    categories,
):
    """
    Protect Food Walk from non-food POIs such as banks,
    churches, offices and shops.
    """

    food_terms = (
        "restaurant",
        "cafe",
        "café",
        "coffee",
        "bakery",
        "bistro",
        "diner",
        "pizzeria",
        "pizza",
        "food",
        "dessert",
        "ice cream",
        "tea",
        "juice",
        "breakfast",
        "burger",
        "sandwich",
        "barbecue",
        "bbq",
        "sweet",
        "dhaba",
        "food court",
        "hotel",
    )

    category_text = " ".join(
        str(
            category.get(
                "name",
                "",
            )
            or ""
        ).lower()

        for category
        in (
            categories
            or []
        )

        if isinstance(
            category,
            dict,
        )
    )

    return any(
        term
        in category_text

        for term
        in food_terms
    )


def _normalize_foursquare_place(
    place,
):
    """
    Convert a Foursquare Places response into the same shape
    FoodWalkPlanner.jsx already understands.
    """

    if not isinstance(
        place,
        dict,
    ):
        return None


    latitude = (
        place.get(
            "latitude"
        )
    )

    longitude = (
        place.get(
            "longitude"
        )
    )


    # Compatibility with older/alternate response shapes.
    if (
        latitude is None
        or
        longitude is None
    ):
        geocodes = (
            place.get(
                "geocodes",
                {},
            )
            or {}
        )

        main_geocode = (
            geocodes.get(
                "main",
                {},
            )
            or {}
        )

        latitude = (
            main_geocode.get(
                "latitude"
            )
        )

        longitude = (
            main_geocode.get(
                "longitude"
            )
        )


    try:
        latitude = float(
            latitude
        )

        longitude = float(
            longitude
        )

    except (
        TypeError,
        ValueError,
    ):
        return None


    if not (
        -90 <= latitude <= 90
        and
        -180 <= longitude <= 180
    ):
        return None


    categories = (
        place.get(
            "categories",
            [],
        )
        or []
    )


    if not _is_food_category(
        categories
    ):
        return None


    category_names = [
        str(
            category.get(
                "name",
                "",
            )
            or ""
        ).strip()

        for category
        in categories

        if isinstance(
            category,
            dict,
        )
        and
        str(
            category.get(
                "name",
                "",
            )
            or ""
        ).strip()
    ]


    location = (
        place.get(
            "location",
            {},
        )
        or {}
    )


    formatted_address = (
        location.get(
            "formatted_address"
        )
        or
        ""
    )


    if not formatted_address:

        address_parts = [
            location.get(
                "address"
            ),
            location.get(
                "locality"
            ),
            location.get(
                "region"
            ),
            location.get(
                "postcode"
            ),
        ]

        formatted_address = ", ".join(
            str(
                item
            ).strip()

            for item
            in address_parts

            if str(
                item
                or ""
            ).strip()
        )


    fsq_place_id = (
        place.get(
            "fsq_place_id"
        )
        or
        place.get(
            "fsq_id"
        )
        or
        place.get(
            "id"
        )
        or
        (
            f"{latitude}:"
            f"{longitude}:"
            f"{place.get('name', '')}"
        )
    )


    return {
        "id":
            f"fsq-{fsq_place_id}",

        "fsq_place_id":
            str(
                fsq_place_id
            ),

        "name":
            str(
                place.get(
                    "name",
                    "",
                )
                or
                "Food place"
            ).strip(),

        "latitude":
            latitude,

        "longitude":
            longitude,

        "address":
            formatted_address,

        "locality":
            str(
                location.get(
                    "locality",
                    "",
                )
                or ""
            ).strip(),

        "city":
            str(
                location.get(
                    "locality",
                    "",
                )
                or ""
            ).strip(),

        "category":
            (
                category_names[0]
                if category_names
                else
                "Restaurant"
            ),

        "categories":
            category_names,

        "cuisines":
            [],

        # Place Search does not guarantee rating/review fields.
        # Keep safe defaults; details can be enriched later.
        "rating":
            _safe_foursquare_number(
                place.get(
                    "rating"
                ),
                0,
            ),

        "review_count":
            0,

        "price_level":
            place.get(
                "price",
                "",
            )
            or "",

        "open_now":
            None,

        "opening_hours":
            "",

        "popular_dishes":
            [],

        "description":
            "Discovered with Foursquare along your Food Walk route.",

        "image":
            "",

        "source":
            "foursquare",
    }


def search_foursquare_food(
    latitude,
    longitude,
    *,
    radius=2500,
    query="",
    limit=25,
    category_ids="13000",
):
    """
    Search Foursquare around one route sample point.
    """

    api_key = (
        _get_foursquare_api_key()
    )


    if not api_key:
        return []


    try:

        request_params = {
            "ll":
                (
                    f"{float(latitude)},"
                    f"{float(longitude)}"
                ),

            "radius":
                max(
                    100,
                    min(
                        int(
                            radius
                        ),
                        100000,
                    ),
                ),

            # Dining & Drinking parent category.
            "fsq_category_ids":
                str(
                    category_ids
                    or
                    "13000"
                ).strip(),

            "limit":
                max(
                    1,
                    min(
                        int(
                            limit
                        ),
                        50,
                    ),
                ),

            "sort":
                "DISTANCE",
        }


        clean_query = str(
            query
            or ""
        ).strip()


        # Use text only when the user actually selected a specific
        # food type/cuisine. For "All", category filtering alone gives
        # much broader coverage.
        if clean_query:

            request_params[
                "query"
            ] = clean_query


        response = requests.get(
            FOURSQUARE_SEARCH_URL,

            headers={
                "Accept":
                    "application/json",

                "Authorization":
                    f"Bearer {api_key}",

                "X-Places-Api-Version":
                    FOURSQUARE_API_VERSION,
            },

            params=
                request_params,

            timeout=
                6,
        )


        if response.status_code in (
            401,
            403,
        ):

            print(
                "FOURSQUARE AUTH ERROR:",
                response.status_code,
                response.text[:500],
            )

            return []


        if response.status_code == 429:

            print(
                "FOURSQUARE RATE LIMIT:",
                response.text[:500],
            )

            return []


        if not response.ok:

            print(
                "FOURSQUARE SEARCH ERROR:",
                response.status_code,
                response.text[:500],
            )

            return []


        data = (
            response.json()
            or {}
        )


        output = []


        for place in (
            data.get(
                "results",
                [],
            )
            or []
        ):

            normalized = (
                _normalize_foursquare_place(
                    place
                )
            )


            if normalized:

                output.append(
                    normalized
                )


        return output


    except requests.Timeout:

        print(
            "FOURSQUARE SEARCH TIMEOUT"
        )

        return []


    except requests.RequestException as exc:

        print(
            "FOURSQUARE REQUEST ERROR:",
            exc,
        )

        return []


    except Exception as exc:

        print(
            "FOURSQUARE PARSE ERROR:",
            exc,
        )

        return []



def get_foursquare_place_details(
    fsq_place_id,
):
    """
    Fetch richer metadata for one Foursquare place.

    This may return address, phone, website, hours, price,
    description and rating depending on the Foursquare data tier
    and availability for that place.
    """

    api_key = (
        _get_foursquare_api_key()
    )

    if (
        not api_key
        or
        not fsq_place_id
    ):
        return {}


    try:

        response = requests.get(
            (
                "https://places-api.foursquare.com/"
                f"places/{fsq_place_id}"
            ),

            headers={
                "Accept":
                    "application/json",

                "Authorization":
                    f"Bearer {api_key}",

                "X-Places-Api-Version":
                    FOURSQUARE_API_VERSION,
            },

            timeout=10,
        )


        if not response.ok:

            print(
                "FOURSQUARE DETAILS ERROR:",
                fsq_place_id,
                response.status_code,
                response.text[:300],
            )

            return {}


        return (
            response.json()
            or {}
        )


    except requests.RequestException as exc:

        print(
            "FOURSQUARE DETAILS REQUEST ERROR:",
            fsq_place_id,
            exc,
        )

        return {}


def _merge_foursquare_details(
    place,
    details,
):
    """
    Merge Foursquare detail response into a normalized FoodKindl place.
    """

    if not details:
        return place


    location = (
        details.get(
            "location",
            {},
        )
        or {}
    )


    address = (
        location.get(
            "formatted_address"
        )
        or
        place.get(
            "address"
        )
        or
        ""
    )


    if not address:

        address_parts = [
            location.get(
                "address"
            ),
            location.get(
                "locality"
            ),
            location.get(
                "region"
            ),
            location.get(
                "postcode"
            ),
        ]

        address = ", ".join(
            str(item).strip()

            for item
            in address_parts

            if str(
                item
                or ""
            ).strip()
        )


    place[
        "address"
    ] = address


    place[
        "locality"
    ] = (
        location.get(
            "locality"
        )
        or
        place.get(
            "locality"
        )
        or
        ""
    )


    place[
        "city"
    ] = (
        location.get(
            "locality"
        )
        or
        place.get(
            "city"
        )
        or
        ""
    )


    place[
        "postcode"
    ] = (
        location.get(
            "postcode"
        )
        or
        ""
    )


    place[
        "tel"
    ] = (
        details.get(
            "tel"
        )
        or
        ""
    )


    place[
        "website"
    ] = (
        details.get(
            "website"
        )
        or
        ""
    )


    place[
        "description"
    ] = (
        details.get(
            "description"
        )
        or
        place.get(
            "description"
        )
        or
        ""
    )


    if details.get(
        "price"
    ) is not None:

        place[
            "price_level"
        ] = details.get(
            "price"
        )


    if details.get(
        "rating"
    ) is not None:

        place[
            "rating"
        ] = (
            _safe_foursquare_number(
                details.get(
                    "rating"
                ),
                0,
            )
        )


    hours = (
        details.get(
            "hours",
            {},
        )
        or {}
    )


    if isinstance(
        hours,
        dict,
    ):

        place[
            "open_now"
        ] = hours.get(
            "open_now"
        )


        display_hours = (
            hours.get(
                "display"
            )
            or
            hours.get(
                "regular"
            )
            or
            ""
        )


        place[
            "opening_hours"
        ] = display_hours


    categories = (
        details.get(
            "categories",
            [],
        )
        or []
    )


    if categories:

        category_names = [
            str(
                category.get(
                    "name",
                    "",
                )
                or ""
            ).strip()

            for category
            in categories

            if isinstance(
                category,
                dict,
            )
            and
            str(
                category.get(
                    "name",
                    "",
                )
                or ""
            ).strip()
        ]


        if category_names:

            place[
                "category"
            ] = category_names[0]

            place[
                "categories"
            ] = category_names


    return place


def _foursquare_query_for_food_walk(
    request,
    *,
    cuisine="",
    food_query="",
    walk_type="",
):
    """
    Convert FoodWalkPlanner filters into a useful Foursquare query.
    """

    place_type = (
        request.query_params
        .get(
            "type",
            "",
        )
        .strip()
        .lower()
    )


    if place_type == "cafe":
        return "cafe coffee"


    if place_type == "restaurant":
        return "restaurant"


    if food_query:
        return food_query


    if cuisine:
        return (
            f"{cuisine.replace('_', ' ')} restaurant"
        )


    walk_queries = {
        "street_food":
            "street food",

        "cafes":
            "cafe coffee",

        "desserts":
            "dessert bakery ice cream",

        "breakfast":
            "breakfast restaurant",

        "night_food":
            "restaurant",

        "local_favourites":
            "local restaurant",

        "hidden_gems":
            "restaurant",

        # For All / Surprise Me, do not add a free-text query.
        # The Foursquare Dining & Drinking category filter will
        # return restaurants, cafes, bakeries, food courts, etc.
        "surprise_me":
            "",
    }


    return (
        walk_queries.get(
            walk_type,
            "",
        )
    )


def _discover_foursquare_along_route(
    request,
    *,
    start_lat,
    start_lon,
    destination_lat,
    destination_lon,
    max_detour_km,
    travel_mode,
    cuisine="",
    food_query="",
    walk_type="",
):
    """
    Sample points between start and destination and discover
    restaurants/cafes near the route.

    The current Food Walk backend uses a straight-line corridor for
    recommendation screening. This function follows the same model,
    so external and FoodKindl database places are treated consistently.
    """

    if not _get_foursquare_api_key():
        return []


    query = (
        _foursquare_query_for_food_walk(
            request,

            cuisine=
                cuisine,

            food_query=
                food_query,

            walk_type=
                walk_type,
        )
    )


    route_distance_km = (
        _haversine_km(
            start_lat,
            start_lon,
            destination_lat,
            destination_lon,
        )
    )


    # More samples for longer trips while keeping API use controlled.
    if route_distance_km <= 5:
        sample_count = 2

    elif route_distance_km <= 15:
        sample_count = 3

    elif route_distance_km <= 40:
        sample_count = 4

    else:
        sample_count = 5


    radius_meters = int(
        max(
            1800,
            min(
                max(
                    max_detour_km
                    * 1000,
                    2500,
                ),
                7000,
            ),
        )
    )


    discovered = {}


    sample_jobs = []


    for index in range(
        sample_count + 1
    ):

        fraction = (
            index
            /
            sample_count
        )


        sample_lat = (
            start_lat
            +
            (
                destination_lat
                -
                start_lat
            )
            *
            fraction
        )


        sample_lon = (
            start_lon
            +
            (
                destination_lon
                -
                start_lon
            )
            *
            fraction
        )


        sample_jobs.append(
            (
                index,
                sample_lat,
                sample_lon,
            )
        )


    # Run route-point searches concurrently so one slow external request
    # does not make the whole Food Walk exceed the frontend timeout.
    with ThreadPoolExecutor(
        max_workers=min(
            5,
            len(
                sample_jobs
            ),
        )
    ) as executor:

        future_map = {
            executor.submit(
                search_foursquare_food,
                sample_lat,
                sample_lon,
                radius=radius_meters,
                query=query,
                limit=30,
                category_ids="13000",
            ):
            (
                index,
                sample_lat,
                sample_lon,
            )

            for (
                index,
                sample_lat,
                sample_lon,
            )
            in sample_jobs
        }


        for future in as_completed(
            future_map
        ):

            (
                index,
                sample_lat,
                sample_lon,
            ) = future_map[
                future
            ]


            try:

                places = (
                    future.result()
                    or []
                )


            except Exception as exc:

                print(
                    "FOURSQUARE SAMPLE ERROR:",
                    index,
                    repr(
                        exc
                    ),
                )

                places = []


            print(
                "FOURSQUARE ROUTE SAMPLE:",
                index,
                "query=",
                query or "<Dining & Drinking>",
                "lat=",
                round(
                    sample_lat,
                    5,
                ),
                "lng=",
                round(
                    sample_lon,
                    5,
                ),
                "radius=",
                radius_meters,
                "results=",
                len(
                    places
                ),
            )


            for place in places:

                fsq_id = (
                    place.get(
                        "fsq_place_id"
                    )
                    or
                    place.get(
                        "id"
                    )
                )


                if not fsq_id:
                    continue


                discovered[
                    str(
                        fsq_id
                    )
                ] = place


    results = []


    for place in (
        discovered.values()
    ):

        try:

            (
                distance_from_route,
                route_position,
            ) = (
                _distance_from_route(
                    place[
                        "latitude"
                    ],
                    place[
                        "longitude"
                    ],

                    start_lat,
                    start_lon,

                    destination_lat,
                    destination_lon,
                )
            )


        except (
            KeyError,
            TypeError,
            ValueError,
        ):

            continue


        if (
            distance_from_route
            >
            max_detour_km
        ):

            continue


        # Approximate round-trip detour from the route.
        detour_km = (
            distance_from_route
            *
            2
        )


        if travel_mode == "walk":

            # ~5 km/h
            detour_minutes = (
                detour_km
                /
                5
                *
                60
            )


        elif travel_mode == "bike":

            # ~15 km/h
            detour_minutes = (
                detour_km
                /
                15
                *
                60
            )


        else:

            # Conservative city driving approximation.
            detour_minutes = (
                detour_km
                /
                25
                *
                60
            )


        place[
            "distance_from_route_km"
        ] = round(
            distance_from_route,
            2,
        )


        place[
            "detour_km"
        ] = round(
            detour_km,
            2,
        )


        place[
            "detour_minutes"
        ] = max(
            0,
            round(
                detour_minutes
            ),
        )


        place[
            "route_position"
        ] = round(
            route_position,
            4,
        )


        # External place scoring.
        score = 0.0


        if distance_from_route <= 0.25:
            score += 40

        elif distance_from_route <= 0.5:
            score += 32

        elif distance_from_route <= 1.0:
            score += 24

        elif distance_from_route <= 2.0:
            score += 15

        else:
            score += max(
                0,
                12
                -
                distance_from_route,
            )


        rating = (
            _safe_foursquare_number(
                place.get(
                    "rating"
                ),
                0,
            )
        )


        if rating:
            score += (
                rating
                *
                5
            )


        place[
            "recommendation_score"
        ] = round(
            score,
            2,
        )


        if distance_from_route <= 0.5:

            place[
                "recommendation_reason"
            ] = (
                "Very close to your route"
            )


        elif distance_from_route <= 1.0:

            place[
                "recommendation_reason"
            ] = (
                "Small detour from your route"
            )


        else:

            place[
                "recommendation_reason"
            ] = (
                "Food option along your route"
            )


        results.append(
            place
        )


    results.sort(
        key=lambda place: (
            -
            float(
                place.get(
                    "recommendation_score",
                    0,
                )
                or 0
            ),

            float(
                place.get(
                    "distance_from_route_km",
                    999,
                )
                or 999
            ),
        )
    )


    # Do not call Place Details here.
    # Serial detail requests make the Food Walk endpoint too slow.
    # Rich details can be fetched lazily when a user opens/selects a place.
    return results


# ============================================================
# OPENSTREETMAP / OVERPASS FOOD DISCOVERY
# ============================================================

OVERPASS_ENDPOINTS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)


def _osm_food_query_terms(
    request,
    *,
    cuisine="",
    food_query="",
):
    """
    Return optional text terms used to refine OSM results locally.

    We deliberately query broad food POIs from Overpass first and
    filter locally. This gives better coverage than trying to encode
    every FoodKindl category inside the Overpass query.
    """

    place_type = (
        request.query_params
        .get(
            "type",
            "",
        )
        .strip()
        .lower()
    )


    terms = []


    if place_type == "restaurant":
        terms.append(
            "restaurant"
        )

    elif place_type == "cafe":
        terms.extend(
            [
                "cafe",
                "coffee",
            ]
        )


    if cuisine:

        terms.extend(
            str(
                cuisine
            )
            .replace(
                "_",
                " ",
            )
            .lower()
            .split()
        )


    if food_query:

        normalized_food_query = (
            str(
                food_query
            )
            .replace(
                "_",
                " ",
            )
            .lower()
        )

        terms.extend(
            word
            for word
            in normalized_food_query.split()
            if len(word) >= 3
        )


    return list(
        dict.fromkeys(
            term
            for term
            in terms
            if term
        )
    )


def _osm_text_matches(
    tags,
    terms,
):
    """
    Apply optional FoodKindl category/cuisine filtering to OSM tags.
    """

    if not terms:
        return True


    text = " ".join(
        [
            str(
                tags.get(
                    "name",
                    "",
                )
                or ""
            ),
            str(
                tags.get(
                    "amenity",
                    "",
                )
                or ""
            ),
            str(
                tags.get(
                    "cuisine",
                    "",
                )
                or ""
            ),
            str(
                tags.get(
                    "description",
                    "",
                )
                or ""
            ),
            str(
                tags.get(
                    "brand",
                    "",
                )
                or ""
            ),
        ]
    ).lower().replace(
        "_",
        " ",
    )


    return any(
        term
        in text
        for term
        in terms
    )


def _osm_address_from_tags(
    tags,
):
    """
    Build a readable address from common OpenStreetMap addr:* tags.
    """

    house = (
        tags.get(
            "addr:housenumber"
        )
        or
        ""
    )

    street = (
        tags.get(
            "addr:street"
        )
        or
        ""
    )

    suburb = (
        tags.get(
            "addr:suburb"
        )
        or
        tags.get(
            "addr:neighbourhood"
        )
        or
        ""
    )

    city = (
        tags.get(
            "addr:city"
        )
        or
        tags.get(
            "addr:town"
        )
        or
        ""
    )

    postcode = (
        tags.get(
            "addr:postcode"
        )
        or
        ""
    )


    first_line = " ".join(
        str(
            value
        ).strip()
        for value
        in (
            house,
            street,
        )
        if str(
            value
            or ""
        ).strip()
    )


    parts = [
        first_line,
        suburb,
        city,
        postcode,
    ]


    return ", ".join(
        str(
            value
        ).strip()
        for value
        in parts
        if str(
            value
            or ""
        ).strip()
    )


def _normalize_osm_food_place(
    element,
):
    """
    Convert an Overpass node/way/relation into the same response
    format that FoodWalkPlanner.jsx already consumes.
    """

    if not isinstance(
        element,
        dict,
    ):
        return None


    tags = (
        element.get(
            "tags",
            {},
        )
        or {}
    )


    latitude = (
        element.get(
            "lat"
        )
    )

    longitude = (
        element.get(
            "lon"
        )
    )


    if (
        latitude is None
        or
        longitude is None
    ):

        center = (
            element.get(
                "center",
                {},
            )
            or {}
        )

        latitude = (
            center.get(
                "lat"
            )
        )

        longitude = (
            center.get(
                "lon"
            )
        )


    try:

        latitude = float(
            latitude
        )

        longitude = float(
            longitude
        )

    except (
        TypeError,
        ValueError,
    ):

        return None


    if not (
        -90 <= latitude <= 90
        and
        -180 <= longitude <= 180
    ):

        return None


    amenity = (
        str(
            tags.get(
                "amenity",
                "",
            )
            or ""
        )
        .strip()
        .lower()
    )


    tourism = (
        str(
            tags.get(
                "tourism",
                "",
            )
            or ""
        )
        .strip()
        .lower()
    )


    allowed_amenities = {
        "restaurant",
        "cafe",
        "fast_food",
        "food_court",
        "ice_cream",
        "biergarten",
        "pub",
    }


    # Hotels are included only when OSM explicitly records a
    # restaurant, cafe, or food-related facility.
    hotel_with_food = (
        tourism == "hotel"
        and
        str(
            tags.get(
                "restaurant",
                "",
            )
            or ""
        )
        .strip()
        .lower()
        in (
            "yes",
            "true",
            "1",
        )
    )


    if (
        amenity
        not in
        allowed_amenities
        and
        not hotel_with_food
    ):

        return None


    name = (
        str(
            tags.get(
                "name",
                "",
            )
            or
            tags.get(
                "brand",
                "",
            )
            or
            (
                "Hotel Restaurant"
                if hotel_with_food
                else
                amenity
                    .replace(
                        "_",
                        " ",
                    )
                    .title()
            )
        )
        .strip()
    )


    if not name:
        return None


    if hotel_with_food:

        category = (
            "Hotel Restaurant"
        )

    else:

        category_map = {
            "restaurant":
                "Restaurant",

            "cafe":
                "Cafe",

            "fast_food":
                "Fast Food",

            "food_court":
                "Food Court",

            "ice_cream":
                "Dessert / Ice Cream",

            "biergarten":
                "Restaurant",

            "pub":
                "Pub / Restaurant",
        }

        category = (
            category_map.get(
                amenity,
                "Restaurant",
            )
        )


    cuisine_value = (
        str(
            tags.get(
                "cuisine",
                "",
            )
            or ""
        )
        .strip()
    )


    cuisines = [
        item
        .replace(
            "_",
            " ",
        )
        .strip()
        .title()

        for item
        in re.split(
            r"[;,]",
            cuisine_value,
        )

        if item.strip()
    ]


    phone = (
        tags.get(
            "contact:phone"
        )
        or
        tags.get(
            "phone"
        )
        or
        ""
    )


    website = (
        tags.get(
            "contact:website"
        )
        or
        tags.get(
            "website"
        )
        or
        ""
    )


    opening_hours = (
        tags.get(
            "opening_hours"
        )
        or
        ""
    )


    address = (
        _osm_address_from_tags(
            tags
        )
    )


    if not address:

        address = (
            tags.get(
                "addr:full"
            )
            or
            ""
        )


    locality = (
        tags.get(
            "addr:suburb"
        )
        or
        tags.get(
            "addr:neighbourhood"
        )
        or
        ""
    )


    city = (
        tags.get(
            "addr:city"
        )
        or
        tags.get(
            "addr:town"
        )
        or
        ""
    )


    osm_type = (
        element.get(
            "type",
            "node",
        )
    )

    osm_id = (
        element.get(
            "id"
        )
    )


    return {
        "id":
            f"osm-{osm_type}-{osm_id}",

        "osm_id":
            osm_id,

        "osm_type":
            osm_type,

        "name":
            name,

        "latitude":
            latitude,

        "longitude":
            longitude,

        "address":
            address,

        "locality":
            str(
                locality
                or ""
            ).strip(),

        "city":
            str(
                city
                or ""
            ).strip(),

        "postcode":
            str(
                tags.get(
                    "addr:postcode",
                    "",
                )
                or ""
            ).strip(),

        "category":
            category,

        "categories":
            [
                category,
            ],

        "cuisines":
            cuisines,

        # OSM usually does not contain a standardized rating.
        "rating":
            0,

        "review_count":
            0,

        "price_level":
            "",

        "open_now":
            None,

        "opening_hours":
            opening_hours,

        "popular_dishes":
            [],

        "description":
            (
                tags.get(
                    "description"
                )
                or
                "OpenStreetMap food place along your route."
            ),

        "tel":
            str(
                phone
                or ""
            ).strip(),

        "website":
            str(
                website
                or ""
            ).strip(),

        "image":
            "",

        "source":
            "openstreetmap",
    }


def _build_overpass_food_query(
    sample_points,
    radius_meters,
):
    """
    Build one Overpass query containing every route sample point.

    One batched request is friendlier to public Overpass instances
    than sending one HTTP request for every route sample.
    """

    radius_meters = max(
        500,
        min(
            int(
                radius_meters
            ),
            8000,
        ),
    )


    query_parts = []


    for latitude, longitude in sample_points:

        around = (
            f"around:{radius_meters},"
            f"{float(latitude)},"
            f"{float(longitude)}"
        )


        for osm_type in (
            "node",
            "way",
            "relation",
        ):

            for amenity in (
                "restaurant",
                "cafe",
                "fast_food",
                "food_court",
                "ice_cream",
            ):

                query_parts.append(
                    (
                        f'{osm_type}["amenity"="{amenity}"]'
                        f'({around});'
                    )
                )


            # Include hotels only when OSM explicitly says that
            # a restaurant is available.
            query_parts.append(
                (
                    f'{osm_type}["tourism"="hotel"]'
                    f'["restaurant"="yes"]'
                    f'({around});'
                )
            )


    return (
        '[out:json][timeout:10];'
        '('
        +
        "".join(
            query_parts
        )
        +
        ');'
        'out center tags;'
    )


def search_openstreetmap_food_along_route(
    request,
    *,
    start_lat,
    start_lon,
    destination_lat,
    destination_lon,
    max_detour_km,
    travel_mode,
    cuisine="",
    food_query="",
):
    """
    Discover restaurant/cafe/food POIs from OpenStreetMap using
    Overpass and keep only places within the Food Walk corridor.

    No API key is required.
    """

    route_distance_km = (
        _haversine_km(
            start_lat,
            start_lon,
            destination_lat,
            destination_lon,
        )
    )


    if route_distance_km <= 5:
        sample_count = 2

    elif route_distance_km <= 15:
        sample_count = 3

    elif route_distance_km <= 40:
        sample_count = 4

    else:
        sample_count = 5


    sample_points = []


    for index in range(
        sample_count + 1
    ):

        fraction = (
            index
            /
            sample_count
        )


        sample_lat = (
            start_lat
            +
            (
                destination_lat
                -
                start_lat
            )
            *
            fraction
        )


        sample_lon = (
            start_lon
            +
            (
                destination_lon
                -
                start_lon
            )
            *
            fraction
        )


        sample_points.append(
            (
                sample_lat,
                sample_lon,
            )
        )


    # Search broadly enough to find food, then apply the exact
    # max_detour_km corridor below.
    radius_meters = int(
        max(
            1800,
            min(
                max(
                    max_detour_km
                    * 1000,
                    2500,
                ),
                7000,
            ),
        )
    )


    overpass_query = (
        _build_overpass_food_query(
            sample_points,
            radius_meters,
        )
    )


    data = None


    for endpoint in (
        OVERPASS_ENDPOINTS
    ):

        try:

            response = requests.post(
                endpoint,

                data={
                    "data":
                        overpass_query,
                },

                headers={
                    "Accept":
                        "application/json",

                    "User-Agent":
                        "FoodKindl/1.0 "
                        "(Food Walk restaurant discovery)",
                },

                timeout=10,
            )


            if not response.ok:

                print(
                    "OVERPASS ERROR:",
                    endpoint,
                    response.status_code,
                    response.text[:300],
                )

                continue


            data = (
                response.json()
                or {}
            )


            print(
                "OVERPASS SUCCESS:",
                endpoint,
                "elements=",
                len(
                    data.get(
                        "elements",
                        [],
                    )
                    or []
                ),
            )


            break


        except requests.RequestException as exc:

            print(
                "OVERPASS REQUEST ERROR:",
                endpoint,
                exc,
            )


        except ValueError as exc:

            print(
                "OVERPASS JSON ERROR:",
                endpoint,
                exc,
            )


    if not data:

        return []


    terms = (
        _osm_food_query_terms(
            request,

            cuisine=
                cuisine,

            food_query=
                food_query,
        )
    )


    discovered = {}


    for element in (
        data.get(
            "elements",
            [],
        )
        or []
    ):

        tags = (
            element.get(
                "tags",
                {},
            )
            or {}
        )


        if not _osm_text_matches(
            tags,
            terms,
        ):

            continue


        place = (
            _normalize_osm_food_place(
                element
            )
        )


        if not place:

            continue


        unique_id = (
            place.get(
                "id"
            )
        )


        if unique_id:

            discovered[
                unique_id
            ] = place


    results = []


    for place in (
        discovered.values()
    ):

        try:

            (
                distance_from_route,
                route_position,
            ) = (
                _distance_from_route(
                    place[
                        "latitude"
                    ],
                    place[
                        "longitude"
                    ],

                    start_lat,
                    start_lon,

                    destination_lat,
                    destination_lon,
                )
            )


        except (
            KeyError,
            TypeError,
            ValueError,
        ):

            continue


        if (
            distance_from_route
            >
            max_detour_km
        ):

            continue


        detour_km = (
            distance_from_route
            *
            2
        )


        if travel_mode == "walk":

            detour_minutes = (
                detour_km
                /
                5
                *
                60
            )


        elif travel_mode == "bike":

            detour_minutes = (
                detour_km
                /
                15
                *
                60
            )


        else:

            detour_minutes = (
                detour_km
                /
                25
                *
                60
            )


        place[
            "distance_from_route_km"
        ] = round(
            distance_from_route,
            2,
        )


        place[
            "detour_km"
        ] = round(
            detour_km,
            2,
        )


        place[
            "detour_minutes"
        ] = max(
            0,
            round(
                detour_minutes
            ),
        )


        place[
            "route_position"
        ] = round(
            route_position,
            4,
        )


        score = 0.0


        if distance_from_route <= 0.25:

            score += 38

        elif distance_from_route <= 0.5:

            score += 30

        elif distance_from_route <= 1.0:

            score += 22

        elif distance_from_route <= 2.0:

            score += 14

        else:

            score += max(
                0,
                10
                -
                distance_from_route,
            )


        # Slightly prefer OSM records with useful details.
        if place.get(
            "cuisines"
        ):

            score += 3


        if place.get(
            "opening_hours"
        ):

            score += 2


        if place.get(
            "address"
        ):

            score += 2


        if place.get(
            "website"
        ):

            score += 1


        place[
            "recommendation_score"
        ] = round(
            score,
            2,
        )


        if distance_from_route <= 0.5:

            place[
                "recommendation_reason"
            ] = (
                "Very close to your route"
            )


        elif distance_from_route <= 1.0:

            place[
                "recommendation_reason"
            ] = (
                "Small detour from your route"
            )


        else:

            place[
                "recommendation_reason"
            ] = (
                "OpenStreetMap food option along your route"
            )


        results.append(
            place
        )


    results.sort(
        key=lambda place: (
            -
            float(
                place.get(
                    "recommendation_score",
                    0,
                )
                or 0
            ),

            float(
                place.get(
                    "distance_from_route_km",
                    999,
                )
                or 999
            ),
        )
    )


    print(
        "OVERPASS ROUTE RESULTS:",
        len(
            results
        ),
    )


    return results


# ============================================================
# FOOD WALK RESTAURANT RECOMMENDATIONS
# ============================================================

class FoodWalkRestaurantRecommendationView(
    APIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]


    # ========================================================
    # SMALL HELPERS
    # ========================================================

    @staticmethod
    def _get_bool(
        request,
        key,
        default=False,
    ):
        value = (
            request.query_params
            .get(
                key,
                None,
            )
        )

        if value is None:
            return default

        return (
            str(value)
            .strip()
            .lower()
            in (
                "1",
                "true",
                "yes",
                "on",
            )
        )


    @staticmethod
    def _safe_float(
        value,
        default=None,
    ):
        try:
            return float(
                value
            )

        except (
            TypeError,
            ValueError,
        ):
            return default


    @staticmethod
    def _safe_int(
        value,
        default=None,
    ):
        try:
            return int(
                value
            )

        except (
            TypeError,
            ValueError,
        ):
            return default


    @staticmethod
    def _restaurant_is_open_now(
        restaurant,
    ):
        """
        Best-effort opening-hours check using the fields that
        currently exist on Restaurant.

        Handles:
            08:00 -> 22:00
            18:00 -> 02:00
        """

        opening_time = (
            restaurant.opening_time
        )

        closing_time = (
            restaurant.closing_time
        )


        # If hours are not stored, don't reject the restaurant.
        if (
            opening_time is None
            or closing_time is None
        ):
            return True


        current_time = (
            timezone
            .localtime()
            .time()
        )


        # Same-day hours
        if (
            opening_time
            <=
            closing_time
        ):

            return (
                opening_time
                <=
                current_time
                <=
                closing_time
            )


        # Overnight hours:
        # example 18:00 -> 02:00
        return (
            current_time
            >=
            opening_time
            or
            current_time
            <=
            closing_time
        )


    @staticmethod
    def _menu_items(
        restaurant,
    ):
        """
        Use already-prefetched menu items.
        """

        try:

            return list(
                restaurant
                .menu_items
                .all()
            )

        except Exception:

            return []


    @staticmethod
    def _best_menu_item(
        restaurant,
        food_query="",
        walk_type="",
    ):
        """
        Pick a useful dish for the Food Walk card.

        Preference:
            1. query-matching available dish
            2. popular available dish
            3. first available dish
        """

        menu_items = (
            FoodWalkRestaurantRecommendationView
            ._menu_items(
                restaurant
            )
        )


        available_items = [
            item
            for item
            in menu_items
            if getattr(
                item,
                "is_available",
                True,
            )
        ]


        if not available_items:
            return None


        search_terms = []


        if food_query:

            search_terms.extend(
                str(food_query)
                .lower()
                .replace("_", " ")
                .split()
            )


        if walk_type:

            search_terms.extend(
                str(walk_type)
                .lower()
                .replace("_", " ")
                .split()
            )


        # ----------------------------------------------------
        # QUERY MATCH
        # ----------------------------------------------------

        for item in available_items:

            item_text = " ".join(
                [
                    str(
                        getattr(
                            item,
                            "name",
                            "",
                        )
                        or ""
                    ),
                    str(
                        getattr(
                            item,
                            "description",
                            "",
                        )
                        or ""
                    ),
                    str(
                        getattr(
                            item,
                            "category",
                            "",
                        )
                        or ""
                    ),
                ]
            ).lower()


            if (
                search_terms
                and
                any(
                    term
                    in item_text
                    for term
                    in search_terms
                    if len(term) >= 3
                )
            ):

                return item


        # ----------------------------------------------------
        # POPULAR
        # ----------------------------------------------------

        for item in available_items:

            if getattr(
                item,
                "is_popular",
                False,
            ):

                return item


        return available_items[0]


    @staticmethod
    def _text_matches(
        restaurant,
        query,
    ):
        """
        Search restaurant metadata + menu item names.

        This allows searches such as:
            dosa
            chai
            seafood
            bakery
            local breakfast
        """

        query = (
            str(
                query
                or ""
            )
            .strip()
            .lower()
            .replace("_", " ")
        )


        if not query:
            return False


        restaurant_text = " ".join(
            [
                str(
                    restaurant.name
                    or ""
                ),
                str(
                    restaurant.cuisine
                    or ""
                ),
                str(
                    restaurant.restaurant_type
                    or ""
                ),
                str(
                    restaurant.description
                    or ""
                ),
                str(
                    restaurant.locality
                    or ""
                ),
                str(
                    restaurant.city
                    or ""
                ),
            ]
        ).lower().replace(
            "_",
            " ",
        )


        if query in restaurant_text:
            return True


        query_words = [
            word
            for word
            in query.split()
            if len(word) >= 3
        ]


        if (
            query_words
            and
            any(
                word
                in restaurant_text
                for word
                in query_words
            )
        ):

            return True


        for item in (
            FoodWalkRestaurantRecommendationView
            ._menu_items(
                restaurant
            )
        ):

            item_text = " ".join(
                [
                    str(
                        getattr(
                            item,
                            "name",
                            "",
                        )
                        or ""
                    ),
                    str(
                        getattr(
                            item,
                            "description",
                            "",
                        )
                        or ""
                    ),
                    str(
                        getattr(
                            item,
                            "category",
                            "",
                        )
                        or ""
                    ),
                ]
            ).lower()


            if query in item_text:
                return True


            if (
                query_words
                and
                any(
                    word
                    in item_text
                    for word
                    in query_words
                )
            ):

                return True


        return False


    # ========================================================
    # GET
    # ========================================================

    def get(
        self,
        request,
    ):

        # ====================================================
        # BASIC ROUTE VALUES
        # ====================================================

        start = (
            request.query_params
            .get(
                "start",
                "",
            )
            .strip()
        )


        destination = (
            request.query_params
            .get(
                "destination",
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


        food_query = (
            request.query_params
            .get(
                "food_query",
                "",
            )
            .strip()
        )


        walk_type = (
            request.query_params
            .get(
                "walk_type",
                "surprise_me",
            )
            .strip()
            .lower()
        )


        travel_mode = (
            request.query_params
            .get(
                "travel_mode",
                "walk",
            )
            .strip()
            .lower()
        )


        dietary_preference = (
            request.query_params
            .get(
                "dietary_preference",
                "",
            )
            .strip()
            .lower()
        )


        # ====================================================
        # VALID TRAVEL MODE
        # ====================================================

        if travel_mode not in (
            "walk",
            "bike",
            "drive",
        ):

            travel_mode = "walk"


        # ====================================================
        # STOP COUNT
        # ====================================================

        preferred_stop_count = (
            self._safe_int(

                request.query_params
                .get(
                    "preferred_stop_count",
                    4,
                ),

                4,
            )
        )


        preferred_stop_count = max(
            2,
            min(
                preferred_stop_count,
                5,
            ),
        )


        # ====================================================
        # MAX DETOUR
        # ====================================================

        max_detour_km = (
            self._safe_float(

                request.query_params
                .get(
                    "max_detour_km",
                    2,
                ),

                2.0,
            )
        )


        # New frontend allows up to 10 km.
        max_detour_km = max(
            0.3,
            min(
                max_detour_km,
                10.0,
            ),
        )


        # ====================================================
        # BUDGET
        #
        # Frontend value is budget PER PERSON.
        #
        # Restaurant model stores:
        # average_cost_for_two
        # ====================================================

        max_budget = (
            self._safe_float(

                request.query_params
                .get(
                    "max_budget",
                    None,
                ),

                None,
            )
        )


        if (
            max_budget is not None
            and
            max_budget <= 0
        ):

            max_budget = None


        max_cost_for_two = (

            max_budget * 2

            if max_budget
            is not None

            else None
        )


        # ====================================================
        # BOOLEAN PREFERENCES
        # ====================================================

        open_now = (
            self._get_bool(
                request,
                "open_now",
            )
        )


        highly_rated = (
            self._get_bool(
                request,
                "highly_rated",
            )
        )


        hidden_gems = (
            self._get_bool(
                request,
                "hidden_gems",
            )
        )


        # ====================================================
        # AUTOCOMPLETE COORDINATES
        # ====================================================

        start_lat_param = (
            request.query_params
            .get(
                "start_lat"
            )
        )


        start_lng_param = (
            request.query_params
            .get(
                "start_lng"
            )
        )


        destination_lat_param = (
            request.query_params
            .get(
                "destination_lat"
            )
        )


        destination_lng_param = (
            request.query_params
            .get(
                "destination_lng"
            )
        )


        # ====================================================
        # REQUIRED VALUES
        #
        # A Food Walk location is valid when EITHER:
        #   1. text was supplied (start / destination), OR
        #   2. autocomplete coordinates were supplied.
        #
        # This is important because the React FoodWalkPlanner sends
        # exact coordinates after the user selects a dropdown item.
        # ====================================================

        has_start_coordinates = (
            start_lat_param
            not in (
                None,
                "",
            )
            and
            start_lng_param
            not in (
                None,
                "",
            )
        )

        has_destination_coordinates = (
            destination_lat_param
            not in (
                None,
                "",
            )
            and
            destination_lng_param
            not in (
                None,
                "",
            )
        )


        if (
            not start
            and
            not has_start_coordinates
        ):

            return Response(
                {
                    "detail":
                        (
                            "Starting point is required. "
                            "Select a starting point from "
                            "the location dropdown."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        if (
            not destination
            and
            not has_destination_coordinates
        ):

            return Response(
                {
                    "detail":
                        (
                            "Destination is required. "
                            "Select a destination from "
                            "the location dropdown."
                        )
                },

                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        # Friendly fallback labels when the frontend sends coordinates
        # without start/destination text.
        if (
            not start
            and
            has_start_coordinates
        ):
            start = "Starting point"


        if (
            not destination
            and
            has_destination_coordinates
        ):
            destination = "Destination"


        # ====================================================
        # START LOCATION
        #
        # Prefer autocomplete coordinates.
        # Only geocode text if coordinates were not supplied.
        # ====================================================

        start_location = None


        if (
            start_lat_param
            not in (
                None,
                "",
            )
            and
            start_lng_param
            not in (
                None,
                "",
            )
        ):

            try:

                start_lat = float(
                    start_lat_param
                )


                start_lon = float(
                    start_lng_param
                )


                if not (
                    -90
                    <=
                    start_lat
                    <=
                    90
                ):

                    raise ValueError


                if not (
                    -180
                    <=
                    start_lon
                    <=
                    180
                ):

                    raise ValueError


                start_location = {

                    "latitude":
                        start_lat,

                    "longitude":
                        start_lon,

                    "display_name":
                        start,

                }


            except (
                ValueError,
                TypeError,
            ):

                start_location = None


        if start_location is None:

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


            if not start_location:

                return Response(
                    {
                        "detail":
                            (
                                "Could not locate "
                                "the starting point."
                            )
                    },

                    status=
                        status.HTTP_400_BAD_REQUEST,
                )


            start_lat = float(
                start_location[
                    "latitude"
                ]
            )


            start_lon = float(
                start_location[
                    "longitude"
                ]
            )


        # ====================================================
        # DESTINATION
        # ====================================================

        destination_location = None


        if (
            destination_lat_param
            not in (
                None,
                "",
            )
            and
            destination_lng_param
            not in (
                None,
                "",
            )
        ):

            try:

                destination_lat = float(
                    destination_lat_param
                )


                destination_lon = float(
                    destination_lng_param
                )


                if not (
                    -90
                    <=
                    destination_lat
                    <=
                    90
                ):

                    raise ValueError


                if not (
                    -180
                    <=
                    destination_lon
                    <=
                    180
                ):

                    raise ValueError


                destination_location = {

                    "latitude":
                        destination_lat,

                    "longitude":
                        destination_lon,

                    "display_name":
                        destination,

                }


            except (
                ValueError,
                TypeError,
            ):

                destination_location = None


        if destination_location is None:

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


            if not destination_location:

                return Response(
                    {
                        "detail":
                            (
                                "Could not locate "
                                "the destination."
                            )
                    },

                    status=
                        status.HTTP_400_BAD_REQUEST,
                )


            destination_lat = float(
                destination_location[
                    "latitude"
                ]
            )


            destination_lon = float(
                destination_location[
                    "longitude"
                ]
            )


        # ====================================================
        # DIRECT ROUTE DISTANCE
        #
        # This remains Haversine for recommendation screening.
        #
        # FoodWalkMap can display/use actual routed navigation
        # separately.
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
        # ROUTE TYPE
        # ====================================================

        if (
            travel_mode == "walk"
            and
            route_distance_km <= 5
        ):

            route_type = (
                "food_walk"
            )

        else:

            route_type = (
                "food_trail"
            )


        # ====================================================
        # RESTAURANT QUERYSET
        # ====================================================

        queryset = (

            Restaurant.objects

            .filter(

                is_active=True,

                latitude__isnull=False,

                longitude__isnull=False,
            )

            .prefetch_related(
                "images",
                "menu_items",
            )
        )


        # ====================================================
        # DIET DATABASE FILTER
        # ====================================================

        if dietary_preference in (
            "vegetarian",
            "vegan",
        ):

            queryset = (
                queryset.filter(
                    serves_vegetarian=True
                )
            )


        elif dietary_preference in (
            "non_vegetarian",
            "non-vegetarian",
            "nonveg",
            "non_veg",
        ):

            queryset = (
                queryset.filter(
                    serves_non_vegetarian=True
                )
            )


        # ====================================================
        # RESTAURANT LOOP
        # ====================================================

        restaurants = []


        for restaurant in queryset:

            # =================================================
            # ROUTE DISTANCE
            # =================================================

            try:

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


            except (
                ValueError,
                TypeError,
            ):

                continue


            if (
                distance_from_route
                >
                max_detour_km
            ):

                continue


            # =================================================
            # OPEN NOW
            # =================================================

            if (
                open_now
                and
                not self
                ._restaurant_is_open_now(
                    restaurant
                )
            ):

                continue


            # =================================================
            # HIGHLY RATED
            # =================================================

            rating = (
                self._safe_float(
                    restaurant.rating,
                    0.0,
                )
            )


            if (
                highly_rated
                and
                rating < 4.0
            ):

                continue


            # =================================================
            # BUDGET
            # =================================================

            average_cost_for_two = (
                self._safe_float(

                    restaurant
                    .average_cost_for_two,

                    None,
                )
            )


            if (
                max_cost_for_two
                is not None
                and
                average_cost_for_two
                is not None
                and
                average_cost_for_two
                >
                max_cost_for_two
            ):

                continue


            # =================================================
            # VEGAN MENU CHECK
            #
            # Restaurant model only contains a generic
            # serves_vegetarian boolean.
            #
            # For Vegan, inspect available menu items.
            # =================================================

            menu_items = (
                self._menu_items(
                    restaurant
                )
            )


            if (
                dietary_preference
                ==
                "vegan"
            ):

                has_vegan_item = any(

                    getattr(
                        item,
                        "food_type",
                        "",
                    )
                    ==
                    "vegan"

                    and

                    getattr(
                        item,
                        "is_available",
                        True,
                    )

                    for item
                    in menu_items
                )


                if not has_vegan_item:
                    continue


            # =================================================
            # CUISINE / FOOD SEARCH
            # =================================================

            cuisine_match = False


            if cuisine:

                normalized_cuisine = (
                    cuisine
                    .lower()
                    .replace(
                        "_",
                        " ",
                    )
                )


                restaurant_cuisine = (
                    str(
                        restaurant.cuisine
                        or ""
                    )
                    .lower()
                    .replace(
                        "_",
                        " ",
                    )
                )


                cuisine_match = (
                    normalized_cuisine
                    in
                    restaurant_cuisine
                    or
                    restaurant_cuisine
                    in
                    normalized_cuisine
                )


                if not cuisine_match:

                    cuisine_match = (
                        self._text_matches(
                            restaurant,
                            cuisine,
                        )
                    )


            food_query_match = False


            if food_query:

                food_query_match = (
                    self._text_matches(
                        restaurant,
                        food_query,
                    )
                )


            # =================================================
            # WALK TYPE MATCH
            # =================================================

            walk_type_match = False


            if walk_type == "street_food":

                walk_type_match = (

                    restaurant.cuisine
                    ==
                    "street_food"

                    or

                    self._text_matches(
                        restaurant,
                        "street food",
                    )
                )


            elif walk_type == "cafes":

                walk_type_match = (

                    restaurant.restaurant_type
                    ==
                    "cafe"

                    or

                    restaurant.cuisine
                    ==
                    "cafe"
                )


            elif walk_type == "desserts":

                walk_type_match = (

                    restaurant.cuisine
                    ==
                    "desserts"

                    or

                    any(
                        getattr(
                            item,
                            "category",
                            "",
                        )
                        ==
                        "dessert"

                        for item
                        in menu_items
                    )
                )


            elif walk_type == "breakfast":

                walk_type_match = (

                    self._text_matches(
                        restaurant,
                        "breakfast",
                    )

                    or

                    self._text_matches(
                        restaurant,
                        "dosa",
                    )

                    or

                    self._text_matches(
                        restaurant,
                        "idli",
                    )
                )


            elif walk_type == "night_food":

                # There is no dedicated late-night field yet.
                # Opening/closing time is the best current signal.

                if restaurant.closing_time:

                    try:

                        walk_type_match = (
                            restaurant.closing_time.hour
                            >=
                            22

                            or

                            restaurant.closing_time.hour
                            <=
                            4
                        )

                    except Exception:

                        walk_type_match = False


            elif walk_type == "local_favourites":

                local_cuisines = {
                    "south_indian",
                    "karnataka",
                    "kerala",
                    "tamil",
                    "andhra",
                    "telangana",
                    "hyderabadi",
                    "maharashtrian",
                    "goan",
                    "bengali",
                    "punjabi",
                }


                walk_type_match = (
                    restaurant.cuisine
                    in
                    local_cuisines
                )


            elif walk_type == "hidden_gems":

                # FoodKindl currently has no review_count /
                # popularity field, so Hidden Gems is a ranking
                # preference instead of a strict filter.

                walk_type_match = True


            elif walk_type in (
                "surprise_me",
                "",
            ):

                walk_type_match = True


            else:

                walk_type_match = (
                    self._text_matches(
                        restaurant,
                        walk_type,
                    )
                )


            # =================================================
            # RECOMMENDATION SCORE
            # =================================================

            score = 0.0


            # -------------------------------------------------
            # ROUTE PROXIMITY — strongest signal
            # -------------------------------------------------

            if (
                distance_from_route
                <=
                0.25
            ):

                score += 40


            elif (
                distance_from_route
                <=
                0.5
            ):

                score += 32


            elif (
                distance_from_route
                <=
                1.0
            ):

                score += 24


            elif (
                distance_from_route
                <=
                2.0
            ):

                score += 15


            else:

                score += max(
                    0,
                    12
                    -
                    distance_from_route,
                )


            # -------------------------------------------------
            # RATING
            # -------------------------------------------------

            if rating:

                score += (
                    rating *
                    5
                )


            # -------------------------------------------------
            # FOODKINDL PARTNER
            # -------------------------------------------------

            if (
                restaurant
                .is_foodkindl_partner
            ):

                score += 15


            # -------------------------------------------------
            # BOOKING SUPPORT
            # -------------------------------------------------

            if (
                restaurant
                .accepts_foodkindl_booking
            ):

                score += 8


            # -------------------------------------------------
            # CUISINE
            # -------------------------------------------------

            if cuisine_match:

                score += 28


            # -------------------------------------------------
            # CUSTOM FOOD QUERY
            # -------------------------------------------------

            if food_query_match:

                score += 32


            # -------------------------------------------------
            # WALK TYPE
            # -------------------------------------------------

            if walk_type_match:

                score += 25


            # -------------------------------------------------
            # HIGHLY RATED
            # -------------------------------------------------

            if (
                highly_rated
                and
                rating >= 4.5
            ):

                score += 15


            # -------------------------------------------------
            # OPEN NOW
            # -------------------------------------------------

            if open_now:

                score += 8


            # -------------------------------------------------
            # BUDGET
            # -------------------------------------------------

            if (
                max_cost_for_two
                is not None
                and
                average_cost_for_two
                is not None
            ):

                budget_ratio = (

                    average_cost_for_two
                    /
                    max_cost_for_two
                )


                if budget_ratio <= 0.6:

                    score += 12


                elif budget_ratio <= 0.85:

                    score += 8


                else:

                    score += 4


            # -------------------------------------------------
            # HIDDEN GEMS
            #
            # With the current database there is no review
            # count / popularity score.
            #
            # Give some weight to good non-booking places
            # instead of filtering them out.
            # -------------------------------------------------

            if hidden_gems:

                if (
                    rating >= 4.0
                ):

                    score += 15


                if (
                    not restaurant
                    .accepts_foodkindl_booking
                ):

                    score += 8


            # =================================================
            # MUST TRY ITEM
            # =================================================

            best_menu_item = (
                self._best_menu_item(

                    restaurant,

                    food_query=
                        (
                            food_query
                            or cuisine
                        ),

                    walk_type=
                        walk_type,
                )
            )


            # =================================================
            # WHY RECOMMENDED
            # =================================================

            reasons = []


            if (
                distance_from_route
                <=
                0.5
            ):

                reasons.append(
                    "Very close to your route"
                )


            elif (
                distance_from_route
                <=
                1.0
            ):

                reasons.append(
                    "Small detour from your route"
                )


            if food_query_match:

                reasons.append(
                    "Matches what you're craving"
                )


            elif cuisine_match:

                reasons.append(
                    "Matches your food preference"
                )


            elif (
                walk_type_match
                and
                walk_type
                not in (
                    "",
                    "surprise_me",
                )
            ):

                reasons.append(
                    "Fits this Food Walk"
                )


            if rating >= 4.5:

                reasons.append(
                    "Highly rated"
                )


            if (
                restaurant
                .is_foodkindl_partner
            ):

                reasons.append(
                    "FoodKindl partner"
                )


            recommendation_reason = (
                " • ".join(
                    reasons[:2]
                )
            )


            # =================================================
            # APPEND
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

                    "food_query_match":
                        food_query_match,

                    "walk_type_match":
                        walk_type_match,

                    "must_try":
                        (
                            best_menu_item.name

                            if best_menu_item

                            else ""
                        ),

                    "recommendation_reason":
                        recommendation_reason,

                }
            )


        # ====================================================
        # SORT
        #
        # Don't simply sort by route_position.
        #
        # First choose strong recommendations, then the
        # frontend can order selected stops naturally.
        # ====================================================

        restaurants.sort(
            key=lambda item: (

                -
                item[
                    "recommendation_score"
                ],

                item[
                    "distance_from_route_km"
                ],

                item[
                    "route_position"
                ],

            )
        )


        # ====================================================
        # NUMBER OF RECOMMENDATIONS
        #
        # User may want 4 stops, but we should give more than
        # exactly 4 choices.
        # ====================================================

        recommendation_limit = min(

            20,

            max(
                8,
                preferred_stop_count
                * 3,
            ),
        )


        best_restaurants = (
            restaurants[
                :recommendation_limit
            ]
        )


        # ====================================================
        # FOR SURPRISE ME:
        #
        # Keep recommendations useful but spread them along
        # the route rather than returning only one cluster.
        # ====================================================

        if (
            walk_type
            ==
            "surprise_me"

            and
            len(restaurants)
            >
            recommendation_limit
        ):

            candidate_pool = (
                restaurants[:30]
            )


            candidate_pool.sort(
                key=lambda item:
                    item[
                        "route_position"
                    ]
            )


            if candidate_pool:

                selected = []

                used_ids = set()


                # Divide route into useful sections.
                segments = max(
                    preferred_stop_count,
                    4,
                )


                for segment_index in range(
                    segments
                ):

                    lower = (
                        segment_index
                        /
                        segments
                    )

                    upper = (
                        (
                            segment_index
                            +
                            1
                        )
                        /
                        segments
                    )


                    segment_items = [

                        item

                        for item
                        in candidate_pool

                        if (
                            item[
                                "route_position"
                            ]
                            >=
                            lower
                            and
                            item[
                                "route_position"
                            ]
                            <=
                            upper
                        )
                    ]


                    segment_items.sort(
                        key=lambda item:
                            -
                            item[
                                "recommendation_score"
                            ]
                    )


                    for item in segment_items[:2]:

                        restaurant_id = (
                            item[
                                "restaurant"
                            ].id
                        )


                        if (
                            restaurant_id
                            in
                            used_ids
                        ):

                            continue


                        used_ids.add(
                            restaurant_id
                        )

                        selected.append(
                            item
                        )


                # Fill remaining recommendation slots.
                for item in restaurants:

                    if (
                        len(selected)
                        >=
                        recommendation_limit
                    ):

                        break


                    restaurant_id = (
                        item[
                            "restaurant"
                        ].id
                    )


                    if (
                        restaurant_id
                        in
                        used_ids
                    ):

                        continue


                    used_ids.add(
                        restaurant_id
                    )

                    selected.append(
                        item
                    )


                best_restaurants = (
                    selected[
                        :recommendation_limit
                    ]
                )


        # ====================================================
        # PRESENT IN ROUTE ORDER
        #
        # Recommendations are chosen by quality but displayed
        # naturally from start -> destination.
        # ====================================================

        best_restaurants.sort(
            key=lambda item:
                item[
                    "route_position"
                ]
        )


        # ====================================================
        # SERIALIZE
        # ====================================================

        output = []


        for item in best_restaurants:

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


            restaurant_data[
                "food_query_match"
            ] = (
                item[
                    "food_query_match"
                ]
            )


            restaurant_data[
                "walk_type_match"
            ] = (
                item[
                    "walk_type_match"
                ]
            )


            # New FoodWalkPlanner.jsx understands these.

            restaurant_data[
                "must_try"
            ] = (
                item[
                    "must_try"
                ]
            )


            restaurant_data[
                "recommendation_reason"
            ] = (
                item[
                    "recommendation_reason"
                ]
            )


            output.append(
                restaurant_data
            )


        # ====================================================
        # OPENSTREETMAP / OVERPASS FOOD DISCOVERY
        #
        # Food Walk now uses OpenStreetMap as the external food
        # discovery source. Foursquare is intentionally NOT called.
        #
        # OSM is queried for:
        #   amenity=restaurant
        #   amenity=cafe
        #   amenity=fast_food
        #   amenity=food_court
        #   amenity=ice_cream
        #   tourism=hotel + restaurant=yes
        #
        # The local FoodKindl Restaurant table is still included.
        # ====================================================

        osm_output = []


        try:

            osm_output = (
                search_openstreetmap_food_along_route(
                    request,

                    start_lat=
                        start_lat,

                    start_lon=
                        start_lon,

                    destination_lat=
                        destination_lat,

                    destination_lon=
                        destination_lon,

                    max_detour_km=
                        max_detour_km,

                    travel_mode=
                        travel_mode,

                    cuisine=
                        cuisine,

                    food_query=
                        food_query,
                )
            )


        except Exception as exc:

            print(
                "OPENSTREETMAP FOOD WALK ERROR:",
                repr(
                    exc
                ),
            )

            traceback.print_exc()

            osm_output = []


        print(
            "FOOD WALK PROVIDERS:",
            "database=",
            len(
                output
            ),
            "openstreetmap=",
            len(
                osm_output
            ),
        )


        # ====================================================
        # MERGE + DEDUPLICATE
        # ====================================================

        merged_output = []

        seen_keys = set()


        for place in (
            output
            +
            osm_output
        ):

            name_key = (
                str(
                    place.get(
                        "name",
                        "",
                    )
                    or ""
                )
                .strip()
                .lower()
            )


            latitude_key = (
                round(
                    float(
                        place.get(
                            "latitude",
                            0,
                        )
                        or 0
                    ),
                    4,
                )
            )


            longitude_key = (
                round(
                    float(
                        place.get(
                            "longitude",
                            0,
                        )
                        or 0
                    ),
                    4,
                )
            )


            duplicate_key = (
                name_key,
                latitude_key,
                longitude_key,
            )


            if (
                duplicate_key
                in
                seen_keys
            ):
                continue


            seen_keys.add(
                duplicate_key
            )

            merged_output.append(
                place
            )


        # Choose by recommendation quality first.
        merged_output.sort(
            key=lambda place: (
                -
                float(
                    place.get(
                        "recommendation_score",
                        0,
                    )
                    or 0
                ),

                float(
                    place.get(
                        "distance_from_route_km",
                        999,
                    )
                    or 999
                ),
            )
        )


        merged_output = (
            merged_output[
                :recommendation_limit
            ]
        )


        # Display naturally from route start to destination.
        merged_output.sort(
            key=lambda place:
                float(
                    place.get(
                        "route_position",
                        0,
                    )
                    or 0
                )
        )


        output = (
            merged_output
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
                            start,
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
                            destination,
                        ),

                },


                "route_type":
                    route_type,


                "travel_mode":
                    travel_mode,


                "route_distance_km":
                    round(
                        route_distance_km,
                        2,
                    ),


                "max_detour_km":
                    max_detour_km,


                "preferred_stop_count":
                    preferred_stop_count,


                "walk_type":
                    walk_type,


                "filters": {

                    "cuisine":
                        cuisine,

                    "food_query":
                        food_query,

                    "dietary_preference":
                        dietary_preference,

                    "max_budget":
                        max_budget,

                    "open_now":
                        open_now,

                    "highly_rated":
                        highly_rated,

                    "hidden_gems":
                        hidden_gems,

                },


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
        
# ============================================================
# LOCATION AUTOCOMPLETE
# ============================================================

class LocationAutocompleteView(APIView):

    permission_classes = [
        AllowAny,
    ]


    @staticmethod
    def _clean_result(
        *,
        result_id,
        name,
        label,
        latitude,
        longitude,
        locality="",
        city="",
        state_name="",
        country="",
        postcode="",
        source="",
    ):

        try:
            latitude = float(
                latitude
            )

            longitude = float(
                longitude
            )

        except (
            TypeError,
            ValueError,
        ):
            return None


        if not (
            -90 <= latitude <= 90
            and
            -180 <= longitude <= 180
        ):
            return None


        label = str(
            label or name or ""
        ).strip()

        name = str(
            name or label or ""
        ).strip()


        if not label:
            return None


        return {
            "id":
                str(
                    result_id
                    or
                    f"{latitude}:{longitude}"
                ),

            "name":
                name,

            "label":
                label,

            # Keep display_name for older FoodKindl components.
            "display_name":
                label,

            "locality":
                str(
                    locality or ""
                ).strip(),

            "city":
                str(
                    city or ""
                ).strip(),

            "state":
                str(
                    state_name or ""
                ).strip(),

            "country":
                str(
                    country or ""
                ).strip(),

            "postcode":
                str(
                    postcode or ""
                ).strip(),

            "latitude":
                latitude,

            "longitude":
                longitude,

            "source":
                source,
        }


    def _search_ors(
        self,
        query,
    ):

        api_key = (
            getattr(
                settings,
                "ORS_API_KEY",
                "",
            )
            or
            ""
        ).strip()


        if not api_key:
            return []


        response = requests.get(
            (
                "https://api.openrouteservice.org/"
                "geocode/autocomplete"
            ),

            params={
                "api_key":
                    api_key,

                "text":
                    query,

                "size":
                    8,

                # Bias toward Bengaluru without restricting the user
                # to Bengaluru.
                "focus.point.lat":
                    12.9716,

                "focus.point.lon":
                    77.5946,

                # ORS/Pelias expects ISO alpha-3.
                "boundary.country":
                    "IND",
            },

            headers={
                "Accept":
                    "application/json",

                "User-Agent":
                    "FoodKindl/1.0",
            },

            timeout=10,
        )


        response.raise_for_status()


        data = (
            response.json()
            or {}
        )


        results = []


        for feature in (
            data.get(
                "features",
                [],
            )
            or []
        ):

            properties = (
                feature.get(
                    "properties",
                    {},
                )
                or {}
            )

            geometry = (
                feature.get(
                    "geometry",
                    {},
                )
                or {}
            )

            coordinates = (
                geometry.get(
                    "coordinates",
                    [],
                )
                or []
            )


            if len(
                coordinates
            ) < 2:
                continue


            item = (
                self._clean_result(
                    result_id=
                        (
                            properties.get(
                                "gid"
                            )
                            or
                            properties.get(
                                "id"
                            )
                        ),

                    name=
                        (
                            properties.get(
                                "name"
                            )
                            or
                            properties.get(
                                "label"
                            )
                        ),

                    label=
                        (
                            properties.get(
                                "label"
                            )
                            or
                            properties.get(
                                "name"
                            )
                        ),

                    latitude=
                        coordinates[1],

                    longitude=
                        coordinates[0],

                    locality=
                        (
                            properties.get(
                                "locality"
                            )
                            or
                            properties.get(
                                "neighbourhood"
                            )
                            or
                            properties.get(
                                "borough"
                            )
                        ),

                    city=
                        (
                            properties.get(
                                "localadmin"
                            )
                            or
                            properties.get(
                                "county"
                            )
                        ),

                    state_name=
                        properties.get(
                            "region"
                        ),

                    country=
                        properties.get(
                            "country"
                        ),

                    postcode=
                        properties.get(
                            "postalcode"
                        ),

                    source=
                        "openrouteservice",
                )
            )


            if item:
                results.append(
                    item
                )


        return results


    def _search_nominatim(
        self,
        query,
    ):

        # For short locality names, Bengaluru context makes
        # results such as Nagasandra and Indiranagar much better.
        lower_query = (
            query.lower()
        )

        search_query = query

        if not any(
            city_word
            in lower_query
            for city_word
            in (
                "bengaluru",
                "bangalore",
            )
        ):
            search_query = (
                f"{query}, Bengaluru, Karnataka, India"
            )


        response = requests.get(
            (
                "https://nominatim.openstreetmap.org/"
                "search"
            ),

            params={
                "q":
                    search_query,

                "format":
                    "jsonv2",

                "addressdetails":
                    1,

                "limit":
                    8,

                "countrycodes":
                    "in",
            },

            headers={
                "Accept":
                    "application/json",

                # Nominatim requires an identifying User-Agent.
                "User-Agent":
                    "FoodKindl/1.0 "
                    "(location-autocomplete)",
            },

            timeout=10,
        )


        response.raise_for_status()


        data = (
            response.json()
            or []
        )


        results = []


        for result in data:

            address = (
                result.get(
                    "address",
                    {},
                )
                or {}
            )


            label = (
                result.get(
                    "display_name",
                    "",
                )
                or
                ""
            )


            name = (
                result.get(
                    "name"
                )
                or
                address.get(
                    "suburb"
                )
                or
                address.get(
                    "neighbourhood"
                )
                or
                address.get(
                    "quarter"
                )
                or
                query
            )


            item = (
                self._clean_result(
                    result_id=
                        result.get(
                            "place_id"
                        ),

                    name=
                        name,

                    label=
                        label,

                    latitude=
                        result.get(
                            "lat"
                        ),

                    longitude=
                        result.get(
                            "lon"
                        ),

                    locality=
                        (
                            address.get(
                                "suburb"
                            )
                            or
                            address.get(
                                "neighbourhood"
                            )
                            or
                            address.get(
                                "quarter"
                            )
                        ),

                    city=
                        (
                            address.get(
                                "city"
                            )
                            or
                            address.get(
                                "town"
                            )
                            or
                            address.get(
                                "municipality"
                            )
                        ),

                    state_name=
                        address.get(
                            "state"
                        ),

                    country=
                        address.get(
                            "country"
                        ),

                    postcode=
                        address.get(
                            "postcode"
                        ),

                    source=
                        "openstreetmap",
                )
            )


            if item:
                results.append(
                    item
                )


        return results


    def get(
        self,
        request,
    ):

        query = (
            request
            .query_params
            .get(
                "q",
                "",
            )
            .strip()
        )


        if len(
            query
        ) < 2:

            return Response(
                {
                    "query":
                        query,

                    "count":
                        0,

                    "results":
                        [],
                },

                status=
                    status.HTTP_200_OK,
            )


        results = []

        provider_errors = []


        # ====================================================
        # PRIMARY: OPENROUTESERVICE
        # ====================================================

        try:

            results = (
                self._search_ors(
                    query
                )
            )

        except requests.RequestException as exc:

            provider_errors.append(
                (
                    "OpenRouteService: "
                    f"{exc}"
                )
            )


        # ====================================================
        # FALLBACK: OPENSTREETMAP / NOMINATIM
        # ====================================================

        if not results:

            try:

                results = (
                    self._search_nominatim(
                        query
                    )
                )

            except requests.RequestException as exc:

                provider_errors.append(
                    (
                        "OpenStreetMap: "
                        f"{exc}"
                    )
                )


        return Response(
            {
                "query":
                    query,

                "count":
                    len(
                        results
                    ),

                "results":
                    results,

                # Helpful during development; frontend can ignore it.
                "provider_errors":
                    provider_errors,
            },

            status=
                status.HTTP_200_OK,
        )



class RestaurantSubmissionListCreateView(
    generics.ListCreateAPIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = (
        RestaurantSubmissionSerializer
    )


    def get_queryset(
        self,
    ):

        return (
            RestaurantSubmission.objects
            .filter(
                submitted_by=
                    self.request.user,
            )
            .select_related(
                "submitted_by",
                "approved_restaurant",
            )
            .order_by(
                "-created_at"
            )
        )


    def perform_create(
        self,
        serializer,
    ):

        serializer.save(
            submitted_by=
                self.request.user,

            status=
                "pending",
        )


# ============================================================
# RESTAURANT SUBMISSION DETAIL
# ============================================================

class RestaurantSubmissionDetailView(
    generics.RetrieveAPIView
):

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = (
        RestaurantSubmissionSerializer
    )


    def get_queryset(
        self,
    ):

        return (
            RestaurantSubmission.objects
            .filter(
                submitted_by=
                    self.request.user,
            )
            .select_related(
                "submitted_by",
                "approved_restaurant",
            )
        )


# IMPORTANT:
# FoodInviteSerializer already declares recipient_user_ids
# as a write-only field. The default ModelSerializer.update()
# cannot save that non-model field, so editing invitees needs a
# custom update() method.

def update(
    self,
    instance,
    validated_data,
):

    recipient_user_ids = (
        validated_data.pop(
            "recipient_user_ids",
            None,
        )
    )


    # --------------------------------------------------------
    # UPDATE NORMAL FOOD INVITE FIELDS
    # --------------------------------------------------------

    for (
        attribute,
        value,
    ) in validated_data.items():

        setattr(
            instance,
            attribute,
            value,
        )


    instance.save()


    # --------------------------------------------------------
    # UPDATE INVITED MEMBERS
    # --------------------------------------------------------

    if (
        recipient_user_ids
        is not None
    ):

        unique_ids = []

        seen = set()


        for user_id in recipient_user_ids:

            try:

                value = int(
                    user_id
                )

            except (
                TypeError,
                ValueError,
            ):

                continue


            if (
                value <= 0
                or
                value in seen
            ):

                continue


            seen.add(
                value
            )

            unique_ids.append(
                value
            )


        creator_id = (
            instance.creator_user_id
        )


        unique_ids = [
            user_id

            for user_id
            in unique_ids

            if user_id
            != creator_id
        ]


        # Existing participant records.
        existing = {

            participant.user_id:
                participant

            for participant
            in instance.participants.all()
        }


        requested_ids = set(
            unique_ids
        )


        # Remove users no longer selected.
        # This includes invited / accepted / declined users.
        # If you prefer not to remove accepted users, add a
        # status condition here.
        instance.participants.exclude(
            user_id__in=
                requested_ids
        ).delete()


        # Add new users or restore declined users to invited.
        for user_id in unique_ids:

            participant = (
                existing.get(
                    user_id
                )
            )


            if participant:

                if (
                    participant.status
                    ==
                    ParticipantStatus.DECLINED
                ):

                    participant.status = (
                        ParticipantStatus.INVITED
                    )

                    participant.responded_at = (
                        None
                    )

                    participant.save(
                        update_fields=[
                            "status",
                            "responded_at",
                        ]
                    )


                continue


            FoodInviteParticipant.objects.create(
                invite=instance,
                user_id=user_id,
                status=
                    ParticipantStatus.INVITED,
            )


    return instance

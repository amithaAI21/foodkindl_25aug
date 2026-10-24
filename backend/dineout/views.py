from .google_places import is_food_place
import math
import logging



import requests

from django.db.models import Q
from django.core.cache import cache

from rest_framework import (

    permissions,

    status,

    viewsets,

)

from rest_framework.decorators import action

from rest_framework.response import Response

from rest_framework.views import APIView



from .models import (

    DineOut,

    DineOutResponse,

)

from .serializers import (

    DineOutResponseSerializer,

    DineOutSerializer,

)





from django.contrib.auth import get_user_model

from rest_framework.generics import ListAPIView

from rest_framework.permissions import IsAuthenticated

from django.db import transaction

from .serializers import DineOutMemberSerializer



from django.db import transaction

from django.shortcuts import get_object_or_404



from rest_framework import (

    permissions,

    status,

    viewsets,

)

from rest_framework.decorators import action

from rest_framework.response import Response



from .google_places import search_google_places, search_locations, PlacesUnavailable
from rest_framework.throttling import UserRateThrottle
from invites.models import Restaurant as FoodKindlRestaurant



logger = logging.getLogger(__name__)

User = get_user_model()





NOMINATIM_URL = (

    "https://nominatim.openstreetmap.org"

)



HTTP_HEADERS = {

    "User-Agent": (

        "FoodKindl/1.0 "

        "(contact@foodkindl.org)"

    ),

}



def distance_km(

    latitude_one,

    longitude_one,

    latitude_two,

    longitude_two,

):

    earth_radius = 6371



    phi_one = math.radians(

        latitude_one

    )



    phi_two = math.radians(

        latitude_two

    )



    delta_phi = math.radians(

        latitude_two - latitude_one

    )



    delta_longitude = math.radians(

        longitude_two - longitude_one

    )



    value = (

        math.sin(delta_phi / 2) ** 2

        + math.cos(phi_one)

        * math.cos(phi_two)

        * math.sin(

            delta_longitude / 2

        ) ** 2

    )



    return (

        earth_radius

        * 2

        * math.atan2(

            math.sqrt(value),

            math.sqrt(1 - value),

        )

    )





class PlacesSearchThrottle(UserRateThrottle):
    scope = "foodkindl_google_places"
    rate = "30/min"


class LocationAutocompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PlacesSearchThrottle]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if len(query) < 3:
            return Response({"results": []})
        if len(query) > 200:
            return Response({"detail": "Location query is too long."}, status=400)
        try:
            limit = max(1, min(8, int(request.query_params.get("limit", 8))))
            return Response({"results": search_locations(query, limit)})
        except (TypeError, ValueError):
            return Response({"detail": "Invalid search limit."}, status=400)
        except PlacesUnavailable as error:
            return Response({"detail": str(error), "results": []}, status=503)


class RestaurantRecommendationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PlacesSearchThrottle]

    def get(self, request):
        try:
            latitude = float(request.query_params["latitude"])
            longitude = float(request.query_params["longitude"])
            radius = int(request.query_params.get("radius", 3000))
            limit = int(request.query_params.get("limit", 50))
        except (KeyError, TypeError, ValueError):
            return Response({"detail": "Valid latitude, longitude, radius and limit are required."},
                            status=status.HTTP_400_BAD_REQUEST)
        if not (math.isfinite(latitude) and math.isfinite(longitude)
                and -90 <= latitude <= 90 and -180 <= longitude <= 180):
            return Response({"detail": "Invalid coordinates."}, status=status.HTTP_400_BAD_REQUEST)

        radius = max(500, min(radius, 10000))
        limit = max(1, min(limit, 50))
        source = request.query_params.get("source", "all").strip().lower()
        if source not in {"all", "partner", "other"}:
            return Response({"detail": "Invalid restaurant source."}, status=status.HTTP_400_BAD_REQUEST)
        place_type = request.query_params.get("place_type", "all").strip().lower()
        if place_type not in {"all", "restaurant", "cafe"}:
            return Response({"detail": "Invalid place_type."}, status=status.HTTP_400_BAD_REQUEST)
        cuisine = request.query_params.get("cuisine", "").strip().lower()
        diet = request.query_params.get("diet", "all").strip().lower()
        if diet not in {"all", "veg", "vegetarian", "nonveg", "non_veg", "non-veg"}:
            return Response({"detail": "Invalid diet."}, status=status.HTTP_400_BAD_REQUEST)

        # FoodKindl listings are queried live, not from the external-places cache.
        partner_results = []
        partner_rows = FoodKindlRestaurant.objects.filter(
            is_active=True,
            is_foodkindl_partner=True,
            latitude__isnull=False,
            longitude__isnull=False,
        )
        for restaurant in partner_rows:
            lat, lon = float(restaurant.latitude), float(restaurant.longitude)
            if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
                continue
            km = distance_km(latitude, longitude, lat, lon)
            if km * 1000 > radius:
                continue
            amenity = restaurant.restaurant_type or "restaurant"
            if not is_food_place(restaurant.name, ["restaurant" if amenity == "hotel" else "fast_food_restaurant" if amenity == "fast_food" else amenity]):
                continue
            if amenity == "hotel":
                amenity = "restaurant"
            if place_type != "all" and amenity != place_type:
                continue
            cuisine_label = restaurant.get_cuisine_display() if restaurant.cuisine else ""
            if cuisine and cuisine != "all cuisines" and cuisine.replace("_", " ") not in cuisine_label.lower():
                continue
            if diet in {"veg", "vegetarian"} and not restaurant.serves_vegetarian:
                continue
            if diet in {"nonveg", "non_veg", "non-veg"} and not restaurant.serves_non_vegetarian:
                continue
            partner_results.append({
                "id": f"foodkindl-{restaurant.pk}",
                "name": restaurant.name,
                "latitude": lat,
                "longitude": lon,
                "distance_km": round(km, 2),
                "amenity": amenity,
                "category": amenity,
                "cuisine": cuisine_label,
                "address": restaurant.address or ", ".join(filter(None, [restaurant.locality, restaurant.city])),
                "phone": restaurant.phone_number,
                "website": restaurant.website,
                "opening_hours": (
                    f"{restaurant.opening_time.strftime('%H:%M')}-{restaurant.closing_time.strftime('%H:%M')}"
                    if restaurant.opening_time and restaurant.closing_time else ""
                ),
                "diet_vegetarian": "yes" if restaurant.serves_vegetarian else "no",
                "diet_non_vegetarian": "yes" if restaurant.serves_non_vegetarian else "no",
                "wheelchair": "yes" if restaurant.wheelchair_accessible else "no",
                "internet_access": "yes" if restaurant.has_wifi else "no",
                "payment_methods": ["cards"] if restaurant.accepts_cards else [],
                "source": "foodkindl",
                "is_foodkindl_partner": True,
                "accepts_foodkindl_booking": restaurant.accepts_foodkindl_booking,
                "image_url": restaurant.image_url,
            })
        partner_results.sort(key=lambda place: place["distance_km"])

        # Partner-only queries must not depend on Overpass availability or latency.
        if source == "partner":
            results = partner_results[:limit]
            return Response({
                "count": len(results), "results": results,
                "requested_radius_metres": radius,
                "searched_radius_metres": radius,
                "mapped_places_in_area": 0,
                "partner_restaurants_found": len(partner_results),
                "external_search_unavailable": False,
            })

        # Google listing content is not persisted in the old OSM cache.
        effective_radius = radius
        overpass_unavailable = False  # Backwards-compatible response field below.
        try:
            places = search_google_places(latitude, longitude, radius_metres=radius)
        except PlacesUnavailable as error:
            logger.warning("Google Places restaurant search unavailable")
            if source == "other":
                return Response({"detail": str(error), "results": []}, status=503)
            overpass_unavailable = True
            places = []

        external_results = []
        for place in places:
            tags = place["tags"]
            category = place["category"]
            if place_type != "all" and category != place_type:
                continue
            if cuisine and cuisine != "all cuisines" and cuisine.replace("_", " ") not in place["cuisine"].lower():
                continue
            veg = str(tags.get("diet:vegetarian", "")).lower()
            vegan = str(tags.get("diet:vegan", "")).lower()
            meat = str(tags.get("diet:meat", "")).lower()
            fish = str(tags.get("diet:fish", "")).lower()
            nonveg = str(tags.get("diet:non-vegetarian", "")).lower()
            if diet in {"veg", "vegetarian"} and not (veg == "yes" or vegan == "yes"):
                continue
            if diet in {"nonveg", "non_veg", "non-veg"} and not (
                    veg == "no" or meat == "yes" or fish == "yes" or nonveg == "yes"):
                continue
            km = distance_km(latitude, longitude, place["latitude"], place["longitude"])
            if km * 1000 > effective_radius:
                continue
            external_results.append({
                "id": place["id"], "name": place["name"],
                "latitude": place["latitude"], "longitude": place["longitude"],
                "distance_km": round(km, 2), "amenity": tags.get("amenity"),
                "category": category,
                "cuisine": place["cuisine"], "address": place["address"],
                "phone": place["phone"], "website": place["website"],
                "opening_hours": place["opening_hours"],
                "diet_vegetarian": place["diet_vegetarian"],
                "diet_vegan": place["diet_vegan"],
                "diet_meat": place["diet_meat"], "diet_fish": place["diet_fish"],
                "diet_non_vegetarian": place["diet_non_vegetarian"],
                "wheelchair": tags.get("wheelchair"),
                "internet_access": tags.get("internet_access"),
                "payment_methods": [key.removeprefix("payment:").replace("_", " ")
                                    for key, value in tags.items()
                                    if key.startswith("payment:") and str(value).lower() == "yes"],
                "source": "google", "is_foodkindl_partner": False,
                "google_place_id": place.get("google_place_id"),
                "rating": place.get("rating"), "review_count": place.get("review_count"),
                "attributions": place.get("attributions", []),
            })
        external_results.sort(key=lambda place: place["distance_km"])

        # Prefer the partner record when OSM contains the same physical venue.
        results = list(partner_results) if source == "all" else []
        for place in external_results:
            duplicate = any(
                place["name"].strip().casefold() == partner["name"].strip().casefold()
                and distance_km(place["latitude"], place["longitude"],
                                partner["latitude"], partner["longitude"]) < 0.12
                for partner in partner_results
            )
            if not duplicate:
                results.append(place)
        results = results[:limit]
        return Response({
            "count": len(results), "results": results,
            "requested_radius_metres": radius,
            "mapped_places_in_area": len(places),
            "searched_radius_metres": effective_radius,
            "partner_restaurants_found": len(partner_results),
            "external_search_unavailable": overpass_unavailable,
            "warning": (
                "Google Places is temporarily unavailable. Showing available FoodKindl Partner restaurants only."
                if overpass_unavailable else ""
            ),
        })


class DineOutViewSet(

    viewsets.ModelViewSet

):

    serializer_class = DineOutSerializer

    permission_classes = [

        permissions.IsAuthenticated,

    ]



    def get_queryset(self):

        user = self.request.user



        return (

            DineOut.objects

            .select_related("host")

            .prefetch_related(

                "invited_members",

                "responses",

                "responses__guest",

            )

            .filter(

                Q(host=user)

                | Q(

                    status=DineOut.Status.PUBLISHED,

                    visibility=DineOut.Visibility.PUBLIC,

                )

                | Q(

                    status=DineOut.Status.PUBLISHED,

                    visibility=DineOut.Visibility.INVITED_ONLY,

                    invited_members=user,

                )

            )

            .distinct()

        )



    def perform_create(self, serializer):

        serializer.save(host=self.request.user)



    @action(

        detail=True,

        methods=["post"],

        url_path="accept",

    )

    @transaction.atomic

    def accept(self, request, pk=None):

        dine_out = get_object_or_404(

            DineOut.objects

            .select_for_update()

            .prefetch_related("invited_members"),

            pk=pk,

        )



        if dine_out.status != DineOut.Status.PUBLISHED:

            return Response(

                {"detail": "This Dine Out is not available."},

                status=status.HTTP_400_BAD_REQUEST,

            )



        if dine_out.host_id == request.user.id:

            return Response(

                {

                    "detail": (

                        "The host cannot accept their own invitation."

                    ),

                },

                status=status.HTTP_400_BAD_REQUEST,

            )



        if dine_out.visibility != DineOut.Visibility.INVITED_ONLY:

            return Response(

                {

                    "detail": (

                        "Use Join for a public Dine Out."

                    ),

                },

                status=status.HTTP_400_BAD_REQUEST,

            )



        if not dine_out.invited_members.filter(

            id=request.user.id

        ).exists():

            return Response(

                {

                    "detail": (

                        "You are not a selected guest for this Dine Out."

                    ),

                },

                status=status.HTTP_403_FORBIDDEN,

            )



        existing_response = (

            DineOutResponse.objects

            .filter(

                dine_out=dine_out,

                guest=request.user,

            )

            .first()

        )



        if (

            existing_response

            and existing_response.status

            == DineOutResponse.Status.ACCEPTED

        ):

            return Response(

                DineOutResponseSerializer(

                    existing_response,

                    context={"request": request},

                ).data,

                status=status.HTTP_200_OK,

            )



        accepted_count = (

            DineOutResponse.objects

            .filter(

                dine_out=dine_out,

                status=DineOutResponse.Status.ACCEPTED,

            )

            .count()

        )



        if accepted_count >= dine_out.maximum_guests:

            return Response(

                {"detail": "This Dine Out is already full."},

                status=status.HTTP_409_CONFLICT,

            )



        invitation_response, _ = (

            DineOutResponse.objects

            .update_or_create(

                dine_out=dine_out,

                guest=request.user,

                defaults={

                    "status": DineOutResponse.Status.ACCEPTED,

                },

            )

        )



        return Response(

            DineOutResponseSerializer(

                invitation_response,

                context={"request": request},

            ).data,

            status=status.HTTP_200_OK,

        )



    @action(

        detail=True,

        methods=["post"],

        url_path="decline",

    )

    @transaction.atomic

    def decline(self, request, pk=None):

        dine_out = get_object_or_404(

            DineOut.objects.select_for_update(),

            pk=pk,

        )



        if dine_out.host_id == request.user.id:

            return Response(

                {

                    "detail": (

                        "The host cannot decline their own Dine Out."

                    ),

                },

                status=status.HTTP_400_BAD_REQUEST,

            )



        if (

            dine_out.visibility

            == DineOut.Visibility.INVITED_ONLY

            and not dine_out.invited_members.filter(

                id=request.user.id

            ).exists()

        ):

            return Response(

                {

                    "detail": (

                        "You are not a selected guest for this Dine Out."

                    ),

                },

                status=status.HTTP_403_FORBIDDEN,

            )



        invitation_response, _ = (

            DineOutResponse.objects

            .update_or_create(

                dine_out=dine_out,

                guest=request.user,

                defaults={

                    "status": DineOutResponse.Status.DECLINED,

                },

            )

        )



        return Response(

            DineOutResponseSerializer(

                invitation_response,

                context={"request": request},

            ).data,

            status=status.HTTP_200_OK,

        )



    @action(

        detail=False,

        methods=["get"],

        url_path="mine",

    )

    def mine(self, request):

        queryset = (

            self.get_queryset()

            .filter(

                Q(host=request.user)

                | Q(invited_members=request.user)

                | Q(

                    responses__guest=request.user,

                    responses__status=(

                        DineOutResponse.Status.ACCEPTED

                    ),

                )

            )

            .distinct()

        )



        page = self.paginate_queryset(queryset)



        if page is not None:

            serializer = self.get_serializer(page, many=True)

            return self.get_paginated_response(serializer.data)



        serializer = self.get_serializer(queryset, many=True)

        return Response(serializer.data)



    @action(

        detail=False,

        methods=["get"],

        url_path="invitations",

    )

    def invitations(self, request):

        queryset = (

            DineOut.objects

            .select_related("host")

            .prefetch_related(

                "invited_members",

                "responses",

                "responses__guest",

            )

            .filter(

                status=DineOut.Status.PUBLISHED,

                visibility=DineOut.Visibility.INVITED_ONLY,

                invited_members=request.user,

            )

            .distinct()

        )



        page = self.paginate_queryset(queryset)



        if page is not None:

            serializer = self.get_serializer(page, many=True)

            return self.get_paginated_response(serializer.data)



        serializer = self.get_serializer(queryset, many=True)

        return Response(serializer.data)



    @action(

        detail=True,

        methods=["post"],

        url_path="join",

    )

    @transaction.atomic

    def join(self, request, pk=None):

        dine_out = get_object_or_404(

            DineOut.objects

            .select_for_update(),

            pk=pk,

        )



        if (

            dine_out.status

            != DineOut.Status.PUBLISHED

        ):

            return Response(

                {

                    "detail": (

                        "This Dine Out is not available."

                    ),

                },

                status=(

                    status

                    .HTTP_400_BAD_REQUEST

                ),

            )



        if (

            dine_out.visibility

            != DineOut.Visibility.PUBLIC

        ):

            return Response(

                {

                    "detail": (

                        "This is a private Dine Out. "

                        "Only selected guests can accept it."

                    ),

                },

                status=(

                    status

                    .HTTP_403_FORBIDDEN

                ),

            )



        if (

            dine_out.host_id

            == request.user.id

        ):

            return Response(

                {

                    "detail": (

                        "The host is already attending."

                    ),

                },

                status=(

                    status

                    .HTTP_400_BAD_REQUEST

                ),

            )



        existing_response = (

            DineOutResponse.objects

            .filter(

                dine_out=dine_out,

                guest=request.user,

            )

            .first()

        )



        if (

            existing_response

            and existing_response.status

            == DineOutResponse.Status.ACCEPTED

        ):

            return Response(

                DineOutResponseSerializer(

                    existing_response

                ).data,

                status=status.HTTP_200_OK,

            )



        accepted_count = (

            DineOutResponse.objects

            .filter(

                dine_out=dine_out,

                status=(

                    DineOutResponse

                    .Status

                    .ACCEPTED

                ),

            )

            .count()

        )



        if (

            accepted_count

            >= dine_out.maximum_guests

        ):

            return Response(

                {

                    "detail": (

                        "This Dine Out is already full."

                    ),

                },

                status=(

                    status

                    .HTTP_409_CONFLICT

                ),

            )



        invitation_response, _ = (

            DineOutResponse.objects

            .update_or_create(

                dine_out=dine_out,

                guest=request.user,

                defaults={

                    "status": (

                        DineOutResponse

                        .Status

                        .ACCEPTED

                    ),

                },

            )

        )



        return Response(

            DineOutResponseSerializer(

                invitation_response,

                context={"request": request},

            ).data,

            status=status.HTTP_200_OK,

        )







class DineOutMemberListView(ListAPIView):

    serializer_class = DineOutMemberSerializer

    permission_classes = [IsAuthenticated]



    def get_queryset(self):

        return (

            User.objects

            .filter(

                is_active=True,

                is_staff=False,

                is_superuser=False,

            )

            .exclude(id=self.request.user.id)

            .order_by("first_name", "username")

        )

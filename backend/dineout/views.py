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



from .helper import search_places



logger = logging.getLogger(__name__)

User = get_user_model()





NOMINATIM_URL = (

    "https://nominatim.openstreetmap.org"

)



OVERPASS_URLS = [

    "https://overpass.private.coffee/api/interpreter",

    "https://overpass-api.de/api/interpreter",


]



HTTP_HEADERS = {

    "User-Agent": (

        "FoodKindl/1.0 "

        "(contact@foodkindl.org)"

    ),

}



def fetch_overpass_results(overpass_query):

    errors = []



    for overpass_url in OVERPASS_URLS:

        try:

            response = requests.post(

                overpass_url,

                data={

                    "data": overpass_query,

                },

                headers=HTTP_HEADERS,

                timeout=(4, 24),

            )



            response.raise_for_status()



            response_data = response.json()



            return response_data.get(

                "elements",

                [],

            )



        except (

            requests.RequestException,

            ValueError,

        ) as error:

            errors.append(

                f"{overpass_url}: {error}"

            )



            continue



    raise requests.RequestException(

        "All Overpass providers failed. "

        + " | ".join(errors)

    )



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





class LocationAutocompleteView(APIView):

    permission_classes = [

        permissions.AllowAny

    ]



    def get(self, request):

        query = (

            request.query_params

            .get("q", "")

            .strip()

        )



        if len(query) < 2:

            return Response({

                "results": [],

            })



        try:

            requested_limit = int(

                request.query_params.get(

                    "limit",

                    8,

                )

            )

        except (TypeError, ValueError):

            requested_limit = 8



        requested_limit = min(

            max(requested_limit, 1),

            10,

        )



        try:

            response = requests.get(

                (

                    f"{NOMINATIM_URL}"

                    "/search"

                ),

                params={

                    "q": query,

                    "format": "jsonv2",

                    "addressdetails": 1,

                    "countrycodes": "in",

                    "limit": requested_limit,

                },

                headers=HTTP_HEADERS,

                timeout=12,

            )



            response.raise_for_status()



        except requests.RequestException:

            return Response(

                {

                    "results": [],

                    "detail": (

                        "Location search is "

                        "temporarily unavailable."

                    ),

                },

                status=status.HTTP_200_OK,

            )



        results = []



        for place in response.json():

            address = (

                place.get("address")

                or {}

            )



            display_name = place.get(

                "display_name",

                "",

            )



            place_name = (

                place.get("name")

                or display_name.split(",")[0]

            )



            try:

                latitude = float(

                    place["lat"]

                )



                longitude = float(

                    place["lon"]

                )



            except (

                KeyError,

                TypeError,

                ValueError,

            ):

                continue



            results.append({

                "id": place.get("place_id"),

                "name": place_name,

                "display_name": display_name,

                "latitude": latitude,

                "longitude": longitude,

                "city": (

                    address.get("city")

                    or address.get("town")

                    or address.get("village")

                ),

                "state": address.get("state"),

                "country": address.get(

                    "country"

                ),

            })



        return Response({

            "results": results,

        })





class RestaurantRecommendationView(APIView):
    permission_classes = [permissions.AllowAny]

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
        radius = max(500, min(radius, 5000))
        limit = max(1, min(limit, 50))
        place_type = request.query_params.get("place_type", "all").strip().lower()
        if place_type not in {"all", "restaurant", "cafe"}:
            return Response({"detail": "Invalid place_type."}, status=status.HTTP_400_BAD_REQUEST)
        cuisine = request.query_params.get("cuisine", "").strip().lower()
        diet = request.query_params.get("diet", "all").strip().lower()
        if diet not in {"all", "veg", "vegetarian", "nonveg", "non_veg", "non-veg"}:
            return Response({"detail": "Invalid diet."}, status=status.HTTP_400_BAD_REQUEST)
        # Cache raw mapped places so all filters reuse the same Overpass response.
        cache_key = f"dineout:places:v8:{latitude:.4f}:{longitude:.4f}:{radius}"
        places = cache.get(cache_key)
        effective_radius = radius
        if places is None:
            for attempt_radius in [radius] + [r for r in (3000, 1500) if r < radius]:
                try:
                    places = search_places(latitude, longitude, radius_metres=attempt_radius,
                                           fetch_elements=fetch_overpass_results)
                    effective_radius = attempt_radius
                    break
                except requests.RequestException:
                    logger.warning("Overpass search failed for radius=%s", attempt_radius,
                                   exc_info=True)
            if places is None:
                return Response({"detail": "Restaurant search is temporarily unavailable.",
                                 "results": []}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            # Keep effective radius with the data; never imply fallback covered the whole area.
            if effective_radius == radius:
                cache.set(cache_key, (effective_radius, places), timeout=600)
        else:
            effective_radius, places = places

        results = []
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
            if km * 1000 > effective_radius + 10:
                continue
            results.append({
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
            })
        results.sort(key=lambda place: place["distance_km"])
        results = results[:limit]
        return Response({"count": len(results), "results": results,
                         "requested_radius_metres": radius,
                         "mapped_places_in_area": len(places),
                         "searched_radius_metres": effective_radius})


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

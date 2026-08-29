from rest_framework.permissions import (
    IsAuthenticated,
)

from rest_framework.response import (
    Response,
)

from rest_framework.views import (
    APIView,
)

from .serializers import (
    RestaurantDiscoverySerializer,
)

from .services import (
    discover_restaurants,
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

        search_query = (
            request.query_params
            .get(
                "query",
                "",
            )
            .strip()
        )


        city = (
            request.query_params
            .get(
                "city",
                "",
            )
            .strip()
        )


        locality = (
            request.query_params
            .get(
                "locality",
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


        limit = max(
            1,
            min(
                limit,
                100,
            ),
        )


        restaurants = (
            discover_restaurants(

                search_query=
                    search_query,

                city=
                    city,

                locality=
                    locality,

                cuisine=
                    cuisine,

                restaurant_type=
                    restaurant_type,

                limit=
                    limit,
            )
        )


        serializer = (
            RestaurantDiscoverySerializer(
                restaurants,
                many=True,
            )
        )


        return Response(
            {

                "query":
                    search_query,

                "city":
                    city,

                "locality":
                    locality,

                "cuisine":
                    cuisine,

                "type":
                    restaurant_type,

                "count":
                    len(
                        serializer.data
                    ),

                "results":
                    serializer.data,

            }
        )
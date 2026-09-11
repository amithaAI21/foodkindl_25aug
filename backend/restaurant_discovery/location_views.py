import requests

from django.conf import settings

from rest_framework import status

from rest_framework.permissions import (
     AllowAny,
)

from rest_framework.response import (
    Response,
)

from rest_framework.views import (
    APIView,
)


ORS_AUTOCOMPLETE_URL = (
    "https://api.heigit.org/"
    "pelias/v1/autocomplete"
)

class LocationSearchView(
    APIView
):

    permission_classes = [
        AllowAny,
    ]


    def get(
        self,
        request,
    ):

        query = (
            request.query_params
            .get(
                "q",
                "",
            )
            .strip()
        )


        if len(query) < 2:

            return Response({
                "query": query,
                "count": 0,
                "results": [],
            })


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

            return Response(
                {
                    "detail":
                        "ORS_API_KEY is not configured."
                },
                status=
                    status.HTTP_503_SERVICE_UNAVAILABLE,
            )


        try:

            response = requests.get(
                        ORS_AUTOCOMPLETE_URL,
                        params={
                            "api_key": settings.ORS_API_KEY,
                            "text": query,
                            "size": 100,
                            "boundary.country": "IN",
                        },
                        headers={
                            "Accept": "application/json",
                        },
                        timeout=12,
                    )


            print(
                "AUTOCOMPLETE STATUS:",
                response.status_code,
            )

            print(
                "AUTOCOMPLETE BODY:",
                response.text[:1000],
            )


            if response.status_code in (
                401,
                403,
            ):

                return Response(
                    {
                        "detail":
                            "OpenRouteService rejected the API key."
                    },
                    status=
                        status.HTTP_503_SERVICE_UNAVAILABLE,
                )


            response.raise_for_status()

            data = response.json()


        except requests.Timeout:

            return Response(
                {
                    "detail":
                        "Location search timed out."
                },
                status=
                    status.HTTP_504_GATEWAY_TIMEOUT,
            )


        except requests.RequestException as exc:

            return Response(
                {
                    "detail":
                        "Location search is temporarily unavailable.",

                    "error":
                        str(exc),
                },
                status=
                    status.HTTP_503_SERVICE_UNAVAILABLE,
            )


        results = []


        for feature in data.get(
            "features",
            [],
        ):

            properties = (
                feature.get(
                    "properties",
                    {},
                )
                or
                {}
            )


            coordinates = (
                feature
                .get(
                    "geometry",
                    {},
                )
                .get(
                    "coordinates",
                    [],
                )
            )


            if len(coordinates) < 2:
                continue


            try:

                longitude = float(
                    coordinates[0]
                )

                latitude = float(
                    coordinates[1]
                )


            except (
                TypeError,
                ValueError,
            ):

                continue


            label = (
                properties.get(
                    "label"
                )
                or
                properties.get(
                    "name"
                )
                or
                ""
            ).strip()


            if not label:
                continue


            results.append({
                "id":
                    (
                        properties.get(
                            "id"
                        )
                        or
                        properties.get(
                            "gid"
                        )
                        or
                        label
                    ),

                "name":
                    (
                        properties.get(
                            "name"
                        )
                        or
                        label
                    ),

                "display_name":
                    label,

                "locality":
                    (
                        properties.get(
                            "locality"
                        )
                        or
                        properties.get(
                            "localadmin"
                        )
                        or
                        ""
                    ),

                "county":
                    properties.get(
                        "county",
                        "",
                    ),

                "region":
                    properties.get(
                        "region",
                        "",
                    ),

                "country":
                    properties.get(
                        "country",
                        "",
                    ),

                "latitude":
                    latitude,

                "longitude":
                    longitude,
            })


        return Response({
            "query":
                query,

            "count":
                len(results),

            "results":
                results,
        })
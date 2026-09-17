import math

import requests
from geopy.exc import GeocoderServiceError, GeocoderTimedOut
from geopy.geocoders import Nominatim
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


OSRM_URL = "https://router.project-osrm.org/route/v1/driving"

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# Search restaurants at points spread across the whole route.
ROUTE_SEARCH_POINTS = 30
SEARCH_RADIUS_METERS = 1400
MAX_PLACES_PER_SECTION = 4
TIMEOUT_SECONDS = 35


def haversine_km(lat1, lon1, lat2, lon2):
    radius = 6371.0

    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)

    a_value = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )

    return radius * 2 * math.atan2(
        math.sqrt(a_value),
        math.sqrt(1 - a_value),
    )


def sample_route_by_distance(route_coordinates):
    """
    Select points at equal distances across the route.

    This avoids concentrating restaurant searches near the start point.
    """
    if len(route_coordinates) < 2:
        return []

    cumulative_distances = [0.0]

    for index in range(1, len(route_coordinates)):
        previous_lon, previous_lat = route_coordinates[index - 1]
        longitude, latitude = route_coordinates[index]

        segment_distance = haversine_km(
            previous_lat,
            previous_lon,
            latitude,
            longitude,
        )

        cumulative_distances.append(
            cumulative_distances[-1] + segment_distance
        )

    total_distance_km = cumulative_distances[-1]

    if total_distance_km <= 0:
        return []

    samples = []

    for step in range(1, ROUTE_SEARCH_POINTS + 1):
        target_distance = (
            total_distance_km * step / (ROUTE_SEARCH_POINTS + 1)
        )

        closest_index = min(
            range(len(cumulative_distances)),
            key=lambda index: abs(
                cumulative_distances[index] - target_distance
            ),
        )

        longitude, latitude = route_coordinates[closest_index]

        samples.append(
            {
                "latitude": latitude,
                "longitude": longitude,
                "progress": target_distance / total_distance_km,
            }
        )

    return samples


def build_overpass_query(samples):
    """
    Build one lightweight restaurant lookup across the full route.
    """
    query_blocks = []

    for sample in samples:
        latitude = sample["latitude"]
        longitude = sample["longitude"]

        around = (
            f"around:{SEARCH_RADIUS_METERS},"
            f"{latitude},{longitude}"
        )

        query_blocks.extend(
            [
                (
                    f'node({around})'
                    '["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"];'
                ),
                (
                    f'way({around})'
                    '["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"];'
                ),
                (
                    f'relation({around})'
                    '["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"];'
                ),
            ]
        )

    return f"""
    [out:json][timeout:45];
    (
        {"".join(query_blocks)}
    );
    out center tags;
    """


def get_overpass_elements(samples):
    """
    Try two Overpass servers. If one is busy, use the second.
    """
    query = build_overpass_query(samples)
    last_error = ""

    for endpoint in OVERPASS_ENDPOINTS:
        try:
            response = requests.post(
                endpoint,
                data={"data": query},
                headers={
                    "User-Agent": "FoodKindl FoodWalk/1.0",
                },
                timeout=65,
            )

            response.raise_for_status()

            data = response.json()

            return data.get("elements", []), ""

        except (requests.RequestException, ValueError) as error:
            last_error = str(error)

    return [], last_error or "Restaurant lookup failed."


def closest_route_sample(latitude, longitude, samples):
    closest = min(
        samples,
        key=lambda sample: haversine_km(
            latitude,
            longitude,
            sample["latitude"],
            sample["longitude"],
        ),
    )

    distance_from_route = haversine_km(
        latitude,
        longitude,
        closest["latitude"],
        closest["longitude"],
    )

    return closest["progress"], distance_from_route


def get_route_section(progress):
    if progress < 0.25:
        return "Start stretch"

    if progress < 0.50:
        return "Early route"

    if progress < 0.75:
        return "Mid-route"

    return "Destination stretch"


def convert_elements_to_places(elements, samples):
    places = []
    seen = set()

    for element in elements:
        osm_type = element.get("type")
        osm_id = element.get("id")

        if not osm_type or osm_id is None:
            continue

        unique_id = f"{osm_type}-{osm_id}"

        if unique_id in seen:
            continue

        seen.add(unique_id)

        if osm_type == "node":
            latitude = element.get("lat")
            longitude = element.get("lon")
        else:
            center = element.get("center") or {}
            latitude = center.get("lat")
            longitude = center.get("lon")

        if latitude is None or longitude is None:
            continue

        tags = element.get("tags") or {}
        name = tags.get("name")

        # Do not show unnamed food places to users.
        if not name:
            continue

        progress, distance_from_route = closest_route_sample(
            latitude,
            longitude,
            samples,
        )

        address = ", ".join(
            value
            for value in [
                tags.get("addr:street"),
                tags.get("addr:suburb"),
                tags.get("addr:city"),
            ]
            if value
        )

        places.append(
            {
                "id": unique_id,
                "osm_id": osm_id,
                "osm_type": osm_type,
                "name": name,
                "amenity": tags.get("amenity", "food_place"),
                "cuisine": tags.get("cuisine", ""),
                "address": address,
                "latitude": float(latitude),
                "longitude": float(longitude),
                "route_progress": round(progress * 100),
                "distance_from_route_km": round(
                    distance_from_route,
                    2,
                ),
                "route_section": get_route_section(progress),
            }
        )

    # Keep restaurants close enough to the actual Food Walk.
    places = [
        place
        for place in places
        if place["distance_from_route_km"] <= 1.6
    ]

    return sorted(
        places,
        key=lambda place: (
            place["route_progress"],
            place["distance_from_route_km"],
        ),
    )


def distribute_places_along_route(all_places):
    """
    Return restaurant names from each route quarter.

    This is the key logic that stops all restaurants
    appearing only near the start point.
    """
    sections = [
        "Start stretch",
        "Early route",
        "Mid-route",
        "Destination stretch",
    ]

    selected_places = []

    for section in sections:
        section_places = [
            place
            for place in all_places
            if place["route_section"] == section
        ]

        selected_places.extend(
            section_places[:MAX_PLACES_PER_SECTION]
        )

    return selected_places


@api_view(["POST"])
def plan_route_with_osm_places(request):
    start = str(request.data.get("start", "")).strip()
    end = str(request.data.get("end", "")).strip()

    if not start or not end:
        return Response(
            {
                "error": (
                    "Both start and end locations are required."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    geolocator = Nominatim(
        user_agent="FoodKindl-FoodWalk/1.0",
        timeout=TIMEOUT_SECONDS,
    )

    try:
        start_location = geolocator.geocode(
            start,
            exactly_one=True,
        )

        end_location = geolocator.geocode(
            end,
            exactly_one=True,
        )

    except (GeocoderTimedOut, GeocoderServiceError):
        return Response(
            {
                "error": (
                    "Location search is temporarily unavailable."
                )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not start_location or not end_location:
        return Response(
            {
                "error": (
                    "Please enter more specific start and destination names."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    start_latitude = float(start_location.latitude)
    start_longitude = float(start_location.longitude)

    end_latitude = float(end_location.latitude)
    end_longitude = float(end_location.longitude)

    try:
        route_response = requests.get(
            f"{OSRM_URL}/"
            f"{start_longitude},{start_latitude};"
            f"{end_longitude},{end_latitude}",
            params={
                "overview": "full",
                "geometries": "geojson",
            },
            timeout=TIMEOUT_SECONDS,
        )

        route_response.raise_for_status()

        route_data = route_response.json()
        routes = route_data.get("routes") or []

        if not routes:
            raise ValueError("No route found")

        selected_route = routes[0]

    except (
        requests.RequestException,
        ValueError,
    ):
        return Response(
            {
                "error": (
                    "A route could not be created for these locations."
                )
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    route = selected_route.get("geometry") or {}
    route_coordinates = route.get("coordinates") or []

    samples = sample_route_by_distance(route_coordinates)

    if not samples:
        return Response(
            {
                "error": "The route could not be processed."
            },
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    elements, lookup_error = get_overpass_elements(samples)

    all_places = convert_elements_to_places(
        elements,
        samples,
    )

    places = distribute_places_along_route(all_places)

    sections = [
        "Start stretch",
        "Early route",
        "Mid-route",
        "Destination stretch",
    ]

    recommended_stops = []

    for section in sections:
        stop = next(
            (
                place
                for place in places
                if place["route_section"] == section
            ),
            None,
        )

        if stop:
            recommended_stops.append(stop)

    response_data = {
        "route": route,
        "distance_km": round(
            selected_route.get("distance", 0) / 1000,
            1,
        ),
        "duration_minutes": round(
            selected_route.get("duration", 0) / 60
        ),
        "start": {
            "name": start_location.address,
            "latitude": start_latitude,
            "longitude": start_longitude,
        },
        "end": {
            "name": end_location.address,
            "latitude": end_latitude,
            "longitude": end_longitude,
        },
        "places_count": len(places),
        "all_places_count": len(all_places),
        "places": places,
        "recommended_stops": recommended_stops,
    }

    if lookup_error:
        response_data["warning"] = (
            f"Food-place lookup failed: {lookup_error}"
        )

    elif not places:
        response_data["warning"] = (
            "No named restaurants were found near this route. "
            "Try searching once again."
        )

    return Response(
        response_data,
        status=status.HTTP_200_OK,
    )
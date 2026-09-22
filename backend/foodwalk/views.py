import math
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from geopy.exc import GeocoderServiceError, GeocoderTimedOut
from geopy.geocoders import Nominatim
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Restaurant


ROUTE_URLS = {
    "walking": "https://routing.openstreetmap.de/routed-foot/route/v1/walking",
    "bike": "https://routing.openstreetmap.de/routed-bike/route/v1/bicycle",
    "car": "https://routing.openstreetmap.de/routed-car/route/v1/driving",
}

PHOTON_URL = "https://photon.komoot.io/api/"
GEOAPIFY_PLACES_URL = "https://api.geoapify.com/v2/places"
GEOAPIFY_API_KEY = os.environ.get("GEOAPIFY_API_KEY", "").strip()

MAX_RECOMMENDED_STOPS = 4
MAX_DETOUR_KM = 1.5
PHOTON_TIMEOUT_SECONDS = 7
PHOTON_RESULTS_PER_ROUTE_POINT = 25
GEOAPIFY_TIMEOUT_SECONDS = 15

# Do not show restaurants clustered around either input location.  Food Walk
# stops must be genuinely between the start and destination.
START_EXCLUSION_PROGRESS = 0.08
END_EXCLUSION_PROGRESS = 0.96

HEADERS = {"User-Agent": "FoodKindl Food Walk/1.0"}


def choose_travel_mode(straight_line_distance_km):
    """Choose a practical mode before requesting the road route.

    Up to 5 km: walking
    Over 5 km and up to 15 km: bike
    Over 15 km: car

    Using straight-line distance here avoids requesting a multi-thousand-km
    walking route before we know that a car route is required.
    """
    if straight_line_distance_km <= 5:
        return "walking"
    if straight_line_distance_km <= 15:
        return "bike"
    return "car"


def distance_km(lat1, lng1, lat2, lng2):
    earth_radius = 6371.0
    lat_diff = math.radians(lat2 - lat1)
    lng_diff = math.radians(lng2 - lng1)
    val = (
        math.sin(lat_diff / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(lng_diff / 2) ** 2
    )
    return earth_radius * 2 * math.atan2(math.sqrt(val), math.sqrt(1 - val))


def get_route_samples(coordinates, total_samples=10):
    """Return distance-even search points, not coordinate-index samples.

    OSRM often returns many geometry coordinates close to the start of a trip.
    Sampling by coordinate index therefore biases every restaurant search toward
    the start. This samples by travelled distance instead.
    """
    if len(coordinates) <= 2:
        return coordinates[:]

    segment_lengths = [
        distance_km(a[1], a[0], b[1], b[0])
        for a, b in zip(coordinates, coordinates[1:])
    ]
    total_length = sum(segment_lengths)
    if total_length <= 0:
        return [coordinates[0], coordinates[-1]]

    targets = [total_length * index / (total_samples - 1) for index in range(total_samples)]
    samples = []
    travelled = 0.0
    segment_index = 0
    for target in targets:
        while (
            segment_index < len(segment_lengths) - 1
            and travelled + segment_lengths[segment_index] < target
        ):
            travelled += segment_lengths[segment_index]
            segment_index += 1

        start_lng, start_lat = coordinates[segment_index]
        end_lng, end_lat = coordinates[segment_index + 1]
        segment_length = segment_lengths[segment_index]
        ratio = 0 if segment_length == 0 else (target - travelled) / segment_length
        samples.append([
            start_lng + (end_lng - start_lng) * ratio,
            start_lat + (end_lat - start_lat) * ratio,
        ])
    return samples


def route_position_and_detour(latitude, longitude, route_coordinates):
    """Find the nearest route segment and distance-based trip progress."""
    if len(route_coordinates) < 2:
        return 0.0, float("inf")

    point_lat_rad = math.radians(latitude)
    point_lng_rad = math.radians(longitude)
    mean_lat_rad = math.radians(
        sum(point[1] for point in route_coordinates) / len(route_coordinates)
    )
    earth_radius_km = 6371.0
    total_length = 0.0
    travelled = 0.0
    best_distance = float("inf")
    best_progress_distance = 0.0

    for (lng1, lat1), (lng2, lat2) in zip(route_coordinates, route_coordinates[1:]):
        x1 = earth_radius_km * math.radians(lng1) * math.cos(mean_lat_rad)
        y1 = earth_radius_km * math.radians(lat1)
        x2 = earth_radius_km * math.radians(lng2) * math.cos(mean_lat_rad)
        y2 = earth_radius_km * math.radians(lat2)
        px = earth_radius_km * point_lng_rad * math.cos(mean_lat_rad)
        py = earth_radius_km * point_lat_rad
        dx, dy = x2 - x1, y2 - y1
        segment_sq = dx * dx + dy * dy
        ratio = 0.0 if segment_sq == 0 else max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / segment_sq))
        nearest_x, nearest_y = x1 + ratio * dx, y1 + ratio * dy
        detour = math.hypot(px - nearest_x, py - nearest_y)
        segment_length = math.sqrt(segment_sq)

        if detour < best_distance:
            best_distance = detour
            best_progress_distance = travelled + segment_length * ratio
        travelled += segment_length
        total_length += segment_length

    return best_progress_distance / total_length if total_length else 0.0, best_distance


def get_category(amenity, cuisine):
    cuisine = (cuisine or "").lower()
    if amenity == "ice_cream" or "dessert" in cuisine:
        return "Dessert"
    if amenity == "bakery":
        return "Bakery"
    if amenity == "cafe":
        return "Café"
    if amenity == "fast_food":
        return "Quick Bite"
    if amenity == "food_court":
        return "Food Court"
    return "Restaurant"


def get_estimated_cost(amenity):
    price_map = {
        "bakery": 120,
        "ice_cream": 140,
        "fast_food": 180,
        "cafe": 220,
        "food_court": 260,
        "restaurant": 350,
    }
    return price_map.get(amenity, 250)


def get_places_from_database(route_coordinates):
    places = []
    for restaurant in Restaurant.objects.all():
        progress, detour = route_position_and_detour(
            restaurant.latitude,
            restaurant.longitude,
            route_coordinates,
        )
        if (
            detour > MAX_DETOUR_KM
            or progress < START_EXCLUSION_PROGRESS
            or progress > END_EXCLUSION_PROGRESS
        ):
            continue
        places.append(
            {
                "id": f"foodkindl-{restaurant.id}",
                "name": restaurant.name,
                "latitude": restaurant.latitude,
                "longitude": restaurant.longitude,
                "cuisine": restaurant.cuisine or "",
                "amenity": "restaurant",
                "category": "Restaurant",
                "estimated_cost": 350,
                "route_progress": round(progress * 100),
                "distance_from_route_km": round(detour, 2),
                "source": "foodkindl",
            }
        )
    return places


def get_places_from_geoapify(
    route_coordinates,
    route_samples,
    maximum_detour_km,
):
    """Fetch restaurant POIs around points distributed along the route."""
    if not GEOAPIFY_API_KEY:
        print("Geoapify skipped: GEOAPIFY_API_KEY is missing")
        return [], "missing_api_key"

    search_points = route_samples[1:-1]
    radius_m = min(20000, max(3000, int(maximum_detour_km * 1000)))

    def fetch_point(sample):
        longitude, latitude = sample
        response = requests.get(
            GEOAPIFY_PLACES_URL,
            params={
                "categories": (
                    "catering.restaurant,catering.cafe,"
                    "catering.fast_food,catering.food_court"
                ),
                "filter": f"circle:{longitude},{latitude},{radius_m}",
                "bias": f"proximity:{longitude},{latitude}",
                "limit": 40,
                "lang": "en",
                "apiKey": GEOAPIFY_API_KEY,
            },
            headers=HEADERS,
            timeout=GEOAPIFY_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.json().get("features", [])

    features = []
    errors = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(fetch_point, point) for point in search_points]
        for future in as_completed(futures):
            try:
                features.extend(future.result())
            except requests.HTTPError as exc:
                status_code = (
                    exc.response.status_code
                    if exc.response is not None
                    else "unknown"
                )
                errors.append(f"HTTP {status_code}")
                print("Geoapify HTTP error:", status_code, exc)
            except (requests.RequestException, ValueError) as exc:
                errors.append(type(exc).__name__)
                print("Geoapify lookup error:", exc)

    places = []
    seen = set()
    for feature in features:
        properties = feature.get("properties") or {}
        coordinates = (feature.get("geometry") or {}).get("coordinates") or []
        name = str(properties.get("name") or "").strip()
        if not name or len(coordinates) < 2:
            continue

        longitude = float(properties.get("lon", coordinates[0]))
        latitude = float(properties.get("lat", coordinates[1]))
        place_id = properties.get("place_id") or f"{latitude:.6f}-{longitude:.6f}"
        unique_id = f"geoapify-{place_id}"
        if unique_id in seen:
            continue
        seen.add(unique_id)

        progress, detour = route_position_and_detour(
            latitude,
            longitude,
            route_coordinates,
        )
        if (
            detour > maximum_detour_km
            or progress < START_EXCLUSION_PROGRESS
            or progress > END_EXCLUSION_PROGRESS
        ):
            continue

        raw = ((properties.get("datasource") or {}).get("raw") or {})
        cuisine = str(properties.get("cuisine") or raw.get("cuisine") or "")
        categories = properties.get("categories") or []
        if "catering.cafe" in categories:
            amenity = "cafe"
        elif "catering.fast_food" in categories:
            amenity = "fast_food"
        elif "catering.food_court" in categories:
            amenity = "food_court"
        else:
            amenity = str(raw.get("amenity") or "restaurant")

        places.append(
            {
                "id": unique_id,
                "name": name,
                "amenity": amenity,
                "cuisine": cuisine.replace(";", ", "),
                "latitude": latitude,
                "longitude": longitude,
                "category": get_category(amenity, cuisine),
                "estimated_cost": get_estimated_cost(amenity),
                "route_progress": round(progress * 100),
                "distance_from_route_km": round(detour, 2),
                "source": "geoapify",
            }
        )

    diagnostic = "ok" if places else ", ".join(sorted(set(errors))) or "no_results"
    return sorted(
        places,
        key=lambda place: (
            place["route_progress"],
            place["distance_from_route_km"],
        ),
    ), diagnostic


def get_places_from_photon(route_coordinates, route_samples):
    """Fetch named restaurants around middle-route points from Photon.

    Photon is an OSM-powered search service. Unlike Overpass, it needs no
    query language or API key. We deliberately search only the middle route
    points, then validate every returned location against the actual route.
    """
    places = []
    seen = set()
    for longitude, latitude in route_samples[1:-1]:
        try:
            response = requests.get(
                PHOTON_URL,
                params={
                    "q": "restaurant",
                    "lat": latitude,
                    "lon": longitude,
                    "limit": PHOTON_RESULTS_PER_ROUTE_POINT,
                    "lang": "en",
                },
                headers=HEADERS,
                timeout=PHOTON_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            features = response.json().get("features", [])
        except (requests.RequestException, ValueError) as exc:
            print("Photon lookup error:", exc)
            continue

        for feature in features:
            properties = feature.get("properties") or {}
            coordinates = (feature.get("geometry") or {}).get("coordinates") or []
            if len(coordinates) < 2:
                continue

            name = str(properties.get("name") or "").strip()
            if not name:
                continue
            lon, lat = float(coordinates[0]), float(coordinates[1])
            osm_type = properties.get("osm_type") or "place"
            osm_id = properties.get("osm_id") or f"{lat:.5f}-{lon:.5f}"
            unique_id = f"photon-{osm_type}-{osm_id}"
            if unique_id in seen:
                continue
            seen.add(unique_id)

            progress, detour = route_position_and_detour(lat, lon, route_coordinates)
            if (
                detour > MAX_DETOUR_KM
                or progress < START_EXCLUSION_PROGRESS
                or progress > END_EXCLUSION_PROGRESS
            ):
                continue

            amenity = str(properties.get("osm_value") or "restaurant")
            cuisine = str(properties.get("cuisine") or "")
            places.append(
                {
                    "id": unique_id,
                    "name": name,
                    "amenity": amenity,
                    "cuisine": cuisine,
                    "latitude": lat,
                    "longitude": lon,
                    "category": get_category(amenity, cuisine),
                    "estimated_cost": get_estimated_cost(amenity),
                    "route_progress": round(progress * 100),
                    "distance_from_route_km": round(detour, 2),
                    "source": "photon",
                }
            )
    return sorted(places, key=lambda p: (p["route_progress"], p["distance_from_route_km"]))


@api_view(["POST"])
def build_food_walk(request):
    start = str(request.data.get("start", "")).strip()
    end = str(request.data.get("end", "")).strip()
    requested_travel_mode = str(request.data.get("travel_mode", "auto")).lower()

    # The React frontend may use "bicycle", while this backend and the route
    # service use "bike".
    if requested_travel_mode == "bicycle":
        requested_travel_mode = "bike"
    try:
        budget_per_person = int(request.data.get("budget_per_person", 1000))
    except (TypeError, ValueError):
        budget_per_person = 1000
    budget_per_person = max(200, min(budget_per_person, 10000))

    if not start or not end:
        return Response({"error": "Please choose both a start and destination."}, status=400)

    if requested_travel_mode not in {*ROUTE_URLS, "auto"}:
        return Response(
            {"error": "Travel mode must be auto, walking, bike, bicycle, or car."},
            status=400,
        )

    try:
        geolocator = Nominatim(user_agent="FoodKindl-FoodWalk/1.0", timeout=8)
        start_loc = geolocator.geocode(start)
        end_loc = geolocator.geocode(end)
    except (GeocoderTimedOut, GeocoderServiceError):
        return Response({"error": "Location service is temporarily unavailable."}, status=503)

    if not start_loc or not end_loc:
        return Response({"error": "Start or end location not found."}, status=400)

    start_lat, start_lon = float(start_loc.latitude), float(start_loc.longitude)
    end_lat, end_lon = float(end_loc.latitude), float(end_loc.longitude)

    straight_line_distance_km = distance_km(
        start_lat,
        start_lon,
        end_lat,
        end_lon,
    )
    automatic_mode = choose_travel_mode(straight_line_distance_km)

    # "auto" chooses by distance. An explicit bike or car choice is always
    # respected, regardless of distance. Only an unsuitable walking request is
    # automatically upgraded for a route above 5 km.
    travel_mode = requested_travel_mode
    if requested_travel_mode == "auto":
        travel_mode = automatic_mode
    elif requested_travel_mode == "walking" and straight_line_distance_km > 5:
        travel_mode = automatic_mode
    elif requested_travel_mode == "bike":
        travel_mode = "bike"
    elif requested_travel_mode == "car":
        travel_mode = "car"

    route_timeout_seconds = 45 if straight_line_distance_km > 500 else 25

    try:
        route_resp = requests.get(
            f"{ROUTE_URLS[travel_mode]}/{start_lon},{start_lat};{end_lon},{end_lat}",
            params={"overview": "full", "geometries": "geojson"},
            headers=HEADERS,
            timeout=route_timeout_seconds,
        )
        route_resp.raise_for_status()
        route_data = route_resp.json()
        routes = route_data.get("routes", [])
        if not routes:
            raise ValueError("No route found")
        route = routes[0]
        geometry = route.get("geometry", {})
        coords = geometry.get("coordinates", [])
        if not coords:
            raise ValueError("No route geometry")
    except (requests.RequestException, ValueError):
        return Response({"error": "Could not create route. Try nearby locations."}, status=502)

    route_distance_km = round(route.get("distance", 0) / 1000, 1)
    if route_distance_km > 150:
        sample_count = min(24, max(12, math.ceil(route_distance_km / 35) + 2))
        maximum_detour_km = 15.0
    elif route_distance_km > 25:
        sample_count = 12
        maximum_detour_km = 5.0
    else:
        sample_count = 8
        maximum_detour_km = MAX_DETOUR_KM

    route_samples = get_route_samples(coords, total_samples=sample_count)

    database_places = get_places_from_database(coords)
    external_places, geoapify_status = get_places_from_geoapify(
        coords,
        route_samples,
        maximum_detour_km,
    )
    restaurant_provider = "geoapify" if external_places else None

    # Photon remains a fallback, but Geoapify is the primary POI provider.
    if not external_places:
        external_places = get_places_from_photon(coords, route_samples)
        if external_places:
            restaurant_provider = "photon"

    all_places = database_places + external_places

    # Deduplicate places by (name, lat, lon)
    unique = {}
    for place in all_places:
        key = (place["name"].lower(), round(place["latitude"], 4), round(place["longitude"], 4))
        if key not in unique:
            unique[key] = place

    places = sorted(unique.values(), key=lambda p: (p["route_progress"], p["distance_from_route_km"]))

    recommended_stops = []
    total_cost = 0
    selected_categories = set()

    preferred_positions = [0.18, 0.42, 0.67, 0.88]
    for preferred_pos in preferred_positions:
        candidates = [
            p for p in places
            if p["id"] not in {stop["id"] for stop in recommended_stops}
            and total_cost + p["estimated_cost"] <= budget_per_person
        ]
        if not candidates:
            continue

        def score(place):
            route_penalty = abs(place["route_progress"] / 100 - preferred_pos) * 100
            detour_penalty = place["distance_from_route_km"] * 22
            dup_penalty = 18 if place["category"] in selected_categories else 0
            cost_penalty = place["estimated_cost"] / 80
            return route_penalty + detour_penalty + dup_penalty + cost_penalty

        best_place = min(candidates, key=score)
        recommended_stops.append(best_place)
        selected_categories.add(best_place["category"])
        total_cost += best_place["estimated_cost"]
        if len(recommended_stops) >= MAX_RECOMMENDED_STOPS:
            break

    duration_min = round(route.get("duration", 0) / 60)

    return Response({
        "route": geometry,
        "travel_mode": travel_mode,
        "requested_travel_mode": requested_travel_mode,
        "straight_line_distance_km": round(straight_line_distance_km, 1),
        "distance_km": route_distance_km,
        "duration_minutes": duration_min,
        "budget_per_person": budget_per_person,
        "estimated_total_per_person": total_cost,
        "maximum_detour_km": maximum_detour_km,
        "restaurant_search_samples": sample_count,
        "restaurant_provider": restaurant_provider,
        "restaurant_candidates_found": len(all_places),
        "geoapify_status": geoapify_status,
        "start": {
            "name": start_loc.address,
            "latitude": start_lat,
            "longitude": start_lon,
        },
        "end": {
            "name": end_loc.address,
            "latitude": end_lat,
            "longitude": end_lon,
        },
        "recommended_stops": recommended_stops,
        "places": places[:60],
        "warning": (
            f"Travel mode was changed from {requested_travel_mode} to {travel_mode} because of the route distance."
            if requested_travel_mode not in {"auto", travel_mode} else None
        ),
        "message": (
            "No named food places were found near this route. Try a shorter route or try again shortly."
            if not places else None
        )
    })


@api_view(["GET"])
def location_suggestions(request):
    """Photon autocomplete in the response shape used by LocationAutocomplete."""
    query = str(request.query_params.get("q", "")).strip()
    if len(query) < 2:
        return Response([])

    try:
        requested_limit = int(request.query_params.get("limit", 8))
    except (TypeError, ValueError):
        requested_limit = 8
    requested_limit = max(1, min(requested_limit, 10))

    try:
        response = requests.get(
            PHOTON_URL,
            params={
                "q": query,
                "limit": requested_limit,
                "lang": "en",
                # India bounding box: west, south, east, north.
                "bbox": "68.1,6.5,97.5,37.6",
            },
            headers=HEADERS,
            timeout=PHOTON_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        features = response.json().get("features", [])
    except (requests.RequestException, ValueError):
        return Response(
            {"error": "Location search is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    suggestions = []
    seen = set()
    for feature in features:
        properties = feature.get("properties") or {}
        coordinates = (feature.get("geometry") or {}).get("coordinates") or []
        if len(coordinates) < 2:
            continue

        longitude, latitude = float(coordinates[0]), float(coordinates[1])
        name = str(properties.get("name") or properties.get("osm_key") or "Location").strip()
        city = str(properties.get("city") or "").strip()
        state_name = str(properties.get("state") or "").strip()
        country = str(properties.get("country") or "India").strip()
        display_name = ", ".join(part for part in [name, city, state_name, country] if part)
        key = (name.lower(), round(latitude, 5), round(longitude, 5))
        if key in seen:
            continue
        seen.add(key)

        osm_id = properties.get("osm_id")
        suggestions.append(
            {
                "id": osm_id or f"{latitude:.5f}-{longitude:.5f}",
                "place_id": osm_id,
                "osm_id": osm_id,
                "name": name,
                "label": display_name,
                "display_name": display_name,
                "latitude": latitude,
                "longitude": longitude,
                "locality": city or state_name,
                "area": state_name,
                "city": city,
                "state": state_name,
                "country": country,
                "properties": properties,
            }
        )

    return Response(suggestions)

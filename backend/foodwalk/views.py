"""Google-backed Food Walk API.

Required: GOOGLE_MAPS_API_KEY with Geocoding, Places API (New),
Routes API enabled, and an active billing account.
"""

import math
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Restaurant


GOOGLE_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
TIMEOUT = 15
MAX_STOPS = 4
MAX_DETOUR_KM = 2.0


def api_key():
    return GOOGLE_KEY or str(
        getattr(settings, "GOOGLE_MAPS_API_KEY", "") or ""
    ).strip()


def google_get(url, params):
    response = requests.get(
        url,
        params={**params, "key": api_key()},
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def google_post(url, body, field_mask=None):
    headers = {
        "X-Goog-Api-Key": api_key(),
        "Content-Type": "application/json",
    }

    if field_mask:
        headers["X-Goog-FieldMask"] = field_mask

    response = requests.post(
        url,
        json=body,
        headers=headers,
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def geocode(value):
    """Geocode an address or accept a 'latitude,longitude' GPS value."""
    parts = str(value).strip().split(",")

    if len(parts) == 2:
        try:
            latitude, longitude = (
                float(part.strip()) for part in parts
            )

            if (
                -90 <= latitude <= 90
                and -180 <= longitude <= 180
            ):
                return {
                    "name": "Current location",
                    "latitude": latitude,
                    "longitude": longitude,
                }
        except ValueError:
            pass

    result = google_get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
            "address": value,
            "region": "in",
            "components": "country:IN",
        },
    )

    if result.get("status") != "OK" or not result.get("results"):
        raise ValueError(f"Location not found: {value}")

    item = result["results"][0]
    point = item["geometry"]["location"]

    return {
        "name": item["formatted_address"],
        "latitude": float(point["lat"]),
        "longitude": float(point["lng"]),
    }


def haversine(point_a, point_b):
    """Return the distance in kilometres between two lat/lng pairs."""
    lat1, lng1 = point_a
    lat2, lng2 = point_b

    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dlat = p2 - p1
    dlng = math.radians(lng2 - lng1)

    haversine_value = (
        math.sin(dlat / 2) ** 2
        + math.cos(p1)
        * math.cos(p2)
        * math.sin(dlng / 2) ** 2
    )

    return 6371 * 2 * math.asin(
        min(1, math.sqrt(haversine_value))
    )


def decode_polyline(encoded):
    """Decode Google's encoded polyline into GeoJSON [lng, lat] pairs."""
    coordinates = []
    index = 0
    latitude = 0
    longitude = 0

    while index < len(encoded):
        differences = []

        for _ in (0, 1):
            shift = 0
            result = 0

            while True:
                char = ord(encoded[index]) - 63
                index += 1

                result |= (char & 31) << shift
                shift += 5

                if char < 32:
                    break

            difference = (
                ~(result >> 1)
                if result & 1
                else result >> 1
            )
            differences.append(difference)

        latitude += differences[0]
        longitude += differences[1]

        # GeoJSON coordinate order is [longitude, latitude].
        coordinates.append(
            [longitude / 1e5, latitude / 1e5]
        )

    return coordinates


def route_sample_points(coordinates, count=10):
    """Sample approximately uniformly by distance along a route."""
    if len(coordinates) < 2:
        return coordinates

    if count <= 1:
        return [coordinates[0]]

    segment_lengths = [
        haversine(
            (point_a[1], point_a[0]),
            (point_b[1], point_b[0]),
        )
        for point_a, point_b in zip(
            coordinates,
            coordinates[1:],
        )
    ]

    total_length = sum(segment_lengths)

    if total_length <= 0:
        return [coordinates[0], coordinates[-1]]

    samples = []
    accumulated = 0.0
    segment_index = 0

    for index in range(count):
        target_distance = (
            total_length * index / (count - 1)
        )

        while (
            segment_index < len(segment_lengths) - 1
            and accumulated + segment_lengths[segment_index]
            < target_distance
        ):
            accumulated += segment_lengths[segment_index]
            segment_index += 1

        segment_length = segment_lengths[segment_index] or 1
        weight = max(
            0.0,
            min(
                1.0,
                (target_distance - accumulated) / segment_length,
            ),
        )

        point_a = coordinates[segment_index]
        point_b = coordinates[segment_index + 1]

        samples.append(
            [
                point_a[0]
                + weight * (point_b[0] - point_a[0]),
                point_a[1]
                + weight * (point_b[1] - point_a[1]),
            ]
        )

    return samples


def route_position(point, coordinates):
    """Return route progress and distance from the nearest route point."""
    if len(coordinates) < 2:
        return 0, float("inf")

    latitude, longitude = point
    latitude_factor = math.cos(math.radians(latitude))

    segment_lengths = [
        haversine(
            (point_a[1], point_a[0]),
            (point_b[1], point_b[0]),
        )
        for point_a, point_b in zip(
            coordinates,
            coordinates[1:],
        )
    ]

    total_length = sum(segment_lengths) or 1
    best_detour = float("inf")
    best_progress = 0.0
    travelled = 0.0

    for (
        (longitude_1, latitude_1),
        (longitude_2, latitude_2),
        segment_length,
    ) in zip(
        coordinates,
        coordinates[1:],
        segment_lengths,
    ):
        dx = (longitude_2 - longitude_1) * latitude_factor
        dy = latitude_2 - latitude_1
        denominator = dx * dx + dy * dy

        if denominator:
            projection = (
                (longitude - longitude_1)
                * latitude_factor
                * dx
                + (latitude - latitude_1) * dy
            ) / denominator

            weight = max(0, min(1, projection))
        else:
            weight = 0

        nearest_point = (
            latitude_1 + weight * (latitude_2 - latitude_1),
            longitude_1 + weight * (longitude_2 - longitude_1),
        )

        detour = haversine(point, nearest_point)

        if detour < best_detour:
            best_detour = detour
            best_progress = (
                travelled + weight * segment_length
            ) / total_length

        travelled += segment_length

    return best_progress, best_detour


def nearby(sample, radius=1400, max_results=20):
    longitude, latitude = sample

    result = google_post(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
            "includedTypes": [
                "restaurant",
                "cafe",
                "bakery",
                "meal_takeaway",
            ],
            "maxResultCount": max_results,
            "rankPreference": "POPULARITY",
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": latitude,
                        "longitude": longitude,
                    },
                    "radius": float(radius),
                }
            },
        },
        (
            "places.id,places.displayName,places.location,"
            "places.primaryType,places.rating,places.priceLevel,"
            "places.businessStatus,places.photos,"
            "places.currentOpeningHours.openNow"
        ),
    )

    return result.get("places", [])


def search_named_restaurants(query, origin, radius_km):
    """Find a user-requested restaurant near the trip start/route."""
    radius_metres = max(1000, min(int(radius_km * 1000), 50000))
    result = google_post(
        "https://places.googleapis.com/v1/places:searchText",
        {
            "textQuery": query,
            "pageSize": 5,
            "regionCode": "IN",
            "languageCode": "en",
            "locationBias": {
                "circle": {
                    "center": {
                        "latitude": origin["latitude"],
                        "longitude": origin["longitude"],
                    },
                    "radius": float(radius_metres),
                }
            },
        },
        (
            "places.id,places.displayName,places.location,"
            "places.primaryType,places.rating,places.priceLevel,"
            "places.businessStatus,places.photos,"
            "places.currentOpeningHours.openNow"
        ),
    )
    return result.get("places", [])


def search_restaurants_near_start(query, latitude, longitude):
    """Text-search nearby businesses to supplement the 20-result Nearby cap."""
    result = google_post(
        "https://places.googleapis.com/v1/places:searchText",
        {
            "textQuery": query,
            "pageSize": 20,
            "regionCode": "IN",
            "languageCode": "en",
            "locationBias": {
                "circle": {
                    "center": {
                        "latitude": latitude,
                        "longitude": longitude,
                    },
                    "radius": 2500.0,
                }
            },
        },
        (
            "places.id,places.displayName,places.location,"
            "places.primaryType,places.rating,places.priceLevel,"
            "places.businessStatus,places.photos,"
            "places.currentOpeningHours.openNow"
        ),
    )
    return result.get("places", [])


@api_view(["GET"])
def nearby_restaurants(request):
    """Return popular restaurant markers around a selected start location."""
    if not api_key():
        return Response(
            {"error": "GOOGLE_MAPS_API_KEY is not configured."},
            status=503,
        )

    try:
        latitude = request.query_params.get("latitude")
        longitude = request.query_params.get("longitude")

        if latitude is not None and longitude is not None:
            latitude = float(latitude)
            longitude = float(longitude)
            if not (
                math.isfinite(latitude)
                and math.isfinite(longitude)
                and -90 <= latitude <= 90
                and -180 <= longitude <= 180
            ):
                return Response(
                    {"error": "Invalid starting coordinates."},
                    status=400,
                )
            start_location = {
                "name": "Selected starting point",
                "latitude": latitude,
                "longitude": longitude,
            }
        else:
            location = str(
                request.query_params.get("location") or ""
            ).strip()
            if not location:
                return Response(
                    {"error": "Provide a starting location."},
                    status=400,
                )
            start_location = geocode(location)
            latitude = start_location["latitude"]
            longitude = start_location["longitude"]

        # Search Nearby favors popular local businesses; Text Search supplements
        # its 20-result cap so a well-known place like Nandhana Palace can appear.
        rows = nearby(
            (longitude, latitude),
            radius=2500,
            max_results=20,
        )
        area_name = str(start_location.get("name") or "").strip()
        text_query = (
            f"restaurants near {area_name}"
            if area_name and area_name != "Selected starting point"
            else "restaurants"
        )
        try:
            rows.extend(
                search_restaurants_near_start(
                    text_query,
                    latitude,
                    longitude,
                )
            )
        except (requests.RequestException, ValueError, KeyError):
            # Keep the Nearby results if the supplemental query fails.
            pass

        places = []
        seen_ids = set()
        for item in rows:
            point = item.get("location") or {}
            place_lat = point.get("latitude")
            place_lng = point.get("longitude")
            place_id = item.get("id")
            if place_lat is None or place_lng is None or not place_id:
                continue
            if place_id in seen_ids:
                continue
            seen_ids.add(place_id)
            if item.get("businessStatus") == "CLOSED_PERMANENTLY":
                continue

            places.append({
                "id": f"google-{place_id}",
                "place_id": place_id,
                "name": (item.get("displayName") or {}).get("text", "Food stop"),
                "latitude": place_lat,
                "longitude": place_lng,
                "category": category(item.get("primaryType", "restaurant")),
                "rating": item.get("rating"),
                "open_now": (item.get("currentOpeningHours") or {}).get("openNow"),
                "photo_resource": next(
                    (photo.get("name") for photo in item.get("photos", []) if photo.get("name")),
                    None,
                ),
                "estimated_cost": estimate_cost(item),
                "estimated_cost_is_approximate": True,
                "distance_from_start_km": round(
                    haversine((latitude, longitude), (float(place_lat), float(place_lng))),
                    2,
                ),
                "near_start": True,
                "source": "google",
            })

        return Response({"start": start_location, "places": places})
    except (requests.RequestException, ValueError, KeyError) as exc:
        return Response(
            {"error": f"Nearby restaurant search failed: {exc}"},
            status=502,
        )


def estimate_cost(place):
    """Return an approximate food cost, not a menu price."""
    price_estimates = {
        "PRICE_LEVEL_INEXPENSIVE": 150,
        "PRICE_LEVEL_MODERATE": 300,
        "PRICE_LEVEL_EXPENSIVE": 600,
        "PRICE_LEVEL_VERY_EXPENSIVE": 900,
    }

    return price_estimates.get(place.get("priceLevel"), 250)


def category(kind):
    return {
        "cafe": "Café",
        "bakery": "Bakery",
        "meal_takeaway": "Quick Bite",
    }.get(kind, "Restaurant")


@api_view(["GET"])
def location_suggestions(request):
    query = str(request.query_params.get("q", "")).strip()

    if len(query) < 2:
        return Response([])

    if not api_key():
        return Response(
            {"error": "GOOGLE_MAPS_API_KEY is not configured."},
            status=503,
        )

    try:
        result = google_get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            {
                "address": query,
                "region": "in",
                "components": "country:IN",
            },
        )

        if result.get("status") not in ("OK", "ZERO_RESULTS"):
            raise ValueError(
                result.get("error_message") or result.get("status")
            )

        items = []

        for item in result.get("results", [])[:8]:
            location = item["geometry"]["location"]
            formatted_address = item["formatted_address"]

            items.append(
                {
                    "id": item["place_id"],
                    "place_id": item["place_id"],
                    "name": formatted_address.split(",")[0],
                    "label": formatted_address,
                    "display_name": formatted_address,
                    "latitude": location["lat"],
                    "longitude": location["lng"],
                }
            )

        return Response(items)

    except (requests.RequestException, ValueError) as exc:
        return Response(
            {"error": f"Google location search failed: {exc}"},
            status=502,
        )


@api_view(["POST"])
def build_food_walk(request):
    if not api_key():
        return Response(
            {
                "error": (
                    "Set GOOGLE_MAPS_API_KEY on the Django backend."
                )
            },
            status=503,
        )

    start = str(request.data.get("start") or "").strip()
    end = str(request.data.get("end") or "").strip()

    if not start or not end:
        return Response(
            {"error": "Choose a start and destination."},
            status=400,
        )

    try:
        budget = max(
            200,
            min(
                int(request.data.get("budget_per_person", 1000)),
                10000,
            ),
        )
    except (ValueError, TypeError):
        budget = 1000

    requested_mode = str(
        request.data.get("travel_mode") or "auto"
    ).lower()
    restaurant_query = str(
        request.data.get("restaurant_query") or ""
    ).strip()[:120]
    food_wish = str(
        request.data.get("food_wish") or ""
    ).strip()[:120]

    if requested_mode not in (
        "auto",
        "walking",
        "bike",
        "bicycle",
        "car",
    ):
        return Response(
            {"error": "Unsupported travel mode."},
            status=400,
        )

    food_type = str(request.data.get("food_type") or "all")

    try:
        # The frontend may pass GPS coordinates as "lat,lng".
        origin = geocode(start)
        destination = geocode(end)

        straight_distance = haversine(
            (
                origin["latitude"],
                origin["longitude"],
            ),
            (
                destination["latitude"],
                destination["longitude"],
            ),
        )

        if requested_mode == "auto":
            if straight_distance <= 5:
                mode = "walking"
            elif straight_distance <= 15:
                mode = "bike"
            else:
                mode = "car"
        else:
            mode = requested_mode

        if mode == "bicycle":
            mode = "bike"

        # Google Routes API travel-mode names. FoodKindl Bike is a motorbike/scooter.
        # TWO_WHEELER requests motorcycle routing; BICYCLE means pedal cycling.
        google_mode = {
            "walking": "WALK",
            "bike": "TWO_WHEELER",
            "car": "DRIVE",
        }[mode]

        route_data = google_post(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            {
                "origin": {
                    "location": {
                        "latLng": {
                            "latitude": origin["latitude"],
                            "longitude": origin["longitude"],
                        }
                    }
                },
                "destination": {
                    "location": {
                        "latLng": {
                            "latitude": destination["latitude"],
                            "longitude": destination["longitude"],
                        }
                    }
                },
                "travelMode": google_mode,
                "polylineQuality": "HIGH_QUALITY",
                "computeAlternativeRoutes": False,
            },
            (
                "routes.distanceMeters,routes.duration,"
                "routes.polyline.encodedPolyline"
            ),
        )

        routes = route_data.get("routes", [])

        if not routes:
            return Response(
                {
                    "error": (
                        "Google Routes did not find a suitable route."
                    )
                },
                status=422,
            )

        route = routes[0]
        coordinates = decode_polyline(
            route["polyline"]["encodedPolyline"]
        )
        distance_km = route["distanceMeters"] / 1000

        sample_count = max(
            6,
            min(14, math.ceil(distance_km / 2) + 2),
        )
        samples = route_sample_points(
            coordinates,
            sample_count,
        )

        external_places = []
        warnings = []

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(nearby, sample)
                for sample in samples
            ]

            for future in as_completed(futures):
                try:
                    external_places.extend(future.result())
                except (
                    requests.RequestException,
                    ValueError,
                    KeyError,
                ) as exc:
                    warnings.append(str(exc))

        requested_place_ids = set()
        food_wish_place_ids = set()
        for query, matched_ids in (
            (restaurant_query, requested_place_ids),
            (food_wish, food_wish_place_ids),
        ):
            if not query:
                continue
            try:
                search_results = search_named_restaurants(
                    query,
                    origin,
                    straight_distance,
                )
                external_places.extend(search_results)
                matched_ids.update(
                    place.get("id")
                    for place in search_results
                    if place.get("id")
                )
            except (requests.RequestException, ValueError, KeyError) as exc:
                warnings.append(str(exc))

        places = []
        seen_place_ids = set()

        for item in external_places:
            location = item.get("location") or {}
            latitude = location.get("latitude")
            longitude = location.get("longitude")
            place_id = item.get("id")

            if (
                latitude is None
                or longitude is None
                or not place_id
                or place_id in seen_place_ids
            ):
                continue

            seen_place_ids.add(place_id)

            progress, detour = route_position(
                (float(latitude), float(longitude)),
                coordinates,
            )

            is_requested_stop = place_id in requested_place_ids
            matches_food_wish = place_id in food_wish_place_ids
            if (
                detour > MAX_DETOUR_KM
                and not is_requested_stop
                and not matches_food_wish
            ):
                continue

            if item.get("businessStatus") == "CLOSED_PERMANENTLY":
                continue

            kind = item.get("primaryType", "restaurant")
            photos = item.get("photos", [])

            places.append(
                {
                    "id": f"google-{place_id}",
                    "place_id": place_id,
                    "name": (
                        item.get("displayName") or {}
                    ).get("text", "Food stop"),
                    "latitude": latitude,
                    "longitude": longitude,
                    "category": category(kind),
                    "cuisine": "",
                    "rating": item.get("rating"),
                    "open_now": (
                        item.get("currentOpeningHours") or {}
                    ).get("openNow"),
                    "photo_resource": next(
                        (
                            photo.get("name")
                            for photo in photos
                            if photo.get("name")
                        ),
                        None,
                    ),
                    "estimated_cost": estimate_cost(item),
                    "estimated_cost_is_approximate": True,
                    "route_progress": round(progress * 100),
                    "distance_from_route_km": round(detour, 2),
                    "source": "google",
                    "is_requested_stop": is_requested_stop,
                    "matches_food_wish": matches_food_wish,
                }
            )

        for restaurant in Restaurant.objects.all():
            if (
                restaurant.latitude is None
                or restaurant.longitude is None
            ):
                continue

            progress, detour = route_position(
                (
                    float(restaurant.latitude),
                    float(restaurant.longitude),
                ),
                coordinates,
            )

            if (
                0.0 <= progress <= 1.0
                and detour <= MAX_DETOUR_KM
            ):
                places.append(
                    {
                        "id": f"foodkindl-{restaurant.id}",
                        "name": restaurant.name,
                        "latitude": float(restaurant.latitude),
                        "longitude": float(restaurant.longitude),
                        "category": "Restaurant",
                        "cuisine": restaurant.cuisine or "",
                        "estimated_cost": 300,
                        "estimated_cost_is_approximate": True,
                        "route_progress": round(progress * 100),
                        "distance_from_route_km": round(detour, 2),
                        "source": "foodkindl",
                    }
                )

        places.sort(
            key=lambda place: (
                place["route_progress"],
                place["distance_from_route_km"],
            )
        )

        unique_places = []
        seen_names_and_locations = set()

        for place in places:
            key = (
                place["name"].casefold(),
                round(float(place["latitude"]), 4),
                round(float(place["longitude"]), 4),
            )

            if key not in seen_names_and_locations:
                seen_names_and_locations.add(key)
                unique_places.append(place)

        recommended_stops = []
        estimated_total = 0

        for target_progress in (5, 35, 65, 90):
            options = [
                place
                for place in unique_places
                if (
                    place not in recommended_stops
                    and estimated_total + place["estimated_cost"]
                    <= budget
                )
            ]

            if not options:
                break

            best_place = min(
                options,
                key=lambda place: (
                    abs(
                        place["route_progress"]
                        - target_progress
                    )
                    + place["distance_from_route_km"] * 20
                ),
            )

            recommended_stops.append(best_place)
            estimated_total += best_place["estimated_cost"]

            if len(recommended_stops) >= MAX_STOPS:
                break

        # Fetch a limited number of Google restaurant photos.
        # The API key stays on the backend.
        photo_candidates = [
            place
            for place in unique_places
            if place.get("photo_resource")
        ][:12]

        def load_photo(place):
            resource = place["photo_resource"]

            try:
                result = google_get(
                    f"https://places.googleapis.com/v1/{resource}/media",
                    {
                        "maxWidthPx": 640,
                        "skipHttpRedirect": "true",
                    },
                )
                return place["id"], result.get("photoUri")
            except (
                requests.RequestException,
                ValueError,
                KeyError,
            ):
                return place["id"], None

        if photo_candidates:
            with ThreadPoolExecutor(max_workers=4) as executor:
                photos = dict(
                    executor.map(load_photo, photo_candidates)
                )

            for place in unique_places:
                place["photo_url"] = photos.get(place["id"])

        for place in unique_places:
            place.pop("photo_resource", None)

        selected_ids = {
            place["id"] for place in recommended_stops
        }

        duration_seconds = int(
            str(route.get("duration", "0s"))
            .rstrip("s")
            .split(".")[0]
        )

        if mode == "walking":
            route_warning = (
                "Walking routes may not include every usable "
                "sidewalk or pedestrian path. Follow local signs "
                "and conditions."
            )
        elif mode == "bike":
            route_warning = (
                "Two-wheeler routes may not reflect every road condition. "
                "Follow local signs and conditions."
            )
        else:
            route_warning = ""

        return Response(
            {
                "route": {
                    "type": "LineString",
                    "coordinates": coordinates,
                },
                "travel_mode": mode,
                "requested_travel_mode": requested_mode,
                "routing_mode": google_mode,
                "route_warning": route_warning,
                "distance_km": round(distance_km, 1),
                "duration_minutes": round(duration_seconds / 60),
                "budget_per_person": budget,
                "estimated_total_per_person": estimated_total,
                "start": origin,
                "end": destination,
                "restaurant_provider": "google",
                "restaurant_candidates_found": len(unique_places),
                "maximum_detour_km": MAX_DETOUR_KM,
                "recommended_stops": recommended_stops,
                "other_places": [
                    place
                    for place in unique_places
                    if place["id"] not in selected_ids
                ][:100],
                "places": unique_places,
                "food_preference_note": (
                    "Vegetarian classification requires verified "
                    "menu data; results are not certified vegetarian."
                    if food_type != "all"
                    else ""
                ),
                "warning": (
                    "Some Google Places searches failed; "
                    "results may be incomplete."
                    if warnings
                    else ""
                ),
            }
        )

    except (
        requests.RequestException,
        ValueError,
        KeyError,
        IndexError,
    ) as exc:
        return Response(
            {"error": f"Google Maps route or places failed: {exc}"},
            status=502,
        )
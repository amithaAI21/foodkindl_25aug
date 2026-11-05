"""Google-backed Food Walk API. Required: GOOGLE_MAPS_API_KEY with Geocoding,
Places API (New), Routes API enabled, plus an active billing account.
"""
import math
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Restaurant

GOOGLE_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
TIMEOUT = 15
MAX_STOPS = 4
MAX_DETOUR_KM = 2.0


def api_key():
    return GOOGLE_KEY or getattr(settings, "GOOGLE_MAPS_API_KEY", "")


def google_get(url, params):
    response = requests.get(url, params={**params, "key": api_key()}, timeout=TIMEOUT)
    response.raise_for_status()
    return response.json()


def google_post(url, body, field_mask=None):
    headers = {"X-Goog-Api-Key": api_key(), "Content-Type": "application/json"}
    if field_mask:
        headers["X-Goog-FieldMask"] = field_mask
    response = requests.post(url, json=body, headers=headers, timeout=TIMEOUT)
    response.raise_for_status()
    return response.json()


def geocode(value):
    # Accept a GPS start as "latitude,longitude" directly, without a
    # Google Geocoding request or exposing it in a geocoding query.
    parts = str(value).strip().split(",")
    if len(parts) == 2:
        try:
            latitude, longitude = (float(part.strip()) for part in parts)
            if -90 <= latitude <= 90 and -180 <= longitude <= 180:
                return {"name": "Current location", "latitude": latitude, "longitude": longitude}
        except ValueError:
            pass
    result = google_get("https://maps.googleapis.com/maps/api/geocode/json", {"address": value, "region": "in"})
    if result.get("status") != "OK" or not result.get("results"):
        raise ValueError(f"Location not found: {value}")
    item = result["results"][0]
    point = item["geometry"]["location"]
    return {"name": item["formatted_address"], "latitude": float(point["lat"]), "longitude": float(point["lng"])}


def haversine(a, b):
    lat1, lng1 = a
    lat2, lng2 = b
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat, dlng = p2-p1, math.radians(lng2-lng1)
    h = math.sin(dlat/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dlng/2)**2
    return 6371 * 2 * math.asin(min(1, math.sqrt(h)))


def decode_polyline(encoded):
    coords, idx, lat, lng = [], 0, 0, 0
    while idx < len(encoded):
        diffs = []
        for _ in (0, 1):
            shift = result = 0
            while True:
                char = ord(encoded[idx]) - 63
                idx += 1
                result |= (char & 31) << shift
                shift += 5
                if char < 32:
                    break
            diffs.append(~(result >> 1) if result & 1 else result >> 1)
        lat += diffs[0]
        lng += diffs[1]
        coords.append([lng / 1e5, lat / 1e5])  # GeoJSON [longitude, latitude]
    return coords


def route_sample_points(coords, count=10):
    """Sample approximately uniformly by distance, not polyline vertex count."""
    if len(coords) < 2:
        return coords
    lengths = [haversine((a[1], a[0]), (b[1], b[0])) for a, b in zip(coords, coords[1:])]
    total = sum(lengths)
    if total <= 0:
        return [coords[0], coords[-1]]
    samples, accumulated, seg = [], 0., 0
    for i in range(count):
        target = total * i / (count - 1)
        while seg < len(lengths) - 1 and accumulated + lengths[seg] < target:
            accumulated += lengths[seg]
            seg += 1
        weight = max(0., min(1., (target - accumulated) / (lengths[seg] or 1)))
        a, b = coords[seg], coords[seg + 1]
        samples.append([a[0] + weight * (b[0] - a[0]), a[1] + weight * (b[1] - a[1])])
    return samples


def route_position(point, coords):
    """Closest projection onto route; reports fraction along and perpendicular distance."""
    if len(coords) < 2:
        return 0, float("inf")
    lat, lon = point
    lat_factor = math.cos(math.radians(lat))
    lengths = [haversine((a[1], a[0]), (b[1], b[0])) for a, b in zip(coords, coords[1:])]
    total = sum(lengths) or 1
    best, best_progress, travelled = float("inf"), 0., 0.
    for (lon1, lat1), (lon2, lat2), length in zip(coords, coords[1:], lengths):
        dx, dy = (lon2-lon1)*lat_factor, lat2-lat1
        denom = dx*dx + dy*dy
        t = max(0, min(1, (((lon-lon1)*lat_factor*dx + (lat-lat1)*dy)/denom))) if denom else 0
        near = (lat1 + t*(lat2-lat1), lon1 + t*(lon2-lon1))
        detour = haversine(point, near)
        if detour < best:
            best, best_progress = detour, (travelled + t*length)/total
        travelled += length
    return best_progress, best


def nearby(sample):
    lon, lat = sample
    result = google_post(
        "https://places.googleapis.com/v1/places:searchNearby",
        {"includedTypes": ["restaurant", "cafe", "bakery", "meal_takeaway"],
         "maxResultCount": 20,
         "locationRestriction": {"circle": {"center": {"latitude": lat, "longitude": lon}, "radius": 1400}}},
        "places.id,places.displayName,places.location,places.primaryType,places.rating,places.priceLevel,places.businessStatus,places.photos,places.currentOpeningHours.openNow",
    )
    return result.get("places", [])


def estimate_cost(place):
    # Clearly an approximate food budget, not a Google-provided menu price.
    return {"PRICE_LEVEL_INEXPENSIVE": 150, "PRICE_LEVEL_MODERATE": 300,
            "PRICE_LEVEL_EXPENSIVE": 600, "PRICE_LEVEL_VERY_EXPENSIVE": 900}.get(place.get("priceLevel"), 250)


def category(kind):
    return {"cafe": "Café", "bakery": "Bakery", "meal_takeaway": "Quick Bite"}.get(kind, "Restaurant")


@api_view(["GET"])
def location_suggestions(request):
    query = str(request.query_params.get("q", "")).strip()
    if len(query) < 2:
        return Response([])
    if not api_key():
        return Response({"error": "GOOGLE_MAPS_API_KEY is not configured."}, status=503)
    try:
        result = google_get("https://maps.googleapis.com/maps/api/geocode/json", {"address": query, "region": "in", "components": "country:IN"})
        if result.get("status") not in ("OK", "ZERO_RESULTS"):
            raise ValueError(result.get("error_message") or result.get("status"))
        items = []
        for item in result.get("results", [])[:8]:
            loc = item["geometry"]["location"]
            items.append({"id": item["place_id"], "place_id": item["place_id"],
                          "name": item["formatted_address"].split(",")[0],
                          "label": item["formatted_address"], "display_name": item["formatted_address"],
                          "latitude": loc["lat"], "longitude": loc["lng"]})
        return Response(items)
    except (requests.RequestException, ValueError) as exc:
        return Response({"error": f"Google location search failed: {exc}"}, status=502)


@api_view(["POST"])
def build_food_walk(request):
    if not api_key():
        return Response({"error": "Set GOOGLE_MAPS_API_KEY on the Django backend."}, status=503)
    start = str(request.data.get("start") or "").strip()
    end = str(request.data.get("end") or "").strip()
    if not start or not end:
        return Response({"error": "Choose a start and destination."}, status=400)
    try:
        budget = max(200, min(int(request.data.get("budget_per_person", 1000)), 10000))
    except (ValueError, TypeError):
        budget = 1000
    requested = str(request.data.get("travel_mode") or "auto").lower()
    if requested not in ("auto", "walking", "bike", "bicycle", "car"):
        return Response({"error": "Unsupported travel mode."}, status=400)
    food_type = str(request.data.get("food_type") or "all")
    try:
        # The frontend passes a GPS coordinate as "lat,lng" when 'Current location' is selected.
        origin, destination = geocode(start), geocode(end)
        straight = haversine((origin["latitude"], origin["longitude"]),
                             (destination["latitude"], destination["longitude"]))
        mode = ("walking" if straight <= 5 else "bike" if straight <= 15 else "car") if requested == "auto" else requested
        if mode == "bicycle":
            mode = "bike"
        if mode == "walking" and straight > 5:
            return Response({"error": "Walking routes are limited to 5 km. Select Bike or Car."}, status=400)
        # Bike intentionally uses car-road routing as a fallback.
        # Not suitable as verified cycling navigation.
        google_mode = {"walking": "WALK", "bike": "DRIVE", "car": "DRIVE"}[mode]
        route_data = google_post(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            {"origin": {"location": {"latLng": {"latitude": origin["latitude"], "longitude": origin["longitude"]}}},
             "destination": {"location": {"latLng": {"latitude": destination["latitude"], "longitude": destination["longitude"]}}},
             "travelMode": google_mode, "polylineQuality": "HIGH_QUALITY",
             "computeAlternativeRoutes": False},
            "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        )
        routes = route_data.get("routes", [])
        if not routes:
            return Response({"error": "Google Routes did not find a suitable route."}, status=422)
        route = routes[0]
        coords = decode_polyline(route["polyline"]["encodedPolyline"])
        kms = route["distanceMeters"] / 1000
        samples = route_sample_points(coords, max(6, min(14, math.ceil(kms / 2) + 2)))
        external, warnings = [], []
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(nearby, s) for s in samples[1:-1]]
            for future in as_completed(futures):
                try:
                    external.extend(future.result())
                except (requests.RequestException, ValueError, KeyError) as exc:
                    warnings.append(str(exc))
        places, seen = [], set()
        for item in external:
            loc = item.get("location") or {}
            lat, lon = loc.get("latitude"), loc.get("longitude")
            if lat is None or lon is None or not item.get("id") or item.get("id") in seen:
                continue
            seen.add(item["id"])
            progress, detour = route_position((float(lat), float(lon)), coords)
            if detour > MAX_DETOUR_KM or not (0.08 <= progress <= 0.96):
                continue
            kind = item.get("primaryType", "restaurant")
            if item.get("businessStatus") == "CLOSED_PERMANENTLY":
                continue
            # No guaranteed vegetarian or non-vegetarian field in Places Nearby.
            # Do not falsely label results; return all and expose the limitation.
            places.append({"id": f"google-{item['id']}", "place_id": item["id"],
                           "name": (item.get("displayName") or {}).get("text", "Food stop"),
                           "latitude": lat, "longitude": lon, "category": category(kind),
                           "cuisine": "", "rating": item.get("rating"),
                           "open_now": (item.get("currentOpeningHours") or {}).get("openNow"),
                           "photo_resource": next((photo.get("name") for photo in item.get("photos", []) if photo.get("name")), None),
                           "estimated_cost": estimate_cost(item),
                           "estimated_cost_is_approximate": True,
                           "route_progress": round(progress * 100),
                           "distance_from_route_km": round(detour, 2), "source": "google"})
        for restaurant in Restaurant.objects.all():
            if restaurant.latitude is None or restaurant.longitude is None:
                continue
            progress, detour = route_position((float(restaurant.latitude), float(restaurant.longitude)), coords)
            if 0.08 <= progress <= 0.96 and detour <= MAX_DETOUR_KM:
                places.append({"id": f"foodkindl-{restaurant.id}", "name": restaurant.name,
                               "latitude": float(restaurant.latitude), "longitude": float(restaurant.longitude),
                               "category": "Restaurant", "cuisine": restaurant.cuisine or "",
                               "estimated_cost": 300, "estimated_cost_is_approximate": True,
                               "route_progress": round(progress * 100),
                               "distance_from_route_km": round(detour, 2), "source": "foodkindl"})
        places.sort(key=lambda p: (p["route_progress"], p["distance_from_route_km"]))
        unique, named = [], set()
        for item in places:
            key = (item["name"].casefold(), round(float(item["latitude"]), 4), round(float(item["longitude"]), 4))
            if key not in named:
                named.add(key)
                unique.append(item)
        recommended, total = [], 0
        for target in (18, 42, 67, 88):
            options = [p for p in unique if p not in recommended and total + p["estimated_cost"] <= budget]
            if not options:
                break
            best = min(options, key=lambda p: abs(p["route_progress"] - target) + p["distance_from_route_km"] * 20)
            recommended.append(best)
            total += best["estimated_cost"]
            if len(recommended) >= MAX_STOPS:
                break
        # Fetch a small number of genuine Google restaurant photo URLs.
        # No API key is sent to the browser; Google returns an expiring public photoUri.
        photo_candidates = [p for p in unique if p.get("photo_resource")][:12]
        def load_photo(place):
            resource = place["photo_resource"]
            try:
                result = google_get(
                    f"https://places.googleapis.com/v1/{resource}/media",
                    {"maxWidthPx": 640, "skipHttpRedirect": "true"},
                )
                return place["id"], result.get("photoUri")
            except (requests.RequestException, ValueError, KeyError):
                return place["id"], None
        if photo_candidates:
            with ThreadPoolExecutor(max_workers=4) as executor:
                photos = dict(executor.map(load_photo, photo_candidates))
            for place in unique:
                place["photo_url"] = photos.get(place["id"])
        for place in unique:
            place.pop("photo_resource", None)
        selected_ids = {p["id"] for p in recommended}
        seconds = int(str(route.get("duration", "0s")).rstrip("s").split(".")[0])
        return Response({"route": {"type": "LineString", "coordinates": coords}, "travel_mode": mode,
                         "requested_travel_mode": requested, "routing_mode": google_mode,
                         "route_warning": "Bike uses car-road routing, not bicycle-safe directions." if mode == "bike" else "",
                         "distance_km": round(kms, 1),
                         "duration_minutes": round(seconds / 60), "budget_per_person": budget,
                         "estimated_total_per_person": total, "start": origin, "end": destination,
                         "restaurant_provider": "google", "restaurant_candidates_found": len(unique),
                         "maximum_detour_km": MAX_DETOUR_KM,
                         "recommended_stops": recommended,
                         "other_places": [p for p in unique if p["id"] not in selected_ids][:100],
                         "places": unique,
                         "food_preference_note": "Vegetarian classification requires verified menu data; results are not certified vegetarian." if food_type != "all" else "",
                         "warning": "Some Google Places searches failed; results may be incomplete." if warnings else ""})
    except (requests.RequestException, ValueError, KeyError, IndexError) as exc:
        return Response({"error": f"Google Maps route or places failed: {exc}"}, status=502)

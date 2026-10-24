"""FoodKindl restaurant discovery: partner records + Google Places nearby/name search.

Wire the existing restaurant recommendations URL to RestaurantRecommendationView here.
Environment: GOOGLE_MAPS_API_KEY (or GOOGLE_PLACES_API_KEY).
"""
import logging
import math
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .google_places import PlacesUnavailable, search_google_places, restaurant_photo_url
from invites.models import Restaurant as FoodKindlRestaurant

logger = logging.getLogger(__name__)
TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
GOOGLE_FIELDS = (
    "places.id,places.displayName,places.location,places.formattedAddress,"
    "places.types,places.primaryType,places.rating,places.userRatingCount,"
    "places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours,"
    "places.servesVegetarianFood,places.photos,places.attributions,nextPageToken"
)
FOOD_TYPES = {
    "restaurant", "cafe", "coffee_shop", "fast_food_restaurant",
    "meal_takeaway", "meal_delivery", "indian_restaurant",
    "south_indian_restaurant", "north_indian_restaurant",
    "andhra_restaurant", "biryani_restaurant", "chinese_restaurant",
    "vegetarian_restaurant", "seafood_restaurant", "barbecue_restaurant",
    "pizza_restaurant", "breakfast_restaurant", "brunch_restaurant",
    "fine_dining_restaurant", "family_restaurant", "buffet_restaurant",
}


def distance_km(a, b, c, d):
    p1, p2 = math.radians(a), math.radians(c)
    dp, dl = math.radians(c - a), math.radians(d - b)
    h = math.sin(dp / 2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl / 2)**2
    return 6371 * 2 * math.atan2(math.sqrt(h), math.sqrt(max(0, 1-h)))


def place_category(types):
    return "cafe" if "cafe" in types or "coffee_shop" in types else "restaurant"


def google_name_search(name, latitude=None, longitude=None, radius=None):
    """Google Text Search with circle *bias*, then enforce exact radius ourselves."""
    key = (getattr(settings, "GOOGLE_MAPS_API_KEY", None)
           or getattr(settings, "GOOGLE_PLACES_API_KEY", None)
           or os.environ.get("GOOGLE_MAPS_API_KEY")
           or os.environ.get("GOOGLE_PLACES_API_KEY"))
    if not key:
        raise PlacesUnavailable("Google Places API key is not configured.")
    payload = {
        "textQuery": name,
        "pageSize": 20,
        "regionCode": "IN",
        "languageCode": "en",
    }
    # A location is OPTIONAL for name search. Without it, Google
    # Text Search ranks matches across India; no distance cutoff applies.
    if latitude is not None and longitude is not None:
        payload["locationBias"] = {"circle": {
            "center": {"latitude": latitude, "longitude": longitude},
            "radius": float(radius or 5000),
        }}
    try:
        records = []
        for _ in range(3):
            res = requests.post(
                TEXT_SEARCH_URL,
                headers={
                    "X-Goog-Api-Key": key,
                    "X-Goog-FieldMask": GOOGLE_FIELDS,
                    "Content-Type": "application/json",
                },
                json=payload, timeout=12,
            )
            res.raise_for_status()
            body = res.json()
            records.extend(body.get("places", []))
            next_token = body.get("nextPageToken")
            if not next_token:
                break
            payload["pageToken"] = next_token
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Google Places Text Search failed: %s", exc)
        raise PlacesUnavailable("Google restaurant name search is temporarily unavailable.") from exc
    result = []
    for place in records:
        types = set(place.get("types") or [])
        primary = place.get("primaryType")
        if primary:
            types.add(primary)
        # Explicitly reject non-food venues (e.g. PGs, hotels without restaurant type).
        if not types.intersection(FOOD_TYPES) and not any(t.endswith("_restaurant") for t in types):
            continue
        location = place.get("location") or {}
        try:
            plat = float(location["latitude"])
            plon = float(location["longitude"])
        except (KeyError, ValueError, TypeError):
            continue
        if not (math.isfinite(plat) and math.isfinite(plon)):
            continue
        km = (distance_km(latitude, longitude, plat, plon)
              if latitude is not None and longitude is not None else None)
        if km is not None and radius is not None and km * 1000 > radius:
            continue
        opening = place.get("regularOpeningHours") or {}
        result.append({
            "id": f"google-{place['id']}", "google_place_id": place["id"],
            "name": (place.get("displayName") or {}).get("text", ""),
            "latitude": plat, "longitude": plon,
            "distance_km": round(km, 2) if km is not None else None,
            "amenity": place_category(types), "category": place_category(types),
            "cuisine": "", "address": place.get("formattedAddress", ""),
            "phone": place.get("nationalPhoneNumber", ""),
            "website": place.get("websiteUri", ""),
            "opening_hours": "; ".join(opening.get("weekdayDescriptions") or []),
            "diet_vegetarian": "yes" if place.get("servesVegetarianFood") is True else "unknown",
            "diet_vegan": "unknown", "diet_meat": "unknown",
            "diet_fish": "unknown", "diet_non_vegetarian": "unknown",
            "wheelchair": None, "internet_access": None,
            "payment_methods": [], "source": "google", "is_foodkindl_partner": False,
            "accepts_foodkindl_booking": False,
            "rating": place.get("rating"), "review_count": place.get("userRatingCount"),
            "attributions": place.get("attributions") or [],
            "photo_url": restaurant_photo_url(place),
            "photo_attributions": ((place.get("photos") or [{}])[0].get("authorAttributions") or []),
        })
    return result


def expanded_nearby_search(latitude, longitude, radius):
    """Up to five geographical searches, each with restaurant and cafe queries.

    Each Google Nearby Search (New) request returns at most 20 places.
    Five overlapping circles improve coverage; they do not guarantee 100.
    All returned businesses are subsequently checked against the user's radius.
    WARNING: up to 10 billable Nearby calls plus 4 Text Search calls per request.
    """
    # Offsetting centers surfaces places outside the first 20 for each search.
    offset_m = radius * 0.42
    search_radius = min(radius, max(500, radius * 0.65))
    lat_shift = offset_m / 111_320.0
    lon_shift = offset_m / max(111_320.0 * abs(math.cos(math.radians(latitude))), 1000)
    centers = [(latitude, longitude)]
    if radius >= 1200:
        centers += [
            (latitude + dy * lat_shift, longitude + dx * lon_shift)
            for dy, dx in [(-1,0), (0,-1), (0,1), (1,0)]
        ]
    all_places = []
    # The center uses the complete radius; supplementary cells use smaller circles.
    with ThreadPoolExecutor(max_workers=5) as executor:
        jobs = [(lat, lon, radius if index == 0 else search_radius)
                for index, (lat, lon) in enumerate(centers)
                if -90 <= lat <= 90 and -180 <= lon <= 180]
        futures = [executor.submit(search_google_places, lat, lon, radius_metres=r)
                   for lat, lon, r in jobs]
        errors = []
        for future in as_completed(futures):
            try:
                all_places.extend(future.result())
            except (PlacesUnavailable, requests.RequestException) as exc:
                logger.warning("Google nearby coverage search failed: %s", exc)
                errors.append(exc)
    if not all_places and errors:
        raise PlacesUnavailable("Google restaurant discovery is unavailable.")

    unique = {}
    for place in all_places:
        try:
            lat, lon = float(place["latitude"]), float(place["longitude"])
        except (KeyError, TypeError, ValueError):
            continue
        if not (math.isfinite(lat) and math.isfinite(lon)):
            continue
        if distance_km(latitude, longitude, lat, lon) * 1000 > radius:
            continue
        key = place.get("google_place_id") or place.get("id") or (
            str(place.get("name", "")).casefold(), round(lat, 5), round(lon, 5))
        unique.setdefault(key, place)
    return list(unique.values())



def combined_restaurant_discovery(latitude, longitude, radius):
    """Nearby coverage plus generic Text Search (no hardcoded restaurant names).

    NOTE: multiple billable Google Places requests; cache results upstream if practical.
    """
    queries = ("restaurants", "cafes", "Indian restaurants", "South Indian restaurants")
    combined = []
    failures = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        tasks = [executor.submit(expanded_nearby_search, latitude, longitude, radius)]
        tasks.extend(
            executor.submit(google_name_search, query, latitude, longitude, radius)
            for query in queries
        )
        for task in as_completed(tasks):
            try:
                combined.extend(task.result())
            except (PlacesUnavailable, requests.RequestException) as exc:
                failures.append(exc)
                logger.warning("Restaurant coverage subquery failed: %s", exc)
    if not combined and failures:
        raise PlacesUnavailable("Google restaurant discovery is unavailable.")

    distinct = {}
    for place in combined:
        try:
            plat, plon = float(place["latitude"]), float(place["longitude"])
        except (TypeError, ValueError, KeyError):
            continue
        if not math.isfinite(plat) or not math.isfinite(plon):
            continue
        if distance_km(latitude, longitude, plat, plon) * 1000 > radius:
            continue
        key = place.get("google_place_id") or str(place.get("id") or "").removeprefix("google-")
        if not key:
            key = (str(place.get("name", "")).casefold(), round(plat, 5), round(plon, 5))
        # Text-search matches may carry fields unavailable in nearby-search listings.
        if key not in distinct or (place.get("rating") is not None and distinct[key].get("rating") is None):
            distinct[key] = place
    return list(distinct.values())


class PlacesSearchThrottle(UserRateThrottle):
    scope = "foodkindl_google_places"
    rate = "30/min"


class RestaurantRecommendationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PlacesSearchThrottle]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        raw_lat = request.query_params.get("latitude")
        raw_lon = request.query_params.get("longitude")
        has_location = bool(raw_lat and raw_lon)
        if bool(raw_lat) != bool(raw_lon):
            return Response({"detail": "Provide both latitude and longitude or neither."}, status=400)
        if not has_location and not search:
            return Response({"detail": "Select a location or enter a restaurant name."}, status=400)
        try:
            latitude = float(raw_lat) if has_location else None
            longitude = float(raw_lon) if has_location else None
            radius = int(request.query_params.get("radius", 5000)) if has_location else None
            limit = int(request.query_params.get("limit", 100))
        except (TypeError, ValueError):
            return Response({"detail": "Invalid coordinates, radius or limit."}, status=400)
        if has_location and not (math.isfinite(latitude) and math.isfinite(longitude)
                and -90 <= latitude <= 90 and -180 <= longitude <= 180):
            return Response({"detail": "Invalid coordinates."}, status=400)
        radius = max(500, min(radius, 5000)) if has_location else None
        limit = max(1, min(limit, 100))
        source = request.query_params.get("source", "other").strip().lower()
        place_type = request.query_params.get("place_type", "all").strip().lower()
        diet = request.query_params.get("diet", "all").strip().lower()
        cuisine = request.query_params.get("cuisine", "").strip().lower()
        try:
            min_rating = float(request.query_params.get("min_rating", 0))
        except (ValueError, TypeError):
            return Response({"detail": "Invalid min_rating."}, status=400)
        if not math.isfinite(min_rating) or min_rating < 0 or min_rating > 5:
            return Response({"detail": "min_rating must be between 0 and 5."}, status=400)
        if source not in {"all", "partner", "other"}:
            return Response({"detail": "Invalid restaurant source."}, status=400)
        if place_type not in {"all", "restaurant", "cafe"}:
            return Response({"detail": "Invalid place_type."}, status=400)
        if diet not in {"all", "veg", "vegetarian", "nonveg", "non_veg", "non-veg"}:
            return Response({"detail": "Invalid diet."}, status=400)
        if len(search) > 100:
            return Response({"detail": "Restaurant search must be 100 characters or fewer."}, status=400)
        if search and len(search) < 2:
            return Response({"detail": "Enter at least two characters to search a restaurant."}, status=400)

        if not has_location and source == "partner":
            return Response({"detail": "Select a location to search FoodKindl partners."}, status=400)

        partners = []
        if has_location and source in {"all", "partner"}:
            rows = FoodKindlRestaurant.objects.filter(
                is_active=True, is_foodkindl_partner=True,
                latitude__isnull=False, longitude__isnull=False,
            )
            for restaurant in rows:
                lat, lon = float(restaurant.latitude), float(restaurant.longitude)
                if not (math.isfinite(lat) and math.isfinite(lon)):
                    continue
                km = distance_km(latitude, longitude, lat, lon)
                if km * 1000 > radius:
                    continue
                amenity = restaurant.restaurant_type or "restaurant"
                if amenity == "hotel":
                    amenity = "restaurant"
                elif amenity == "fast_food":
                    amenity = "restaurant"
                if amenity not in {"restaurant", "cafe"}:
                    continue
                cuisine_label = restaurant.get_cuisine_display() if restaurant.cuisine else ""
                if search and search.casefold() not in restaurant.name.casefold():
                    continue
                if place_type != "all" and place_type != amenity:
                    continue
                if cuisine and cuisine != "all cuisines" and cuisine.replace("_", " ") not in cuisine_label.lower():
                    continue
                if diet in {"veg", "vegetarian"} and not restaurant.serves_vegetarian:
                    continue
                if diet in {"nonveg", "non_veg", "non-veg"} and not restaurant.serves_non_vegetarian:
                    continue
                partners.append({
                    "id": f"foodkindl-{restaurant.pk}", "name": restaurant.name,
                    "latitude": lat, "longitude": lon, "distance_km": round(km, 2),
                    "amenity": amenity, "category": amenity, "cuisine": cuisine_label,
                    "address": restaurant.address or ", ".join(filter(None, [restaurant.locality, restaurant.city])),
                    "phone": restaurant.phone_number, "website": restaurant.website,
                    "opening_hours": (f"{restaurant.opening_time:%H:%M}-{restaurant.closing_time:%H:%M}"
                                      if restaurant.opening_time and restaurant.closing_time else ""),
                    "diet_vegetarian": "yes" if restaurant.serves_vegetarian else "no",
                    "diet_non_vegetarian": "yes" if restaurant.serves_non_vegetarian else "no",
                    "wheelchair": "yes" if restaurant.wheelchair_accessible else "no",
                    "internet_access": "yes" if restaurant.has_wifi else "no",
                    "payment_methods": ["cards"] if restaurant.accepts_cards else [],
                    "source": "foodkindl", "is_foodkindl_partner": True,
                    "accepts_foodkindl_booking": restaurant.accepts_foodkindl_booking,
                    "image_url": restaurant.image_url,
                })
            partners.sort(key=lambda p: p["distance_km"])

        if source == "partner":
            return Response({"count": min(len(partners), limit), "results": partners[:limit],
                             "requested_radius_metres": radius, "searched_radius_metres": radius,
                             "mapped_places_in_area": 0, "partner_restaurants_found": len(partners),
                             "external_search_unavailable": False})

        unavailable = False
        warning = ""
        try:
            if search:
                external = google_name_search(search, latitude, longitude, radius)
            else:
                nearby = combined_restaurant_discovery(latitude, longitude, radius)
                external = []
                for p in nearby:
                    tags = p.get("tags") or {}
                    category = p.get("category") or "restaurant"
                    try:
                        plat, plon = float(p["latitude"]), float(p["longitude"])
                    except (ValueError, TypeError, KeyError):
                        continue
                    if not (math.isfinite(plat) and math.isfinite(plon)):
                        continue
                    km = distance_km(latitude, longitude, plat, plon)
                    if km * 1000 > radius:
                        continue
                    # Some records already come normalized from Text Search.
                    external.append({
                        "id": p.get("id"), "name": p.get("name"),
                        "latitude": plat, "longitude": plon, "distance_km": round(km, 2),
                        "amenity": category, "category": category, "cuisine": p.get("cuisine", ""),
                        "address": p.get("address", ""), "phone": p.get("phone", ""),
                        "website": p.get("website", ""), "opening_hours": p.get("opening_hours", ""),
                        "diet_vegetarian": p.get("diet_vegetarian", "unknown"),
                        "diet_vegan": p.get("diet_vegan", "unknown"),
                        "diet_meat": p.get("diet_meat", "unknown"),
                        "diet_fish": p.get("diet_fish", "unknown"),
                        "diet_non_vegetarian": p.get("diet_non_vegetarian", "unknown"),
                        "wheelchair": p.get("wheelchair", tags.get("wheelchair")),
                        "internet_access": p.get("internet_access", tags.get("internet_access")),
                        "payment_methods": p.get("payment_methods") or [],
                        "source": "google", "is_foodkindl_partner": False,
                        "accepts_foodkindl_booking": False,
                        "google_place_id": p.get("google_place_id"),
                        "rating": p.get("rating"), "review_count": p.get("review_count"),
                        "photo_url": p.get("photo_url"),
                        "photo_attributions": p.get("photo_attributions", []),
                        "attributions": p.get("attributions", []),
                    })
        except (PlacesUnavailable, requests.RequestException) as exc:
            logger.warning("Restaurant discovery unavailable: %s", exc)
            if source == "other":
                return Response({"detail": str(exc), "results": []}, status=503)
            unavailable = True
            warning = "Google Places is temporarily unavailable. Showing FoodKindl partners only."
            external = []

        filtered = []
        for p in external:
            category = p.get("category", "")
            if category not in {"restaurant", "cafe"}:
                continue
            if place_type != "all" and category != place_type:
                continue
            if cuisine and cuisine != "all cuisines" and cuisine.replace("_", " ") not in p.get("cuisine", "").lower():
                continue
            veg = str(p.get("diet_vegetarian", "")).lower()
            nonveg = str(p.get("diet_non_vegetarian", "")).lower()
            if diet in {"veg", "vegetarian"} and veg != "yes":
                continue
            if diet in {"nonveg", "non_veg", "non-veg"} and nonveg != "yes":
                continue
            if not p.get("name"):
                continue
            score = p.get("rating")
            if min_rating and (score is None or float(score) < min_rating):
                continue
            # No booking permission is ever inherited from an external Google listing.
            filtered.append(p)
        if has_location:
            filtered.sort(key=lambda p: p["distance_km"])

        results = list(partners) if source == "all" else []
        for p in filtered:
            duplicate = any(p["name"].strip().casefold() == partner["name"].strip().casefold()
                            and distance_km(p["latitude"], p["longitude"], partner["latitude"], partner["longitude"]) < 0.12
                            for partner in partners)
            if not duplicate:
                results.append(p)
        if min_rating:
            results = [p for p in results if p.get("rating") is not None
                       and float(p["rating"]) >= min_rating]
        if has_location:
            results.sort(key=lambda p: p["distance_km"])
        results = results[:limit]
        return Response({
            "count": len(results), "results": results,
            "requested_radius_metres": radius, "searched_radius_metres": radius,
            "search_mode": "nearby" if has_location else "name_only",
            "mapped_places_in_area": len(external),
            "partner_restaurants_found": len(partners),
            "external_search_unavailable": unavailable, "warning": warning,
        })

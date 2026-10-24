"""FoodKindl Google Places discovery. No OSM calls or persistent Google listing cache."""
import logging
import math
import os
import re

import requests
from django.conf import settings

logger = logging.getLogger(__name__)
URL = "https://places.googleapis.com/v1/places:"
FIELDS = (
    "places.id,places.displayName,places.location,places.formattedAddress,"
    "places.types,places.primaryType,places.rating,places.userRatingCount,"
    "places.photos,places.attributions"
)
FOOD_TYPES = {
    "restaurant", "cafe", "coffee_shop", "fast_food_restaurant",
    "bakery", "meal_takeaway",
}
ACCOMMODATION_TYPES = {
    "hotel", "lodging", "guest_house", "hostel", "motel", "resort_hotel", "bed_and_breakfast"
}
PG_NAME = re.compile(r"\b(?:p\.?\s*g\.?|paying\s+guests?|hostels?|boys[’']?\s+pg|girls[’']?\s+pg)\b", re.I)


class PlacesUnavailable(Exception):
    pass


def _request(method, body, fields=None):
    key = (
        getattr(settings, "GOOGLE_PLACES_API_KEY", "")
        or os.environ.get("GOOGLE_PLACES_API_KEY", "")
        or getattr(settings, "GOOGLE_MAPS_API_KEY", "")
        or os.environ.get("GOOGLE_MAPS_API_KEY", "")
    )
    if not key:
        raise PlacesUnavailable("Google Places API key is not configured.")
    try:
        response = requests.post(
            URL + method,
            headers={
                "X-Goog-Api-Key": key,
                "X-Goog-FieldMask": fields or FIELDS,
                "Content-Type": "application/json",
            },
            json=body,
            timeout=(3, 12),
        )
        response.raise_for_status()
        payload = response.json()
        rows = payload.get("places", [])
        if not isinstance(rows, list):
            raise ValueError("Invalid Google Places response")
        return rows
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Google Places %s failed (%s)", method, type(exc).__name__)
        raise PlacesUnavailable("Google Places request failed. Check API key, billing and quota.") from None


def is_food_place(name, types, primary_type=""):
    """Keep dining establishments, excluding accommodation as a primary business."""
    if PG_NAME.search(str(name or "")):
        return False
    if str(primary_type or "") in ACCOMMODATION_TYPES:
        return False
    return any(
        t in FOOD_TYPES or t.endswith("_restaurant") or t.endswith("_cafe")
        for t in (types or [])
    )


def distance_km(a, b, c, d):
    a, b, c, d = map(float, (a, b, c, d))
    h = (math.sin(math.radians(c-a)/2)**2 +
         math.cos(math.radians(a))*math.cos(math.radians(c))*
         math.sin(math.radians(d-b)/2)**2)
    return 12742 * math.asin(min(1, math.sqrt(max(0, h))))


def search_locations(query, limit=8):
    if not str(query).strip():
        return []
    rows = _request(
        "searchText",
        {"textQuery": str(query).strip(), "pageSize": max(1, min(10, int(limit))),
         "regionCode": "IN", "languageCode": "en"},
        fields="places.id,places.displayName,places.location,places.formattedAddress,places.attributions"
    )
    results = []
    for p in rows:
        loc = p.get("location") or {}
        if loc.get("latitude") is None or loc.get("longitude") is None:
            continue
        results.append({
            "id": p.get("id"), "name": (p.get("displayName") or {}).get("text", ""),
            "display_name": p.get("formattedAddress", ""),
            "latitude": loc["latitude"], "longitude": loc["longitude"],
            "attributions": p.get("attributions") or []
        })
    return results



def restaurant_photo_url(place):
    """Time-limited internal URL for first Google Places photo (no API key in browser)."""
    from django.core import signing
    from django.urls import reverse
    photos = place.get("photos") or []
    for photo in photos:
        resource = photo.get("name", "")
        if re.fullmatch(r"places/[^/]+/photos/[^/]+", resource):
            token = signing.dumps(resource, salt="foodkindl-google-photo")
            return reverse("dineout-restaurant-photo", kwargs={"token": token})
    return None

def _normalize(place, center_lat, center_lon, radius):
    place_id = place.get("id")
    name = str((place.get("displayName") or {}).get("text") or "").strip()
    types = place.get("types") or []
    if not place_id or not name or not is_food_place(name, types, place.get("primaryType", "")):
        return None
    loc = place.get("location") or {}
    try:
        lat = float(loc["latitude"])
        lon = float(loc["longitude"])
    except (TypeError, ValueError, KeyError):
        return None
    if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
        return None
    km = distance_km(center_lat, center_lon, lat, lon)
    if km * 1000 > radius:
        return None
    category = "cafe" if any(t in {"cafe", "coffee_shop"} or t.endswith("_cafe") for t in types) else "restaurant"
    return {
        "id": f"google-{place_id}", "google_place_id": place_id,
        "name": name, "latitude": lat, "longitude": lon,
        "distance_km": round(km, 2), "category": category, "amenity": category,
        "tags": {"amenity": category}, "cuisine": "",
        "address": place.get("formattedAddress", ""),
        "rating": place.get("rating"), "review_count": place.get("userRatingCount"),
        "opening_hours": "", "phone": "", "website": "",
        "diet_vegetarian": None, "diet_vegan": None,
        "diet_meat": None, "diet_fish": None, "diet_non_vegetarian": None,
        "source": "google", "is_foodkindl_partner": False,
        "accepts_foodkindl_booking": False,
        "attributions": place.get("attributions") or [],
        "photo_url": restaurant_photo_url(place),
        "photo_attributions": ((place.get("photos") or [{}])[0].get("authorAttributions") or []),
    }


def search_google_places(latitude, longitude, radius_metres=3000):
    """Nearby Search New, separate restaurant and cafe queries; <= 20 each."""
    lat, lon = float(latitude), float(longitude)
    if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("Invalid coordinates")
    radius = max(500, min(int(radius_metres), 5000))
    found = {}
    failed = 0
    # Separate requests provide more coverage than a single combined 20-result response.
    for group in (["restaurant"], ["cafe", "coffee_shop"]):
        body = {
            "includedTypes": group,
            "maxResultCount": 20,
            "rankPreference": "DISTANCE",
            "languageCode": "en",
            "regionCode": "IN",
            "locationRestriction": {"circle": {
                "center": {"latitude": lat, "longitude": lon},
                "radius": float(radius),
            }},
        }
        try:
            rows = _request("searchNearby", body)
        except PlacesUnavailable:
            failed += 1
            continue
        for p in rows:
            result = _normalize(p, lat, lon, radius)
            if result:
                found[result["google_place_id"]] = result
    if failed == 2:
        raise PlacesUnavailable("Nearby restaurant and cafe searches failed.")
    return sorted(found.values(), key=lambda p: p["distance_km"])

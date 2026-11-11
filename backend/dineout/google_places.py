"""FoodKindl Google Places discovery; does not cache Google listings."""
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
    "places.photos,places.attributions,places.websiteUri,"
    "places.nationalPhoneNumber,places.regularOpeningHours"
)
FOOD_TYPES = {
    "restaurant", "cafe", "coffee_shop", "fast_food_restaurant",
    "bakery", "meal_takeaway",
}
ACCOMMODATION_TYPES = {
    "hotel", "lodging", "guest_house", "hostel", "motel",
    "resort_hotel", "bed_and_breakfast",
}
PG_NAME = re.compile(
    r"\b(?:p\s*\.\s*g\s*\.?|paying\s+guests?|hostels?|"
    r"boys[’']?\s+pg|girls[’']?\s+pg)\b",
    re.IGNORECASE,
)


class PlacesUnavailable(Exception):
    """Raised when Google Places cannot return a usable response."""


def _api_key():
    return (
        getattr(settings, "GOOGLE_PLACES_API_KEY", "")
        or os.environ.get("GOOGLE_PLACES_API_KEY", "")
        or getattr(settings, "GOOGLE_MAPS_API_KEY", "")
        or os.environ.get("GOOGLE_MAPS_API_KEY", "")
    )


def _request(method, body, fields=None):
    key = _api_key()
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
        raise PlacesUnavailable(
            "Google Places request failed. Check API key, billing and quota."
        ) from None


def is_food_place(name, types, primary_type=""):
    """Keep dining businesses and exclude lodging businesses."""
    if PG_NAME.search(str(name or "")):
        return False
    if str(primary_type or "") in ACCOMMODATION_TYPES:
        return False
    return any(
        item in FOOD_TYPES or item.endswith("_restaurant") or item.endswith("_cafe")
        for item in (types or [])
    )


def distance_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(float, (lat1, lon1, lat2, lon2))
    haversine = (
        math.sin(math.radians(lat2 - lat1) / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    )
    return 12742 * math.asin(min(1, math.sqrt(max(0, haversine))))


def search_locations(query, limit=8):
    query = str(query or "").strip()
    if not query:
        return []

    rows = _request(
        "searchText",
        {
            "textQuery": query,
            "pageSize": max(1, min(10, int(limit))),
            "regionCode": "IN",
            "languageCode": "en",
        },
        fields=(
            "places.id,places.displayName,places.location,"
            "places.formattedAddress,places.attributions"
        ),
    )
    results = []
    for place in rows:
        location = place.get("location") or {}
        if location.get("latitude") is None or location.get("longitude") is None:
            continue
        results.append({
            "id": place.get("id"),
            "name": (place.get("displayName") or {}).get("text", ""),
            "display_name": place.get("formattedAddress", ""),
            "latitude": location["latitude"],
            "longitude": location["longitude"],
            "attributions": place.get("attributions") or [],
        })
    return results


def restaurant_photo_url(place):
    """Return a signed internal proxy URL; never expose the Google API key."""
    from django.core import signing
    from django.urls import reverse

    for photo in place.get("photos") or []:
        resource = photo.get("name", "")
        if re.fullmatch(r"places/[^/]+/photos/[^/]+", resource):
            token = signing.dumps(resource, salt="foodkindl-google-photo")
            return reverse("dineout-restaurant-photo", kwargs={"token": token})
    return ""


def _normalize(place, center_lat, center_lon, radius_metres):
    place_id = place.get("id")
    name = str((place.get("displayName") or {}).get("text") or "").strip()
    types = place.get("types") or []
    if not place_id or not name or not is_food_place(
        name, types, place.get("primaryType", "")
    ):
        return None

    location = place.get("location") or {}
    try:
        latitude = float(location["latitude"])
        longitude = float(location["longitude"])
    except (TypeError, ValueError, KeyError):
        return None
    if not (
        math.isfinite(latitude)
        and math.isfinite(longitude)
        and -90 <= latitude <= 90
        and -180 <= longitude <= 180
    ):
        return None

    distance = distance_km(center_lat, center_lon, latitude, longitude)
    if distance * 1000 > radius_metres:
        return None

    category = (
        "cafe"
        if any(item in {"cafe", "coffee_shop"} or item.endswith("_cafe") for item in types)
        else "restaurant"
    )
    opening = place.get("regularOpeningHours") or {}
    photo = (place.get("photos") or [{}])[0]
    return {
        "id": f"google-{place_id}",
        "google_place_id": place_id,
        "name": name,
        "latitude": latitude,
        "longitude": longitude,
        "distance_km": round(distance, 2),
        "category": category,
        "amenity": category,
        "tags": {"amenity": category},
        "cuisine": "",
        "address": place.get("formattedAddress", ""),
        "rating": place.get("rating"),
        "review_count": place.get("userRatingCount"),
        "opening_hours": "; ".join(opening.get("weekdayDescriptions") or []),
        "phone": place.get("nationalPhoneNumber", ""),
        "website": place.get("websiteUri", ""),
        "diet_vegetarian": None,
        "diet_vegan": None,
        "diet_meat": None,
        "diet_fish": None,
        "diet_non_vegetarian": None,
        "source": "google",
        "is_foodkindl_partner": False,
        "accepts_foodkindl_booking": False,
        "attributions": place.get("attributions") or [],
        "photo_url": restaurant_photo_url(place),
        "photo_attributions": photo.get("authorAttributions") or [],
        "website": place.get("websiteUri", ""),
        "phone": place.get("nationalPhoneNumber", ""),
        "opening_hours": "; ".join(opening.get("weekdayDescriptions") or []),
        "photo_url": restaurant_photo_url(place),
    }


def search_google_places(latitude, longitude, radius_metres=3000):
    """Search nearby restaurants and cafes, up to 20 results per request."""
    latitude, longitude = float(latitude), float(longitude)
    if not (
        math.isfinite(latitude)
        and math.isfinite(longitude)
        and -90 <= latitude <= 90
        and -180 <= longitude <= 180
    ):
        raise ValueError("Invalid coordinates")

    radius = max(500, min(int(radius_metres), 5000))
    found = {}
    failed = 0
    for included_types in (["restaurant"], ["cafe", "coffee_shop"]):
        body = {
            "includedTypes": included_types,
            "maxResultCount": 20,
            "rankPreference": "DISTANCE",
            "languageCode": "en",
            "regionCode": "IN",
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": latitude, "longitude": longitude},
                    "radius": float(radius),
                }
            },
        }
        try:
            rows = _request("searchNearby", body)
        except PlacesUnavailable:
            failed += 1
            continue
        for place in rows:
            result = _normalize(place, latitude, longitude, radius)
            if result:
                found[result["google_place_id"]] = result

    if failed == 2:
        raise PlacesUnavailable("Nearby restaurant and cafe searches failed.")
    return sorted(found.values(), key=lambda item: item["distance_km"])

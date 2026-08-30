import requests
from django.conf import settings


GEOCODE_URL = "https://api.openrouteservice.org/geocode/search"


def geocode_restaurant_location(
    address="",
    locality="",
    city="",
    pincode="",
):
    api_key = getattr(
        settings,
        "ORS_API_KEY",
        "",
    )

    if not api_key:
        print("❌ ORS_API_KEY is missing")
        return None

    parts = [
        address,
        locality,
        city,
        pincode,
        "India",
    ]

    search_text = ", ".join(
        str(item).strip()
        for item in parts
        if item and str(item).strip()
    )

    print("🔎 GEOCODING:", search_text)

    try:
        response = requests.get(
            GEOCODE_URL,
            params={
                "api_key": api_key,
                "text": search_text,
                "size": 1,
            },
            timeout=20,
        )

        print(
            "🌐 GEOCODING STATUS:",
            response.status_code,
        )

        if not response.ok:
            print(
                "❌ GEOCODING RESPONSE:",
                response.text[:500],
            )
            return None

        data = response.json()

        features = data.get(
            "features",
            [],
        )

        if not features:
            print(
                "❌ No geocoding result:",
                search_text,
            )
            return None

        coordinates = (
            features[0]
            .get("geometry", {})
            .get("coordinates", [])
        )

        if len(coordinates) < 2:
            print(
                "❌ Invalid coordinates:",
                coordinates,
            )
            return None

        longitude = coordinates[0]
        latitude = coordinates[1]

        print(
            "✅ GEOCODING SUCCESS:",
            latitude,
            longitude,
        )

        return {
            "latitude": latitude,
            "longitude": longitude,
        }

    except Exception as exc:
        print(
            "❌ GEOCODING EXCEPTION:",
            repr(exc),
        )

        return None


# Compatibility
def geocode_restaurant(*args, **kwargs):
    return geocode_restaurant_location(
        *args,
        **kwargs,
    )


def geocode_place(*args, **kwargs):
    return geocode_restaurant_location(
        *args,
        **kwargs,
    )
import logging

import requests

from django.conf import settings
from django.core.exceptions import ValidationError


# ============================================================
# LOGGER
# ============================================================

logger = logging.getLogger(__name__)


# ============================================================
# OPENROUTESERVICE
# ============================================================

ORS_GEOCODE_SEARCH_URL = (
    "https://api.openrouteservice.org/geocode/search"
)

ORS_GEOCODE_AUTOCOMPLETE_URL = (
    "https://api.openrouteservice.org/geocode/autocomplete"
)


DEFAULT_COUNTRY = "IND"

DEFAULT_TIMEOUT = 12


# Bengaluru is only used as a weak search bias.
# It does NOT restrict searches to Bengaluru.
DEFAULT_FOCUS_LAT = 12.9716
DEFAULT_FOCUS_LON = 77.5946


# ============================================================
# SETTINGS
# ============================================================

def _get_ors_api_key():
    """
    Return the OpenRouteService API key configured in Django.
    """

    api_key = getattr(
        settings,
        "ORS_API_KEY",
        "",
    )

    api_key = str(
        api_key or ""
    ).strip()

    if not api_key:
        raise ValidationError(
            "ORS_API_KEY is not configured."
        )

    return api_key


# ============================================================
# TEXT HELPERS
# ============================================================

def _clean_text(value):
    """
    Safely convert a value to stripped text.
    """

    if value is None:
        return ""

    return str(
        value
    ).strip()


def _build_location_text(
    *,
    name="",
    address="",
    locality="",
    city="",
    pincode="",
    country="India",
):
    """
    Create one sensible geocoding query.

    Duplicate pieces are removed while preserving order.
    """

    values = [
        name,
        address,
        locality,
        city,
        pincode,
        country,
    ]

    cleaned = []

    seen = set()

    for value in values:

        text = _clean_text(
            value
        )

        if not text:
            continue

        key = text.lower()

        if key in seen:
            continue

        seen.add(
            key
        )

        cleaned.append(
            text
        )

    return ", ".join(
        cleaned
    )


# ============================================================
# COORDINATE HELPERS
# ============================================================

def _valid_latitude(value):

    try:
        value = float(
            value
        )

    except (
        TypeError,
        ValueError,
    ):
        return None

    if not (
        -90 <= value <= 90
    ):
        return None

    return value


def _valid_longitude(value):

    try:
        value = float(
            value
        )

    except (
        TypeError,
        ValueError,
    ):
        return None

    if not (
        -180 <= value <= 180
    ):
        return None

    return value


# ============================================================
# PARSE ORS FEATURE
# ============================================================

def _parse_feature(
    feature,
    fallback_name="",
):
    """
    Convert one ORS GeoJSON feature into FoodKindl's
    common location format.
    """

    if not isinstance(
        feature,
        dict,
    ):
        return None


    geometry = (
        feature.get(
            "geometry"
        )
        or {}
    )


    properties = (
        feature.get(
            "properties"
        )
        or {}
    )


    coordinates = (
        geometry.get(
            "coordinates"
        )
        or []
    )


    if len(
        coordinates
    ) < 2:

        return None


    longitude = (
        _valid_longitude(
            coordinates[0]
        )
    )


    latitude = (
        _valid_latitude(
            coordinates[1]
        )
    )


    if (
        latitude is None
        or longitude is None
    ):

        return None


    name = (
        _clean_text(
            properties.get(
                "name"
            )
        )
        or
        _clean_text(
            fallback_name
        )
    )


    display_name = (
        _clean_text(
            properties.get(
                "label"
            )
        )
        or
        name
    )


    locality = (
        _clean_text(
            properties.get(
                "locality"
            )
        )
        or
        _clean_text(
            properties.get(
                "neighbourhood"
            )
        )
        or
        _clean_text(
            properties.get(
                "borough"
            )
        )
    )


    city = (
        _clean_text(
            properties.get(
                "localadmin"
            )
        )
        or
        _clean_text(
            properties.get(
                "county"
            )
        )
    )


    state_name = (
        _clean_text(
            properties.get(
                "region"
            )
        )
    )


    country = (
        _clean_text(
            properties.get(
                "country"
            )
        )
    )


    postcode = (
        _clean_text(
            properties.get(
                "postalcode"
            )
        )
    )


    return {

        "id": (
            properties.get(
                "id"
            )
            or
            properties.get(
                "gid"
            )
            or
            f"{latitude}-{longitude}"
        ),

        "name":
            name,

        "display_name":
            display_name,

        "locality":
            locality,

        "city":
            city,

        "state":
            state_name,

        "country":
            country,

        "postcode":
            postcode,

        "latitude":
            latitude,

        "longitude":
            longitude,

        "layer":
            _clean_text(
                properties.get(
                    "layer"
                )
            ),

        "confidence":
            properties.get(
                "confidence"
            ),

    }


# ============================================================
# ORS REQUEST
# ============================================================

def _request_ors_geocode(
    search_text,
    *,
    size=1,
    use_focus=False,
):
    """
    Search OpenRouteService and return parsed locations.
    """

    search_text = _clean_text(
        search_text
    )


    if not search_text:

        return []


    api_key = (
        _get_ors_api_key()
    )


    params = {

        "api_key":
            api_key,

        "text":
            search_text,

        "size":
            max(
                1,
                min(
                    int(
                        size or 1
                    ),
                    10,
                ),
            ),

        "boundary.country":
            DEFAULT_COUNTRY,

    }


    # --------------------------------------------------------
    # IMPORTANT
    #
    # This is only a bias toward Bengaluru.
    #
    # boundary.country=IND still allows locations anywhere
    # in India, which is important for Food Walk journeys
    # such as Bengaluru -> Rameswaram.
    # --------------------------------------------------------

    if use_focus:

        params[
            "focus.point.lat"
        ] = DEFAULT_FOCUS_LAT

        params[
            "focus.point.lon"
        ] = DEFAULT_FOCUS_LON


    logger.info(
        "ORS geocoding search: %s",
        search_text,
    )


    try:

        response = requests.get(

            ORS_GEOCODE_SEARCH_URL,

            params=params,

            timeout=DEFAULT_TIMEOUT,

        )


    except requests.Timeout as exc:

        logger.warning(
            "ORS geocoding timeout: %s",
            search_text,
        )

        raise ValidationError(
            "Location search timed out. "
            "Please try again."
        ) from exc


    except requests.ConnectionError as exc:

        logger.exception(
            "Could not connect to ORS."
        )

        raise ValidationError(
            "FoodKindl could not connect "
            "to the location service."
        ) from exc


    except requests.RequestException as exc:

        logger.exception(
            "ORS request error."
        )

        raise ValidationError(
            "Location search failed."
        ) from exc


    logger.info(
        "ORS geocoding status: %s",
        response.status_code,
    )


    if response.status_code in (
        401,
        403,
    ):

        raise ValidationError(
            "OpenRouteService rejected "
            "the API key."
        )


    if response.status_code == 429:

        raise ValidationError(
            "The location service is temporarily "
            "receiving too many requests. "
            "Please try again shortly."
        )


    if not response.ok:

        body = (
            response.text
            or ""
        ).strip()

        if len(
            body
        ) > 300:

            body = (
                body[:300]
                + "..."
            )


        logger.error(
            "ORS geocoding failed. "
            "Status=%s Body=%s",
            response.status_code,
            body,
        )


        raise ValidationError(
            "The location service could not "
            "complete this search."
        )


    try:

        data = (
            response.json()
            or {}
        )


    except ValueError as exc:

        raise ValidationError(
            "The location service returned "
            "an invalid response."
        ) from exc


    features = (
        data.get(
            "features"
        )
        or []
    )


    results = []


    for feature in features:

        parsed = (
            _parse_feature(
                feature,
                fallback_name=
                    search_text,
            )
        )


        if parsed:

            results.append(
                parsed
            )


    return results


# ============================================================
# GENERIC PLACE GEOCODING
#
# Used by Food Walk:
#
# geocode_place("Nagasandra")
# geocode_place("Majestic Bengaluru")
# geocode_place("Rameswaram")
# ============================================================

def geocode_place(
    place,
    *,
    city="",
    state="",
    country="India",
):
    """
    Geocode an arbitrary place used by Food Walk.

    Accepts:
        geocode_place("Nagasandra")
        geocode_place("Majestic, Bengaluru")
        geocode_place(
            "Nagasandra",
            city="Bengaluru"
        )

    Returns:
        {
            latitude,
            longitude,
            display_name,
            ...
        }

    Raises ValidationError if the place cannot be found.
    """

    place = _clean_text(
        place
    )


    if not place:

        raise ValidationError(
            "Please enter a location."
        )


    search_parts = [
        place,
        city,
        state,
        country,
    ]


    search_text = ", ".join(

        _clean_text(
            value
        )

        for value
        in search_parts

        if _clean_text(
            value
        )

    )


    # --------------------------------------------------------
    # First search:
    # complete text.
    # --------------------------------------------------------

    results = (
        _request_ors_geocode(
            search_text,
            size=3,
            use_focus=True,
        )
    )


    if results:

        return results[0]


    # --------------------------------------------------------
    # Fallback:
    # Do not force supplied city/state if ORS could not find
    # the complete search.
    #
    # Useful for long-distance Food Walk destinations.
    # --------------------------------------------------------

    if search_text.lower() != place.lower():

        results = (
            _request_ors_geocode(
                f"{place}, India",
                size=3,
                use_focus=False,
            )
        )


        if results:

            return results[0]


    raise ValidationError(
        f"Could not locate '{place}'. "
        "Try selecting a location from "
        "the suggestions."
    )


# ============================================================
# RESTAURANT LOCATION
#
# Used by Restaurant.save()
# ============================================================

def geocode_restaurant_location(
    address="",
    locality="",
    city="",
    pincode="",
    name="",
):
    """
    Geocode restaurant details.

    The search starts with the most precise address and
    gradually falls back if ORS cannot find it.
    """

    address = _clean_text(
        address
    )

    locality = _clean_text(
        locality
    )

    city = _clean_text(
        city
    )

    pincode = _clean_text(
        pincode
    )

    name = _clean_text(
        name
    )


    if not any(
        (
            name,
            address,
            locality,
            city,
            pincode,
        )
    ):

        raise ValidationError(
            "Restaurant location information "
            "is missing."
        )


    # ========================================================
    # SEARCH STRATEGIES
    #
    # Restaurant name can sometimes hurt geocoding if ORS
    # does not know the business, therefore address-first.
    # ========================================================

    candidates = []


    # 1. Full address
    candidates.append(

        _build_location_text(

            name="",

            address=
                address,

            locality=
                locality,

            city=
                city,

            pincode=
                pincode,

        )

    )


    # 2. Name + locality + city
    if name:

        candidates.append(

            _build_location_text(

                name=
                    name,

                locality=
                    locality,

                city=
                    city,

                pincode=
                    pincode,

            )

        )


    # 3. Locality + city
    candidates.append(

        _build_location_text(

            locality=
                locality,

            city=
                city,

            pincode=
                pincode,

        )

    )


    # 4. City + pincode
    candidates.append(

        _build_location_text(

            city=
                city,

            pincode=
                pincode,

        )

    )


    # Remove duplicate / empty searches

    unique_candidates = []

    seen = set()


    for candidate in candidates:

        candidate = (
            _clean_text(
                candidate
            )
        )


        if not candidate:
            continue


        key = (
            candidate.lower()
        )


        if key in seen:
            continue


        seen.add(
            key
        )

        unique_candidates.append(
            candidate
        )


    # ========================================================
    # TRY EACH SEARCH
    # ========================================================

    last_error = None


    for search_text in unique_candidates:

        try:

            results = (
                _request_ors_geocode(
                    search_text,
                    size=3,
                    use_focus=False,
                )
            )


        except ValidationError as exc:

            last_error = exc

            continue


        if results:

            result = (
                results[0]
            )


            logger.info(
                "Restaurant geocoded: %s -> %s, %s",
                search_text,
                result[
                    "latitude"
                ],
                result[
                    "longitude"
                ],
            )


            return result


    if last_error:

        logger.warning(
            "Restaurant geocoding failed: %s",
            last_error,
        )


    raise ValidationError(
        "FoodKindl could not determine "
        "the restaurant location. "
        "Please check the address, locality, "
        "city and pincode."
    )


# ============================================================
# RESTAURANT COMPATIBILITY WRAPPER
#
# IMPORTANT:
#
# Your views currently call:
#
#     geocode_restaurant(restaurant)
#
# while Restaurant.save() calls:
#
#     geocode_restaurant_location(
#         address=...,
#         locality=...,
#         city=...,
#         pincode=...
#     )
#
# This wrapper supports BOTH.
# ============================================================

def geocode_restaurant(
    restaurant=None,
    *args,
    **kwargs,
):
    """
    Supports:

        geocode_restaurant(restaurant_object)

    and:

        geocode_restaurant(
            address="...",
            locality="...",
            city="...",
            pincode="..."
        )
    """

    # ========================================================
    # RESTAURANT MODEL OBJECT
    # ========================================================

    if (
        restaurant is not None
        and
        not isinstance(
            restaurant,
            str,
        )
    ):

        return (
            geocode_restaurant_location(

                name=getattr(
                    restaurant,
                    "name",
                    "",
                ),

                address=getattr(
                    restaurant,
                    "address",
                    "",
                ),

                locality=getattr(
                    restaurant,
                    "locality",
                    "",
                ),

                city=getattr(
                    restaurant,
                    "city",
                    "",
                ),

                pincode=getattr(
                    restaurant,
                    "pincode",
                    "",
                ),

            )
        )


    # ========================================================
    # STRING PASSED POSITIONALLY
    #
    # Maintain backward compatibility:
    #
    # geocode_restaurant("MG Road")
    # ========================================================

    if isinstance(
        restaurant,
        str,
    ):

        kwargs.setdefault(
            "address",
            restaurant,
        )


    return (
        geocode_restaurant_location(
            *args,
            **kwargs,
        )
    )
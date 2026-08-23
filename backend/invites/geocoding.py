import requests

from django.core.exceptions import ValidationError


# ============================================================
# CONFIGURATION
# ============================================================

NOMINATIM_URL = (
    "https://nominatim.openstreetmap.org/search"
)

REQUEST_TIMEOUT = 15


# ============================================================
# CLEAN VALUE
# ============================================================

def _clean(
    value,
):

    if value is None:
        return ""

    return str(
        value
    ).strip()


# ============================================================
# BUILD RESTAURANT ADDRESS QUERIES
#
# We try several address combinations because a restaurant
# name, building name or locality may not always exist exactly
# as entered in OpenStreetMap.
# ============================================================

def build_restaurant_queries(
    restaurant,
):

    name = _clean(
        restaurant.name
    )

    address = _clean(
        restaurant.address
    )

    locality = _clean(
        restaurant.locality
    )

    city = _clean(
        restaurant.city
    )

    pincode = _clean(
        restaurant.pincode
    )


    queries = []


    # ========================================================
    # 1. FULL ADDRESS
    # ========================================================

    full_address = ", ".join(
        value

        for value in (
            name,
            address,
            locality,
            city,
            pincode,
            "India",
        )

        if value
    )


    if full_address:

        queries.append(
            full_address
        )


    # ========================================================
    # 2. WITHOUT RESTAURANT NAME
    # ========================================================

    address_without_name = ", ".join(
        value

        for value in (
            address,
            locality,
            city,
            pincode,
            "India",
        )

        if value
    )


    if address_without_name:

        queries.append(
            address_without_name
        )


    # ========================================================
    # 3. ADDRESS + CITY + PINCODE
    #
    # Useful when locality entered in admin is incorrect.
    # ========================================================

    address_city_pincode = ", ".join(
        value

        for value in (
            address,
            city,
            pincode,
            "India",
        )

        if value
    )


    if address_city_pincode:

        queries.append(
            address_city_pincode
        )


    # ========================================================
    # 4. ADDRESS + CITY
    # ========================================================

    address_city = ", ".join(
        value

        for value in (
            address,
            city,
            "India",
        )

        if value
    )


    if address_city:

        queries.append(
            address_city
        )


    # ========================================================
    # 5. LOCALITY + CITY + PINCODE
    # ========================================================

    locality_city_pincode = ", ".join(
        value

        for value in (
            locality,
            city,
            pincode,
            "India",
        )

        if value
    )


    if locality_city_pincode:

        queries.append(
            locality_city_pincode
        )


    # ========================================================
    # 6. LOCALITY + CITY
    # ========================================================

    locality_city = ", ".join(
        value

        for value in (
            locality,
            city,
            "India",
        )

        if value
    )


    if locality_city:

        queries.append(
            locality_city
        )


    # ========================================================
    # 7. PINCODE + CITY
    # ========================================================

    pincode_city = ", ".join(
        value

        for value in (
            pincode,
            city,
            "India",
        )

        if value
    )


    if pincode_city:

        queries.append(
            pincode_city
        )


    # ========================================================
    # REMOVE DUPLICATES
    # ========================================================

    return list(
        dict.fromkeys(
            queries
        )
    )


# ============================================================
# GEOCODE ONE QUERY
# ============================================================

def _geocode_query(
    query,
):

    headers = {

        "User-Agent": (
            "FoodKindl/1.0 "
            "(restaurant-geocoding)"
        ),

        "Accept":
            "application/json",
    }


    params = {

        "q":
            query,

        "format":
            "jsonv2",

        "limit":
            1,

        "countrycodes":
            "in",

        "addressdetails":
            1,
    }


    try:

        response = requests.get(

            NOMINATIM_URL,

            params=params,

            headers=headers,

            timeout=
                REQUEST_TIMEOUT,
        )


    except requests.Timeout as exc:

        raise ValidationError(
            (
                "Restaurant location lookup "
                "timed out."
            )
        ) from exc


    except requests.ConnectionError as exc:

        raise ValidationError(
            (
                "Could not connect to the "
                "location service."
            )
        ) from exc


    except requests.RequestException as exc:

        raise ValidationError(
            (
                "Location lookup request failed: "
                f"{exc}"
            )
        ) from exc


    # ========================================================
    # HTTP ERROR
    # ========================================================

    if not response.ok:

        raise ValidationError(
            (
                "Location service returned "
                f"HTTP {response.status_code}."
            )
        )


    # ========================================================
    # JSON RESPONSE
    # ========================================================

    try:

        results = (
            response.json()
        )


    except ValueError as exc:

        raise ValidationError(
            (
                "Location service returned "
                "invalid data."
            )
        ) from exc


    if not results:

        return None


    result = (
        results[0]
    )


    latitude = (
        result.get(
            "lat"
        )
    )


    longitude = (
        result.get(
            "lon"
        )
    )


    if (
        not latitude
        or not longitude
    ):

        return None


    return {

        "latitude":
            latitude,

        "longitude":
            longitude,

        "display_name":
            result.get(
                "display_name",
                "",
            ),

        "query":
            query,

        "address":
            result.get(
                "address",
                {},
            ),
    }


# ============================================================
# MAIN FUNCTION
#
# THIS IS THE FUNCTION views.py IS IMPORTING
# ============================================================

def geocode_restaurant(
    restaurant,
):

    queries = (
        build_restaurant_queries(
            restaurant
        )
    )


    if not queries:

        raise ValidationError(
            (
                "Restaurant does not have "
                "enough address information."
            )
        )


    errors = []


    # ========================================================
    # TRY EACH ADDRESS
    # ========================================================

    for query in queries:

        try:

            result = (
                _geocode_query(
                    query
                )
            )


            if result:

                return result


        except ValidationError as exc:

            errors.append(
                str(exc)
            )


    # ========================================================
    # NOTHING FOUND
    # ========================================================

    if errors:

        raise ValidationError(
            errors[-1]
        )


    raise ValidationError(
        (
            "Could not find coordinates for "
            "this restaurant address. "
            "Please check the address, locality, "
            "city and pincode."
        )
    )


# ============================================================
# BACKWARD COMPATIBILITY
#
# Keep these functions in case your older admin.py still
# imports build_restaurant_address / geocode_address.
# ============================================================

def build_restaurant_address(
    restaurant,
):

    queries = (
        build_restaurant_queries(
            restaurant
        )
    )


    if not queries:

        return ""


    return queries[0]


def geocode_address(
    address,
):

    address = _clean(
        address
    )


    if not address:

        raise ValidationError(
            "Address cannot be empty."
        )


    result = (
        _geocode_query(
            address
        )
    )


    if not result:

        raise ValidationError(
            (
                "Could not find coordinates "
                "for this address."
            )
        )


    return result

# ============================================================
# GEOCODE GENERAL PLACE FOR FOOD WALK
# ============================================================

def geocode_place(
    place,
):

    place = _clean(
        place
    )


    if not place:

        raise ValidationError(
            "Location cannot be empty."
        )


    queries = [

        (
            f"{place}, "
            "Bengaluru, Karnataka, India"
        ),

        (
            f"{place}, "
            "Bangalore, Karnataka, India"
        ),

        (
            f"{place}, "
            "Karnataka, India"
        ),

        (
            f"{place}, "
            "India"
        ),

    ]


    for query in queries:

        try:

            result = (
                _geocode_query(
                    query
                )
            )


            if result:

                return result


        except ValidationError:

            continue


    raise ValidationError(
        (
            "FoodKindl could not find "
            f"the location '{place}'."
        )
    )
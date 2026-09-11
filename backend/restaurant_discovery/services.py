import math
from typing import Iterable

import requests

from django.conf import settings

from invites.models import Restaurant


# ============================================================
# CONFIG
# ============================================================
OVERPASS_URLS = [
    getattr(
        settings,
        "FOODKINDL_OVERPASS_URL",
        "https://overpass-api.de/api/interpreter",
    ),
    "https://overpass.kumi.systems/api/interpreter",
]

OSRM_URL = getattr(
    settings,
    "FOODKINDL_OSRM_URL",
    "https://router.project-osrm.org",
)


HTTP_USER_AGENT = getattr(
    settings,
    "FOODKINDL_HTTP_USER_AGENT",
    "FoodKindl/1.0 (contact: support@foodkindl.online)",
)


# ============================================================
# FOURSQUARE PLACES API — DINE OUT
# ============================================================

FOURSQUARE_API_KEY = (
    getattr(
        settings,
        "FOURSQUARE_API_KEY",
        "",
    )
    or
    ""
).strip()


FOURSQUARE_API_VERSION = (
    getattr(
        settings,
        "FOURSQUARE_API_VERSION",
        "2025-06-17",
    )
    or
    "2025-06-17"
).strip()


FOURSQUARE_BASE_URL = (
    "https://places-api.foursquare.com"
)


FOURSQUARE_SEARCH_URL = (
    f"{FOURSQUARE_BASE_URL}/places/search"
)


FOURSQUARE_DETAILS_LIMIT = int(
    getattr(
        settings,
        "FOURSQUARE_DETAILS_LIMIT",
        8,
    )
)


FOURSQUARE_PHOTOS_PER_PLACE = int(
    getattr(
        settings,
        "FOURSQUARE_PHOTOS_PER_PLACE",
        3,
    )
)
# ============================================================
# BASIC HELPERS
# ============================================================

def normalize_text(value):
    return " ".join(
        str(
            value or ""
        )
        .strip()
        .lower()
        .replace("_", " ")
        .split()
    )


# ============================================================
# FOOD QUERY NORMALIZATION / ALIASES
# ============================================================

FOOD_QUERY_ALIASES = {
    "barbecue": {
        "barbecue", "barbeque", "barbique", "bbq",
        "grill", "grills", "grilled", "charcoal",
        "charcoal grill", "smoked", "smokehouse",
        "tandoor", "tandoori", "kebab", "kebabs",
        "kabab", "kababs", "grilled chicken",
        "grilled paneer", "barbecue grill",
    },

    "pizza": {
        "pizza", "pizzas", "pizzeria",
        "wood fired pizza", "wood-fired pizza",
    },

    "burger": {
        "burger", "burgers", "hamburger",
        "hamburgers", "cheeseburger", "slider",
        "sliders",
    },

    "cafe": {
        "cafe", "cafes", "coffee", "coffee shop",
        "coffee_shop", "coffeehouse", "espresso",
        "roastery",
    },

    "dessert": {
        "dessert", "desserts", "sweet", "sweets",
        "sweet shop", "ice cream", "ice_cream",
        "gelato", "cake", "cakes", "pastry",
        "pastries", "waffle", "waffles",
        "chocolate",
    },

    "bakery": {
        "bakery", "bakes", "baked goods", "bread",
        "pastry", "pastries", "croissant",
        "croissants", "patisserie", "cake",
    },

    "indian": {
        "indian", "south indian", "north indian",
        "kerala", "karnataka", "andhra",
        "telangana", "tamil", "tamil nadu",
        "punjabi", "bengali", "rajasthani",
        "gujarati", "maharashtrian", "goan",
        "hyderabadi", "udupi", "mangalorean",
        "chettinad", "biryani", "dosa", "idli",
        "tandoori", "kebab",
    },

    "regional": {
        "regional", "local", "traditional",
        "authentic", "kerala", "karnataka",
        "andhra", "telangana", "tamil",
        "punjabi", "bengali", "rajasthani",
        "gujarati", "maharashtrian", "goan",
        "hyderabadi", "udupi", "mangalorean",
        "chettinad", "malabar", "konkan",
        "coastal",
    },

    "juice": {
        "juice", "juices", "juice bar",
        "smoothie", "smoothies", "beverages",
        "fresh juice",
    },

    "salad": {
        "salad", "salads", "healthy",
        "healthy food", "health food",
        "bowl", "bowls",
    },

    "kombucha": {
        "kombucha", "fermented tea",
        "fermented drink",
    },

    "breakfast": {
        "breakfast", "brunch", "morning",
        "idli", "dosa", "poha", "upma",
        "paratha", "appam", "puttu",
    },

    "street food": {
        "street food", "chaat", "snacks",
        "momo", "momos", "kebab", "kebabs",
        "pani puri", "golgappa", "vada pav",
        "roll", "rolls",
    },

    "fast food": {
        "fast food", "fast_food", "quick service",
        "qsr", "burger", "burgers", "pizza",
        "fried chicken", "sandwich", "sandwiches",
    },

    "seafood": {
        "seafood", "sea food", "fish", "prawn",
        "prawns", "shrimp", "crab", "lobster",
        "coastal", "fish fry",
    },

    "chicken": {
        "chicken", "fried chicken",
        "grilled chicken", "tandoori chicken",
        "chicken tikka", "chicken kebab",
    },

    "tea": {
        "tea", "chai", "tea shop",
        "tea house", "teahouse",
    },

    "biryani": {
        "biryani", "biriyani", "briyani",
        "hyderabadi biryani", "dum biryani",
        "dum biriyani",
    },

    "chinese": {
        "chinese", "indo chinese", "indo-chinese",
        "schezwan", "sichuan", "noodles",
        "dimsum", "dim sum",
    },

    "italian": {
        "italian", "pasta", "pizza",
        "pizzeria", "risotto",
    },

    "japanese": {
        "japanese", "sushi", "ramen",
        "yakitori", "tempura",
    },

    "korean": {
        "korean", "korean bbq",
        "korean barbecue", "kimchi", "bibimbap",
    },

    "mexican": {
        "mexican", "taco", "tacos",
        "burrito", "burritos", "nachos",
    },

    "arabian": {
        "arabian", "arabic", "middle eastern",
        "shawarma", "mandi", "kebab",
        "kebabs", "lebanese",
    },

    "vegetarian": {
        "vegetarian", "veg", "pure veg",
        "pure vegetarian",
    },

    "vegan": {
        "vegan", "plant based", "plant-based",
    },
}



FOOD_QUERY_CANONICAL = {}

for canonical, aliases in FOOD_QUERY_ALIASES.items():
    FOOD_QUERY_CANONICAL[
        normalize_text(
            canonical
        )
    ] = canonical

    for alias in aliases:
        FOOD_QUERY_CANONICAL[
            normalize_text(
                alias
            )
        ] = canonical


def canonical_food_query(
    value,
):
    normalized = normalize_text(
        value
    )

    if not normalized:
        return ""

    return FOOD_QUERY_CANONICAL.get(
        normalized,
        normalized,
    )


def food_query_terms(
    value,
):
    canonical = canonical_food_query(
        value
    )

    if not canonical:
        return set()

    aliases = (
        FOOD_QUERY_ALIASES.get(
            canonical,
            {
                canonical,
            },
        )
    )

    return {
        normalize_text(
            alias
        )
        for alias in (
            set(
                aliases
            )
            |
            {
                canonical,
            }
        )
        if normalize_text(
            alias
        )
    }


def food_query_matches_blob(
    blob,
    value,
):
    normalized_blob = normalize_text(
        blob
    )

    if not normalized_blob:
        return False

    terms = food_query_terms(
        value
    )

    if not terms:
        return False

    return any(
        term in normalized_blob
        for term in terms
    )


def food_query_match_strength(
    blob,
    value,
):
    """
    Return a rough relevance score:
    0 = no match
    1 = weak alias match
    2 = exact/canonical term match
    3 = multiple matching aliases
    """

    normalized_blob = normalize_text(
        blob
    )

    canonical = canonical_food_query(
        value
    )

    if (
        not normalized_blob
        or
        not canonical
    ):
        return 0

    terms = food_query_terms(
        value
    )

    matched_terms = [
        term
        for term in terms
        if term in normalized_blob
    ]

    if not matched_terms:
        return 0

    if len(
        matched_terms
    ) >= 2:
        return 3

    if canonical in normalized_blob:
        return 2

    return 1


def safe_float(value):
    try:
        if value in (
            None,
            "",
        ):
            return None

        return float(
            value
        )

    except (
        TypeError,
        ValueError,
    ):
        return None


def safe_int(value):
    try:
        if value in (
            None,
            "",
        ):
            return None

        return int(
            value
        )

    except (
        TypeError,
        ValueError,
    ):
        return None


def haversine_km(
    lat1,
    lon1,
    lat2,
    lon2,
):
    radius_km = 6371.0088

    lat1_rad = math.radians(
        float(
            lat1
        )
    )

    lat2_rad = math.radians(
        float(
            lat2
        )
    )

    delta_lat = math.radians(
        float(
            lat2
        )
        -
        float(
            lat1
        )
    )

    delta_lon = math.radians(
        float(
            lon2
        )
        -
        float(
            lon1
        )
    )

    a = (
        math.sin(
            delta_lat / 2
        ) ** 2
        +
        math.cos(
            lat1_rad
        )
        *
        math.cos(
            lat2_rad
        )
        *
        math.sin(
            delta_lon / 2
        ) ** 2
    )

    return (
        2
        *
        radius_km
        *
        math.atan2(
            math.sqrt(
                a
            ),
            math.sqrt(
                1 - a
            ),
        )
    )


# ============================================================
# ROUTE
# ============================================================

def osrm_profile(
    travel_mode,
):
    """
    router.project-osrm.org publicly exposes driving.
    If you self-host OSRM profiles for cycling/walking, point
    FOODKINDL_OSRM_URL at your own service and change this map.
    """

    mode = normalize_text(
        travel_mode
    )

    if mode in (
        "walk",
        "walking",
        "foot",
        "bike",
        "bicycle",
        "cycling",
    ):
        # Public OSRM demo commonly exposes the driving profile.
        # For route discovery this still gives us a road corridor.
        return "driving"

    return "driving"


def fetch_route(
    *,
    start_lat,
    start_lng,
    destination_lat,
    destination_lng,
    travel_mode="car",
    timeout=20,
):
    profile = osrm_profile(
        travel_mode
    )

    coordinate_string = (
        f"{float(start_lng)},{float(start_lat)};"
        f"{float(destination_lng)},{float(destination_lat)}"
    )

    url = (
        f"{OSRM_URL.rstrip('/')}"
        f"/route/v1/{profile}/"
        f"{coordinate_string}"
    )

    response = requests.get(
        url,
        params={
            "overview":
                "full",
            "geometries":
                "geojson",
            "steps":
                "false",
            "alternatives":
                "false",
        },
        headers={
            "User-Agent":
                HTTP_USER_AGENT,
        },
        timeout=timeout,
    )

    response.raise_for_status()

    data = response.json()

    routes = data.get(
        "routes",
        [],
    )

    if not routes:
        raise ValueError(
            "No route could be calculated."
        )

    route = routes[0]

    geometry = (
        route
        .get(
            "geometry",
            {},
        )
        .get(
            "coordinates",
            [],
        )
    )

    route_points = []

    for coordinate in geometry:
        if (
            not isinstance(
                coordinate,
                (
                    list,
                    tuple,
                ),
            )
            or
            len(
                coordinate
            )
            < 2
        ):
            continue

        lng = safe_float(
            coordinate[0]
        )

        lat = safe_float(
            coordinate[1]
        )

        if (
            lat is None
            or
            lng is None
        ):
            continue

        route_points.append(
            (
                lat,
                lng,
            )
        )

    if len(
        route_points
    ) < 2:
        raise ValueError(
            "Routing service returned an empty route geometry."
        )

    return {
        "points":
            route_points,
        "distance_km":
            float(
                route.get(
                    "distance",
                    0,
                )
            )
            /
            1000,
        "duration_minutes":
            float(
                route.get(
                    "duration",
                    0,
                )
            )
            /
            60,
    }


# ============================================================
# ROUTE SAMPLING
# ============================================================

def sample_route_points(
    route_points,
    *,
    max_samples=12,
):
    """
    Keep Overpass requests efficient by searching around a limited
    number of representative points distributed along the route.
    """

    points = list(
        route_points
    )

    if len(
        points
    ) <= max_samples:
        return points

    samples = []

    for index in range(
        max_samples
    ):
        fraction = (
            index
            /
            (
                max_samples
                -
                1
            )
        )

        position = round(
            fraction
            *
            (
                len(
                    points
                )
                -
                1
            )
        )

        samples.append(
            points[
                position
            ]
        )

    return samples


def dense_route_reference(
    route_points,
    *,
    max_points=350,
):
    """
    Used only for approximate distance-to-route calculation.
    """

    points = list(
        route_points
    )

    if len(
        points
    ) <= max_points:
        return points

    step = max(
        1,
        math.ceil(
            len(
                points
            )
            /
            max_points
        ),
    )

    result = points[
        ::step
    ]

    if (
        result
        and
        result[-1]
        !=
        points[-1]
    ):
        result.append(
            points[-1]
        )

    return result


def distance_to_route_km(
    *,
    latitude,
    longitude,
    route_reference,
):
    best = None

    for (
        route_lat,
        route_lng,
    ) in route_reference:

        distance = haversine_km(
            latitude,
            longitude,
            route_lat,
            route_lng,
        )

        if (
            best is None
            or
            distance < best
        ):
            best = distance

    return (
        best
        if best is not None
        else 9999
    )


def approximate_route_position(
    *,
    latitude,
    longitude,
    route_reference,
):
    """
    Returns 0.0 near route start and 1.0 near route end.
    """

    if not route_reference:
        return None

    best_index = 0
    best_distance = None

    for (
        index,
        (
            route_lat,
            route_lng,
        ),
    ) in enumerate(
        route_reference
    ):
        distance = haversine_km(
            latitude,
            longitude,
            route_lat,
            route_lng,
        )

        if (
            best_distance is None
            or
            distance < best_distance
        ):
            best_distance = distance
            best_index = index

    if len(
        route_reference
    ) <= 1:
        return 0

    return (
        best_index
        /
        (
            len(
                route_reference
            )
            -
            1
        )
    )


# ============================================================
# OVERPASS / OPENSTREETMAP
# ============================================================

def search_radius_m(
    *,
    travel_mode,
    max_detour_km,
):
    user_radius = max(
        0.3,
        float(
            max_detour_km
            or 2
        ),
    )

    mode = normalize_text(
        travel_mode
    )

    if mode in (
        "walk",
        "walking",
        "foot",
    ):
        default_radius = 0.9

    elif mode in (
        "bike",
        "bicycle",
        "cycling",
    ):
        default_radius = 1.8

    else:
        default_radius = 3.0

    return int(
        min(
            max(
                user_radius,
                default_radius,
            ),
            10.0,
        )
        *
        1000
    )


def build_overpass_query(
    *,
    sample_points,
    radius_m,
):
    """
    Build an efficient Overpass query.

    Used by both:
    - Dine Out nearby discovery
    - Food Walk discovery

    nwr = node + way + relation
    """

    clauses = []


    for (
        latitude,
        longitude,
    ) in sample_points:

        around = (
            f"(around:{int(radius_m)},"
            f"{float(latitude):.6f},"
            f"{float(longitude):.6f})"
        )


        # Restaurants, cafes, fast food,
        # food courts and ice cream.
        clauses.append(
            (
                'nwr'
                '["amenity"~'
                '"^(restaurant|cafe|fast_food|food_court|ice_cream)$"]'
                f'{around};'
            )
        )


        # Bakeries
        clauses.append(
            (
                'nwr'
                '["shop"="bakery"]'
                f'{around};'
            )
        )


    return (
        "[out:json]"
        "[timeout:18];"
        "("
        +
        "".join(
            clauses
        )
        +
        ");"
        "out center tags;"
    )


def fetch_osm_places(
    *,
    sample_points,
    radius_m,
    timeout=12,
):
    """
    Fetch live food places from OpenStreetMap / Overpass.

    Tries more than one public Overpass endpoint so a busy
    server does not block Dine Out for a full minute.
    """
    if not sample_points:
        return []

    query = build_overpass_query(
        sample_points=sample_points,
        radius_m=radius_m,
    )

    response = None
    last_error = None

    for overpass_url in OVERPASS_URLS:
        try:
            print(
                "OVERPASS TRY:",
                overpass_url,
            )

            candidate_response = requests.post(
                overpass_url,
                data={
                    "data": query,
                },
                headers={
                    "User-Agent": HTTP_USER_AGENT,
                    "Accept": "application/json",
                },
                timeout=(5, timeout),
            )

            print(
                "OVERPASS STATUS:",
                candidate_response.status_code,
            )

            if candidate_response.status_code in (
                429,
                500,
                502,
                503,
                504,
            ):
                last_error = requests.HTTPError(
                    f"Overpass returned {candidate_response.status_code}"
                )
                continue

            candidate_response.raise_for_status()
            response = candidate_response
            break

        except requests.Timeout as exc:
            print(
                "OVERPASS TIMEOUT:",
                overpass_url,
            )
            last_error = exc

        except requests.RequestException as exc:
            print(
                "OVERPASS ERROR:",
                overpass_url,
                repr(exc),
            )
            last_error = exc

    if response is None:
        raise requests.RequestException(
            "Restaurant discovery timed out or all Overpass servers failed."
        ) from last_error

    data = response.json()

    elements = data.get(
        "elements",
        [],
    )

    places = []
    seen = set()

    for element in elements:

        osm_type = str(
            element.get(
                "type",
                "",
            )
        )

        osm_id = element.get(
            "id"
        )

        unique_key = (
            osm_type,
            osm_id,
        )

        if unique_key in seen:
            continue

        seen.add(
            unique_key
        )

        tags = element.get(
            "tags",
            {},
        ) or {}

        name = str(
            tags.get(
                "name",
                "",
            )
        ).strip()

        if not name:
            # Unnamed OSM food POIs are not useful recommendation cards.
            continue

        latitude = safe_float(
            element.get(
                "lat"
            )
        )

        longitude = safe_float(
            element.get(
                "lon"
            )
        )

        if (
            latitude is None
            or
            longitude is None
        ):
            center = element.get(
                "center",
                {},
            ) or {}

            latitude = safe_float(
                center.get(
                    "lat"
                )
            )

            longitude = safe_float(
                center.get(
                    "lon"
                )
            )

        if (
            latitude is None
            or
            longitude is None
        ):
            continue

        amenity = normalize_text(
            tags.get(
                "amenity",
                "",
            )
        )

        tourism = normalize_text(
            tags.get(
                "tourism",
                "",
            )
        )

        shop = normalize_text(
            tags.get(
                "shop",
                "",
            )
        )

        if tourism == "hotel":
            restaurant_type = "hotel"

        elif shop == "bakery":
            restaurant_type = "bakery"

        elif amenity in (
            "cafe",
            "fast food",
            "food court",
            "ice cream",
        ):
            restaurant_type = (
                amenity
                .replace(
                    " ",
                    "_",
                )
            )

        else:
            restaurant_type = "restaurant"

        address_parts = [
            tags.get(
                "addr:housenumber"
            ),
            tags.get(
                "addr:street"
            ),
            tags.get(
                "addr:suburb"
            ),
            tags.get(
                "addr:city"
            ),
        ]

        address = ", ".join(
            str(
                value
            ).strip()
            for value in address_parts
            if value
        )

        place = {
            "id":
                f"osm:{osm_type}:{osm_id}",
            "source":
                "openstreetmap",
            "source_id":
                f"{osm_type}:{osm_id}",
            "name":
                name,
            "restaurant_type":
                restaurant_type,
            "cuisine":
                str(
                    tags.get(
                        "cuisine",
                        "",
                    )
                )
                .replace(
                    ";",
                    ", ",
                ),
            "locality":
                (
                    tags.get(
                        "addr:suburb"
                    )
                    or
                    tags.get(
                        "addr:neighbourhood"
                    )
                    or
                    tags.get(
                        "addr:place"
                    )
                    or
                    ""
                ),
            "city":
                tags.get(
                    "addr:city",
                    "",
                ),
            "latitude":
                latitude,
            "longitude":
                longitude,
            "rating":
                None,
            "review_count":
                None,
            "average_cost_for_two":
                None,
            "opening_hours":
                tags.get(
                    "opening_hours",
                    "",
                ),
            "phone":
                (
                    tags.get(
                        "contact:phone"
                    )
                    or
                    tags.get(
                        "phone"
                    )
                    or
                    ""
                ),
            "website":
                (
                    tags.get(
                        "contact:website"
                    )
                    or
                    tags.get(
                        "website"
                    )
                    or
                    ""
                ),
            "address":
                address,
            "is_foodkindl_partner":
                False,
            "accepts_foodkindl_booking":
                False,
            "is_active":
                True,
            "menu_items":
                [],
            "matched_dishes":
                [],
            "osm_tags":
                tags,
        }

        places.append(
            place
        )

    return places


# ============================================================
# FOODKINDL DATABASE PLACES
# ============================================================

def matching_menu_items(
    restaurant,
    search_query,
):
    query = canonical_food_query(
        search_query
    )

    if not query:
        return []

    terms = food_query_terms(
        query
    )

    matches = []

    for item in (
        restaurant.menu_items.all()
    ):

        if (
            hasattr(
                item,
                "is_available",
            )
            and
            item.is_available is False
        ):
            continue

        item_blob = normalize_text(
            " ".join(
                [
                    str(
                        getattr(
                            item,
                            "name",
                            "",
                        )
                        or
                        ""
                    ),
                    str(
                        getattr(
                            item,
                            "category",
                            "",
                        )
                        or
                        ""
                    ),
                    str(
                        getattr(
                            item,
                            "food_type",
                            "",
                        )
                        or
                        ""
                    ),
                ]
            )
        )

        if any(
            term in item_blob
            for term in terms
        ):
            matches.append(
                item.name
            )

    return matches[:5]


def serialize_foodkindl_restaurant(
    restaurant,
):
    return {
        "id":
            str(
                restaurant.id
            ),
        "source":
            "foodkindl",
        "source_id":
            str(
                restaurant.id
            ),
        "name":
            restaurant.name,
        "restaurant_type":
            restaurant.restaurant_type
            or
            "restaurant",
        "cuisine":
            restaurant.cuisine
            or
            "",
        "locality":
            restaurant.locality
            or
            "",
        "city":
            restaurant.city
            or
            "",
        "latitude":
            safe_float(
                restaurant.latitude
            ),
        "longitude":
            safe_float(
                restaurant.longitude
            ),
        "rating":
            safe_float(
                restaurant.rating
            ),
        "review_count":
            safe_int(
                getattr(
                    restaurant,
                    "review_count",
                    None,
                )
            ),
        "average_cost_for_two":
            safe_float(
                restaurant.average_cost_for_two
            ),
        "opening_hours":
            getattr(
                restaurant,
                "opening_hours",
                "",
            )
            or
            "",
        "phone":
            getattr(
                restaurant,
                "phone",
                "",
            )
            or
            "",
        "website":
            getattr(
                restaurant,
                "website",
                "",
            )
            or
            "",
        "address":
            getattr(
                restaurant,
                "address",
                "",
            )
            or
            "",
        "is_foodkindl_partner":
            bool(
                restaurant.is_foodkindl_partner
            ),
        "accepts_foodkindl_booking":
            bool(
                restaurant.accepts_foodkindl_booking
            ),
        "is_active":
            bool(
                restaurant.is_active
            ),
        "menu_items":
            [
                {
                    "id":
                        item.id,
                    "name":
                        item.name,
                    "category":
                        item.category,
                    "food_type":
                        item.food_type,
                    "price":
                        safe_float(
                            item.price
                        ),
                    "is_popular":
                        bool(
                            item.is_popular
                        ),
                    "is_available":
                        bool(
                            item.is_available
                        ),
                }
                for item in restaurant.menu_items.all()
            ],
        "osm_tags":
            {},
    }


def fetch_foodkindl_places():
    restaurants = (
        Restaurant.objects
        .filter(
            is_active=True,
        )
        .prefetch_related(
            "menu_items",
        )
    )

    results = []

    for restaurant in restaurants:
        latitude = safe_float(
            restaurant.latitude
        )

        longitude = safe_float(
            restaurant.longitude
        )

        if (
            latitude is None
            or
            longitude is None
        ):
            continue

        results.append(
            serialize_foodkindl_restaurant(
                restaurant
            )
        )

    return results


# ============================================================
# RANKING
# ============================================================

def place_search_blob(
    place,
):
    tags = place.get(
        "osm_tags",
        {},
    ) or {}

    values = [
        place.get(
            "name",
            "",
        ),
        place.get(
            "restaurant_type",
            "",
        ),
        place.get(
            "cuisine",
            "",
        ),
        place.get(
            "locality",
            "",
        ),
        place.get(
            "city",
            "",
        ),
        tags.get(
            "brand",
            "",
        ),
        tags.get(
            "description",
            "",
        ),
        tags.get(
            "cuisine",
            "",
        ),
        tags.get(
            "amenity",
            "",
        ),
        tags.get(
            "shop",
            "",
        ),
        tags.get(
            "tourism",
            "",
        ),
        tags.get(
            "diet:vegetarian",
            "",
        ),
        tags.get(
            "diet:vegan",
            "",
        ),
    ]

    return normalize_text(
        " ".join(
            str(
                value or ""
            )
            for value in values
        )
    )



def menu_search_blob(
    place,
):
    values = []

    for item in (
        place.get(
            "menu_items",
            [],
        )
        or []
    ):

        if not isinstance(
            item,
            dict,
        ):
            continue

        values.extend(
            [
                item.get(
                    "name",
                    "",
                ),
                item.get(
                    "category",
                    "",
                ),
                item.get(
                    "food_type",
                    "",
                ),
            ]
        )

    return normalize_text(
        " ".join(
            str(
                value or ""
            )
            for value in values
        )
    )


def popular_menu_blob(
    place,
):
    values = []

    for item in (
        place.get(
            "menu_items",
            [],
        )
        or []
    ):

        if not isinstance(
            item,
            dict,
        ):
            continue

        if item.get(
            "is_available"
        ) is False:
            continue

        if not item.get(
            "is_popular"
        ):
            continue

        values.extend(
            [
                item.get(
                    "name",
                    "",
                ),
                item.get(
                    "category",
                    "",
                ),
                item.get(
                    "food_type",
                    "",
                ),
            ]
        )

    return normalize_text(
        " ".join(
            str(
                value or ""
            )
            for value in values
        )
    )


def popular_dishes_for_place(
    place,
    limit=5,
):
    result = []

    for item in (
        place.get(
            "menu_items",
            [],
        )
        or []
    ):

        if not isinstance(
            item,
            dict,
        ):
            continue

        if item.get(
            "is_available"
        ) is False:
            continue

        if not item.get(
            "is_popular"
        ):
            continue

        name = str(
            item.get(
                "name",
                "",
            )
            or
            ""
        ).strip()

        if (
            name
            and
            name not in result
        ):
            result.append(
                name
            )

        if len(
            result
        ) >= limit:
            break

    return result


def structured_preference_match(
    place,
    value,
):
    canonical = canonical_food_query(
        value
    )

    if not canonical:
        return {
            "canonical": "",
            "matched": False,
            "name": False,
            "popular_menu": False,
            "menu": False,
            "cuisine": False,
            "tags": False,
            "generic": False,
            "strength": 0,
            "matched_fields": [],
        }

    terms = food_query_terms(
        canonical
    )

    tags = (
        place.get(
            "osm_tags",
            {},
        )
        or {}
    )

    name_blob = normalize_text(
        " ".join(
            [
                str(
                    place.get(
                        "name",
                        "",
                    )
                    or
                    ""
                ),
                str(
                    tags.get(
                        "brand",
                        "",
                    )
                    or
                    ""
                ),
            ]
        )
    )

    cuisine_blob = normalize_text(
        " ".join(
            [
                str(
                    place.get(
                        "cuisine",
                        "",
                    )
                    or
                    ""
                ),
                str(
                    tags.get(
                        "cuisine",
                        "",
                    )
                    or
                    ""
                ),
            ]
        )
    )

    tags_blob = normalize_text(
        " ".join(
            [
                str(
                    tags.get(
                        "amenity",
                        "",
                    )
                    or
                    ""
                ),
                str(
                    tags.get(
                        "shop",
                        "",
                    )
                    or
                    ""
                ),
                str(
                    tags.get(
                        "tourism",
                        "",
                    )
                    or
                    ""
                ),
                str(
                    tags.get(
                        "description",
                        "",
                    )
                    or
                    ""
                ),
                str(
                    tags.get(
                        "diet:vegetarian",
                        "",
                    )
                    or
                    ""
                ),
                str(
                    tags.get(
                        "diet:vegan",
                        "",
                    )
                    or
                    ""
                ),
            ]
        )
    )

    menu_blob = menu_search_blob(
        place
    )

    popular_blob = popular_menu_blob(
        place
    )

    generic_blob = place_search_blob(
        place
    )


    def matches(
        blob,
    ):
        return any(
            term in blob
            for term in terms
        )


    name_match = matches(
        name_blob
    )

    popular_menu_match = matches(
        popular_blob
    )

    menu_match = matches(
        menu_blob
    )

    cuisine_match = matches(
        cuisine_blob
    )

    tags_match = matches(
        tags_blob
    )

    generic_match = matches(
        generic_blob
    )


    matched_fields = []

    if name_match:
        matched_fields.append(
            "name"
        )

    if popular_menu_match:
        matched_fields.append(
            "popular_menu"
        )

    if menu_match:
        matched_fields.append(
            "menu"
        )

    if cuisine_match:
        matched_fields.append(
            "cuisine"
        )

    if tags_match:
        matched_fields.append(
            "osm_tags"
        )

    if generic_match:
        matched_fields.append(
            "metadata"
        )


    strength = 0

    if name_match:
        strength += 5

    if popular_menu_match:
        strength += 6

    if menu_match:
        strength += 4

    if cuisine_match:
        strength += 4

    if tags_match:
        strength += 2

    if generic_match:
        strength += 1


    return {
        "canonical":
            canonical,

        "matched":
            bool(
                strength
            ),

        "name":
            name_match,

        "popular_menu":
            popular_menu_match,

        "menu":
            menu_match,

        "cuisine":
            cuisine_match,

        "tags":
            tags_match,

        "generic":
            generic_match,

        "strength":
            strength,

        "matched_fields":
            matched_fields,
    }


def place_quality_score(
    place,
):
    score = 0.0

    rating = safe_float(
        place.get(
            "rating"
        )
    )

    review_count = safe_int(
        place.get(
            "review_count"
        )
    )

    if rating is not None:

        score += (
            rating
            /
            5
        ) * 18

        if rating >= 4:
            score += 5

        if rating >= 4.5:
            score += 3


    if review_count:

        score += min(
            8,
            math.log10(
                review_count
                +
                1
            )
            *
            2.5,
        )


    if place.get(
        "opening_hours"
    ):
        score += 3


    if place.get(
        "address"
    ):
        score += 2


    if (
        place.get(
            "phone"
        )
        or
        place.get(
            "website"
        )
    ):
        score += 2


    return score



def calculate_place_score(
    place,
    *,
    food_query="",
    cuisine="",
    restaurant_type="",
    highly_rated=False,
    hidden_gems=False,
):
    score = 0.0

    distance = safe_float(
        place.get(
            "distance_from_route_km"
        )
    )

    if distance is None:
        distance = 999


    # Route proximity.
    score += max(
        0,
        45
        -
        (
            distance
            *
            10
        ),
    )


    query_match = (
        structured_preference_match(
            place,
            food_query,
        )
        if normalize_text(
            food_query
        )
        else None
    )


    cuisine_match = (
        structured_preference_match(
            place,
            cuisine,
        )
        if normalize_text(
            cuisine
        )
        else None
    )


    # Strongest signals first.
    if query_match:

        if query_match[
            "name"
        ]:
            score += 35

        if query_match[
            "popular_menu"
        ]:
            score += 40

        if query_match[
            "menu"
        ]:
            score += 30

        if query_match[
            "cuisine"
        ]:
            score += 28

        if query_match[
            "tags"
        ]:
            score += 15

        if (
            query_match[
                "generic"
            ]
            and
            not (
                query_match[
                    "name"
                ]
                or
                query_match[
                    "popular_menu"
                ]
                or
                query_match[
                    "menu"
                ]
                or
                query_match[
                    "cuisine"
                ]
                or
                query_match[
                    "tags"
                ]
            )
        ):
            score += 8


    if cuisine_match:

        if cuisine_match[
            "name"
        ]:
            score += 15

        if cuisine_match[
            "popular_menu"
        ]:
            score += 20

        if cuisine_match[
            "menu"
        ]:
            score += 18

        if cuisine_match[
            "cuisine"
        ]:
            score += 20

        if cuisine_match[
            "tags"
        ]:
            score += 10


    selected_type = normalize_text(
        restaurant_type
    )

    if selected_type:

        type_blob = normalize_text(
            " ".join(
                [
                    str(
                        place.get(
                            "restaurant_type",
                            "",
                        )
                        or
                        ""
                    ),
                    str(
                        (
                            place.get(
                                "osm_tags",
                                {},
                            )
                            or {}
                        ).get(
                            "amenity",
                            "",
                        )
                        or
                        ""
                    ),
                ]
            )
        )

        if selected_type in type_blob:
            score += 12


    score += place_quality_score(
        place
    )


    rating = safe_float(
        place.get(
            "rating"
        )
    )

    if (
        highly_rated
        and
        rating is not None
        and
        rating >= 4
    ):
        score += 12


    if place.get(
        "is_foodkindl_partner"
    ):
        score += 8


    osm_tags = (
        place.get(
            "osm_tags",
            {},
        )
        or {}
    )

    if (
        hidden_gems
        and
        not osm_tags.get(
            "brand"
        )
    ):
        score += 6


    return round(
        score,
        3,
    )


def recommendation_reason(
    place,
    *,
    food_query="",
):
    parts = []

    distance = safe_float(
        place.get(
            "distance_from_route_km"
        )
    )

    if distance is not None:

        if distance < 0.15:

            parts.append(
                "right on your route"
            )

        elif distance < 1:

            parts.append(
                f"{distance:.1f} km from your route"
            )

        else:

            parts.append(
                f"{distance:.1f} km detour"
            )


    match = (
        structured_preference_match(
            place,
            food_query,
        )
        if normalize_text(
            food_query
        )
        else None
    )


    if (
        match
        and
        match[
            "matched"
        ]
    ):

        canonical = match[
            "canonical"
        ]

        if match[
            "popular_menu"
        ]:

            parts.append(
                f"popular dishes match {canonical}"
            )

        elif match[
            "menu"
        ]:

            parts.append(
                f"menu matches {canonical}"
            )

        elif match[
            "name"
        ]:

            parts.append(
                f"{canonical} in the place name"
            )

        elif match[
            "cuisine"
        ]:

            parts.append(
                f"serves {canonical}"
            )

        else:

            parts.append(
                f"matches {canonical}"
            )


    if place.get(
        "is_foodkindl_partner"
    ):

        parts.append(
            "FoodKindl partner"
        )


    rating = safe_float(
        place.get(
            "rating"
        )
    )

    if rating is not None:

        parts.append(
            f"rated {rating:.1f}"
        )


    if not parts:

        parts.append(
            "food stop along your journey"
        )


    return (
        parts[0][0].upper()
        +
        parts[0][1:]
        +
        (
            " • "
            +
            " • ".join(
                parts[1:]
            )
            if len(
                parts
            ) > 1
            else ""
        )
    )



# ============================================================
# DEDUPLICATION
# ============================================================

def duplicate_key(
    place,
):
    source = place.get(
        "source"
    )

    source_id = place.get(
        "source_id"
    )

    if (
        source
        and
        source_id
    ):
        return (
            source,
            str(
                source_id
            ),
        )

    name = normalize_text(
        place.get(
            "name",
            "",
        )
    )

    latitude = safe_float(
        place.get(
            "latitude"
        )
    )

    longitude = safe_float(
        place.get(
            "longitude"
        )
    )

    return (
        name,
        round(
            latitude or 0,
            4,
        ),
        round(
            longitude or 0,
            4,
        ),
    )


def combine_places(
    *collections,
):
    merged = {}

    for collection in collections:
        for place in collection:
            key = duplicate_key(
                place
            )

            current = merged.get(
                key
            )

            if current is None:
                merged[key] = place
                continue

            # Prefer FoodKindl's richer record when duplicate.
            if (
                place.get(
                    "source"
                )
                ==
                "foodkindl"
            ):
                merged[
                    key
                ] = place

    return list(
        merged.values()
    )


# ============================================================
# ROUTE DISCOVERY
# ============================================================

def discover_restaurants_along_route(
    *,
    start_lat,
    start_lng,
    destination_lat,
    destination_lng,
    travel_mode="car",
    food_query="",
    cuisine="",
    restaurant_type="",
    max_detour_km=3,
    highly_rated=False,
    hidden_gems=False,
    limit=30,
):
    route = fetch_route(
        start_lat=
            start_lat,
        start_lng=
            start_lng,
        destination_lat=
            destination_lat,
        destination_lng=
            destination_lng,
        travel_mode=
            travel_mode,
    )

    route_points = route[
        "points"
    ]

    route_reference = (
        dense_route_reference(
            route_points
        )
    )

    sample_points = (
        sample_route_points(
            route_points,
            max_samples=12,
        )
    )

    radius_m = search_radius_m(
        travel_mode=
            travel_mode,
        max_detour_km=
            max_detour_km,
    )

    osm_places = fetch_osm_places(
        sample_points=
            sample_points,
        radius_m=
            radius_m,
    )

    foodkindl_places = (
        fetch_foodkindl_places()
    )

    places = combine_places(
        foodkindl_places,
        osm_places,
    )

    accepted = []

    max_distance = max(
        float(
            max_detour_km
            or 3
        ),
        radius_m
        /
        1000,
    )

    for place in places:
        latitude = safe_float(
            place.get(
                "latitude"
            )
        )

        longitude = safe_float(
            place.get(
                "longitude"
            )
        )

        if (
            latitude is None
            or
            longitude is None
        ):
            continue

        distance = distance_to_route_km(
            latitude=
                latitude,
            longitude=
                longitude,
            route_reference=
                route_reference,
        )

        if distance > max_distance:
            continue

        place[
            "distance_from_route_km"
        ] = round(
            distance,
            2,
        )

        place[
            "route_position"
        ] = round(
            approximate_route_position(
                latitude=
                    latitude,
                longitude=
                    longitude,
                route_reference=
                    route_reference,
            ),
            4,
        )

        if (
            place.get(
                "source"
            )
            ==
            "foodkindl"
        ):
            db_id = place.get(
                "source_id"
            )

            try:
                restaurant = (
                    Restaurant.objects
                    .prefetch_related(
                        "menu_items"
                    )
                    .get(
                        pk=db_id
                    )
                )

                matched_dishes = (
                    matching_menu_items(
                        restaurant,
                        food_query,
                    )
                )

            except (
                Restaurant.DoesNotExist,
                ValueError,
                TypeError,
            ):
                matched_dishes = []

            place[
                "matched_dishes"
            ] = matched_dishes

        place[
            "popular_dishes"
        ] = popular_dishes_for_place(
            place
        )


        initial_match = (
            structured_preference_match(
                place,
                food_query
                or
                cuisine,
            )
            if (
                food_query
                or
                cuisine
            )
            else {
                "matched": False,
                "strength": 0,
                "matched_fields": [],
            }
        )


        place[
            "matched_fields"
        ] = initial_match.get(
            "matched_fields",
            [],
        )


        place[
            "preference_match_strength"
        ] = initial_match.get(
            "strength",
            0,
        )


        score = calculate_place_score(
            place,
            food_query=
                food_query,
            cuisine=
                cuisine,
            restaurant_type=
                restaurant_type,
            highly_rated=
                highly_rated,
            hidden_gems=
                hidden_gems,
        )

        if place.get(
            "matched_dishes"
        ):
            score += 30

        place[
            "match_score"
        ] = round(
            score,
            3,
        )

        place[
            "recommendation_reason"
        ] = recommendation_reason(
            place,
            food_query=
                food_query,
        )

        accepted.append(
            place
        )

    accepted.sort(
        key=lambda item: (
            -float(
                item.get(
                    "match_score",
                    0,
                )
            ),
            float(
                item.get(
                    "distance_from_route_km",
                    9999,
                )
            ),
            normalize_text(
                item.get(
                    "name",
                    "",
                )
            ),
        )
    )


    preferred_query = (
        canonical_food_query(
            food_query
        )
        or
        canonical_food_query(
            cuisine
        )
    )


    preferred_matches = []
    fallback_matches = []


    for place in accepted:

        match = (
            structured_preference_match(
                place,
                preferred_query,
            )
            if preferred_query
            else {
                "matched": False,
                "strength": 0,
                "matched_fields": [],
            }
        )


        place[
            "preference_match_strength"
        ] = match.get(
            "strength",
            0,
        )


        place[
            "matched_fields"
        ] = match.get(
            "matched_fields",
            [],
        )


        if (
            preferred_query
            and
            match.get(
                "matched"
            )
        ):

            place[
                "matches_preference"
            ] = True

            preferred_matches.append(
                place
            )

        else:

            place[
                "matches_preference"
            ] = False

            fallback_matches.append(
                place
            )


    if preferred_query:

        preferred_matches.sort(
            key=lambda item: (
                -int(
                    item.get(
                        "preference_match_strength",
                        0,
                    )
                ),
                -float(
                    item.get(
                        "match_score",
                        0,
                    )
                ),
                float(
                    item.get(
                        "distance_from_route_km",
                        9999,
                    )
                ),
            )
        )


        fallback_matches.sort(
            key=lambda item: (
                -float(
                    item.get(
                        "match_score",
                        0,
                    )
                ),
                float(
                    item.get(
                        "distance_from_route_km",
                        9999,
                    )
                ),
            )
        )


        ordered_results = (
            preferred_matches
            +
            fallback_matches
        )

    else:

        ordered_results = accepted


    total_limit = max(
        1,
        int(
            limit
            or 30
        ),
    )

    selected_results = (
        ordered_results[
            :total_limit
        ]
    )


    preferred_count = len(
        preferred_matches
    )


    fallback_count = len(
        [
            place
            for place in selected_results
            if not place.get(
                "matches_preference"
            )
        ]
    )


    return {
        "route_distance_km":
            round(
                route[
                    "distance_km"
                ],
                2,
            ),
        "route_duration_minutes":
            round(
                route[
                    "duration_minutes"
                ],
                1,
            ),
        "candidate_count":
            len(
                accepted
            ),

        "preference_query":
            preferred_query,

        "preferred_match_count":
            preferred_count,

        "fallback_count":
            fallback_count,

        "restaurants":
            selected_results,
    }


# ============================================================
# EXISTING NON-ROUTE DISCOVERY
# ============================================================

def discover_restaurants(
    *,
    search_query="",
    city="",
    locality="",
    cuisine="",
    restaurant_type="",
    limit=30,
):
    """
    Keeps your existing database-only discovery endpoint working.
    """

    restaurants = (
        Restaurant.objects
        .filter(
            is_active=True,
        )
        .prefetch_related(
            "menu_items",
        )
    )

    if city:
        restaurants = (
            restaurants.filter(
                city__icontains=
                    city
            )
        )

    if locality:
        restaurants = (
            restaurants.filter(
                locality__icontains=
                    locality
            )
        )

    results = []

    for restaurant in restaurants:
        place = (
            serialize_foodkindl_restaurant(
                restaurant
            )
        )

        matched_dishes = (
            matching_menu_items(
                restaurant,
                search_query,
            )
        )

        place[
            "matched_dishes"
        ] = matched_dishes

        score = calculate_place_score(
            place,
            food_query=
                search_query,
            cuisine=
                cuisine,
            restaurant_type=
                restaurant_type,
        )

        if matched_dishes:
            score += 30

        place[
            "match_score"
        ] = score

        place[
            "recommendation_reason"
        ] = recommendation_reason(
            place,
            food_query=
                search_query,
        )

        results.append(
            place
        )

    results.sort(
        key=lambda item: (
            -float(
                item.get(
                    "match_score",
                    0,
                )
            ),
            -float(
                item.get(
                    "rating",
                    0,
                )
                or 0
            ),
            normalize_text(
                item.get(
                    "name",
                    "",
                )
            ),
        )
    )

    return results[
        :limit
    ]


# ============================================================
# FOURSQUARE HELPERS — DINE OUT ONLY
# ============================================================

FOURSQUARE_GENERIC_FOOD_TERMS = {
    "restaurant",
    "food",
    "cafe",
    "coffee shop",
    "bakery",
    "hotel",
    "fast food restaurant",
}


def _fsq_require_key():
    if not FOURSQUARE_API_KEY:
        raise ValueError(
            "FOURSQUARE_API_KEY is not configured."
        )


def _fsq_headers():
    _fsq_require_key()

    return {
        "Accept":
            "application/json",

        "Authorization":
            f"Bearer {FOURSQUARE_API_KEY}",

        "X-Places-Api-Version":
            FOURSQUARE_API_VERSION,

        "User-Agent":
            HTTP_USER_AGENT,
    }


def _fsq_safe_list(value):
    if value in (
        None,
        "",
    ):
        return []

    if isinstance(
        value,
        list,
    ):
        return value

    if isinstance(
        value,
        tuple,
    ):
        return list(
            value
        )

    return [
        value,
    ]


def _fsq_first(
    mapping,
    *keys,
):
    if not isinstance(
        mapping,
        dict,
    ):
        return None

    for key in keys:
        value = mapping.get(
            key
        )

        if value not in (
            None,
            "",
            [],
            {},
        ):
            return value

    return None


def _fsq_place_id(place):
    return str(
        _fsq_first(
            place,
            "fsq_place_id",
            "fsq_id",
            "id",
        )
        or
        ""
    ).strip()


def _fsq_coordinates(place):
    latitude = safe_float(
        _fsq_first(
            place,
            "latitude",
            "lat",
        )
    )

    longitude = safe_float(
        _fsq_first(
            place,
            "longitude",
            "lng",
            "lon",
        )
    )

    geocodes = (
        place.get(
            "geocodes",
            {},
        )
        or
        {}
    )

    main = (
        geocodes.get(
            "main",
            {},
        )
        or
        {}
    )

    if latitude is None:
        latitude = safe_float(
            _fsq_first(
                main,
                "latitude",
                "lat",
            )
        )

    if longitude is None:
        longitude = safe_float(
            _fsq_first(
                main,
                "longitude",
                "lng",
                "lon",
            )
        )

    return (
        latitude,
        longitude,
    )


def _fsq_location(place):
    value = (
        place.get(
            "location",
            {},
        )
        or
        {}
    )

    if isinstance(
        value,
        dict,
    ):
        return value

    return {}


def _fsq_full_address(place):
    location = _fsq_location(
        place
    )

    formatted = str(
        _fsq_first(
            location,
            "formatted_address",
            "formattedAddress",
        )
        or
        ""
    ).strip()

    if formatted:
        return formatted

    direct = str(
        _fsq_first(
            place,
            "formatted_address",
            "address",
        )
        or
        ""
    ).strip()

    if direct:
        return direct

    pieces = [
        _fsq_first(
            location,
            "address",
            "address_extended",
        ),
        _fsq_first(
            location,
            "locality",
            "city",
        ),
        _fsq_first(
            location,
            "region",
            "state",
        ),
        _fsq_first(
            location,
            "postcode",
            "postal_code",
        ),
        _fsq_first(
            location,
            "country",
        ),
    ]

    return ", ".join(
        str(
            value
        ).strip()
        for value in pieces
        if str(
            value
            or
            ""
        ).strip()
    )


def _fsq_categories(place):
    categories = []

    raw_categories = (
        place.get(
            "categories",
            [],
        )
        or
        []
    )

    for category in raw_categories:
        if isinstance(
            category,
            dict,
        ):
            name = str(
                _fsq_first(
                    category,
                    "name",
                    "short_name",
                    "shortName",
                )
                or
                ""
            ).strip()

            category_id = str(
                _fsq_first(
                    category,
                    "fsq_category_id",
                    "id",
                )
                or
                ""
            ).strip()

            if name:
                categories.append(
                    {
                        "id":
                            category_id,
                        "name":
                            name,
                    }
                )

        elif str(
            category
            or
            ""
        ).strip():
            categories.append(
                {
                    "id":
                        "",
                    "name":
                        str(
                            category
                        ).strip(),
                }
            )

    labels = (
        place.get(
            "fsq_category_labels",
            [],
        )
        or
        []
    )

    for label in labels:
        label = str(
            label
            or
            ""
        ).strip()

        if (
            label
            and
            not any(
                normalize_text(
                    row[
                        "name"
                    ]
                )
                ==
                normalize_text(
                    label
                )
                for row in categories
            )
        ):
            categories.append(
                {
                    "id":
                        "",
                    "name":
                        label,
                }
            )

    return categories


def _fsq_type_names(place):
    return [
        row[
            "name"
        ]
        for row in _fsq_categories(
            place
        )
        if row.get(
            "name"
        )
    ]


def _fsq_restaurant_type(place):
    text = normalize_text(
        " ".join(
            _fsq_type_names(
                place
            )
        )
    )

    if (
        "hotel" in text
        or
        "lodging" in text
    ):
        return "hotel"

    if (
        "bakery" in text
        or
        "pastry" in text
    ):
        return "bakery"

    if (
        "cafe" in text
        or
        "coffee shop" in text
        or
        "coffee" in text
    ):
        return "cafe"

    return "restaurant"


def _fsq_primary_type(place):
    categories = (
        _fsq_type_names(
            place
        )
    )

    if not categories:
        return ""

    # Foursquare typically returns the most granular category.
    return categories[0]


def _fsq_main_cuisine(place):
    explicit = str(
        _fsq_first(
            place,
            "cuisine",
            "main_cuisine",
        )
        or
        ""
    ).strip()

    if explicit:
        return explicit

    text = normalize_text(
        " ".join(
            [
                str(
                    place.get(
                        "name",
                        ""
                    )
                    or
                    ""
                ),
                " ".join(
                    _fsq_type_names(
                        place
                    )
                ),
            ]
        )
    )

    cuisine_map = [
        (
            "Kerala",
            [
                "kerala",
                "malayali",
                "malabar",
                "nadan",
            ],
        ),
        (
            "South Indian",
            [
                "south indian",
                "andhra",
                "udupi",
                "tamil",
                "karnataka",
            ],
        ),
        (
            "North Indian",
            [
                "north indian",
                "punjabi",
                "mughlai",
            ],
        ),
        (
            "Indian",
            [
                "indian restaurant",
            ],
        ),
        (
            "Biryani",
            [
                "biryani",
                "biriyani",
            ],
        ),
        (
            "Chinese",
            [
                "chinese",
                "szechuan",
                "schezwan",
            ],
        ),
        (
            "Italian",
            [
                "italian",
                "pizza",
                "pizzeria",
                "pasta",
            ],
        ),
        (
            "Arabian / Middle Eastern",
            [
                "arabian",
                "middle eastern",
                "lebanese",
                "shawarma",
                "mandi",
            ],
        ),
        (
            "Seafood",
            [
                "seafood",
                "sea food",
            ],
        ),
        (
            "Japanese",
            [
                "japanese",
                "sushi",
                "ramen",
            ],
        ),
        (
            "Thai",
            [
                "thai",
            ],
        ),
        (
            "Mexican",
            [
                "mexican",
            ],
        ),
        (
            "Vegetarian",
            [
                "vegetarian",
                "vegan",
            ],
        ),
    ]

    for label, keywords in cuisine_map:
        if any(
            keyword in text
            for keyword in keywords
        ):
            return label

    primary = (
        _fsq_primary_type(
            place
        )
    )

    primary_normalized = normalize_text(
        primary
    )

    if (
        primary
        and
        primary_normalized
        not in
        FOURSQUARE_GENERIC_FOOD_TERMS
    ):
        cleaned = primary

        for suffix in (
            " Restaurant",
            " restaurant",
        ):
            if cleaned.endswith(
                suffix
            ):
                cleaned = cleaned[
                    :-len(
                        suffix
                    )
                ].strip()

        if cleaned:
            return cleaned

    return ""


def _fsq_opening_hours(place):
    hours = (
        place.get(
            "hours",
            {}
        )
        or
        {}
    )

    if isinstance(
        hours,
        str,
    ):
        return hours.strip()

    if isinstance(
        hours,
        list,
    ):
        return " | ".join(
            str(
                value
            )
            for value in hours
            if value
        )

    if not isinstance(
        hours,
        dict,
    ):
        return ""

    display = (
        _fsq_first(
            hours,
            "display",
            "display_hours",
            "displayHours",
        )
    )

    if isinstance(
        display,
        list,
    ):
        return " | ".join(
            str(
                row
            )
            for row in display
            if row
        )

    if display:
        return str(
            display
        ).strip()

    regular = (
        _fsq_first(
            hours,
            "regular",
            "open",
        )
    )

    if isinstance(
        regular,
        list,
    ):
        parts = []

        for row in regular:
            if isinstance(
                row,
                dict,
            ):
                day = _fsq_first(
                    row,
                    "day",
                    "day_of_week",
                )
                start = _fsq_first(
                    row,
                    "open",
                    "start",
                )
                end = _fsq_first(
                    row,
                    "close",
                    "end",
                )

                pieces = [
                    str(
                        value
                    )
                    for value in (
                        day,
                        start,
                        end,
                    )
                    if value not in (
                        None,
                        "",
                    )
                ]

                if pieces:
                    parts.append(
                        " ".join(
                            pieces
                        )
                    )

            elif row:
                parts.append(
                    str(
                        row
                    )
                )

        return " | ".join(
            parts
        )

    return ""


def _fsq_photo_url(photo, size="800x600"):
    """
    Supports both:
    - direct URL fields
    - classic Foursquare prefix + suffix photo objects
    """

    if not isinstance(
        photo,
        dict,
    ):
        return str(
            photo
            or
            ""
        ).strip()

    direct = str(
        _fsq_first(
            photo,
            "url",
            "photo_url",
            "image_url",
        )
        or
        ""
    ).strip()

    if direct:
        return direct

    prefix = str(
        photo.get(
            "prefix",
            ""
        )
        or
        ""
    ).strip()

    suffix = str(
        photo.get(
            "suffix",
            ""
        )
        or
        ""
    ).strip()

    if (
        prefix
        and
        suffix
    ):
        return (
            f"{prefix}"
            f"{size}"
            f"{suffix}"
        )

    return ""


def fetch_foursquare_place_photos(
    fsq_place_id,
    *,
    limit=None,
    timeout=12,
):
    fsq_place_id = str(
        fsq_place_id
        or
        ""
    ).strip()

    if not fsq_place_id:
        return []

    if limit is None:
        limit = (
            FOURSQUARE_PHOTOS_PER_PLACE
        )

    limit = min(
        max(
            int(
                limit
                or
                0
            ),
            0,
        ),
        10,
    )

    if limit <= 0:
        return []

    url = (
        f"{FOURSQUARE_BASE_URL}/"
        f"places/{fsq_place_id}/photos"
    )

    try:
        response = requests.get(
            url,
            params={
                "limit":
                    limit,
                "sort":
                    "POPULAR",
            },
            headers=
                _fsq_headers(),
            timeout=timeout,
        )

        response.raise_for_status()

        payload = response.json()

        rows = (
            payload
            if isinstance(
                payload,
                list,
            )
            else
            (
                payload.get(
                    "results",
                    []
                )
                or
                payload.get(
                    "photos",
                    []
                )
                or
                []
            )
        )

        urls = []

        for row in rows:
            url = _fsq_photo_url(
                row
            )

            if (
                url
                and
                url not in urls
            ):
                urls.append(
                    url
                )

        return urls[
            :limit
        ]

    except (
        requests.RequestException,
        ValueError,
        TypeError,
    ) as exc:
        print(
            "FOURSQUARE PHOTO ERROR:",
            repr(
                exc
            ),
        )

        return []


def fetch_foursquare_place_details(
    fsq_place_id,
    *,
    timeout=12,
):
    fsq_place_id = str(
        fsq_place_id
        or
        ""
    ).strip()

    if not fsq_place_id:
        return {}

    url = (
        f"{FOURSQUARE_BASE_URL}/"
        f"places/{fsq_place_id}"
    )

    # Ask for rich fields, but gracefully tolerate plans that
    # don't expose all Premium fields.
    requested_fields = ",".join(
        [
            "fsq_place_id",
            "name",
            "latitude",
            "longitude",
            "location",
            "categories",
            "tel",
            "website",
            "hours",
            "rating",
            "price",
            "description",
        ]
    )

    try:
        response = requests.get(
            url,
            params={
                "fields":
                    requested_fields,
            },
            headers=
                _fsq_headers(),
            timeout=timeout,
        )

        # Some plans may reject Premium-only fields.
        # Retry with default Pro fields.
        if response.status_code in (
            400,
            403,
        ):
            response = requests.get(
                url,
                headers=
                    _fsq_headers(),
                timeout=timeout,
            )

        response.raise_for_status()

        payload = response.json()

        if isinstance(
            payload,
            dict,
        ):
            return payload

        return {}

    except requests.RequestException as exc:
        print(
            "FOURSQUARE DETAILS ERROR:",
            repr(
                exc
            ),
        )

        return {}


def fetch_foursquare_places(
    *,
    latitude,
    longitude,
    radius_km=4,
    food_query="",
    cuisine="",
    restaurant_type="",
    limit=12,
    timeout=15,
):
    """
    New Foursquare Places API:
    GET https://places-api.foursquare.com/places/search

    The query may match place name, category, taste label, tips, etc.
    """

    _fsq_require_key()

    radius_m = min(
        max(
            int(
                float(
                    radius_km
                )
                *
                1000
            ),
            100,
        ),
        100000,
    )

    search_parts = []

    if str(
        food_query
        or
        ""
    ).strip():
        search_parts.append(
            str(
                food_query
            ).strip()
        )

    if str(
        cuisine
        or
        ""
    ).strip():
        search_parts.append(
            str(
                cuisine
            )
            .replace(
                "_",
                " "
            )
            .strip()
        )

    selected_type = normalize_text(
        restaurant_type
    )

    type_map = {
        "restaurant":
            "restaurant",
        "cafe":
            "cafe",
        "bakery":
            "bakery",
        "hotel":
            "hotel",
    }

    if selected_type:
        type_word = (
            type_map.get(
                selected_type
            )
        )

        if type_word:
            search_parts.append(
                type_word
            )

    query = " ".join(
        value
        for value in search_parts
        if value
    ).strip()

    if not query:
        query = "restaurant"

    response = requests.get(
        FOURSQUARE_SEARCH_URL,
        params={
            "query":
                query,
            "ll":
                (
                    f"{float(latitude)},"
                    f"{float(longitude)}"
                ),
            "radius":
                radius_m,
            "limit":
                min(
                    max(
                        int(
                            limit
                            or
                            12
                        ),
                        1,
                    ),
                    50,
                ),
            "sort":
                "RELEVANCE",
        },
        headers=
            _fsq_headers(),
        timeout=timeout,
    )

    response.raise_for_status()

    payload = response.json()

    if isinstance(
        payload,
        list,
    ):
        return payload

    if isinstance(
        payload,
        dict,
    ):
        return (
            payload.get(
                "results",
                []
            )
            or
            payload.get(
                "places",
                []
            )
            or
            []
        )

    return []


def _merge_foursquare_place(
    basic,
    details,
):
    result = dict(
        basic
        or
        {}
    )

    for key, value in (
        details
        or
        {}
    ).items():
        if value not in (
            None,
            "",
            [],
            {},
        ):
            result[
                key
            ] = value

    return result


def _normalize_foursquare_place(
    place,
    *,
    search_latitude,
    search_longitude,
    photos=None,
):
    place = (
        place
        or
        {}
    )

    fsq_place_id = (
        _fsq_place_id(
            place
        )
    )

    name = str(
        place.get(
            "name",
            ""
        )
        or
        ""
    ).strip()

    (
        latitude,
        longitude,
    ) = _fsq_coordinates(
        place
    )

    if (
        not fsq_place_id
        or
        not name
        or
        latitude is None
        or
        longitude is None
    ):
        return None

    distance_km = (
        haversine_km(
            search_latitude,
            search_longitude,
            latitude,
            longitude,
        )
    )

    categories = (
        _fsq_categories(
            place
        )
    )

    types = [
        row[
            "name"
        ]
        for row in categories
        if row.get(
            "name"
        )
    ]

    primary_type = (
        _fsq_primary_type(
            place
        )
    )

    main_cuisine = (
        _fsq_main_cuisine(
            place
        )
    )

    photos = list(
        photos
        or
        []
    )

    # Some detail responses may already include photo arrays.
    for raw_photo in _fsq_safe_list(
        place.get(
            "photos"
        )
    ):
        photo_url = (
            _fsq_photo_url(
                raw_photo
            )
        )

        if (
            photo_url
            and
            photo_url not in photos
        ):
            photos.append(
                photo_url
            )

    location = (
        _fsq_location(
            place
        )
    )

    phone = str(
        _fsq_first(
            place,
            "tel",
            "phone",
            "telephone",
        )
        or
        ""
    ).strip()

    website = str(
        _fsq_first(
            place,
            "website",
            "website_url",
        )
        or
        ""
    ).strip()

    rating = safe_float(
        place.get(
            "rating"
        )
    )

    review_count = safe_int(
        _fsq_first(
            place,
            "review_count",
            "reviews_count",
            "total_tips",
            "tips_count",
        )
    )

    return {
        "id":
            f"foursquare:{fsq_place_id}",

        "source":
            "foursquare",

        "source_id":
            fsq_place_id,

        "fsq_place_id":
            fsq_place_id,

        "name":
            name,

        "restaurant_type":
            _fsq_restaurant_type(
                place
            ),

        "primary_type":
            primary_type,

        "primary_type_label":
            primary_type,

        "types":
            types,

        "categories":
            categories,

        "main_cuisine":
            main_cuisine,

        "cuisine":
            main_cuisine,

        "cuisines":
            (
                [
                    main_cuisine
                ]
                if main_cuisine
                else
                []
            ),

        "locality":
            str(
                _fsq_first(
                    location,
                    "locality",
                    "city",
                )
                or
                ""
            ).strip(),

        "city":
            str(
                _fsq_first(
                    location,
                    "locality",
                    "city",
                )
                or
                ""
            ).strip(),

        "latitude":
            latitude,

        "longitude":
            longitude,

        "distance_from_search_km":
            round(
                distance_km,
                2,
            ),

        "distance_from_route_km":
            None,

        "route_position":
            None,

        "rating":
            rating,

        # Foursquare's current Places API does not guarantee a
        # Google-style review-count field on every account/plan.
        # We only expose a real provider value when present.
        "review_count":
            review_count,

        "average_cost_for_two":
            None,

        "price_level":
            str(
                place.get(
                    "price",
                    ""
                )
                or
                ""
            ).strip(),

        "opening_hours":
            _fsq_opening_hours(
                place
            ),

        "phone":
            phone,

        "website":
            website,

        "address":
            _fsq_full_address(
                place
            ),

        "photo_url":
            (
                photos[0]
                if photos
                else
                ""
            ),

        "image":
            (
                photos[0]
                if photos
                else
                ""
            ),

        "photo":
            (
                photos[0]
                if photos
                else
                ""
            ),

        "image_url":
            (
                photos[0]
                if photos
                else
                ""
            ),

        "photos":
            photos,

        "description":
            str(
                place.get(
                    "description",
                    ""
                )
                or
                ""
            ).strip(),

        "is_foodkindl_partner":
            False,

        "accepts_foodkindl_booking":
            False,

        "is_active":
            True,

        "menu_items":
            [],

        "matched_dishes":
            [],

        "popular_dishes":
            [],

        "recommendation_reason":
            "",

        "match_score":
            0,

        "matches_preference":
            False,

        "matched_fields":
            [],

        "preference_match_strength":
            0,

        "vegetarian":
            False,

        "vegan":
            False,

        "halal":
            False,

        "osm_tags":
            {},
    }


def _foursquare_dineout_score(
    place,
    *,
    food_query="",
    cuisine="",
    restaurant_type="",
    dietary_preference="",
):
    score = 0.0

    distance = safe_float(
        place.get(
            "distance_from_search_km"
        )
    )

    if distance is None:
        distance = 999

    score += max(
        0,
        40
        -
        (
            distance
            *
            6
        ),
    )

    preference = (
        food_query
        or
        cuisine
        or
        dietary_preference
        or
        ""
    )

    if preference:
        match = (
            structured_preference_match(
                place,
                preference,
            )
        )

        score += (
            match.get(
                "strength",
                0,
            )
            *
            15
        )

        if match.get(
            "name"
        ):
            score += 30

        if match.get(
            "cuisine"
        ):
            score += 28

    selected_type = normalize_text(
        restaurant_type
    )

    place_type = normalize_text(
        place.get(
            "restaurant_type",
            ""
        )
    )

    if (
        selected_type
        and
        selected_type == place_type
    ):
        score += 18

    rating = safe_float(
        place.get(
            "rating"
        )
    )

    if rating is not None:
        # Foursquare ratings, where available, can use a 0-10 scale.
        normalized_rating = (
            rating / 10
            if rating > 5
            else rating / 5
        )

        score += max(
            0,
            min(
                normalized_rating,
                1,
            )
            *
            20,
        )

    if place.get(
        "photo_url"
    ):
        score += 3

    if place.get(
        "phone"
    ):
        score += 2

    if place.get(
        "website"
    ):
        score += 2

    if place.get(
        "opening_hours"
    ):
        score += 2

    return round(
        score,
        3,
    )


def _foursquare_recommendation_reason(
    place,
    *,
    food_query="",
    cuisine="",
):
    reasons = []

    preference = (
        food_query
        or
        cuisine
        or
        ""
    )

    if preference:
        match = (
            structured_preference_match(
                place,
                preference,
            )
        )

        if match.get(
            "matched"
        ):
            reasons.append(
                "Matches your search"
            )

    distance = safe_float(
        place.get(
            "distance_from_search_km"
        )
    )

    if distance is not None:
        reasons.append(
            f"{distance:.1f} km away"
        )

    main_cuisine = str(
        place.get(
            "main_cuisine",
            ""
        )
        or
        ""
    ).strip()

    if main_cuisine:
        reasons.append(
            f"Main cuisine: {main_cuisine}"
        )

    rating = safe_float(
        place.get(
            "rating"
        )
    )

    if rating is not None:
        reasons.append(
            f"Foursquare rating {rating:g}"
        )

    return " • ".join(
        reasons[
            :4
        ]
    )



# ============================================================
# DINE OUT - LIVE NEARBY DISCOVERY
# ============================================================

def discover_nearby_restaurants(
    *,
    latitude,
    longitude,
    food_query="",
    cuisine="",
    restaurant_type="",
    dietary_preference="",
    radius_km=4,
    highly_rated=False,
    hidden_gems=False,
    limit=12,
):
    """
    FoodKindl Dine Out using Foursquare Places API.

    This function:
    - searches live Foursquare places;
    - enriches the top results with Place Details;
    - fetches photos only for the top results;
    - calculates FoodKindl distance and recommendation ranking;
    - does NOT save discovery results to the FoodKindl database.

    Food Walk remains on the existing OSM / OSRM implementation.

    NOTE:
    The new Foursquare Places API reliably provides core POI fields
    such as name/location/categories/tel/website. Rich attributes such
    as photos, opening hours, and ratings can depend on endpoint access
    and your Foursquare plan. Missing values remain blank/null.
    """

    latitude = safe_float(
        latitude
    )

    longitude = safe_float(
        longitude
    )

    if (
        latitude is None
        or
        longitude is None
    ):
        raise ValueError(
            "Valid latitude and longitude are required."
        )

    _fsq_require_key()

    try:
        radius_km = float(
            radius_km
            or
            4
        )
    except (
        TypeError,
        ValueError,
    ):
        radius_km = 4

    radius_km = min(
        max(
            radius_km,
            0.5,
        ),
        50,
    )

    try:
        limit = int(
            limit
            or
            12
        )
    except (
        TypeError,
        ValueError,
    ):
        limit = 12

    limit = min(
        max(
            limit,
            1,
        ),
        30,
    )

    # Search a few more candidates than the final output.
    search_limit = min(
        max(
            limit * 2,
            20,
        ),
        50,
    )

    raw_places = fetch_foursquare_places(
        latitude=
            latitude,
        longitude=
            longitude,
        radius_km=
            radius_km,
        food_query=
            food_query,
        cuisine=
            cuisine,
        restaurant_type=
            restaurant_type,
        limit=
            search_limit,
    )

    candidates = []

    selected_type = normalize_text(
        restaurant_type
    )

    for raw in raw_places:
        if not isinstance(
            raw,
            dict,
        ):
            continue

        normalized = _normalize_foursquare_place(
            raw,
            search_latitude=
                latitude,
            search_longitude=
                longitude,
        )

        if not normalized:
            continue

        distance = safe_float(
            normalized.get(
                "distance_from_search_km"
            )
        )

        if (
            distance is None
            or
            distance > radius_km
        ):
            continue

        if (
            selected_type
            and
            normalize_text(
                normalized.get(
                    "restaurant_type",
                    ""
                )
            )
            !=
            selected_type
        ):
            continue

        normalized[
            "match_score"
        ] = _foursquare_dineout_score(
            normalized,
            food_query=
                food_query,
            cuisine=
                cuisine,
            restaurant_type=
                restaurant_type,
            dietary_preference=
                dietary_preference,
        )

        candidates.append(
            (
                raw,
                normalized,
            )
        )

    candidates.sort(
        key=lambda pair: (
            -float(
                pair[1].get(
                    "match_score",
                    0,
                )
            ),
            float(
                pair[1].get(
                    "distance_from_search_km",
                    9999,
                )
            ),
        )
    )

    # To keep costs controlled, only enrich the best N places.
    details_limit = min(
        max(
            FOURSQUARE_DETAILS_LIMIT,
            0,
        ),
        limit,
        len(
            candidates
        ),
    )

    results = []

    for index, (
        raw,
        basic,
    ) in enumerate(
        candidates
    ):
        fsq_place_id = (
            basic.get(
                "fsq_place_id"
            )
        )

        details = {}

        photos = []

        if (
            index <
            details_limit
            and
            fsq_place_id
        ):
            details = (
                fetch_foursquare_place_details(
                    fsq_place_id
                )
            )

            photos = (
                fetch_foursquare_place_photos(
                    fsq_place_id,
                    limit=
                        FOURSQUARE_PHOTOS_PER_PLACE,
                )
            )

        merged = _merge_foursquare_place(
            raw,
            details,
        )

        place = _normalize_foursquare_place(
            merged,
            search_latitude=
                latitude,
            search_longitude=
                longitude,
            photos=
                photos,
        )

        if not place:
            continue

        preference = (
            food_query
            or
            cuisine
            or
            dietary_preference
            or
            ""
        )

        preference_match = (
            structured_preference_match(
                place,
                preference,
            )
            if preference
            else {
                "matched":
                    False,
                "strength":
                    0,
                "matched_fields":
                    [],
            }
        )

        place[
            "matches_preference"
        ] = preference_match.get(
            "matched",
            False,
        )

        place[
            "preference_match_strength"
        ] = preference_match.get(
            "strength",
            0,
        )

        place[
            "matched_fields"
        ] = preference_match.get(
            "matched_fields",
            [],
        )

        place[
            "match_score"
        ] = _foursquare_dineout_score(
            place,
            food_query=
                food_query,
            cuisine=
                cuisine,
            restaurant_type=
                restaurant_type,
            dietary_preference=
                dietary_preference,
        )

        place[
            "recommendation_reason"
        ] = _foursquare_recommendation_reason(
            place,
            food_query=
                food_query,
            cuisine=
                cuisine,
        )

        if highly_rated:
            rating = safe_float(
                place.get(
                    "rating"
                )
            )

            # Only filter when a rating is actually available.
            if rating is not None:
                threshold = (
                    8
                    if rating > 5
                    else 4
                )

                if rating < threshold:
                    continue

        results.append(
            place
        )

    results.sort(
        key=lambda item: (
            -int(
                bool(
                    item.get(
                        "matches_preference"
                    )
                )
            ),

            -float(
                item.get(
                    "match_score",
                    0,
                )
            ),

            float(
                item.get(
                    "distance_from_search_km",
                    9999,
                )
            ),

            normalize_text(
                item.get(
                    "name",
                    "",
                )
            ),
        )
    )

    selected_results = results[
        :limit
    ]

    return {
        "center": {
            "latitude":
                latitude,
            "longitude":
                longitude,
        },

        "radius_km":
            radius_km,

        "candidate_count":
            len(
                results
            ),

        "provider":
            "foursquare",

        "details_enriched_count":
            min(
                details_limit,
                len(
                    selected_results
                ),
            ),

        "photos_per_place":
            FOURSQUARE_PHOTOS_PER_PLACE,

        "restaurants":
            selected_results,
    }


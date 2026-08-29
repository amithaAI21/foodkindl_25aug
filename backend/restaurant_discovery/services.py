from django.db.models import Q

from invites.models import Restaurant


# ============================================================
# NORMALIZE
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
# MATCH DISHES
# ============================================================

def get_matching_dishes(
    restaurant,
    search_query,
):

    query = normalize_text(
        search_query
    )


    if not query:
        return []


    matches = []


    for item in (
        restaurant.menu_items.all()
    ):

        # Ignore unavailable menu items
        if (
            hasattr(
                item,
                "is_available",
            )
            and
            item.is_available is False
        ):
            continue


        item_name = normalize_text(
            item.name
        )


        # Example:
        # query = chocolate
        # item = chocolate
        if query in item_name:

            matches.append(
                item.name
            )

            continue


        # Example:
        # query = masala dosa
        # item = mysore masala dosa
        words = query.split()


        if (
            words
            and
            all(
                word in item_name
                for word in words
            )
        ):

            matches.append(
                item.name
            )


    return matches[:5]


# ============================================================
# SCORE
# ============================================================

def calculate_score(
    restaurant,
    search_query="",
    cuisine="",
    locality="",
    city="",
    restaurant_type="",
):

    score = 0


    query = normalize_text(
        search_query
    )


    selected_city = normalize_text(
        city
    )


    selected_locality = normalize_text(
        locality
    )


    selected_cuisine = normalize_text(
        cuisine
    )


    selected_type = normalize_text(
        restaurant_type
    )


    restaurant_city = normalize_text(
        restaurant.city
    )


    restaurant_locality = normalize_text(
        restaurant.locality
    )


    restaurant_cuisine = normalize_text(
        restaurant.cuisine
    )


    restaurant_type_value = (
        normalize_text(
            restaurant.restaurant_type
        )
    )


    restaurant_name = normalize_text(
        restaurant.name
    )


    matched_dishes = (
        get_matching_dishes(
            restaurant,
            query,
        )
    )


    # ========================================================
    # DISH
    # ========================================================

    if matched_dishes:

        score += 200


        exact_match = any(

            normalize_text(
                dish
            ) == query

            for dish in matched_dishes

        )


        if exact_match:
            score += 100


    # ========================================================
    # RESTAURANT NAME
    # ========================================================

    if (
        query
        and
        query in restaurant_name
    ):

        score += 80


    # ========================================================
    # CITY
    # ========================================================

    if selected_city:

        if (
            selected_city ==
            restaurant_city
        ):

            score += 100

        elif (
            selected_city
            in restaurant_city
        ):

            score += 70


    # ========================================================
    # LOCALITY
    # ========================================================

    if (
        selected_locality
        and
        selected_locality
        in restaurant_locality
    ):

        score += 40


    # ========================================================
    # CUISINE
    #
    # Ranking only — NOT a hard filter.
    # ========================================================

    if selected_cuisine:

        if (
            selected_cuisine ==
            restaurant_cuisine
        ):

            score += 40


        elif (
            selected_cuisine
            in restaurant_cuisine
        ):

            score += 25


    # ========================================================
    # TYPE
    #
    # Ranking only.
    #
    # Important:
    # Roastery Corner can be a Cafe even when the
    # Food Invite currently defaults to Restaurant.
    # ========================================================

    if (
        selected_type
        and
        selected_type ==
        restaurant_type_value
    ):

        score += 20


    # ========================================================
    # PARTNER
    # ========================================================

    if getattr(
        restaurant,
        "is_foodkindl_partner",
        False,
    ):

        score += 10


    # ========================================================
    # RATING
    # ========================================================

    try:

        rating = float(
            restaurant.rating or 0
        )

    except (
        TypeError,
        ValueError,
    ):

        rating = 0


    score += int(
        rating * 5
    )


    return (
        score,
        matched_dishes,
    )


# ============================================================
# REASON
# ============================================================

def build_recommendation_reason(
    restaurant,
    search_query,
    matched_dishes,
):

    if matched_dishes:

        if len(
            matched_dishes
        ) == 1:

            return (
                f"Serves {matched_dishes[0]}"
            )


        return (
            "Matching dishes: "
            +
            ", ".join(
                matched_dishes[:3]
            )
        )


    return (
        "Recommended in "
        f"{restaurant.city}"
    )


# ============================================================
# DISCOVER
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

    search_query = str(
        search_query or ""
    ).strip()


    city = str(
        city or ""
    ).strip()


    locality = str(
        locality or ""
    ).strip()


    cuisine = str(
        cuisine or ""
    ).strip()


    restaurant_type = str(
        restaurant_type or ""
    ).strip()


    # ========================================================
    # ALL ACTIVE RESTAURANTS
    #
    # IMPORTANT:
    # Do NOT filter accepts_foodkindl_booking here.
    # Do NOT filter restaurant_type here.
    # Do NOT filter cuisine here.
    # ========================================================

    restaurants = (

        Restaurant.objects

        .filter(
            is_active=True,
        )

        .prefetch_related(
            "menu_items",
        )

    )


    # ========================================================
    # CITY
    #
    # Hard filter.
    # ========================================================

    if city:

        restaurants = (
            restaurants.filter(
                city__icontains=
                    city
            )
        )


    # ========================================================
    # LOCALITY
    #
    # Optional.
    # ========================================================

    if locality:

        restaurants = (
            restaurants.filter(
                locality__icontains=
                    locality
            )
        )


    # ========================================================
    # FOOD / DISH
    #
    # IMPORTANT:
    # Search restaurant menu item name.
    # ========================================================

    if search_query:

        restaurants = (

            restaurants.filter(

                Q(
                    menu_items__name__icontains=
                        search_query
                )

                |

                Q(
                    name__icontains=
                        search_query
                )

                |

                Q(
                    cuisine__icontains=
                        search_query
                )

            )

            .distinct()

        )


    # ========================================================
    # DEBUG
    # ========================================================

    print(
        "========================================"
    )

    print(
        "FOODKINDL RESTAURANT DISCOVERY"
    )

    print(
        "Search:",
        search_query
    )

    print(
        "City:",
        city
    )

    print(
        "Restaurants found:",
        restaurants.count()
    )


    for item in restaurants:

        print(
            "FOUND:",
            item.id,
            item.name,
            item.city,
            item.restaurant_type,
        )


    print(
        "========================================"
    )


    # ========================================================
    # RANK
    # ========================================================

    ranked = []


    for restaurant in restaurants:

        (
            score,
            matched_dishes,
        ) = calculate_score(

            restaurant,

            search_query=
                search_query,

            city=
                city,

            locality=
                locality,

            cuisine=
                cuisine,

            restaurant_type=
                restaurant_type,
        )


        restaurant._match_score = (
            score
        )


        restaurant._matched_dishes = (
            matched_dishes
        )


        restaurant._recommendation_reason = (
            build_recommendation_reason(

                restaurant,

                search_query,

                matched_dishes,
            )
        )


        ranked.append(
            restaurant
        )


    ranked.sort(

        key=lambda item: (

            -getattr(
                item,
                "_match_score",
                0,
            ),

            -float(
                item.rating or 0
            ),

            item.name.lower(),

        )

    )


    return ranked[:limit]
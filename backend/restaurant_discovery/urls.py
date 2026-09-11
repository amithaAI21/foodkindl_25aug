from django.urls import path

from .location_views import (
    LocationSearchView,
)

from .views import (
    FoodWalkRecommendationView,
    RestaurantRecommendationView,
)


app_name = "restaurant_discovery"


urlpatterns = [

    # ========================================================
    # LOCATION AUTOCOMPLETE
    # ========================================================

    path(
        "locations/search/",
        LocationSearchView.as_view(),
        name="location-search",
    ),


    # ========================================================
    # DINE OUT
    # ========================================================

    path(
        "restaurants/recommendations/",
        RestaurantRecommendationView.as_view(),
        name="restaurant-recommendations",
    ),


    # ========================================================
    # FOOD WALK
    # ========================================================

    path(
        "restaurants/food-walk/",
        FoodWalkRecommendationView.as_view(),
        name="food-walk-recommendations",
    ),

]
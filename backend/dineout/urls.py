
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DineOutMemberListView,
    DineOutViewSet,
    LocationAutocompleteView,
)

from .photo_views import restaurant_photo

# Updated Google Places restaurant discovery
from .restaurant_discovery import RestaurantRecommendationView

# Restaurant navigation and directions
from .route_views import RestaurantRouteView


router = DefaultRouter()

router.register(
    "dine-outs",
    DineOutViewSet,
    basename="dine-out",
)


urlpatterns = [
    # FoodKindl members
    path(
        "members/",
        DineOutMemberListView.as_view(),
        name="dineout-members",
    ),

    # Google Places location autocomplete
    path(
        "locations/autocomplete/",
        LocationAutocompleteView.as_view(),
        name="location-autocomplete",
    ),

    # Restaurant discovery + name search
    path(
        "restaurants/recommendations/",
        RestaurantRecommendationView.as_view(),
        name="restaurant-recommendations",
    ),

    # Restaurant routes and navigation
    path(
        "route/",
        RestaurantRouteView.as_view(),
        name="restaurant-route",
    ),
    
    path("restaurant-photo/<str:token>/", restaurant_photo, name="dineout-restaurant-photo"),


    # Dine Out invitations and actions
    path(
        "",
        include(router.urls),
    ),
]

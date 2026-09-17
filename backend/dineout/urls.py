from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DineOutMemberListView,
    DineOutViewSet,
    LocationAutocompleteView,
    RestaurantRecommendationView,
)


router = DefaultRouter()

router.register(
    "dine-outs",
    DineOutViewSet,
    basename="dine-out",
)


urlpatterns = [
    path(
        "members/",
        DineOutMemberListView.as_view(),
        name="dineout-members",
    ),

    path(
        "locations/autocomplete/",
        LocationAutocompleteView.as_view(),
        name="location-autocomplete",
    ),

    path(
        "restaurants/recommendations/",
        RestaurantRecommendationView.as_view(),
        name="restaurant-recommendations",
    ),

    path("", include(router.urls)),
]
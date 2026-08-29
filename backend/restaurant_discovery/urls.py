from django.urls import path

from .views import (
    RestaurantRecommendationView,
)


urlpatterns = [

    path(
        "recommendations/",
        RestaurantRecommendationView.as_view(),
        name="restaurant-discovery-recommendations",
    ),

]
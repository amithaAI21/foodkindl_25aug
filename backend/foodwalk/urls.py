from django.urls import path
from . import views

urlpatterns = [
    path(
        "locations/autocomplete/",
        views.location_suggestions,
        name="location-autocomplete",
    ),
    path(
        "location-suggestions/",
        views.location_suggestions,
        name="location-suggestions",
    ),
    path(
        "build-food-walk/",
        views.build_food_walk,
        name="build-food-walk",
    ),
]
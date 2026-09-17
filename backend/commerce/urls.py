from django.urls import path

from .views import (
    AIIdentifyIngredientsView,
    AIIngredientRecipeBookView,
    AIRecipeGenerateView,
    AIRecipeVideoGenerateView,
)


urlpatterns = [
    path(
        "recipe/",
        AIRecipeGenerateView.as_view(),
        name="ai-recipe",
    ),
    path(
        "ingredient-recipe-book/",
        AIIngredientRecipeBookView.as_view(),
        name="ai-ingredient-recipe-book",
    ),
    path(
        "identify-ingredients/",
        AIIdentifyIngredientsView.as_view(),
        name="ai-identify-ingredients",
    ),
    path(
        "recipe-video/",
        AIRecipeVideoGenerateView.as_view(),
        name="ai-recipe-video",
    ),
]

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ConnectionViewSet,
    ConversationViewSet,
    FoodListingViewSet,
    InvitationViewSet,
    MemberDetailView,
    MemberListView,
    PostViewSet,
    ai_ingredient_recipe_book,
    stats,
)

from .ai_views import (
    AIRecipeGenerateView,
    AIRecipeVideoGenerateView,
)


router = DefaultRouter()

router.register(
    "posts",
    PostViewSet,
    basename="posts",
)

router.register(
    "food-listings",
    FoodListingViewSet,
    basename="food-listings",
)

router.register(
    "invitations",
    InvitationViewSet,
    basename="invitations",
)

router.register(
    "connections",
    ConnectionViewSet,
    basename="connections",
)

router.register(
    "conversations",
    ConversationViewSet,
    basename="conversations",
)


urlpatterns = [
    path(
        "members/",
        MemberListView.as_view(),
        name="member-list",
    ),

    path(
        "members/<int:pk>/",
        MemberDetailView.as_view(),
        name="member-detail",
    ),

    path(
        "stats/",
        stats,
        name="stats",
    ),

    # Normal dish-name recipe search.
    path(
        "ai/recipe/",
        AIRecipeGenerateView.as_view(),
        name="ai-recipe",
    ),

    # Ingredient mode:
    # user supplies ingredients and FoodKindl chooses the dish.
    path(
        "ai/ingredient-recipe-book/",
        ai_ingredient_recipe_book,
        name="ai-ingredient-recipe-book",
    ),

    # 30-second AI cooking video.
    path(
        "ai/recipe-video/",
        AIRecipeVideoGenerateView.as_view(),
        name="ai-recipe-video",
    ),
]


urlpatterns += router.urls

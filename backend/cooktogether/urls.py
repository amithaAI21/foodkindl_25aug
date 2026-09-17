from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CookTogetherViewSet, JoinRequestViewSet

router = DefaultRouter()

router.register(
    "cook-togethers",
    CookTogetherViewSet,
    basename="cook-together",
)

router.register(
    "cook-together-requests",
    JoinRequestViewSet,
    basename="cook-together-request",
)

urlpatterns = [
    path("", include(router.urls)),
]
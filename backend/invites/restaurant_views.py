
from rest_framework import generics, permissions

from .models import Restaurant
from .restaurant_serializers import RestaurantPartnerSerializer


class IsRestaurantPartner(permissions.BasePermission):
    message = "Only Restaurant Partners can manage restaurants."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        profile = getattr(request.user, "profile", None)

        return bool(
            profile
            and profile.account_type == "partner"
        )


class PartnerRestaurantListCreateView(generics.ListCreateAPIView):
    serializer_class = RestaurantPartnerSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsRestaurantPartner,
    ]

    def get_queryset(self):
        return Restaurant.objects.filter(
            owner=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            is_foodkindl_partner=True,
            is_active=True,
        )


class PartnerRestaurantDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = RestaurantPartnerSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsRestaurantPartner,
    ]

    def get_queryset(self):
        return Restaurant.objects.filter(
            owner=self.request.user
        )

    def perform_update(self, serializer):
        serializer.save(owner=self.request.user)

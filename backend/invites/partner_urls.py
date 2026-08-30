from django.urls import (
    path,
)

from .partner_views import (
    PartnerMenuDetailView,
    PartnerMenuListCreateView,
    PartnerMenuPhotoView,
    PartnerRestaurantDetailView,
    PartnerRestaurantListCreateView,
    PartnerRestaurantMainPhotoView,
    PartnerRestaurantPhotoDeleteView,
    PartnerRestaurantPhotosView,
)


urlpatterns = [

    # ========================================================
    # RESTAURANTS
    # ========================================================

    path(
        "restaurants/",
        PartnerRestaurantListCreateView.as_view(),
        name="partner-restaurants",
    ),


    path(
        "restaurants/<int:restaurant_id>/",
        PartnerRestaurantDetailView.as_view(),
        name="partner-restaurant-detail",
    ),


    # ========================================================
    # MAIN RESTAURANT PHOTO
    # ========================================================

    path(
        "restaurants/<int:restaurant_id>/main-photo/",
        PartnerRestaurantMainPhotoView.as_view(),
        name="partner-main-photo",
    ),


    # ========================================================
    # RESTAURANT GALLERY
    # ========================================================

    path(
        "restaurants/<int:restaurant_id>/photos/",
        PartnerRestaurantPhotosView.as_view(),
        name="partner-photos",
    ),


    path(
        "restaurants/<int:restaurant_id>/photos/<int:image_id>/",
        PartnerRestaurantPhotoDeleteView.as_view(),
        name="partner-photo-delete",
    ),


    # ========================================================
    # MENU
    # ========================================================

    path(
        "restaurants/<int:restaurant_id>/menu/",
        PartnerMenuListCreateView.as_view(),
        name="partner-menu",
    ),


    path(
        "restaurants/<int:restaurant_id>/menu/<int:menu_id>/",
        PartnerMenuDetailView.as_view(),
        name="partner-menu-detail",
    ),


    # ========================================================
    # MENU PHOTO
    # ========================================================

    path(
        "restaurants/<int:restaurant_id>/menu/<int:menu_id>/photo/",
        PartnerMenuPhotoView.as_view(),
        name="partner-menu-photo",
    ),
]
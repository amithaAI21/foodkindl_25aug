from django.urls import path

from .views import (
    FoodInviteCancelView,
    FoodInviteCompleteView,
    FoodInviteDetailView,
    FoodInviteListCreateView,
    FoodInviteRespondView,

    FoodWalkRestaurantRecommendationView,

    RecommendedRestaurantListView,

    RestaurantBookingCancelView,
    RestaurantBookingDetailView,
    RestaurantBookingListCreateView,
    RestaurantBookingStatusView,

    RestaurantCreateView,
    RestaurantDetailView,
    RestaurantGeocodeView,
    RestaurantUpdateView,

    LocationAutocompleteView,

    # ========================================================
    # CUSTOMER RESTAURANT SUBMISSIONS
    # ========================================================

    RestaurantSubmissionListCreateView,
    RestaurantSubmissionDetailView,
)


urlpatterns = [

    # ========================================================
    # FOOD INVITES
    # ========================================================

    path(
        "food-invites/",
        FoodInviteListCreateView.as_view(),
        name="food-invite-list-create",
    ),

    path(
        "food-invites/<uuid:id>/",
        FoodInviteDetailView.as_view(),
        name="food-invite-detail",
    ),

    path(
        "food-invites/<uuid:invite_id>/respond/",
        FoodInviteRespondView.as_view(),
        name="food-invite-respond",
    ),

    path(
        "food-invites/<uuid:invite_id>/cancel/",
        FoodInviteCancelView.as_view(),
        name="food-invite-cancel",
    ),

    path(
        "food-invites/<uuid:invite_id>/complete/",
        FoodInviteCompleteView.as_view(),
        name="food-invite-complete",
    ),


    # ========================================================
    # CUSTOMER RESTAURANT / CAFE / HOTEL SUBMISSIONS
    #
    # Logged-in users:
    #
    # POST /restaurant-submissions/
    #     -> create pending submission
    #
    # GET /restaurant-submissions/
    #     -> user's own submissions
    #
    # GET /restaurant-submissions/<id>/
    #     -> submission detail
    # ========================================================

    path(
        "restaurant-submissions/",
        RestaurantSubmissionListCreateView.as_view(),
        name="restaurant-submission-list-create",
    ),

    path(
        "restaurant-submissions/<int:pk>/",
        RestaurantSubmissionDetailView.as_view(),
        name="restaurant-submission-detail",
    ),


    # ========================================================
    # FOOD WALK / RESTAURANT RECOMMENDATIONS
    #
    # Keep static paths before restaurants/<int:id>/.
    # ========================================================

    path(
        "restaurants/recommended/",
        RecommendedRestaurantListView.as_view(),
        name="recommended-restaurants",
    ),

    path(
        "restaurants/food-walk/",
        FoodWalkRestaurantRecommendationView.as_view(),
        name="food-walk-restaurants",
    ),


    # ========================================================
    # ADMIN RESTAURANT MANAGEMENT
    # ========================================================

    path(
        "restaurants/create/",
        RestaurantCreateView.as_view(),
        name="restaurant-create",
    ),

    path(
        "restaurants/<int:id>/manage/",
        RestaurantUpdateView.as_view(),
        name="restaurant-manage",
    ),

    path(
        "restaurants/<int:restaurant_id>/geocode/",
        RestaurantGeocodeView.as_view(),
        name="restaurant-geocode",
    ),


    # ========================================================
    # RESTAURANT DETAIL
    # ========================================================

    path(
        "restaurants/<int:id>/",
        RestaurantDetailView.as_view(),
        name="restaurant-detail",
    ),


    # ========================================================
    # RESTAURANT BOOKINGS
    # ========================================================

    path(
        "restaurant-bookings/",
        RestaurantBookingListCreateView.as_view(),
        name="restaurant-bookings",
    ),

    path(
        "restaurant-bookings/<int:id>/",
        RestaurantBookingDetailView.as_view(),
        name="restaurant-booking-detail",
    ),

    path(
        "restaurant-bookings/<int:booking_id>/cancel/",
        RestaurantBookingCancelView.as_view(),
        name="restaurant-booking-cancel",
    ),

    path(
        "restaurant-bookings/<int:booking_id>/status/",
        RestaurantBookingStatusView.as_view(),
        name="restaurant-booking-status",
    ),


    # ========================================================
    # LOCATION AUTOCOMPLETE
    # ========================================================

    path(
        "locations/autocomplete/",
        LocationAutocompleteView.as_view(),
        name="location-autocomplete",
    ),
]
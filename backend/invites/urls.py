
from django.urls import path

# ============================================================
# EXISTING INVITES VIEWS
# ============================================================

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

    RestaurantSubmissionListCreateView,
    RestaurantSubmissionDetailView,
)

from .booking_api import (
    MemberCheckInView,
    PartnerVisitVerificationView,
    BookingVisitStatusView,
    DailyReferralSummaryView,
    PartnerBillPaidView,
)


# ============================================================
# FOODKINDL RESTAURANT PARTNER VIEWS
# ============================================================

from .restaurant_views import (
    PartnerRestaurantListCreateView,
    PartnerRestaurantDetailView,
)


# ============================================================
# FOODKINDL SOCIAL TABLE BOOKING VIEWS
# ============================================================

from .booking_api import (
    MemberTableBookingsView,
    MemberCancelTableBookingView,
    PartnerTableBookingsView,
    PartnerBookingDecisionView,
    DineOutBookingEligibilityView,
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
    # CUSTOMER RESTAURANT SUBMISSIONS
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
    # RESTAURANT RECOMMENDATIONS
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
    # EXISTING RESTAURANT MANAGEMENT
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

    path(
        "restaurants/<int:id>/",
        RestaurantDetailView.as_view(),
        name="restaurant-detail",
    ),

    # ========================================================
    # FOODKINDL RESTAURANT PARTNER REGISTRATION
    # ========================================================

    path(
        "partner/restaurants/",
        PartnerRestaurantListCreateView.as_view(),
        name="partner-restaurants",
    ),

    path(
        "partner/restaurants/<int:pk>/",
        PartnerRestaurantDetailView.as_view(),
        name="partner-restaurant-detail",
    ),

    # ========================================================
    # EXISTING RESTAURANT BOOKINGS
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
    # FOODKINDL SOCIAL DINE OUT — TABLE BOOKINGS
    # ========================================================

    # Member can view their table booking or request a new one.
    path(
        "table-bookings/",
        MemberTableBookingsView.as_view(),
        name="table-bookings",
    ),

    # Check whether a Dine Out invitation is eligible
    # for table booking.
    #
    # Conditions enforced by the booking API:
    # 1. Logged-in user is the invitation host.
    # 2. At least one guest has accepted.
    # 3. Restaurant is a registered FoodKindl Partner.
    # 4. Restaurant accepts FoodKindl bookings.
    # 5. An active booking does not already exist.
    path(
        "table-bookings/eligibility/<int:dine_out_id>/",
        DineOutBookingEligibilityView.as_view(),
        name="dineout-booking-eligibility",
    ),

    # Member cancels an existing booking.
    path(
        "table-bookings/<int:booking_id>/cancel/",
        MemberCancelTableBookingView.as_view(),
        name="table-booking-cancel",
    ),

    # Restaurant partner views incoming booking requests.
    path(
        "partner/table-bookings/",
        PartnerTableBookingsView.as_view(),
        name="partner-table-bookings",
    ),

    # Restaurant partner confirms or rejects a booking.
    path(
        "partner/table-bookings/<int:booking_id>/decision/",
        PartnerBookingDecisionView.as_view(),
        name="partner-table-booking-decision",
    ),

    # ========================================================
    # LOCATION AUTOCOMPLETE
    # ========================================================

    path(
        "geocode/",
        LocationAutocompleteView.as_view(),
        name="location-autocomplete",
    ),

    path(
        "locations/autocomplete/",
        LocationAutocompleteView.as_view(),
        name="location-autocomplete-legacy",
    ),

    path(
    "table-bookings/<int:booking_id>/check-in/",
    MemberCheckInView.as_view(),
    name="member-check-in",
),

    path(
        "table-bookings/<int:booking_id>/visit-status/",
        BookingVisitStatusView.as_view(),
        name="booking-visit-status",
    ),

    path(
        "partner/table-bookings/<int:booking_id>/verify-visit/",
        PartnerVisitVerificationView.as_view(),
        name="partner-verify-visit",
    ),
    
    path(
    "partner/referrals/daily/",
    DailyReferralSummaryView.as_view(),
    name="daily-referral-summary",
),
    path(
    "partner/table-bookings/<int:booking_id>/bill-paid/",
    PartnerBillPaidView.as_view(),
    name="partner-bill-paid",
),
]

from django.urls import path

from .views import (
    BlockedMembersView,
    BlockMemberView,
    BlockStatusView,
    EmailLoginView,
    FoodMatchView,
    MeView,
    ProfileUpdateView,
    RegisterView,
    UnblockMemberView,
    VerificationStatusView,
)


urlpatterns = [

    # ========================================================
    # AUTH
    # ========================================================

    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),

    path(
        "login/",
        EmailLoginView.as_view(),
        name="login",
    ),

    path(
        "me/",
        MeView.as_view(),
        name="me",
    ),


    # ========================================================
    # PROFILE
    # ========================================================

    path(
        "profile/",
        ProfileUpdateView.as_view(),
        name="profile",
    ),


    # ========================================================
    # FOOD MATCH
    # ========================================================

    path(
        "food-matches/",
        FoodMatchView.as_view(),
        name="food-matches",
    ),


    # ========================================================
    # VERIFICATION
    # ========================================================

    path(
        "verification-status/",
        VerificationStatusView.as_view(),
        name="verification-status",
    ),


    # ========================================================
    # BLOCKING
    # ========================================================

    path(
        "blocked-members/",
        BlockedMembersView.as_view(),
        name="blocked-members",
    ),

    path(
        "block/<int:user_id>/",
        BlockMemberView.as_view(),
        name="block-member",
    ),

    path(
        "unblock/<int:user_id>/",
        UnblockMemberView.as_view(),
        name="unblock-member",
    ),

    path(
        "block-status/<int:user_id>/",
        BlockStatusView.as_view(),
        name="block-status",
    ),
]
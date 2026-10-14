
from django.urls import path

from .views import (
    BlockedMembersView,
    BlockMemberView,
    BlockStatusView,
    EmailLoginView,
    FoodKindlPeopleView,
    FoodMatchView,
    ForgotPasswordView,
    MeView,
    ProfileUpdateView,
    RegisterView,
    ResendVerificationEmailView,
    ResetPasswordView,
    SessionContextView,
    UnblockMemberView,
    VerificationStatusView,
    VerifyEmailView,
)


urlpatterns = [
    # Authentication
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", EmailLoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    path("session-context/", SessionContextView.as_view(), name="session-context"),

    # Password reset
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),

    # Email verification
    path(
        "verify-email/<str:token>/",
        VerifyEmailView.as_view(),
        name="verify-email",
    ),
    path(
        "email/verification/resend/",
        ResendVerificationEmailView.as_view(),
        name="resend-verification-email",
    ),
    path(
        "verification-status/",
        VerificationStatusView.as_view(),
        name="verification-status",
    ),

    # Profiles and people
    path("profile/", ProfileUpdateView.as_view(), name="profile"),
    path("people/", FoodKindlPeopleView.as_view(), name="foodkindl-people"),
    path("food-matches/", FoodMatchView.as_view(), name="food-matches"),

    # Blocking
    path("blocked-members/", BlockedMembersView.as_view(), name="blocked-members"),
    path("block/<int:user_id>/", BlockMemberView.as_view(), name="block-member"),
    path("unblock/<int:user_id>/", UnblockMemberView.as_view(), name="unblock-member"),
    path(
        "block-status/<int:user_id>/",
        BlockStatusView.as_view(),
        name="block-status",
    ),
]

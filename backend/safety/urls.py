from django.urls import path

from .views import (
    ActiveSOSView,
    SOSCreateView,
    SOSMarkSafeView,
    TrustedContactDeleteView,
    TrustedContactsView,
    SOSLocationUpdateView,
    PublicSOSTrackingView,
)

from django.urls import path


urlpatterns = [

    path(
        "trusted-contacts/",
        TrustedContactsView.as_view(),
        name="trusted-contacts",
    ),

    path(
        "trusted-contacts/<int:contact_id>/",
        TrustedContactDeleteView.as_view(),
        name="trusted-contact-delete",
    ),

    path(
        "sos/",
        SOSCreateView.as_view(),
        name="sos-create",
    ),

    path(
        "sos/active/",
        ActiveSOSView.as_view(),
        name="sos-active",
    ),

    path(
        "sos/<int:sos_id>/safe/",
        SOSMarkSafeView.as_view(),
        name="sos-safe",
    ),
    
    # Trusted contacts
    path(
        "trusted-contacts/",
        TrustedContactsView.as_view(),
        name="trusted-contacts",
    ),

    path(
        "trusted-contacts/<int:contact_id>/",
        TrustedContactDeleteView.as_view(),
        name="trusted-contact-delete",
    ),

    # SOS activation
    path(
        "sos/",
        SOSCreateView.as_view(),
        name="sos-create",
    ),

    # Active SOS
    path(
        "sos/active/",
        ActiveSOSView.as_view(),
        name="active-sos",
    ),

    # Mark safe
    path(
        "sos/<int:sos_id>/safe/",
        SOSMarkSafeView.as_view(),
        name="sos-mark-safe",
    ),

    # Update GPS location
    path(
        "sos/<int:sos_id>/location/",
        SOSLocationUpdateView.as_view(),
        name="sos-location-update",
    ),

    # Public tracking
    path(
        "sos/track/<uuid:tracking_token>/",
        PublicSOSTrackingView.as_view(),
        name="public-sos-tracking",
    ),

]
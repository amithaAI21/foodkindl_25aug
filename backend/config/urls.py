from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from community.views import reverse_geocode
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)


urlpatterns = [

    path(
        "admin/",
        admin.site.urls,
    ),

    path(
        "api/auth/",
        include(
            "accounts.urls"
        ),
    ),

    path(
        "api/auth/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    path(
        "api/",
        include(
            "community.urls"
        ),
    ),

    path(
        "api/website/",
        include(
            "website.urls"
        ),
    ),

    path(
        "api/safety/",
        include(
            "safety.urls"
        ),
    ),

    path(
        "api/",
        include(
            "invites.urls"
        ),
    ),

    path(
        "api/commerce/",
        include(
            "commerce.urls"
        ),
    ),


    path(
        "api/partner/",
        include(
            "invites.partner_urls"
        ),
    ),
    
    path("api/", include("cooktogether.urls")),
    path("api/dineout/", include("dineout.urls")),
    path("api/foodwalk/", include("foodwalk.urls")),
    path(
    "api/geo/reverse/",
    reverse_geocode,
    name="reverse-geocode",
),

]


if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=
            settings.MEDIA_ROOT,
    )
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

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
        include("accounts.urls"),
    ),

    path(
        "api/auth/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    path(
        "api/",
        include("community.urls"),
    ),

    path(
        "api/website/",
        include("website.urls"),
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
    "api/restaurant-discovery/",
    include(
        "restaurant_discovery.urls"
    ),
),
]


# Local development / legacy media only
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
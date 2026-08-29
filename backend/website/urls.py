from django.urls import path

from .views import (
    homepage_video,
)


urlpatterns = [

    path(
        "homepage-video/",
        homepage_video,
        name="homepage-video",
    ),

]
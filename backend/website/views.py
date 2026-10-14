# website/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import HomepageVideo
from .serializers import HomepageVideoSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def homepage_video(request):
    video = (
        HomepageVideo.objects
        .filter(is_active=True)
        .exclude(video_url="")
        .order_by("-updated_at", "-pk")
        .first()
    )

    return Response(
        {
            "video": (
                HomepageVideoSerializer(video).data
                if video else None
            )
        },
        headers={"Cache-Control": "no-store"},
    )
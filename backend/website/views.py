from rest_framework import status

from rest_framework.decorators import (
    api_view,
    permission_classes,
)

from rest_framework.permissions import (
    AllowAny,
)

from rest_framework.response import (
    Response,
)

from .models import (
    Feedback,
    HomepageVideo,
)


# ============================================================
# SUBMIT FEEDBACK
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def submit_feedback(request):

    name = str(
        request.data.get(
            "name",
            ""
        )
    ).strip()


    email = str(
        request.data.get(
            "email",
            ""
        )
    ).strip()


    feedback_type = str(
        request.data.get(
            "feedback_type",
            "feedback"
        )
    ).strip()


    message = str(
        request.data.get(
            "message",
            ""
        )
    ).strip()


    rating = request.data.get(
        "rating"
    )


    # ========================================================
    # VALIDATION
    # ========================================================

    if not name:

        return Response(
            {
                "detail":
                    "Name is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


    if not message:

        return Response(
            {
                "detail":
                    "Feedback message is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


    valid_feedback_types = [
        choice[0]
        for choice
        in Feedback.FEEDBACK_TYPE_CHOICES
    ]


    if (
        feedback_type
        not in valid_feedback_types
    ):

        return Response(
            {
                "detail":
                    "Invalid feedback type."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


    if rating not in (
        None,
        "",
    ):

        try:

            rating = int(
                rating
            )

        except (
            TypeError,
            ValueError,
        ):

            return Response(
                {
                    "detail":
                        "Rating must be a number "
                        "between 1 and 5."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


        if (
            rating < 1
            or rating > 5
        ):

            return Response(
                {
                    "detail":
                        "Rating must be between "
                        "1 and 5."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    else:

        rating = None


    # ========================================================
    # CREATE FEEDBACK
    # ========================================================

    feedback = Feedback.objects.create(

        name=name,

        email=email,

        feedback_type=feedback_type,

        rating=rating,

        message=message,

    )


    return Response(
        {
            "success": True,

            "message":
                "Thank you for your feedback.",

            "feedback": {
                "id":
                    feedback.id,

                "name":
                    feedback.name,

                "feedback_type":
                    feedback.feedback_type,

                "rating":
                    feedback.rating,

                "status":
                    feedback.status,

                "created_at":
                    feedback.created_at,
            },
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# FEEDBACK OPTIONS
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def feedback_options(request):

    options = [

        {
            "value":
                value,

            "label":
                label,
        }

        for value, label
        in Feedback.FEEDBACK_TYPE_CHOICES

    ]


    return Response(
        {
            "feedback_types":
                options
        }
    )


# ============================================================
# ACTIVE HOMEPAGE VIDEO
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def homepage_video(request):

    video = (
        HomepageVideo.objects
        .filter(
            is_active=True,
        )
        .exclude(
            video_url="",
        )
        .order_by(
            "-updated_at"
        )
        .first()
    )


    if not video:

        return Response(
            {
                "available":
                    False,

                "video_url":
                    "",

                "poster_url":
                    "",
            }
        )


    return Response(
        {
            "available":
                True,

            "id":
                video.id,

            "title":
                video.title,

            "video_url":
                video.video_url,

            "poster_url":
                video.poster_url,

            "updated_at":
                video.updated_at,
        }
    )
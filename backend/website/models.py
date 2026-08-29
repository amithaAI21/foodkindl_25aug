from django.db import models
from django.core.validators import (
    MinValueValidator,
    MaxValueValidator,
)
from django.db.models import Q


# ============================================================
# WAITLIST
# ============================================================

class WaitlistEntry(models.Model):

    full_name = models.CharField(
        max_length=140
    )

    email = models.EmailField(
        unique=True
    )

    city = models.CharField(
        max_length=120
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.email


# ============================================================
# FEEDBACK
# ============================================================

class Feedback(models.Model):

    FEEDBACK_TYPE_CHOICES = [
        ("feedback", "General Feedback"),
        ("suggestion", "Suggestion"),
        ("bug", "Report a Problem"),
        ("complaint", "Complaint"),
        ("appreciation", "Appreciation"),
    ]

    STATUS_CHOICES = [
        ("new", "New"),
        ("reviewing", "Reviewing"),
        ("resolved", "Resolved"),
    ]

    name = models.CharField(
        max_length=140
    )

    email = models.EmailField(
        blank=True
    )

    feedback_type = models.CharField(
        max_length=30,
        choices=FEEDBACK_TYPE_CHOICES,
        default="feedback",
    )

    rating = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5),
        ],
        help_text="Optional rating from 1 to 5.",
    )

    message = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="new",
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(rating__isnull=True)
                    | Q(
                        rating__gte=1,
                        rating__lte=5,
                    )
                ),
                name="feedback_rating_between_1_and_5",
            )
        ]

    def __str__(self):
        return (
            f"{self.name} - "
            f"{self.get_feedback_type_display()}"
        )


# ============================================================
# HOMEPAGE VIDEO
# ============================================================

class HomepageVideo(models.Model):

    title = models.CharField(
        max_length=150,
        default="FoodKindl Story",
    )

    # Actual MP4 is stored in Netlify Blobs.
    # Django stores only the Blob key.
    video_blob_key = models.CharField(
        max_length=500,
        blank=True,
    )

    # Public URL used by the frontend video player.
    video_url = models.URLField(
        max_length=1000,
        blank=True,
    )

    # Optional thumbnail/poster URL.
    poster_url = models.URLField(
        max_length=1000,
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
        help_text=(
            "If enabled, this video can be displayed "
            "on the FoodKindl homepage."
        ),
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title

    @property
    def has_video(self):
        return bool(
            self.video_blob_key
            and self.video_url
        )
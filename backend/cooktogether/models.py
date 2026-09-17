from django.conf import settings
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models


class CookTogether(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        PRIVATE = "private", "Private"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        CANCELLED = "cancelled", "Cancelled"

    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cook_togethers",
    )

    title = models.CharField(
        max_length=140
    )

    dish = models.CharField(
        max_length=140
    )

    description = models.TextField(
        blank=True
    )

    event_date = models.DateField(
        null=True,
        blank=True,
    )

    start_time = models.TimeField(
        null=True,
        blank=True,
    )

    location_name = models.CharField(
        max_length=180,
        blank=True,
    )

    exact_address = models.TextField(
        blank=True
    )

    cover_photo = models.ImageField(
        upload_to="cook_together/covers/%Y/%m/",
        blank=True,
        null=True,
    )

    visibility = models.CharField(
        max_length=10,
        choices=Visibility.choices,
        default=Visibility.PUBLIC,
    )

    verified_only = models.BooleanField(
        default=True
    )

    women_only = models.BooleanField(
        default=False
    )

    host_approval_required = models.BooleanField(
        default=True
    )

    maximum_guests = models.PositiveSmallIntegerField(
        default=6,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(20),
        ],
    )

    dietary_notes = models.CharField(
        max_length=500,
        blank=True,
    )

    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    published_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    invited_members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="cook_together_invitations",
        blank=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

    def __str__(self):
        return f"{self.title} — {self.host}"


class CookTogetherRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        DECLINED = "declined", "Declined"

    class InvitationType(models.TextChoices):
        JOIN_REQUEST = (
            "join_request",
            "Join request",
        )

        HOST_INVITE = (
            "host_invite",
            "Host invitation",
        )

    cook_together = models.ForeignKey(
        CookTogether,
        on_delete=models.CASCADE,
        related_name="join_requests",
    )

    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cook_together_requests",
    )

    note = models.CharField(
        max_length=300,
        blank=True,
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )

    invitation_type = models.CharField(
        max_length=20,
        choices=InvitationType.choices,
        default=InvitationType.JOIN_REQUEST,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "cook_together",
                    "guest",
                ],
                name="unique_cook_together_guest",
            )
        ]

    def __str__(self):
        return (
            f"{self.guest} — "
            f"{self.cook_together} — "
            f"{self.status}"
        )
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class DineOut(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        CANCELLED = "cancelled", "Cancelled"

    class Visibility(models.TextChoices):
        PUBLIC = "public", "Visible to everyone"
        INVITED_ONLY = "invited_only", "Selected guests only"

    class BookingStatus(models.TextChoices):
        NOT_BOOKED = "not_booked", "Not booked yet"
        BOOKED = "booked", "Booked"
        WALK_IN = "walk_in", "Walk in"

    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hosted_dine_outs",
    )

    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)

    restaurant_external_id = models.CharField(
        max_length=120,
        blank=True,
    )

    restaurant_name = models.CharField(max_length=220)
    restaurant_address = models.TextField(blank=True)
    restaurant_cuisine = models.CharField(max_length=180, blank=True)
    restaurant_phone = models.CharField(max_length=50, blank=True)
    restaurant_website = models.URLField(max_length=500, blank=True)

    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
    )

    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
    )

    starts_at = models.DateTimeField()

    maximum_guests = models.PositiveSmallIntegerField(
        default=4,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(20),
        ],
    )

    budget_label = models.CharField(max_length=100, blank=True)

    booking_status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.NOT_BOOKED,
    )

    dietary_notes = models.TextField(blank=True)
    meetup_notes = models.TextField(blank=True)

    verified_only = models.BooleanField(default=False)
    women_only = models.BooleanField(default=False)

    visibility = models.CharField(
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.PUBLIC,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PUBLISHED,
    )

    invited_members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="dine_out_invitations",
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["starts_at", "-created_at"]

    def __str__(self):
        return f"{self.title} at {self.restaurant_name}"
    
    
class DineOutResponse(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"

    dine_out = models.ForeignKey(
        DineOut,
        on_delete=models.CASCADE,
        related_name="responses",
    )

    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dine_out_responses",
    )

    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "dine_out",
                    "guest",
                ],
                name="unique_dineout_guest_response",
            ),
        ]

    def __str__(self):
        return (
            f"{self.guest} - "
            f"{self.dine_out} - "
            f"{self.status}"
        )
from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


indian_mobile_validator = RegexValidator(
    regex=r"^[6-9][0-9]{9}$",
    message="Enter a valid Indian 10-digit mobile number.",
)


class Profile(models.Model):
    DIETARY_PREFERENCE_CHOICES = [
        ("non_vegetarian", "Non-Vegetarian"),
        ("vegetarian", "Vegetarian"),
        ("vegan", "Vegan"),
    ]

    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("prefer_not_to_say", "Prefer not to say"),
    ]

    PROFILE_VISIBILITY_CHOICES = [
        ("public", "Public"),
        ("private", "Private"),
    ]

    ACCOUNT_TYPE_CHOICES = [
        ("member", "FoodKindl Member"),
        ("partner", "Restaurant Partner"),
    ]

    PORTAL_CHOICES = [
        ("member", "FoodKindl Member"),
        ("restaurant", "Restaurant Partner"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    # Account settings
    account_type = models.CharField(
        max_length=20,
        choices=ACCOUNT_TYPE_CHOICES,
        default="member",
        db_index=True,
    )
    member_profile_enabled = models.BooleanField(
        default=True,
        db_index=True,
    )
    preferred_portal = models.CharField(
        max_length=20,
        choices=PORTAL_CHOICES,
        default="member",
        db_index=True,
    )
    profile_visibility = models.CharField(
        max_length=10,
        choices=PROFILE_VISIBILITY_CHOICES,
        default="public",
        db_index=True,
    )

    # Profile information
    bio = models.TextField(blank=True, default="")
    city = models.CharField(max_length=120, blank=True, default="")
    locality = models.CharField(max_length=120, blank=True, default="")
    postcode = models.CharField(max_length=20, blank=True, default="")
    college_workplace = models.CharField(
        max_length=180,
        blank=True,
        default="",
    )
    role = models.CharField(max_length=120, blank=True, default="")

    # Food interests
    interests = models.CharField(
        max_length=1000,
        blank=True,
        default="",
    )
    favorite_cuisines = models.CharField(
        max_length=1000,
        blank=True,
        default="",
    )
    food_connection_preferences = models.CharField(
        max_length=1000,
        blank=True,
        default="",
    )
    gender = models.CharField(
        max_length=30,
        choices=GENDER_CHOICES,
        blank=True,
        default="",
    )
    dietary_preference = models.CharField(
        max_length=30,
        choices=DIETARY_PREFERENCE_CHOICES,
        default="non_vegetarian",
    )
    women_only_mode = models.BooleanField(default=False)

    blocked_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="blocked_by_profiles",
    )

    # Optional profile photos
    profile_image_1 = models.ImageField(
        upload_to="profiles/photos/",
        blank=True,
        null=True,
    )
    profile_image_2 = models.ImageField(
        upload_to="profiles/photos/",
        blank=True,
        null=True,
    )
    profile_image_3 = models.ImageField(
        upload_to="profiles/photos/",
        blank=True,
        null=True,
    )

    profile_image_1_blob_key = models.CharField(
        max_length=500, blank=True, default=""
    )
    profile_image_1_url = models.URLField(
        max_length=1500, blank=True, default=""
    )
    profile_image_2_blob_key = models.CharField(
        max_length=500, blank=True, default=""
    )
    profile_image_2_url = models.URLField(
        max_length=1500, blank=True, default=""
    )
    profile_image_3_blob_key = models.CharField(
        max_length=500, blank=True, default=""
    )
    profile_image_3_url = models.URLField(
        max_length=1500, blank=True, default=""
    )

    # Email verification used by the new registration/login flow.
    # Only the backend verification view should set this timestamp.
    email_verified_at = models.DateTimeField(
        null=True,
        blank=True,
        editable=False,
    )

    # Existing phone fields retained for compatibility.
    # They are optional and are not required for email registration.
    phone_number = models.CharField(
        max_length=10,
        unique=True,
        null=True,
        blank=True,
        default=None,
        validators=[indian_mobile_validator],
    )
    phone_verified_at = models.DateTimeField(
        null=True,
        blank=True,
        editable=False,
    )

    # Legacy phone-verification flag.
    # Use is_email_verified for email login checks.
    is_verified = models.BooleanField(
        default=False,
        db_index=True,
        editable=False,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_email_verified(self):
        return bool(self.email_verified_at)

    @property
    def is_phone_verified(self):
        return bool(self.phone_number and self.phone_verified_at)

    @property
    def is_partner_account(self):
        return self.account_type == "partner"

    @property
    def is_member_account(self):
        return self.account_type == "member"

    @property
    def should_open_partner_portal(self):
        return self.account_type == "partner"

    def has_blocked(self, user):
        if not user or not getattr(user, "pk", None):
            return False
        return self.blocked_users.filter(pk=user.pk).exists()

    def get_food_interests(self):
        return [
            item.strip()
            for item in (self.interests or "").split(",")
            if item.strip()
        ]

    def get_favorite_cuisines(self):
        return [
            item.strip()
            for item in (self.favorite_cuisines or "").split(",")
            if item.strip()
        ]

    def get_food_connection_preferences(self):
        return [
            item.strip()
            for item in (
                self.food_connection_preferences or ""
            ).split(",")
            if item.strip()
        ]

    def save(self, *args, **kwargs):
        fields = kwargs.get("update_fields")

        if fields is not None:
            fields = set(fields)
            if not fields:
                return

        if self.account_type == "partner":
            self.preferred_portal = "restaurant"
        else:
            self.account_type = "member"
            self.preferred_portal = "member"
            self.member_profile_enabled = True

        if self.phone_number == "":
            self.phone_number = None
            if fields is not None:
                fields.add("phone_number")

        # Preserve the existing meaning of the legacy flag.
        self.is_verified = self.is_phone_verified

        if fields is not None:
            kwargs["update_fields"] = fields | {
                "is_verified",
                "preferred_portal",
                "account_type",
                "member_profile_enabled",
            }

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            self.user.email
            or self.user.get_username()
            or f"Profile {self.pk}"
        )


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def ensure_user_profile(sender, instance, created, **kwargs):
    if kwargs.get("raw"):
        return

    Profile.objects.get_or_create(user=instance)


# Retained while existing OTP imports are being removed.
# Keeping this model does not send SMS or enable OTP login.
class MobileOTPChallenge(models.Model):
    PURPOSE_CHOICES = [
        ("login", "Mobile Login"),
        ("link", "Link Mobile Number"),
    ]

    mobile = models.CharField(
        max_length=10,
        unique=True,
        validators=[indian_mobile_validator],
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    purpose = models.CharField(
        max_length=10,
        choices=PURPOSE_CHOICES,
        default="login",
    )
    code_hash = models.CharField(
        max_length=128,
        blank=True,
        default="",
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    window_started_at = models.DateTimeField(null=True, blank=True)
    requests_in_window = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Mobile OTP challenge {self.pk}"


class AdminNotification(models.Model):
    NOTIFICATION_TYPE_CHOICES = [
        ("email_verified", "Email Verified"),
        ("phone_verified", "Phone Verified"),
        ("general", "General"),
    ]

    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPE_CHOICES,
        default="general",
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default="")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="foodkindl_admin_notifications",
        null=True,
        blank=True,
    )
    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="admin_notifications",
        null=True,
        blank=True,
    )

    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
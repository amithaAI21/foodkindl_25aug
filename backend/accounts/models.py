from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


# ============================================================
# PROFILE
# ============================================================

class Profile(models.Model):

    # ========================================================
    # CHOICES
    # ========================================================

    DIETARY_PREFERENCE_CHOICES = [
        (
            "non_vegetarian",
            "Non-Vegetarian",
        ),
        (
            "vegetarian",
            "Vegetarian",
        ),
        (
            "vegan",
            "Vegan",
        ),
        (
            "halal",
            "Halal",
        ),
        (
            "keto",
            "Keto",
        ),
        (
            "pescatarian",
            "Pescatarian",
        ),
        (
            "gluten_free",
            "Gluten-free",
        ),
    ]


    GOVERNMENT_ID_TYPE_CHOICES = [
        (
            "aadhaar",
            "Aadhaar Card",
        ),
        (
            "passport",
            "Passport",
        ),
        (
            "driving_licence",
            "Driving Licence",
        ),
        (
            "voter_id",
            "Voter ID",
        ),
        (
            "pan",
            "PAN Card",
        ),
        (
            "other",
            "Other",
        ),
    ]


    VERIFICATION_STATUS_CHOICES = [
        (
            "not_submitted",
            "Not Submitted",
        ),
        (
            "pending",
            "Pending",
        ),
        (
            "approved",
            "Approved",
        ),
        (
            "rejected",
            "Rejected",
        ),
    ]


    GENDER_CHOICES = [
        (
            "male",
            "Male",
        ),
        (
            "female",
            "Female",
        ),
        (
            "other",
            "Other",
        ),
        (
            "prefer_not_to_say",
            "Prefer not to say",
        ),
    ]


    PROFILE_VISIBILITY_CHOICES = [
        (
            "public",
            "Public",
        ),
        (
            "private",
            "Private",
        ),
    ]


    # ========================================================
    # ACCOUNT TYPE
    # ========================================================

    ACCOUNT_TYPE_CHOICES = [
        (
            "member",
            "FoodKindl Member",
        ),
        (
            "partner",
            "Restaurant Partner",
        ),
    ]


    PORTAL_CHOICES = [
        (
            "member",
            "FoodKindl Member",
        ),
        (
            "restaurant",
            "Restaurant Partner",
        ),
    ]


    # ========================================================
    # USER
    # ========================================================

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )


    # ========================================================
    # ACCOUNT SETTINGS
    # ========================================================

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


    # ========================================================
    # PROFILE PRIVACY
    # ========================================================

    profile_visibility = models.CharField(
        max_length=10,
        choices=PROFILE_VISIBILITY_CHOICES,
        default="public",
        db_index=True,
    )


    # ========================================================
    # PROFILE INFORMATION
    # ========================================================

    bio = models.TextField(
        blank=True,
        default="",
    )


    city = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )


    locality = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )


    postcode = models.CharField(
        max_length=20,
        blank=True,
        default="",
    )


    college_workplace = models.CharField(
        max_length=180,
        blank=True,
        default="",
    )


    role = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )


    # ========================================================
    # FOOD INTERESTS
    # ========================================================

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


    women_only_mode = models.BooleanField(
        default=False,
    )


    # ========================================================
    # BLOCKED MEMBERS
    # ========================================================

    blocked_users = models.ManyToManyField(
        User,
        blank=True,
        related_name="blocked_by_profiles",
    )


    # ========================================================
    # LEGACY DJANGO PROFILE PHOTOS
    # ========================================================

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


    # ========================================================
    # NETLIFY BLOB PROFILE PHOTO 1
    # ========================================================

    profile_image_1_blob_key = models.CharField(
        max_length=500,
        blank=True,
        default="",
    )


    profile_image_1_url = models.URLField(
        max_length=1500,
        blank=True,
        default="",
    )


    # ========================================================
    # NETLIFY BLOB PROFILE PHOTO 2
    # ========================================================

    profile_image_2_blob_key = models.CharField(
        max_length=500,
        blank=True,
        default="",
    )


    profile_image_2_url = models.URLField(
        max_length=1500,
        blank=True,
        default="",
    )


    # ========================================================
    # NETLIFY BLOB PROFILE PHOTO 3
    # ========================================================

    profile_image_3_blob_key = models.CharField(
        max_length=500,
        blank=True,
        default="",
    )


    profile_image_3_url = models.URLField(
        max_length=1500,
        blank=True,
        default="",
    )


    # ========================================================
    # LEGACY GOVERNMENT ID
    # ========================================================

    government_id = models.FileField(
        upload_to="private/government_ids/",
        blank=True,
        null=True,
    )


    # ========================================================
    # PRIVATE NETLIFY BLOB GOVERNMENT ID
    # ========================================================

    government_id_blob_key = models.CharField(
        max_length=500,
        blank=True,
        default="",
    )


    # ========================================================
    # GOVERNMENT ID HTTPS URL
    # ========================================================

    government_id_url = models.URLField(
        max_length=1500,
        blank=True,
        default="",
    )


    government_id_original_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )


    government_id_content_type = models.CharField(
        max_length=100,
        blank=True,
        default="",
    )


    government_id_type = models.CharField(
        max_length=30,
        choices=GOVERNMENT_ID_TYPE_CHOICES,
        blank=True,
        default="",
    )


    # ========================================================
    # VERIFICATION
    # ========================================================

    verification_status = models.CharField(
        max_length=30,
        choices=VERIFICATION_STATUS_CHOICES,
        default="not_submitted",
        db_index=True,
    )


    is_verified = models.BooleanField(
        default=False,
        db_index=True,
    )


    rejection_reason = models.TextField(
        blank=True,
        default="",
    )


    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_profiles",
    )


    verified_at = models.DateTimeField(
        null=True,
        blank=True,
    )


    # ========================================================
    # TIMESTAMPS
    # ========================================================

    created_at = models.DateTimeField(
        auto_now_add=True,
    )


    updated_at = models.DateTimeField(
        auto_now=True,
    )


    # ========================================================
    # ACCOUNT HELPERS
    # ========================================================

    @property
    def is_partner_account(
        self,
    ):
        return (
            self.account_type
            ==
            "partner"
        )


    @property
    def is_member_account(
        self,
    ):
        return (
            self.account_type
            ==
            "member"
        )


    @property
    def should_open_partner_portal(
        self,
    ):
        return (
            self.account_type
            ==
            "partner"
        )


    # ========================================================
    # BLOCK HELPERS
    # ========================================================

    def has_blocked(
        self,
        user,
    ):

        if not user:
            return False

        if not getattr(
            user,
            "id",
            None,
        ):
            return False

        return (
            self.blocked_users
            .filter(
                id=user.id
            )
            .exists()
        )


    # ========================================================
    # FOOD MATCH HELPERS
    # ========================================================

    def get_food_interests(
        self,
    ):

        if not self.interests:
            return []

        return [
            item.strip()
            for item
            in self.interests.split(",")
            if item.strip()
        ]


    def get_favorite_cuisines(
        self,
    ):

        if not self.favorite_cuisines:
            return []

        return [
            item.strip()
            for item
            in self.favorite_cuisines.split(",")
            if item.strip()
        ]


    def get_food_connection_preferences(
        self,
    ):

        if not self.food_connection_preferences:
            return []

        return [
            item.strip()
            for item
            in self.food_connection_preferences.split(",")
            if item.strip()
        ]


    # ========================================================
    # SAVE
    # ========================================================

    def save(
        self,
        *args,
        **kwargs,
    ):

        # ----------------------------------------------------
        # ACCOUNT TYPE / PORTAL
        # ----------------------------------------------------

        if (
            self.account_type
            ==
            "partner"
        ):

            self.preferred_portal = (
                "restaurant"
            )

        else:

            self.account_type = (
                "member"
            )

            self.preferred_portal = (
                "member"
            )

            self.member_profile_enabled = (
                True
            )


        # ----------------------------------------------------
        # VERIFICATION
        # ----------------------------------------------------

        verification_status = (
            str(
                self.verification_status
                or
                "not_submitted"
            )
            .strip()
            .lower()
        )


        valid_statuses = {
            "not_submitted",
            "pending",
            "approved",
            "rejected",
        }


        if (
            verification_status
            not in
            valid_statuses
        ):

            verification_status = (
                "not_submitted"
            )


        self.verification_status = (
            verification_status
        )


        # Approved is the ONLY state
        # where is_verified can be True.

        self.is_verified = (
            verification_status
            ==
            "approved"
        )


        # Not approved = remove
        # old verification metadata.

        if (
            verification_status
            !=
            "approved"
        ):

            self.verified_by = None

            self.verified_at = None


        # Remove old rejection reason when user
        # has resubmitted / pending / approved.

        if (
            verification_status
            in {
                "not_submitted",
                "pending",
                "approved",
            }
        ):

            self.rejection_reason = ""


        super().save(
            *args,
            **kwargs,
        )


    # ========================================================
    # STRING
    # ========================================================

    def __str__(
        self,
    ):

        return (
            self.user.email
            or
            self.user.username
            or
            f"Profile {self.pk}"
        )


# ============================================================
# ENSURE EVERY USER HAS A PROFILE
# ============================================================

@receiver(
    post_save,
    sender=User,
)
def ensure_user_profile(
    sender,
    instance,
    created,
    **kwargs,
):

    Profile.objects.get_or_create(
        user=instance
    )


# ============================================================
# ADMIN NOTIFICATIONS
# ============================================================

class AdminNotification(
    models.Model
):

    NOTIFICATION_TYPE_CHOICES = [
        (
            "government_id_uploaded",
            "Government ID Uploaded",
        ),
        (
            "general",
            "General",
        ),
    ]


    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPE_CHOICES,
        default="general",
        db_index=True,
    )


    title = models.CharField(
        max_length=255,
    )


    message = models.TextField(
        blank=True,
        default="",
    )


    user = models.ForeignKey(
        User,
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


    is_read = models.BooleanField(
        default=False,
        db_index=True,
    )


    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )


    read_at = models.DateTimeField(
        null=True,
        blank=True,
    )


    class Meta:

        ordering = [
            "-created_at",
        ]


    def __str__(
        self,
    ):

        return self.title
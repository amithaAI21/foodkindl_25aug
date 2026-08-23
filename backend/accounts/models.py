from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


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


    # ========================================================
    # USER
    # ========================================================

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )


    # ========================================================
    # PROFILE INFORMATION
    # ========================================================

    bio = models.TextField(
        blank=True,
    )


    city = models.CharField(
        max_length=120,
        blank=True,
    )


    locality = models.CharField(
        max_length=120,
        blank=True,
    )


    postcode = models.CharField(
        max_length=20,
        blank=True,
    )


    college_workplace = models.CharField(
        max_length=180,
        blank=True,
    )


    role = models.CharField(
        max_length=120,
        blank=True,
    )


    # ========================================================
    # FOOD INTERESTS
    #
    # Example:
    # Home Cooking,Baking,Food Exploring
    # ========================================================

    interests = models.CharField(
        max_length=1000,
        blank=True,
        default="",
    )


    # ========================================================
    # FOOD MATCH - FAVOURITE CUISINES
    #
    # Example:
    # Kerala,South Indian,Chinese,Italian
    # ========================================================

    favorite_cuisines = models.CharField(
        max_length=1000,
        blank=True,
        default="",
    )


    # ========================================================
    # FOOD MATCH - CONNECTION PREFERENCES
    #
    # Example:
    # Cook Together,Dine Out,Food Gatherings
    # ========================================================

    food_connection_preferences = models.CharField(
        max_length=1000,
        blank=True,
        default="",
    )


    gender = models.CharField(
        max_length=30,
        choices=GENDER_CHOICES,
        blank=True,
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
    #
    # Stores the HTTPS URL returned by Netlify.
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
    # HELPERS
    # ========================================================

    def has_blocked(
        self,
        user,
    ):

        if not user:
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

    def get_food_interests(self):
        """
        Return food interests as a clean Python list.
        """

        if not self.interests:
            return []

        return [
            item.strip()
            for item in self.interests.split(",")
            if item.strip()
        ]


    def get_favorite_cuisines(self):
        """
        Return favourite cuisines as a clean Python list.
        """

        if not self.favorite_cuisines:
            return []

        return [
            item.strip()
            for item in self.favorite_cuisines.split(",")
            if item.strip()
        ]


    def get_food_connection_preferences(self):
        """
        Return connection preferences as a clean Python list.
        """

        if not self.food_connection_preferences:
            return []

        return [
            item.strip()
            for item
            in self.food_connection_preferences.split(",")
            if item.strip()
        ]


    def __str__(
        self,
    ):

        return (
            self.user.email
            or self.user.username
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
    **kwargs,
):

    Profile.objects.get_or_create(
        user=instance
    )
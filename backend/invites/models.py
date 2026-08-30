import uuid

from django.conf import settings
from django.db import models
from .geocoding import geocode_restaurant_location

CUISINE_CHOICES = [

    # Indian regional
    ("south_indian", "South Indian"),
    ("north_indian", "North Indian"),
    ("kerala", "Kerala"),
    ("karnataka", "Karnataka"),
    ("tamil", "Tamil"),
    ("andhra", "Andhra"),
    ("telangana", "Telangana"),
    ("hyderabadi", "Hyderabadi"),
    ("punjabi", "Punjabi"),
    ("bengali", "Bengali"),
    ("rajasthani", "Rajasthani"),
    ("gujarati", "Gujarati"),
    ("maharashtrian", "Maharashtrian"),
    ("goan", "Goan"),
    ("kashmiri", "Kashmiri"),

    # International
    ("chinese", "Chinese"),
    ("indo_chinese", "Indo-Chinese"),
    ("italian", "Italian"),
    ("continental", "Continental"),
    ("mediterranean", "Mediterranean"),
    ("mexican", "Mexican"),
    ("thai", "Thai"),
    ("japanese", "Japanese"),
    ("korean", "Korean"),
    ("arabian", "Arabian"),
    ("middle_eastern", "Middle Eastern"),
    ("lebanese", "Lebanese"),

    # Popular restaurant categories
    ("biryani", "Biryani"),
    ("seafood", "Seafood"),
    ("street_food", "Street Food"),
    ("fast_food", "Fast Food"),
    ("cafe", "Cafe"),
    ("bakery", "Bakery"),
    ("desserts", "Desserts"),
    ("barbecue", "Barbecue / Grill"),

    # Diet based
    ("vegetarian", "Vegetarian"),
    ("vegan", "Vegan"),
    ("jain", "Jain"),

    # Other
    ("multi_cuisine", "Multi Cuisine"),
    ("other", "Other"),
]

# ============================================================
# INVITE TYPE
# ============================================================

class InviteType(
    models.TextChoices
):

    COOK_TOGETHER = (
        "cook_together",
        "Cook Together",
    )

    DINE_OUT = (
        "dine_out",
        "Dine Out",
    )

    FOOD_WALK = (
        "food_walk",
        "Food Walk",
    )


# ============================================================
# COOK VENUE TYPE
# ============================================================

class CookVenueType(
    models.TextChoices
):

    HOME = (
        "home",
        "Home",
    )

    CLUBHOUSE = (
        "clubhouse",
        "Clubhouse",
    )

    OTHER = (
        "other",
        "Other Venue",
    )


# ============================================================
# DINE VENUE TYPE
# ============================================================

class DineVenueType(
    models.TextChoices
):

    RESTAURANT = (
        "restaurant",
        "Restaurant",
    )

    CAFE = (
        "cafe",
        "Cafe",
    )


# ============================================================
# INVITE STATUS
# ============================================================

class InviteStatus(
    models.TextChoices
):

    OPEN = (
        "open",
        "Open",
    )

    CONFIRMED = (
        "confirmed",
        "Confirmed",
    )

    CANCELLED = (
        "cancelled",
        "Cancelled",
    )

    COMPLETED = (
        "completed",
        "Completed",
    )


# ============================================================
# PARTICIPANT STATUS
# ============================================================

class ParticipantStatus(
    models.TextChoices
):

    INVITED = (
        "invited",
        "Invited",
    )

    ACCEPTED = (
        "accepted",
        "Accepted",
    )

    DECLINED = (
        "declined",
        "Declined",
    )


# ============================================================
# FOOD INVITE
# ============================================================

class FoodInvite(
    models.Model
):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )


    # ========================================================
    # CREATOR
    # ========================================================

    creator_user_id = (
        models.PositiveBigIntegerField(
            db_index=True,
        )
    )


    # ========================================================
    # TYPE
    # ========================================================

    invite_type = models.CharField(
        max_length=30,
        choices=InviteType.choices,
        db_index=True,
    )


    # ========================================================
    # CONTENT
    # ========================================================

    title = models.CharField(
        max_length=180,
        blank=True,
        default="",
    )


    description = models.TextField(
        blank=True,
        default="",
    )


    cuisine = models.CharField(
        max_length=180,
        blank=True,
        default="",
    )


    # ========================================================
    # DATE / TIME
    # ========================================================

    start_at = models.DateTimeField(
        db_index=True,
    )


    end_at = models.DateTimeField(
        blank=True,
        null=True,
    )


    # ========================================================
    # VENUE
    # ========================================================

    cook_venue_type = models.CharField(
        max_length=30,
        choices=CookVenueType.choices,
        blank=True,
        default="",
    )


    dine_venue_type = models.CharField(
        max_length=30,
        choices=DineVenueType.choices,
        blank=True,
        default="",
    )


    venue_name = models.CharField(
        max_length=200,
        blank=True,
        default="",
    )


    location_label = models.CharField(
        max_length=200,
        blank=True,
        default="",
    )


    private_address = models.CharField(
        max_length=500,
        blank=True,
        default="",
    )


    # ========================================================
    # FOOD WALK
    # ========================================================

    food_walk_stops = models.JSONField(
        default=list,
        blank=True,
    )


    # ========================================================
    # PARTICIPANTS
    # ========================================================

    max_participants = (
        models.PositiveIntegerField(
            default=2,
        )
    )


    # ========================================================
    # SAFETY
    # ========================================================

    verified_only = (
        models.BooleanField(
            default=True,
        )
    )


    women_only = (
        models.BooleanField(
            default=False,
        )
    )


    # ========================================================
    # KITCHEN CONTRIBUTION
    # ========================================================

    kitchen_contribution = (
        models.DecimalField(
            max_digits=8,
            decimal_places=2,
            default=0,
        )
    )


    # ========================================================
    # STATUS
    # ========================================================

    status = models.CharField(
        max_length=30,
        choices=InviteStatus.choices,
        default=InviteStatus.OPEN,
        db_index=True,
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


    class Meta:

        ordering = [
            "start_at",
        ]


    def __str__(
        self,
    ):

        return (
            self.title
            or
            self.get_invite_type_display()
        )


# ============================================================
# FOOD INVITE PARTICIPANT
# ============================================================

class FoodInviteParticipant(
    models.Model
):

    invite = models.ForeignKey(
        FoodInvite,
        on_delete=models.CASCADE,
        related_name="participants",
    )


    user_id = (
        models.PositiveBigIntegerField(
            db_index=True,
        )
    )


    status = models.CharField(
        max_length=20,
        choices=ParticipantStatus.choices,
        default=ParticipantStatus.INVITED,
        db_index=True,
    )


    responded_at = models.DateTimeField(
        blank=True,
        null=True,
    )


    created_at = models.DateTimeField(
        auto_now_add=True,
    )


    class Meta:

        constraints = [

            models.UniqueConstraint(
                fields=[
                    "invite",
                    "user_id",
                ],
                name=(
                    "unique_food_invite_participant"
                ),
            ),

        ]


    def __str__(
        self,
    ):

        return (
            f"{self.user_id} - "
            f"{self.status}"
        )


# ============================================================
# RESTAURANT
# ============================================================

class Restaurant(models.Model):

    RESTAURANT_TYPE_CHOICES = [
        ("restaurant", "Restaurant"),
        ("cafe", "Cafe"),
        ("hotel", "Hotel"),
    ]

    PRICE_RANGE_CHOICES = [
        ("budget", "Budget"),
        ("moderate", "Moderate"),
        ("premium", "Premium"),
    ]

    CUISINE_CHOICES = [
        ("south_indian", "South Indian"),
        ("north_indian", "North Indian"),
        ("kerala", "Kerala"),
        ("karnataka", "Karnataka"),
        ("tamil", "Tamil"),
        ("andhra", "Andhra"),
        ("telangana", "Telangana"),
        ("hyderabadi", "Hyderabadi"),
        ("punjabi", "Punjabi"),
        ("bengali", "Bengali"),
        ("rajasthani", "Rajasthani"),
        ("gujarati", "Gujarati"),
        ("maharashtrian", "Maharashtrian"),
        ("goan", "Goan"),
        ("kashmiri", "Kashmiri"),

        ("chinese", "Chinese"),
        ("indo_chinese", "Indo-Chinese"),
        ("italian", "Italian"),
        ("continental", "Continental"),
        ("mediterranean", "Mediterranean"),
        ("mexican", "Mexican"),
        ("thai", "Thai"),
        ("japanese", "Japanese"),
        ("korean", "Korean"),
        ("arabian", "Arabian"),
        ("middle_eastern", "Middle Eastern"),
        ("lebanese", "Lebanese"),

        ("biryani", "Biryani"),
        ("seafood", "Seafood"),
        ("street_food", "Street Food"),
        ("fast_food", "Fast Food"),
        ("cafe", "Cafe"),
        ("bakery", "Bakery"),
        ("desserts", "Desserts"),
        ("barbecue", "Barbecue / Grill"),

        ("vegetarian", "Vegetarian"),
        ("vegan", "Vegan"),
        ("jain", "Jain"),

        ("multi_cuisine", "Multi Cuisine"),
        ("other", "Other"),
    ]

    # ========================================================
    # OWNER
    # ========================================================

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="owned_restaurants",
        null=True,
        blank=True,
    )

    # ========================================================
    # BASIC INFORMATION
    # ========================================================

    name = models.CharField(
        max_length=180,
    )

    restaurant_type = models.CharField(
        max_length=20,
        choices=RESTAURANT_TYPE_CHOICES,
        default="restaurant",
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    cuisine = models.CharField(
        max_length=50,
        choices=CUISINE_CHOICES,
        blank=True,
        default="",
        db_index=True,
    )

    # ========================================================
    # CONTACT
    # ========================================================

    phone_number = models.CharField(
        max_length=30,
        blank=True,
        default="",
    )

    email = models.EmailField(
        blank=True,
        default="",
    )

    website = models.URLField(
        max_length=500,
        blank=True,
        default="",
    )

    # ========================================================
    # LOCATION
    # ========================================================

    address = models.TextField(
        blank=True,
        default="",
    )

    locality = models.CharField(
        max_length=180,
        blank=True,
        default="",
        db_index=True,
    )

    city = models.CharField(
        max_length=120,
        blank=True,
        default="",
        db_index=True,
    )

    pincode = models.CharField(
        max_length=12,
        blank=True,
        default="",
        db_index=True,
    )

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        db_index=True,
        editable=False,
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        db_index=True,
        editable=False,
    )

    # ========================================================
    # DETAILS
    # ========================================================

    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        blank=True,
        null=True,
    )

    price_range = models.CharField(
        max_length=20,
        choices=PRICE_RANGE_CHOICES,
        blank=True,
        default="",
    )

    average_cost_for_two = models.PositiveIntegerField(
        blank=True,
        null=True,
    )

    opening_time = models.TimeField(
        blank=True,
        null=True,
    )

    closing_time = models.TimeField(
        blank=True,
        null=True,
    )

    seating_capacity = models.PositiveIntegerField(
        blank=True,
        null=True,
    )

    # ========================================================
    # FACILITIES
    # ========================================================

    has_parking = models.BooleanField(default=False)
    has_wifi = models.BooleanField(default=False)
    accepts_cards = models.BooleanField(default=True)
    family_friendly = models.BooleanField(default=True)
    outdoor_seating = models.BooleanField(default=False)
    wheelchair_accessible = models.BooleanField(default=False)
    serves_vegetarian = models.BooleanField(default=True)
    serves_non_vegetarian = models.BooleanField(default=True)

    # ========================================================
    # MAIN IMAGE
    # ========================================================

    image_blob_key = models.CharField(
        max_length=1000,
        blank=True,
        default="",
    )

    image_url = models.URLField(
        max_length=1500,
        blank=True,
        default="",
    )

    image_original_name = models.CharField(
        max_length=500,
        blank=True,
        default="",
    )

    image_content_type = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    # ========================================================
    # FOODKINDL
    # ========================================================

    is_foodkindl_partner = models.BooleanField(
        default=True,
        db_index=True,
    )

    accepts_foodkindl_booking = models.BooleanField(
        default=False,
        db_index=True,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-rating",
            "name",
        ]

    def save(self, *args, **kwargs):
        should_geocode = (
            self.latitude is None
            or self.longitude is None
        )

        if self.pk:
            try:
                old = Restaurant.objects.get(
                    pk=self.pk
                )

                if (
                    old.address != self.address
                    or old.locality != self.locality
                    or old.city != self.city
                    or old.pincode != self.pincode
                ):
                    should_geocode = True

            except Restaurant.DoesNotExist:
                should_geocode = True

        if should_geocode:

            print(
                "📍 Trying to geocode restaurant:",
                self.name,
            )

            result = geocode_restaurant_location(
                address=self.address,
                locality=self.locality,
                city=self.city,
                pincode=self.pincode,
            )

            if result:
                self.latitude = result[
                    "latitude"
                ]

                self.longitude = result[
                    "longitude"
                ]

                print(
                    "✅ SAVING COORDINATES:",
                    self.latitude,
                    self.longitude,
                )

            else:
                print(
                    "❌ Restaurant geocoding returned no result"
                )

        super().save(
            *args,
            **kwargs,
        )


    def __str__(self):
        return self.name

# ============================================================
# RESTAURANT GALLERY IMAGE
# ============================================================

class RestaurantImage(
    models.Model
):

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="images",
    )


    # ========================================================
    # NETLIFY BLOB METADATA
    # ========================================================

    image_blob_key = (
        models.CharField(
            max_length=1000,
            blank=True,
            default="",
        )
    )


    image_url = models.URLField(
        max_length=1500,
        blank=True,
        default="",
    )


    image_original_name = (
        models.CharField(
            max_length=500,
            blank=True,
            default="",
        )
    )


    image_content_type = (
        models.CharField(
            max_length=120,
            blank=True,
            default="",
        )
    )


    # ========================================================
    # DETAILS
    # ========================================================

    caption = models.CharField(
        max_length=180,
        blank=True,
        default="",
    )


    sort_order = (
        models.PositiveIntegerField(
            default=0,
        )
    )


    is_active = models.BooleanField(
        default=True,
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


    class Meta:

        ordering = [
            "sort_order",
            "id",
        ]


    def __str__(
        self,
    ):

        return (
            f"{self.restaurant.name} "
            f"- Photo {self.id}"
        )


# ============================================================
# RESTAURANT MENU ITEM
# ============================================================

class RestaurantMenuItem(
    models.Model
):

    CATEGORY_CHOICES = [

        (
            "starter",
            "Starter",
        ),

        (
            "main_course",
            "Main Course",
        ),

        (
            "bread",
            "Bread",
        ),

        (
            "rice",
            "Rice",
        ),

        (
            "dessert",
            "Dessert",
        ),

        (
            "beverage",
            "Beverage",
        ),

        (
            "snack",
            "Snack",
        ),

        (
            "other",
            "Other",
        ),

    ]


    FOOD_TYPE_CHOICES = [

        (
            "vegetarian",
            "Vegetarian",
        ),

        (
            "non_vegetarian",
            "Non Vegetarian",
        ),

        (
            "vegan",
            "Vegan",
        ),

        (
            "egg",
            "Egg",
        ),

    ]


    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="menu_items",
    )


    # ========================================================
    # DISH INFORMATION
    # ========================================================

    name = models.CharField(
        max_length=180,
    )


    description = models.TextField(
        blank=True,
        default="",
    )


    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default="main_course",
    )


    food_type = models.CharField(
        max_length=30,
        choices=FOOD_TYPE_CHOICES,
        default="vegetarian",
    )


    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )


    # ========================================================
    # MENU ITEM PHOTO
    # ========================================================

    image_blob_key = (
        models.CharField(
            max_length=1000,
            blank=True,
            default="",
        )
    )


    image_url = models.URLField(
        max_length=1500,
        blank=True,
        default="",
    )


    image_original_name = (
        models.CharField(
            max_length=500,
            blank=True,
            default="",
        )
    )


    image_content_type = (
        models.CharField(
            max_length=120,
            blank=True,
            default="",
        )
    )


    # ========================================================
    # DISPLAY
    # ========================================================

    is_popular = models.BooleanField(
        default=False,
    )


    is_available = models.BooleanField(
        default=True,
    )


    sort_order = (
        models.PositiveIntegerField(
            default=0,
        )
    )


    # ========================================================
    # TIMESTAMPS
    # ========================================================

    created_at = (
        models.DateTimeField(
            auto_now_add=True,
        )
    )


    updated_at = (
        models.DateTimeField(
            auto_now=True,
        )
    )


    class Meta:

        ordering = [
            "sort_order",
            "category",
            "name",
        ]


    def __str__(
        self,
    ):

        return (
            f"{self.restaurant.name} "
            f"- {self.name}"
        )


# ============================================================
# RESTAURANT BOOKING
# ============================================================

class RestaurantBooking(
    models.Model
):

    STATUS_CHOICES = [

        (
            "pending",
            "Pending",
        ),

        (
            "confirmed",
            "Confirmed",
        ),

        (
            "rejected",
            "Rejected",
        ),

        (
            "cancelled",
            "Cancelled",
        ),

        (
            "completed",
            "Completed",
        ),

    ]


    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT,
        related_name="bookings",
    )


    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name=(
            "restaurant_bookings"
        ),
    )


    # ========================================================
    # BOOKING DETAILS
    # ========================================================

    booking_date = (
        models.DateField()
    )


    booking_time = (
        models.TimeField()
    )


    guest_count = (
        models.PositiveIntegerField(
            default=2,
        )
    )


    special_request = models.TextField(
        blank=True,
        default="",
    )


    # ========================================================
    # FOOD INVITE
    # ========================================================

    food_invite_id = models.UUIDField(
        blank=True,
        null=True,
    )


    # ========================================================
    # STATUS
    # ========================================================

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        db_index=True,
    )


    # ========================================================
    # BOOKING REFERENCE
    # ========================================================

    booking_reference = (
        models.CharField(
            max_length=50,
            unique=True,
            blank=True,
        )
    )


    # ========================================================
    # TIMESTAMPS
    # ========================================================

    created_at = (
        models.DateTimeField(
            auto_now_add=True,
        )
    )


    updated_at = (
        models.DateTimeField(
            auto_now=True,
        )
    )


    class Meta:

        ordering = [
            "-created_at",
        ]


    def save(self, *args, **kwargs):
        if not self.booking_reference:
            self.booking_reference = (
                "FK-"
                + uuid.uuid4().hex[:10].upper()
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.booking_reference} "
            f"- {self.restaurant.name}"
        )
# ============================================================
# CUSTOMER PLACE SUBMISSION
#
# Restaurants / Cafes / Hotels suggested by FoodKindl members.
#
# These records DO NOT appear in the main Restaurant table
# until an admin approves them.
# ============================================================

class RestaurantSubmission(
    models.Model
):

    # ========================================================
    # STATUS
    # ========================================================

    STATUS_CHOICES = [

        (
            "pending",
            "Pending Review",
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


    # ========================================================
    # SUBMITTED BY
    # ========================================================

    submitted_by = models.ForeignKey(

        settings.AUTH_USER_MODEL,

        on_delete=models.SET_NULL,

        related_name=(
            "restaurant_submissions"
        ),

        blank=True,

        null=True,
    )


    # ========================================================
    # BASIC INFORMATION
    # ========================================================

    name = models.CharField(
        max_length=180,
    )


    restaurant_type = models.CharField(

        max_length=20,

        choices=
            Restaurant.RESTAURANT_TYPE_CHOICES,

        default="restaurant",
    )


    description = models.TextField(
        blank=True,
        default="",
    )


    cuisine = models.CharField(

        max_length=50,

        choices=
            Restaurant.CUISINE_CHOICES,

        blank=True,

        default="",
    )


    # ========================================================
    # CONTACT
    # ========================================================

    phone_number = models.CharField(
        max_length=30,
        blank=True,
        default="",
    )


    email = models.EmailField(
        blank=True,
        default="",
    )


    website = models.URLField(
        max_length=500,
        blank=True,
        default="",
    )


    # ========================================================
    # LOCATION
    # ========================================================

    address = models.TextField(
        blank=True,
        default="",
    )


    locality = models.CharField(
        max_length=180,
        blank=True,
        default="",
        db_index=True,
    )


    city = models.CharField(
        max_length=120,
        blank=True,
        default="",
        db_index=True,
    )


    pincode = models.CharField(
        max_length=12,
        blank=True,
        default="",
    )


    latitude = models.DecimalField(

        max_digits=9,

        decimal_places=6,

        blank=True,

        null=True,
    )


    longitude = models.DecimalField(

        max_digits=9,

        decimal_places=6,

        blank=True,

        null=True,
    )


    # ========================================================
    # OPTIONAL DETAILS
    # ========================================================

    price_range = models.CharField(

        max_length=20,

        choices=
            Restaurant.PRICE_RANGE_CHOICES,

        blank=True,

        default="",
    )


    average_cost_for_two = (
        models.PositiveIntegerField(
            blank=True,
            null=True,
        )
    )


    opening_time = models.TimeField(
        blank=True,
        null=True,
    )


    closing_time = models.TimeField(
        blank=True,
        null=True,
    )


    # ========================================================
    # FACILITIES
    # ========================================================

    has_parking = models.BooleanField(
        default=False,
    )


    has_wifi = models.BooleanField(
        default=False,
    )


    accepts_cards = models.BooleanField(
        default=True,
    )


    family_friendly = models.BooleanField(
        default=True,
    )


    outdoor_seating = models.BooleanField(
        default=False,
    )


    wheelchair_accessible = (
        models.BooleanField(
            default=False,
        )
    )


    serves_vegetarian = models.BooleanField(
        default=True,
    )


    serves_non_vegetarian = (
        models.BooleanField(
            default=True,
        )
    )


    # ========================================================
    # IMAGE
    #
    # Customer can provide one image.
    # Later this can be moved to Netlify Blob.
    # ========================================================

    image_url = models.URLField(

        max_length=1500,

        blank=True,

        default="",
    )


    image_blob_key = models.CharField(

        max_length=1000,

        blank=True,

        default="",
    )


    image_original_name = models.CharField(

        max_length=500,

        blank=True,

        default="",
    )


    image_content_type = models.CharField(

        max_length=120,

        blank=True,

        default="",
    )


    # ========================================================
    # ADMIN REVIEW
    # ========================================================

    status = models.CharField(

        max_length=20,

        choices=
            STATUS_CHOICES,

        default="pending",

        db_index=True,
    )


    admin_note = models.TextField(
        blank=True,
        default="",
    )


    reviewed_by = models.ForeignKey(

        settings.AUTH_USER_MODEL,

        on_delete=models.SET_NULL,

        related_name=(
            "restaurant_submission_reviews"
        ),

        blank=True,

        null=True,
    )


    reviewed_at = models.DateTimeField(
        blank=True,
        null=True,
    )


    # ========================================================
    # CREATED RESTAURANT
    #
    # Filled when admin approves.
    # ========================================================

    approved_restaurant = (
        models.ForeignKey(

            Restaurant,

            on_delete=models.SET_NULL,

            related_name=(
                "approved_submissions"
            ),

            blank=True,

            null=True,
        )
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
    # META
    # ========================================================

    class Meta:

        ordering = [
            "-created_at",
        ]


    def __str__(
        self,
    ):

        return (
            f"{self.name} "
            f"({self.get_status_display()})"
        )
        

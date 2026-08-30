from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.utils.html import format_html

from .models import (
    FoodInvite,
    FoodInviteParticipant,
    Restaurant,
    RestaurantImage,
    RestaurantMenuItem,
    RestaurantBooking,
    RestaurantSubmission,
)

from .netlify_blob import upload_image_to_netlify


# ============================================================
# COMMON IMAGE PREVIEW
# ============================================================


def image_preview(url):
    if not url:
        return "-"

    return format_html(
        """
        <a
            href="{}"
            target="_blank"
            rel="noopener noreferrer"
        >
            <img
                src="{}"
                style="
                    width: 160px;
                    height: 110px;
                    object-fit: cover;
                    border-radius: 10px;
                    border: 1px solid #ddd;
                "
            />
        </a>
        """,
        url,
        url,
    )


# ============================================================
# RESTAURANT ADMIN FORM
#
# Adds an upload control that is NOT a database field.
# Image is sent directly to Netlify Blob.
# ============================================================


class RestaurantAdminForm(forms.ModelForm):

    cover_photo_upload = forms.ImageField(
        required=False,
        label="Upload cover photo",
        help_text=(
            "Upload JPG, PNG or WebP. "
            "Maximum size: 10 MB."
        ),
    )

    class Meta:
        model = Restaurant
        fields = "__all__"

    def save(self, commit=True):
        instance = super().save(commit=False)

        uploaded_file = self.cleaned_data.get(
            "cover_photo_upload"
        )

        if uploaded_file:

            try:
                result = upload_image_to_netlify(
                    uploaded_file,
                    category="restaurants/covers",
                )

            except ValidationError:
                raise

            except Exception as exc:
                raise ValidationError(
                    f"Cover photo upload failed: {exc}"
                ) from exc

            instance.image_blob_key = result["key"]
            instance.image_url = result["url"]

            instance.image_original_name = result.get(
                "original_name",
                uploaded_file.name,
            )

            instance.image_content_type = result.get(
                "content_type",
                getattr(
                    uploaded_file,
                    "content_type",
                    "",
                ),
            )

        if commit:
            instance.save()

            if hasattr(self, "save_m2m"):
                self.save_m2m()

        return instance


# ============================================================
# RESTAURANT ADMIN
# ============================================================


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):

    form = RestaurantAdminForm

    list_display = (
        "name",
        "owner",
        "restaurant_type",
        "city",
        "cuisine",
        "is_foodkindl_partner",
        "accepts_foodkindl_booking",
        "is_active",
        "cover_thumbnail",
    )

    list_filter = (
        "restaurant_type",
        "is_foodkindl_partner",
        "accepts_foodkindl_booking",
        "is_active",
        "city",
    )

    search_fields = (
        "name",
        "owner__username",
        "owner__email",
        "city",
        "locality",
        "email",
        "phone_number",
    )

    autocomplete_fields = (
        "owner",
    )

    readonly_fields = (
        "cover_preview",
        "image_blob_key",
        "image_url",
        "image_original_name",
        "image_content_type",
        "created_at",
        "updated_at",
    )

    fieldsets = (

        (
            "Owner",
            {
                "fields": (
                    "owner",
                )
            },
        ),

        (
            "Basic information",
            {
                "fields": (
                    "name",
                    "restaurant_type",
                    "description",
                    "cuisine",
                )
            },
        ),

        (
            "Contact",
            {
                "fields": (
                    "phone_number",
                    "email",
                    "website",
                )
            },
        ),

        (
            "Location",
            {
                "fields": (
                    "address",
                    "locality",
                    "city",
                    "pincode",
                    "latitude",
                    "longitude",
                )
            },
        ),

        (
            "Restaurant details",
            {
                "fields": (
                    "rating",
                    "price_range",
                    "average_cost_for_two",
                    "opening_time",
                    "closing_time",
                    "seating_capacity",
                )
            },
        ),

        (
            "Facilities",
            {
                "fields": (
                    "has_parking",
                    "has_wifi",
                    "accepts_cards",
                    "family_friendly",
                    "outdoor_seating",
                    "wheelchair_accessible",
                    "serves_vegetarian",
                    "serves_non_vegetarian",
                )
            },
        ),

        (
            "Cover photo",
            {
                "fields": (
                    "cover_photo_upload",
                    "cover_preview",
                    "image_blob_key",
                    "image_url",
                    "image_original_name",
                    "image_content_type",
                )
            },
        ),

        (
            "FoodKindl",
            {
                "fields": (
                    "is_foodkindl_partner",
                    "accepts_foodkindl_booking",
                    "is_active",
                )
            },
        ),

        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    @admin.display(
        description="Cover"
    )
    def cover_thumbnail(self, obj):
        return image_preview(
            obj.image_url
        )

    @admin.display(
        description="Current cover photo"
    )
    def cover_preview(self, obj):
        if not obj or not obj.pk:
            return "-"

        return image_preview(
            obj.image_url
        )


# ============================================================
# RESTAURANT GALLERY IMAGE ADMIN FORM
# ============================================================


class RestaurantImageAdminForm(forms.ModelForm):

    image_upload = forms.ImageField(
        required=False,
        label="Upload image",
        help_text=(
            "Upload JPG, PNG or WebP. "
            "Maximum size: 10 MB."
        ),
    )

    class Meta:
        model = RestaurantImage
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()

        image_upload = cleaned_data.get(
            "image_upload"
        )

        # New gallery item MUST have an image.
        if not self.instance.pk and not image_upload:
            raise ValidationError(
                {
                    "image_upload":
                        "Please select an image."
                }
            )

        return cleaned_data

    def save(self, commit=True):

        instance = super().save(
            commit=False
        )

        uploaded_file = self.cleaned_data.get(
            "image_upload"
        )

        if uploaded_file:

            restaurant = (
                self.cleaned_data.get(
                    "restaurant"
                )
                or instance.restaurant
            )

            restaurant_id = (
                restaurant.pk
                if restaurant
                else "unknown"
            )

            try:

                result = upload_image_to_netlify(
                    uploaded_file,
                    category=(
                        f"restaurants/"
                        f"{restaurant_id}/gallery"
                    ),
                )

            except ValidationError:
                raise

            except Exception as exc:
                raise ValidationError(
                    f"Gallery image upload failed: {exc}"
                ) from exc

            instance.image_blob_key = (
                result["key"]
            )

            instance.image_url = (
                result["url"]
            )

            instance.image_original_name = (
                result.get(
                    "original_name",
                    uploaded_file.name,
                )
            )

            instance.image_content_type = (
                result.get(
                    "content_type",
                    getattr(
                        uploaded_file,
                        "content_type",
                        "",
                    ),
                )
            )

        if commit:
            instance.save()

            if hasattr(
                self,
                "save_m2m",
            ):
                self.save_m2m()

        return instance


# ============================================================
# RESTAURANT GALLERY ADMIN
# ============================================================


@admin.register(RestaurantImage)
class RestaurantImageAdmin(
    admin.ModelAdmin
):

    form = RestaurantImageAdminForm

    list_display = (
        "id",
        "restaurant",
        "thumbnail",
        "caption",
        "sort_order",
        "is_active",
        "created_at",
    )

    list_filter = (
        "is_active",
        "restaurant",
    )

    search_fields = (
        "restaurant__name",
        "caption",
        "image_original_name",
    )

    readonly_fields = (
        "preview",
        "image_blob_key",
        "image_url",
        "image_original_name",
        "image_content_type",
        "created_at",
        "updated_at",
    )

    fields = (
        "restaurant",
        "image_upload",
        "preview",
        "caption",
        "sort_order",
        "is_active",
        "image_blob_key",
        "image_url",
        "image_original_name",
        "image_content_type",
        "created_at",
        "updated_at",
    )

    @admin.display(
        description="Image"
    )
    def thumbnail(self, obj):
        return image_preview(
            obj.image_url
        )

    @admin.display(
        description="Current image"
    )
    def preview(self, obj):

        if not obj or not obj.pk:
            return "-"

        return image_preview(
            obj.image_url
        )


# ============================================================
# MENU ITEM ADMIN FORM
# ============================================================


class RestaurantMenuItemAdminForm(
    forms.ModelForm
):

    image_upload = forms.ImageField(
        required=False,
        label="Upload dish photo",
        help_text=(
            "Upload JPG, PNG or WebP. "
            "Maximum size: 10 MB."
        ),
    )

    class Meta:
        model = RestaurantMenuItem
        fields = "__all__"

    def save(self, commit=True):

        instance = super().save(
            commit=False
        )

        uploaded_file = self.cleaned_data.get(
            "image_upload"
        )

        if uploaded_file:

            restaurant = (
                self.cleaned_data.get(
                    "restaurant"
                )
                or instance.restaurant
            )

            restaurant_id = (
                restaurant.pk
                if restaurant
                else "unknown"
            )

            try:

                result = upload_image_to_netlify(
                    uploaded_file,
                    category=(
                        f"restaurants/"
                        f"{restaurant_id}/menu"
                    ),
                )

            except ValidationError:
                raise

            except Exception as exc:
                raise ValidationError(
                    f"Menu image upload failed: {exc}"
                ) from exc

            instance.image_blob_key = (
                result["key"]
            )

            instance.image_url = (
                result["url"]
            )

            instance.image_original_name = (
                result.get(
                    "original_name",
                    uploaded_file.name,
                )
            )

            instance.image_content_type = (
                result.get(
                    "content_type",
                    getattr(
                        uploaded_file,
                        "content_type",
                        "",
                    ),
                )
            )

        if commit:
            instance.save()

            if hasattr(
                self,
                "save_m2m",
            ):
                self.save_m2m()

        return instance


# ============================================================
# MENU ITEM ADMIN
# ============================================================


@admin.register(RestaurantMenuItem)
class RestaurantMenuItemAdmin(
    admin.ModelAdmin
):

    form = RestaurantMenuItemAdminForm

    list_display = (
        "name",
        "restaurant",
        "category",
        "food_type",
        "price",
        "is_available",
        "is_popular",
        "thumbnail",
    )

    list_filter = (
        "category",
        "food_type",
        "is_available",
        "is_popular",
        "restaurant",
    )

    search_fields = (
        "name",
        "restaurant__name",
        "description",
    )

    readonly_fields = (
        "preview",
        "image_blob_key",
        "image_url",
        "image_original_name",
        "image_content_type",
        "created_at",
        "updated_at",
    )

    fieldsets = (

        (
            "Dish",
            {
                "fields": (
                    "restaurant",
                    "name",
                    "description",
                    "category",
                    "food_type",
                    "price",
                )
            },
        ),

        (
            "Photo",
            {
                "fields": (
                    "image_upload",
                    "preview",
                    "image_blob_key",
                    "image_url",
                    "image_original_name",
                    "image_content_type",
                )
            },
        ),

        (
            "Display",
            {
                "fields": (
                    "is_popular",
                    "is_available",
                    "sort_order",
                )
            },
        ),

        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    @admin.display(
        description="Image"
    )
    def thumbnail(self, obj):

        return image_preview(
            obj.image_url
        )

    @admin.display(
        description="Current dish photo"
    )
    def preview(self, obj):

        if not obj or not obj.pk:
            return "-"

        return image_preview(
            obj.image_url
        )


# ============================================================
# RESTAURANT BOOKING
# ============================================================


@admin.register(RestaurantBooking)
class RestaurantBookingAdmin(
    admin.ModelAdmin
):

    list_display = (
        "booking_reference",
        "restaurant",
        "user",
        "booking_date",
        "booking_time",
        "guest_count",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "booking_date",
        "restaurant",
    )

    search_fields = (
        "booking_reference",
        "restaurant__name",
        "user__username",
        "user__email",
    )


# ============================================================
# RESTAURANT SUBMISSION
# ============================================================


@admin.register(RestaurantSubmission)
class RestaurantSubmissionAdmin(
    admin.ModelAdmin
):

    list_display = (
        "name",
        "submitted_by",
        "restaurant_type",
        "city",
        "status",
        "approved_restaurant",
        "created_at",
    )

    list_filter = (
        "status",
        "restaurant_type",
        "city",
    )

    search_fields = (
        "name",
        "submitted_by__username",
        "submitted_by__email",
        "city",
        "locality",
    )


# ============================================================
# FOOD INVITE
# ============================================================


@admin.register(FoodInvite)
class FoodInviteAdmin(
    admin.ModelAdmin
):

    list_display = (
        "title",
        "creator_user_id",
        "invite_type",
        "start_at",
        "status",
    )

    list_filter = (
        "invite_type",
        "status",
    )

    search_fields = (
        "title",
        "description",
    )


# ============================================================
# FOOD INVITE PARTICIPANT
# ============================================================


@admin.register(FoodInviteParticipant)
class FoodInviteParticipantAdmin(
    admin.ModelAdmin
):

    list_display = (
        "invite",
        "user_id",
        "status",
        "responded_at",
    )

    list_filter = (
        "status",
    )
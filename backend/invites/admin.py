from django import forms
from django.contrib import admin
from django.contrib import messages
from django.core.exceptions import ValidationError
from django.utils.html import format_html

from .geocoding import (
    geocode_restaurant,
)

from .models import (
    Restaurant,
    RestaurantBooking,
    RestaurantImage,
    RestaurantMenuItem,
)

from .netlify_blob import (
    upload_image_to_netlify,
)


# ============================================================
# RESTAURANT ADMIN FORM
# ============================================================

class RestaurantAdminForm(
    forms.ModelForm
):

    main_photo_upload = forms.ImageField(
        required=False,
        label="Upload main restaurant photo",
        help_text=(
            "Choose a JPG, PNG or WebP image. "
            "The image will be uploaded to Netlify Blob."
        ),
    )

    class Meta:
        model = Restaurant
        fields = "__all__"


    def save(
        self,
        commit=True,
    ):

        instance = (
            super()
            .save(
                commit=False
            )
        )

        uploaded_file = (
            self.cleaned_data.get(
                "main_photo_upload"
            )
        )

        if uploaded_file:

            upload_result = (
                upload_image_to_netlify(
                    uploaded_file=
                        uploaded_file,

                    category=
                        "restaurants/main",
                )
            )

            instance.image_blob_key = (
                upload_result.get(
                    "key",
                    "",
                )
            )

            instance.image_url = (
                upload_result.get(
                    "url",
                    "",
                )
            )

            instance.image_original_name = (
                uploaded_file.name
            )

            instance.image_content_type = (
                getattr(
                    uploaded_file,
                    "content_type",
                    "",
                )
                or ""
            )

        if commit:

            instance.save()

            self.save_m2m()

        return instance


# ============================================================
# RESTAURANT GALLERY IMAGE INLINE FORM
# ============================================================

class RestaurantImageInlineForm(
    forms.ModelForm
):

    photo_upload = forms.ImageField(
        required=False,
        label="Upload restaurant photo",
        help_text=(
            "Choose a restaurant image. "
            "It will be uploaded to Netlify Blob."
        ),
    )

    class Meta:

        model = RestaurantImage

        fields = (
            "photo_upload",
            "caption",
            "sort_order",
            "is_active",
        )


    def save(
        self,
        commit=True,
    ):

        instance = (
            super()
            .save(
                commit=False
            )
        )

        uploaded_file = (
            self.cleaned_data.get(
                "photo_upload"
            )
        )

        if uploaded_file:

            upload_result = (
                upload_image_to_netlify(
                    uploaded_file=
                        uploaded_file,

                    category=
                        "restaurants/gallery",
                )
            )

            instance.image_blob_key = (
                upload_result.get(
                    "key",
                    "",
                )
            )

            instance.image_url = (
                upload_result.get(
                    "url",
                    "",
                )
            )

            instance.image_original_name = (
                uploaded_file.name
            )

            instance.image_content_type = (
                getattr(
                    uploaded_file,
                    "content_type",
                    "",
                )
                or ""
            )

        if commit:
            instance.save()

        return instance


# ============================================================
# RESTAURANT IMAGE INLINE
# ============================================================

class RestaurantImageInline(
    admin.TabularInline
):

    model = RestaurantImage

    form = RestaurantImageInlineForm

    extra = 2

    fields = (
        "photo_upload",
        "caption",
        "sort_order",
        "is_active",
    )

    ordering = (
        "sort_order",
        "id",
    )


# ============================================================
# MENU ITEM INLINE FORM
# ============================================================

class RestaurantMenuItemInlineForm(
    forms.ModelForm
):

    menu_photo_upload = forms.ImageField(
        required=False,
        label="Upload dish photo",
        help_text=(
            "Choose a dish image. "
            "It will be uploaded to Netlify Blob."
        ),
    )

    class Meta:

        model = RestaurantMenuItem

        fields = (
            "name",
            "description",
            "category",
            "food_type",
            "price",
            "menu_photo_upload",
            "is_popular",
            "is_available",
            "sort_order",
        )


    def save(
        self,
        commit=True,
    ):

        instance = (
            super()
            .save(
                commit=False
            )
        )

        uploaded_file = (
            self.cleaned_data.get(
                "menu_photo_upload"
            )
        )

        if uploaded_file:

            upload_result = (
                upload_image_to_netlify(
                    uploaded_file=
                        uploaded_file,

                    category=
                        "restaurants/menu",
                )
            )

            instance.image_blob_key = (
                upload_result.get(
                    "key",
                    "",
                )
            )

            instance.image_url = (
                upload_result.get(
                    "url",
                    "",
                )
            )

            instance.image_original_name = (
                uploaded_file.name
            )

            instance.image_content_type = (
                getattr(
                    uploaded_file,
                    "content_type",
                    "",
                )
                or ""
            )

        if commit:
            instance.save()

        return instance


# ============================================================
# MENU INLINE
# ============================================================

class RestaurantMenuItemInline(
    admin.StackedInline
):

    model = RestaurantMenuItem

    form = RestaurantMenuItemInlineForm

    extra = 1

    fields = (
        "name",
        "description",
        "category",
        "food_type",
        "price",
        "menu_photo_upload",
        "is_popular",
        "is_available",
        "sort_order",
    )

    ordering = (
        "sort_order",
        "category",
        "name",
    )


# ============================================================
# RESTAURANT ADMIN
# ============================================================

@admin.register(Restaurant)
class RestaurantAdmin(
    admin.ModelAdmin
):

    form = RestaurantAdminForm


    # ========================================================
    # ACTIONS
    # ========================================================

    actions = (
        "refresh_coordinates",
    )


    # ========================================================
    # LIST
    # ========================================================

    list_display = (
        "id",
        "name",
        "restaurant_type",
        "cuisine",
        "locality",
        "city",
        "latitude",
        "longitude",
        "rating",
        "average_cost_for_two",
        "is_foodkindl_partner",
        "accepts_foodkindl_booking",
        "is_active",
    )


    list_filter = (
        "restaurant_type",
        "price_range",
        "city",
        "is_foodkindl_partner",
        "accepts_foodkindl_booking",
        "is_active",
    )


    search_fields = (
        "name",
        "cuisine",
        "phone_number",
        "email",
        "address",
        "locality",
        "city",
        "pincode",
    )


    # ========================================================
    # READ ONLY
    # ========================================================

    readonly_fields = (
        "location_status",
        "latitude",
        "longitude",

        "main_photo_preview",

        "image_blob_key",
        "image_url",
        "image_original_name",
        "image_content_type",

        "created_at",
        "updated_at",
    )


    # ========================================================
    # INLINES
    # ========================================================

    inlines = (
        RestaurantImageInline,
        RestaurantMenuItemInline,
    )


    # ========================================================
    # LOCATION STATUS
    # ========================================================

    def location_status(
        self,
        obj,
    ):

        if (
            obj
            and obj.latitude is not None
            and obj.longitude is not None
        ):

            return format_html(
                (
                    '<span style="'
                    'color:#198754;'
                    'font-weight:600;">'
                    '✓ Coordinates found'
                    '</span>'
                )
            )

        return format_html(
            (
                '<span style="'
                'color:#b45309;'
                'font-weight:600;">'
                'Coordinates not available'
                '</span>'
            )
        )


    location_status.short_description = (
        "Location status"
    )


    # ========================================================
    # MAIN PHOTO PREVIEW
    # ========================================================

    def main_photo_preview(
        self,
        obj,
    ):

        if (
            not obj
            or not obj.image_url
        ):

            return (
                "No restaurant photo uploaded."
            )

        return format_html(
            (
                '<a href="{}" '
                'target="_blank" '
                'rel="noopener noreferrer">'
                '<img '
                'src="{}" '
                'style="'
                'width:260px;'
                'height:170px;'
                'object-fit:cover;'
                'border-radius:12px;'
                'border:1px solid #ddd;'
                '" />'
                '</a>'
            ),
            obj.image_url,
            obj.image_url,
        )


    main_photo_preview.short_description = (
        "Current restaurant photo"
    )


    # ========================================================
    # SAVE + AUTO GEOCODE
    # ========================================================

    def save_model(
        self,
        request,
        obj,
        form,
        change,
    ):

        # ----------------------------------------------------
        # Save all normal restaurant fields first.
        # ----------------------------------------------------

        super().save_model(
            request,
            obj,
            form,
            change,
        )


        location_fields = {
            "name",
            "address",
            "locality",
            "city",
            "pincode",
        }


        changed_fields = set(
            form.changed_data
        )


        location_changed = bool(
            location_fields.intersection(
                changed_fields
            )
        )


        coordinates_missing = (
            obj.latitude is None
            or obj.longitude is None
        )


        if not (
            location_changed
            or coordinates_missing
        ):

            return


        # ----------------------------------------------------
        # Run FoodKindl geocoder.
        # ----------------------------------------------------

        try:

            result = (
                geocode_restaurant(
                    obj
                )
            )


            latitude = (
                result.get(
                    "latitude"
                )
            )


            longitude = (
                result.get(
                    "longitude"
                )
            )


            if (
                latitude is None
                or longitude is None
            ):

                raise ValidationError(
                    (
                        "Geocoder did not return "
                        "latitude and longitude."
                    )
                )


            # ------------------------------------------------
            # Assign coordinates
            # ------------------------------------------------

            obj.latitude = latitude

            obj.longitude = longitude


            # ------------------------------------------------
            # IMPORTANT:
            # Explicitly save these two columns.
            # ------------------------------------------------

            obj.save(
                update_fields=[
                    "latitude",
                    "longitude",
                ]
            )


            # ------------------------------------------------
            # Reload from DB to prove they were persisted.
            # ------------------------------------------------

            obj.refresh_from_db(
                fields=[
                    "latitude",
                    "longitude",
                ]
            )


            print(
                ""
            )

            print(
                "========================================"
            )

            print(
                "FOODKINDL LOCATION SAVED"
            )

            print(
                "Restaurant:",
                obj.name,
            )

            print(
                "Matched:",
                result.get(
                    "display_name",
                    "",
                ),
            )

            print(
                "Query:",
                result.get(
                    "query",
                    "",
                ),
            )

            print(
                "Latitude:",
                obj.latitude,
            )

            print(
                "Longitude:",
                obj.longitude,
            )

            print(
                "========================================"
            )

            print(
                ""
            )


            self.message_user(
                request,
                (
                    "Restaurant saved. "
                    "Location coordinates found: "
                    f"{obj.latitude}, "
                    f"{obj.longitude}"
                ),
                level=
                    messages.SUCCESS,
            )


        except ValidationError as exc:

            print(
                ""
            )

            print(
                "========================================"
            )

            print(
                "FOODKINDL LOCATION FAILED"
            )

            print(
                "Restaurant:",
                obj.name,
            )

            print(
                "Address:",
                obj.address,
            )

            print(
                "Locality:",
                obj.locality,
            )

            print(
                "City:",
                obj.city,
            )

            print(
                "Pincode:",
                obj.pincode,
            )

            print(
                "ERROR:",
                exc,
            )

            print(
                "========================================"
            )

            print(
                ""
            )


            self.message_user(
                request,
                (
                    "Restaurant saved, but coordinates "
                    f"could not be generated: {exc}"
                ),
                level=
                    messages.ERROR,
            )


    # ========================================================
    # MANUAL REFRESH COORDINATES
    # ========================================================

    @admin.action(
        description=
            "Find / refresh restaurant coordinates"
    )
    def refresh_coordinates(
        self,
        request,
        queryset,
    ):

        success_count = 0

        failure_count = 0


        for restaurant in queryset:

            try:

                result = (
                    geocode_restaurant(
                        restaurant
                    )
                )


                latitude = (
                    result.get(
                        "latitude"
                    )
                )


                longitude = (
                    result.get(
                        "longitude"
                    )
                )


                if (
                    latitude is None
                    or longitude is None
                ):

                    failure_count += 1

                    continue


                restaurant.latitude = (
                    latitude
                )

                restaurant.longitude = (
                    longitude
                )


                restaurant.save(
                    update_fields=[
                        "latitude",
                        "longitude",
                    ]
                )


                restaurant.refresh_from_db(
                    fields=[
                        "latitude",
                        "longitude",
                    ]
                )


                print(
                    (
                        "Restaurant "
                        f"{restaurant.id}: "
                        f"{restaurant.latitude}, "
                        f"{restaurant.longitude}"
                    )
                )


                success_count += 1


            except ValidationError as exc:

                print(
                    (
                        "Coordinate lookup failed "
                        f"for restaurant "
                        f"{restaurant.id}: {exc}"
                    )
                )

                failure_count += 1


        if success_count:

            self.message_user(
                request,
                (
                    "Coordinates updated for "
                    f"{success_count} restaurant(s)."
                ),
                level=
                    messages.SUCCESS,
            )


        if failure_count:

            self.message_user(
                request,
                (
                    "Coordinates could not be found for "
                    f"{failure_count} restaurant(s)."
                ),
                level=
                    messages.WARNING,
            )


    # ========================================================
    # FIELDSETS
    # ========================================================

    fieldsets = (

        (
            "Restaurant Information",
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
            "Contact Information",
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
                "description": (
                    "Enter the restaurant address. "
                    "FoodKindl automatically finds "
                    "latitude and longitude when saved."
                ),

                "fields": (
                    "address",
                    "locality",
                    "city",
                    "pincode",

                    "location_status",

                    "latitude",
                    "longitude",
                )
            },
        ),


        (
            "Restaurant Details",
            {
                "fields": (
                    "rating",
                    "price_range",
                    "average_cost_for_two",
                    "seating_capacity",
                )
            },
        ),


        (
            "Opening Hours",
            {
                "fields": (
                    "opening_time",
                    "closing_time",
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
            "Main Restaurant Photo",
            {
                "description": (
                    "Choose a photo directly from "
                    "the admin computer. "
                    "FoodKindl uploads it to Netlify Blob."
                ),

                "fields": (
                    "main_photo_upload",
                    "main_photo_preview",
                )
            },
        ),


        (
            "Photo Storage Information",
            {
                "classes": (
                    "collapse",
                ),

                "fields": (
                    "image_blob_key",
                    "image_url",
                    "image_original_name",
                    "image_content_type",
                )
            },
        ),


        (
            "FoodKindl Partnership",
            {
                "description": (
                    "A restaurant appears in recommendations "
                    "when it is active, is a FoodKindl partner "
                    "and accepts FoodKindl bookings."
                ),

                "fields": (
                    "is_foodkindl_partner",
                    "accepts_foodkindl_booking",
                )
            },
        ),


        (
            "Status",
            {
                "fields": (
                    "is_active",
                )
            },
        ),


        (
            "System Information",
            {
                "classes": (
                    "collapse",
                ),

                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )


# ============================================================
# RESTAURANT IMAGE ADMIN
# ============================================================

@admin.register(RestaurantImage)
class RestaurantImageAdmin(
    admin.ModelAdmin
):

    list_display = (
        "id",
        "restaurant",
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
        "image_blob_key",
        "image_url",
        "image_original_name",
        "image_content_type",
        "created_at",
        "updated_at",
    )


    ordering = (
        "restaurant",
        "sort_order",
        "id",
    )


# ============================================================
# RESTAURANT MENU ITEM ADMIN
# ============================================================

@admin.register(RestaurantMenuItem)
class RestaurantMenuItemAdmin(
    admin.ModelAdmin
):

    list_display = (
        "id",
        "name",
        "restaurant",
        "category",
        "food_type",
        "price",
        "is_popular",
        "is_available",
    )


    list_filter = (
        "category",
        "food_type",
        "is_popular",
        "is_available",
        "restaurant",
    )


    search_fields = (
        "name",
        "description",
        "restaurant__name",
    )


    readonly_fields = (
        "image_blob_key",
        "image_url",
        "image_original_name",
        "image_content_type",
        "created_at",
        "updated_at",
    )


    ordering = (
        "restaurant",
        "sort_order",
        "category",
        "name",
    )


# ============================================================
# RESTAURANT BOOKING ADMIN
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
        "user__email",
        "user__first_name",
        "user__last_name",
    )


    readonly_fields = (
        "booking_reference",
        "created_at",
        "updated_at",
    )


    fieldsets = (

        (
            "Booking Details",
            {
                "fields": (
                    "booking_reference",
                    "restaurant",
                    "user",
                    "booking_date",
                    "booking_time",
                    "guest_count",
                    "special_request",
                    "food_invite_id",
                )
            },
        ),


        (
            "Booking Status",
            {
                "fields": (
                    "status",
                )
            },
        ),


        (
            "System",
            {
                "classes": (
                    "collapse",
                ),

                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )
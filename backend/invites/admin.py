from django import forms
from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.html import format_html
from django.template.response import TemplateResponse

from import_export.admin import ImportExportModelAdmin

from .geocoding import geocode_restaurant
from .models import (
    Restaurant,
    RestaurantBooking,
    RestaurantImage,
    RestaurantMenuItem,
    RestaurantSubmission,
)
from .netlify_blob import upload_image_to_netlify
from .resources import RestaurantResource


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
    ImportExportModelAdmin
):

    resource_classes = [
        RestaurantResource,
    ]

    form = RestaurantAdminForm


    # ========================================================
    # ACTIONS
    # ========================================================

    actions = (
        "refresh_coordinates",
        "delete_all_restaurants",
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
    # DELETE ALL RESTAURANTS
    #
    # Deletes:
    # 1. Restaurant bookings
    # 2. Restaurant gallery images
    # 3. Restaurant menu items
    # 4. Restaurant records
    #
    # RestaurantBooking uses on_delete=PROTECT, therefore
    # bookings MUST be removed before Restaurants.
    #
    # RestaurantSubmission history is intentionally retained.
    # If approved_restaurant uses SET_NULL, Django will clear
    # the link automatically when the Restaurant is deleted.
    # ========================================================

    @admin.action(
        description=
            "⚠ Delete ALL restaurant records"
    )
    def delete_all_restaurants(
        self,
        request,
        queryset,
    ):

        # ====================================================
        # STEP 2 — CONFIRMED DELETE
        # ====================================================

        if (
            request.POST.get(
                "confirm_delete_all"
            )
            ==
            "yes"
        ):

            try:

                with transaction.atomic():

                    restaurant_count = (
                        Restaurant.objects.count()
                    )

                    booking_count = (
                        RestaurantBooking.objects.count()
                    )

                    image_count = (
                        RestaurantImage.objects.count()
                    )

                    menu_count = (
                        RestaurantMenuItem.objects.count()
                    )


                    # =========================================
                    # IMPORTANT:
                    # RestaurantBooking has PROTECT.
                    # Delete bookings first.
                    # =========================================

                    RestaurantBooking.objects.all().delete()


                    # =========================================
                    # Delete child records explicitly.
                    # These may already be CASCADE, but doing
                    # this first makes the wipe predictable.
                    # =========================================

                    RestaurantImage.objects.all().delete()

                    RestaurantMenuItem.objects.all().delete()


                    # =========================================
                    # Finally delete all Restaurants.
                    # =========================================

                    Restaurant.objects.all().delete()


                self.message_user(
                    request,
                    (
                        f"Deleted {restaurant_count} restaurant(s), "
                        f"{booking_count} booking(s), "
                        f"{image_count} image(s), and "
                        f"{menu_count} menu item(s)."
                    ),
                    level=
                        messages.SUCCESS,
                )

            except Exception as exc:

                self.message_user(
                    request,
                    (
                        "Delete failed: "
                        f"{exc}"
                    ),
                    level=
                        messages.ERROR,
                )

            return None


        # ====================================================
        # STEP 1 — CONFIRMATION PAGE
        # ====================================================

        context = {

            **self.admin_site.each_context(
                request
            ),

            "title":
                "Delete ALL Restaurant Data?",

            "restaurant_count":
                Restaurant.objects.count(),

            "booking_count":
                RestaurantBooking.objects.count(),

            "image_count":
                RestaurantImage.objects.count(),

            "menu_count":
                RestaurantMenuItem.objects.count(),

            "opts":
                self.model._meta,

            "action_name":
                "delete_all_restaurants",

            "queryset":
                queryset,
        }


        return TemplateResponse(
            request,
            (
                "admin/"
                "restaurants_delete_all_confirmation.html"
            ),
            context,
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

# ============================================================
# RESTAURANT SUBMISSION ADMIN
# ============================================================

@admin.register(RestaurantSubmission)
class RestaurantSubmissionAdmin(
    admin.ModelAdmin
):

    list_display = (
        "id",
        "name",
        "restaurant_type",
        "city",
        "locality",
        "status",
        "submitted_by",
        "approved_restaurant",
        "created_at",
    )

    list_filter = (
        "status",
        "restaurant_type",
        "city",
        "created_at",
    )

    search_fields = (
        "name",
        "city",
        "locality",
        "address",
        "phone_number",
        "email",
        "submitted_by__email",
    )

    readonly_fields = (
        "submitted_by",
        "created_at",
        "updated_at",
        "reviewed_at",
        "reviewed_by",
        "approved_restaurant",
    )

    actions = (
        "approve_places",
        "reject_places",
    )

    fieldsets = (
        (
            "Submitted Place",
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
            "Restaurant Details",
            {
                "fields": (
                    "price_range",
                    "average_cost_for_two",
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
            "Image",
            {
                "fields": (
                    "image_url",
                    "image_blob_key",
                    "image_original_name",
                    "image_content_type",
                )
            },
        ),
        (
            "Admin Review",
            {
                "fields": (
                    "status",
                    "admin_note",
                    "approved_restaurant",
                    "reviewed_by",
                    "reviewed_at",
                )
            },
        ),
        (
            "Submission Information",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "submitted_by",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )


    # ========================================================
    # INTERNAL APPROVAL HELPER
    # ========================================================

    def _approve_submission(
        self,
        request,
        submission,
    ):

        # Already linked.
        if (
            submission.approved_restaurant_id
            is not None
        ):

            if submission.status != "approved":
                submission.status = "approved"
                submission.reviewed_by = request.user
                submission.reviewed_at = (
                    submission.reviewed_at
                    or timezone.now()
                )

                submission.save(
                    update_fields=(
                        "status",
                        "reviewed_by",
                        "reviewed_at",
                        "updated_at",
                    )
                )

            return (
                submission.approved_restaurant,
                False,
            )


        with transaction.atomic():

            locked_submission = (
                RestaurantSubmission.objects
                .select_for_update()
                .get(
                    pk=submission.pk
                )
            )


            if (
                locked_submission
                .approved_restaurant_id
                is not None
            ):

                locked_submission.status = (
                    "approved"
                )

                locked_submission.reviewed_by = (
                    request.user
                )

                locked_submission.reviewed_at = (
                    locked_submission.reviewed_at
                    or timezone.now()
                )

                locked_submission.save(
                    update_fields=(
                        "status",
                        "reviewed_by",
                        "reviewed_at",
                        "updated_at",
                    )
                )

                submission.refresh_from_db()

                return (
                    locked_submission
                    .approved_restaurant,
                    False,
                )


            # Prevent duplicates.
            existing = (
                Restaurant.objects
                .filter(
                    name__iexact=
                        locked_submission.name,

                    city__iexact=
                        locked_submission.city,

                    locality__iexact=
                        locked_submission.locality,
                )
                .first()
            )


            created = False


            if existing:

                restaurant = existing

            else:

                restaurant = (
                    Restaurant.objects.create(

                        name=
                            locked_submission.name,

                        restaurant_type=
                            locked_submission
                            .restaurant_type,

                        description=
                            locked_submission.description,

                        cuisine=
                            locked_submission.cuisine,

                        phone_number=
                            locked_submission
                            .phone_number,

                        email=
                            locked_submission.email,

                        website=
                            locked_submission.website,

                        address=
                            locked_submission.address,

                        locality=
                            locked_submission.locality,

                        city=
                            locked_submission.city,

                        pincode=
                            locked_submission.pincode,

                        latitude=
                            locked_submission.latitude,

                        longitude=
                            locked_submission.longitude,

                        price_range=
                            locked_submission.price_range,

                        average_cost_for_two=
                            locked_submission
                            .average_cost_for_two,

                        opening_time=
                            locked_submission.opening_time,

                        closing_time=
                            locked_submission.closing_time,

                        has_parking=
                            locked_submission.has_parking,

                        has_wifi=
                            locked_submission.has_wifi,

                        accepts_cards=
                            locked_submission.accepts_cards,

                        family_friendly=
                            locked_submission
                            .family_friendly,

                        outdoor_seating=
                            locked_submission
                            .outdoor_seating,

                        wheelchair_accessible=
                            locked_submission
                            .wheelchair_accessible,

                        serves_vegetarian=
                            locked_submission
                            .serves_vegetarian,

                        serves_non_vegetarian=
                            locked_submission
                            .serves_non_vegetarian,

                        image_blob_key=
                            locked_submission
                            .image_blob_key,

                        image_url=
                            locked_submission.image_url,

                        image_original_name=
                            locked_submission
                            .image_original_name,

                        image_content_type=
                            locked_submission
                            .image_content_type,

                        # Approved customer-submitted place is active,
                        # but is not automatically an official partner.
                        is_foodkindl_partner=
                            False,

                        accepts_foodkindl_booking=
                            False,

                        is_active=
                            True,
                    )
                )

                created = True


            locked_submission.status = (
                "approved"
            )

            locked_submission.approved_restaurant = (
                restaurant
            )

            locked_submission.reviewed_by = (
                request.user
            )

            locked_submission.reviewed_at = (
                timezone.now()
            )

            locked_submission.save(
                update_fields=(
                    "status",
                    "approved_restaurant",
                    "reviewed_by",
                    "reviewed_at",
                    "updated_at",
                )
            )

            submission.refresh_from_db()

            return (
                restaurant,
                created,
            )


    # ========================================================
    # SAVE FROM DETAIL PAGE
    #
    # If admin changes status to "approved" and clicks Save,
    # create/link Restaurant automatically.
    # ========================================================

    def save_model(
        self,
        request,
        obj,
        form,
        change,
    ):

        requested_status = (
            form.cleaned_data.get(
                "status"
            )
            if hasattr(
                form,
                "cleaned_data"
            )
            else obj.status
        )

        super().save_model(
            request,
            obj,
            form,
            change,
        )


        if requested_status == "approved":

            restaurant, created = (
                self._approve_submission(
                    request,
                    obj,
                )
            )

            if created:

                self.message_user(
                    request,
                    (
                        f'"{obj.name}" approved and '
                        f'created in Restaurants '
                        f'(Restaurant ID {restaurant.id}).'
                    ),
                    level=
                        messages.SUCCESS,
                )

            else:

                self.message_user(
                    request,
                    (
                        f'"{obj.name}" approved and '
                        f'linked to existing Restaurant '
                        f'ID {restaurant.id}.'
                    ),
                    level=
                        messages.SUCCESS,
                )


        elif requested_status == "rejected":

            obj.reviewed_by = (
                request.user
            )

            obj.reviewed_at = (
                timezone.now()
            )

            obj.save(
                update_fields=(
                    "reviewed_by",
                    "reviewed_at",
                    "updated_at",
                )
            )


    # ========================================================
    # BULK APPROVE
    # ========================================================

    @admin.action(
        description=
            "Approve selected places and add to Restaurants"
    )
    def approve_places(
        self,
        request,
        queryset,
    ):

        created_count = 0
        linked_count = 0
        failed_count = 0


        for submission in queryset:

            try:

                restaurant, created = (
                    self._approve_submission(
                        request,
                        submission,
                    )
                )

                if created:
                    created_count += 1
                else:
                    linked_count += 1

            except Exception as exc:

                failed_count += 1

                self.message_user(
                    request,
                    (
                        f'Could not approve '
                        f'"{submission.name}": {exc}'
                    ),
                    level=
                        messages.ERROR,
                )


        if created_count:

            self.message_user(
                request,
                (
                    f"{created_count} new place(s) "
                    "created in Restaurants."
                ),
                level=
                    messages.SUCCESS,
            )


        if linked_count:

            self.message_user(
                request,
                (
                    f"{linked_count} submission(s) "
                    "linked to existing Restaurant records."
                ),
                level=
                    messages.INFO,
            )


        if failed_count:

            self.message_user(
                request,
                (
                    f"{failed_count} submission(s) "
                    "could not be approved."
                ),
                level=
                    messages.ERROR,
            )


    # ========================================================
    # BULK REJECT
    # ========================================================

    @admin.action(
        description=
            "Reject selected places"
    )
    def reject_places(
        self,
        request,
        queryset,
    ):

        rejected_count = 0


        for submission in queryset:

            if (
                submission.status ==
                "approved"
            ):

                continue


            submission.status = (
                "rejected"
            )

            submission.reviewed_by = (
                request.user
            )

            submission.reviewed_at = (
                timezone.now()
            )

            submission.save(
                update_fields=(
                    "status",
                    "reviewed_by",
                    "reviewed_at",
                    "updated_at",
                )
            )

            rejected_count += 1


        self.message_user(
            request,
            (
                f"{rejected_count} "
                "submission(s) rejected."
            ),
            level=
                messages.SUCCESS,
        )

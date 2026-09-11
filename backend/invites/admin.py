"""
FoodKindl invites/admin.py

Restaurant and related models are registered here because the models
belong to the invites app. The restaurant_discovery app does not need
to register these models again.
"""

import csv

from datetime import datetime

from decimal import (
    Decimal,
    InvalidOperation,
)

from django import forms

from django.contrib import (
    admin,
    messages,
)

from django.contrib.auth import (
    get_user_model,
)

from django.core.exceptions import (
    ValidationError,
)

from django.db import (
    transaction,
)

from django.http import (
    HttpResponseRedirect,
)

from django.shortcuts import (
    render,
)

from django.urls import (
    path,
    reverse,
)


from .geocoding import (
    geocode_restaurant,
)


from .models import (
    FoodInvite,
    FoodInviteParticipant,
    Restaurant,
    RestaurantBooking,
    RestaurantImage,
    RestaurantMenuItem,
    RestaurantSubmission,
)


# ============================================================
# CSV IMPORT FORM
# ============================================================

class RestaurantCSVImportForm(
    forms.Form
):

    csv_file = forms.FileField(
        label="CSV file",
        help_text=(
            "Upload a UTF-8 encoded CSV "
            "containing restaurant records."
        ),
    )


    update_existing = (
        forms.BooleanField(
            required=False,
            initial=True,
            label=(
                "Update existing restaurants"
            ),
            help_text=(
                "Existing restaurants are matched "
                "using Name + Locality + City."
            ),
        )
    )


    geocode_missing_coordinates = (
        forms.BooleanField(
            required=False,
            initial=True,
            label=(
                "Automatically geocode "
                "missing coordinates"
            ),
            help_text=(
                "FoodKindl will use "
                "OpenRouteService to find "
                "latitude and longitude."
            ),
        )
    )


# ============================================================
# CONSTANTS
# ============================================================

TRUE_VALUES = {
    "true",
    "1",
    "yes",
    "y",
    "on",
}


FALSE_VALUES = {
    "false",
    "0",
    "no",
    "n",
    "off",
}


CUISINE_ALIASES = {

    "south indian":
        "south_indian",

    "south-indian":
        "south_indian",

    "north indian":
        "north_indian",

    "north-indian":
        "north_indian",

    "indo chinese":
        "indo_chinese",

    "indo-chinese":
        "indo_chinese",

    "middle eastern":
        "middle_eastern",

    "middle-eastern":
        "middle_eastern",

    "street food":
        "street_food",

    "fast food":
        "fast_food",

    "multi cuisine":
        "multi_cuisine",

    "multi-cuisine":
        "multi_cuisine",

    "coastal":
        "seafood",

    "asian":
        "multi_cuisine",

    "indian":
        "multi_cuisine",

    "awadhi":
        "north_indian",

    "healthy":
        "other",

    "dessert":
        "desserts",

    "coffee":
        "cafe",

}


# ============================================================
# TEXT
# ============================================================

def clean_text(
    value,
):

    if value is None:
        return ""

    return str(
        value
    ).strip()


# ============================================================
# BOOLEAN
# ============================================================

def parse_boolean(
    value,
):

    text = (
        clean_text(
            value
        )
        .lower()
    )


    if not text:
        return None


    if text in TRUE_VALUES:
        return True


    if text in FALSE_VALUES:
        return False


    raise ValidationError(
        (
            "Invalid boolean value: "
            f"{value}"
        )
    )


# ============================================================
# INTEGER
# ============================================================

def parse_integer(
    value,
):

    text = clean_text(
        value
    )


    if not text:
        return None


    try:

        return int(
            float(
                text
            )
        )


    except (
        TypeError,
        ValueError,
    ) as exc:

        raise ValidationError(
            (
                "Invalid integer value: "
                f"{value}"
            )
        ) from exc


# ============================================================
# DECIMAL
# ============================================================

def parse_decimal(
    value,
):

    text = clean_text(
        value
    )


    if not text:
        return None


    try:

        return Decimal(
            text
        )


    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:

        raise ValidationError(
            (
                "Invalid decimal value: "
                f"{value}"
            )
        ) from exc


# ============================================================
# TIME
# ============================================================

def parse_time(
    value,
):

    text = clean_text(
        value
    )


    if not text:
        return None


    formats = (

        "%H:%M",

        "%H:%M:%S",

        "%I:%M %p",

        "%I:%M%p",

    )


    for time_format in formats:

        try:

            return (
                datetime.strptime(
                    text,
                    time_format,
                )
                .time()
            )


        except ValueError:

            continue


    raise ValidationError(
        (
            f"Invalid time '{value}'. "
            "Use HH:MM, for example 09:30."
        )
    )


# ============================================================
# CUISINE NORMALIZATION
# ============================================================

def normalize_cuisine(
    value,
):

    text = (
        clean_text(
            value
        )
        .lower()
    )


    if not text:
        return ""


    valid_values = {

        choice[0]

        for choice
        in Restaurant.CUISINE_CHOICES

    }


    if text in valid_values:
        return text


    normalized = (

        text
        .replace(
            "-",
            "_",
        )
        .replace(
            " ",
            "_",
        )

    )


    if normalized in valid_values:
        return normalized


    alias = (
        CUISINE_ALIASES
        .get(
            text
        )
    )


    if alias:
        return alias


    return "other"


# ============================================================
# RESTAURANT TYPE
# ============================================================

def normalize_restaurant_type(
    value,
):

    text = (
        clean_text(
            value
        )
        .lower()
    )


    if not text:
        return "restaurant"


    valid_values = {

        choice[0]

        for choice
        in Restaurant
        .RESTAURANT_TYPE_CHOICES

    }


    if text in valid_values:
        return text


    aliases = {

        "food court":
            "restaurant",

        "bakery":
            "cafe",

        "dessert shop":
            "cafe",

        "coffee shop":
            "cafe",

        "patisserie":
            "cafe",

        "hotel restaurant":
            "hotel",

    }


    return aliases.get(
        text,
        "restaurant",
    )


# ============================================================
# PRICE RANGE
# ============================================================

def normalize_price_range(
    value,
):

    text = (
        clean_text(
            value
        )
        .lower()
    )


    if not text:
        return ""


    valid_values = {

        choice[0]

        for choice
        in Restaurant
        .PRICE_RANGE_CHOICES

    }


    if text in valid_values:
        return text


    aliases = {

        "cheap":
            "budget",

        "affordable":
            "budget",

        "low":
            "budget",

        "medium":
            "moderate",

        "mid":
            "moderate",

        "expensive":
            "premium",

        "luxury":
            "premium",

        "fine dining":
            "premium",

    }


    return aliases.get(
        text,
        "",
    )


# ============================================================
# OWNER
# ============================================================

def parse_owner(
    value,
):

    text = clean_text(
        value
    )


    if not text:
        return None


    try:

        owner_id = int(
            text
        )


    except (
        TypeError,
        ValueError,
    ):

        return None


    User = (
        get_user_model()
    )


    try:

        return (
            User.objects.get(
                pk=owner_id
            )
        )


    except User.DoesNotExist:

        return None


# ============================================================
# BUILD RESTAURANT VALUES
# ============================================================

def build_restaurant_values(
    row,
):

    values = {}


    # ========================================================
    # NAME
    # ========================================================

    name = clean_text(
        row.get(
            "name"
        )
    )


    if not name:

        raise ValidationError(
            "Restaurant name is required."
        )


    values[
        "name"
    ] = name


    # ========================================================
    # OWNER
    # ========================================================

    owner = (
        parse_owner(
            row.get(
                "owner"
            )
        )
    )


    if owner is not None:

        values[
            "owner"
        ] = owner


    # ========================================================
    # RESTAURANT TYPE
    # ========================================================

    restaurant_type = clean_text(
        row.get(
            "restaurant_type"
        )
    )


    if restaurant_type:

        values[
            "restaurant_type"
        ] = (
            normalize_restaurant_type(
                restaurant_type
            )
        )


    # ========================================================
    # DESCRIPTION
    # ========================================================

    description = clean_text(
        row.get(
            "description"
        )
    )


    if description:

        values[
            "description"
        ] = description


    # ========================================================
    # CUISINE
    # ========================================================

    cuisine = clean_text(
        row.get(
            "cuisine"
        )
    )


    if cuisine:

        values[
            "cuisine"
        ] = (
            normalize_cuisine(
                cuisine
            )
        )


    # ========================================================
    # CONTACT
    # ========================================================

    for field_name in (

        "phone_number",

        "email",

        "website",

    ):

        value = clean_text(
            row.get(
                field_name
            )
        )


        if value:

            values[
                field_name
            ] = value


    # ========================================================
    # ADDRESS
    # ========================================================

    for field_name in (

        "address",

        "locality",

        "city",

        "pincode",

    ):

        value = clean_text(
            row.get(
                field_name
            )
        )


        if value:

            values[
                field_name
            ] = value


    # ========================================================
    # LATITUDE
    # ========================================================

    latitude = parse_decimal(
        row.get(
            "latitude"
        )
    )


    if latitude is not None:

        if not (
            Decimal("-90")
            <=
            latitude
            <=
            Decimal("90")
        ):

            raise ValidationError(
                (
                    "Latitude must be between "
                    "-90 and 90."
                )
            )


        values[
            "latitude"
        ] = latitude


    # ========================================================
    # LONGITUDE
    # ========================================================

    longitude = parse_decimal(
        row.get(
            "longitude"
        )
    )


    if longitude is not None:

        if not (
            Decimal("-180")
            <=
            longitude
            <=
            Decimal("180")
        ):

            raise ValidationError(
                (
                    "Longitude must be between "
                    "-180 and 180."
                )
            )


        values[
            "longitude"
        ] = longitude


    # ========================================================
    # RATING
    # ========================================================

    rating = parse_decimal(
        row.get(
            "rating"
        )
    )


    if rating is not None:

        if (
            rating < 0
            or
            rating > 5
        ):

            raise ValidationError(
                (
                    "Rating must be between "
                    "0 and 5."
                )
            )


        values[
            "rating"
        ] = rating


    # ========================================================
    # PRICE RANGE
    # ========================================================

    price_range = clean_text(
        row.get(
            "price_range"
        )
    )


    if price_range:

        values[
            "price_range"
        ] = (
            normalize_price_range(
                price_range
            )
        )


    # ========================================================
    # COST FOR TWO
    # ========================================================

    average_cost_for_two = (
        parse_integer(
            row.get(
                "average_cost_for_two"
            )
        )
    )


    if (
        average_cost_for_two
        is not None
    ):

        values[
            "average_cost_for_two"
        ] = average_cost_for_two


    # ========================================================
    # TIMES
    # ========================================================

    opening_time = (
        parse_time(
            row.get(
                "opening_time"
            )
        )
    )


    closing_time = (
        parse_time(
            row.get(
                "closing_time"
            )
        )
    )


    if opening_time is not None:

        values[
            "opening_time"
        ] = opening_time


    if closing_time is not None:

        values[
            "closing_time"
        ] = closing_time


    # ========================================================
    # SEATING CAPACITY
    # ========================================================

    seating_capacity = (
        parse_integer(
            row.get(
                "seating_capacity"
            )
        )
    )


    if seating_capacity is not None:

        values[
            "seating_capacity"
        ] = seating_capacity


    # ========================================================
    # BOOLEAN FIELDS
    # ========================================================

    boolean_fields = (

        "has_parking",

        "has_wifi",

        "accepts_cards",

        "family_friendly",

        "outdoor_seating",

        "wheelchair_accessible",

        "serves_vegetarian",

        "serves_non_vegetarian",

        "is_foodkindl_partner",

        "accepts_foodkindl_booking",

        "is_active",

    )


    for field_name in boolean_fields:

        value = (
            parse_boolean(
                row.get(
                    field_name
                )
            )
        )


        if value is not None:

            values[
                field_name
            ] = value


    # ========================================================
    # IMAGE
    # ========================================================

    for field_name in (

        "image_blob_key",

        "image_url",

        "image_original_name",

        "image_content_type",

    ):

        value = clean_text(
            row.get(
                field_name
            )
        )


        if value:

            values[
                field_name
            ] = value


    return values


# ============================================================
# DUPLICATE KEY
# ============================================================

def restaurant_duplicate_key(
    name,
    locality,
    city,
):

    return (

        clean_text(
            name
        ).lower(),

        clean_text(
            locality
        ).lower(),

        clean_text(
            city
        ).lower(),

    )


# ============================================================
# AUTOMATIC GEOCODING
# ============================================================

def geocode_restaurant_if_needed(
    restaurant,
):

    if (
        restaurant.latitude is not None
        and
        restaurant.longitude is not None
    ):

        return (
            True,
            None,
        )


    try:

        result = (
            geocode_restaurant(
                restaurant
            )
        )


    except Exception as exc:

        return (
            False,
            str(
                exc
            ),
        )


    if not result:

        return (
            False,
            (
                "No geocoding result "
                "was returned."
            ),
        )


    latitude = result.get(
        "latitude"
    )


    longitude = result.get(
        "longitude"
    )


    if (
        latitude is None
        or longitude is None
    ):

        return (
            False,
            (
                "Geocoder returned "
                "incomplete coordinates."
            ),
        )


    restaurant.latitude = latitude

    restaurant.longitude = longitude


    return (
        True,
        None,
    )


# ============================================================
# RESTAURANT ADMIN
# ============================================================

@admin.register(Restaurant)
class RestaurantAdmin(
    admin.ModelAdmin
):

    # ========================================================
    # LIST DISPLAY
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


    # ========================================================
    # FILTERS
    # ========================================================

    list_filter = (

        "restaurant_type",

        "cuisine",

        "price_range",

        "city",

        "is_foodkindl_partner",

        "accepts_foodkindl_booking",

        "is_active",

        "serves_vegetarian",

        "serves_non_vegetarian",

    )


    # ========================================================
    # SEARCH
    # ========================================================

    search_fields = (

        "name",

        "address",

        "locality",

        "city",

        "pincode",

        "phone_number",

        "email",

    )


    ordering = (

        "-rating",

        "name",

    )


    list_per_page = 50


    readonly_fields = (

        "latitude",

        "longitude",

        "created_at",

        "updated_at",

    )


    # ========================================================
    # CUSTOM TEMPLATE
    # ========================================================

    change_list_template = (
        "1admin/invites/restaurant/change_list.html"
    )


    # ========================================================
    # CUSTOM URL
    # ========================================================

    def get_urls(
        self,
    ):

        urls = (
            super()
            .get_urls()
        )


        custom_urls = [

            path(

                "import-csv/",

                self.admin_site
                .admin_view(
                    self.import_csv_view
                ),

                name=(
                    "invites_restaurant_import_csv"
                ),

            ),

        ]


        return (
            custom_urls
            +
            urls
        )


    # ========================================================
    # CSV IMPORT VIEW
    # ========================================================

    def import_csv_view(
        self,
        request,
    ):

        # ====================================================
        # POST
        # ====================================================

        if request.method == "POST":

            form = (
                RestaurantCSVImportForm(

                    request.POST,

                    request.FILES,

                )
            )


            if form.is_valid():

                csv_file = (
                    form.cleaned_data[
                        "csv_file"
                    ]
                )


                update_existing = (
                    form.cleaned_data[
                        "update_existing"
                    ]
                )


                geocode_missing = (
                    form.cleaned_data[
                        "geocode_missing_coordinates"
                    ]
                )


                # ============================================
                # VALIDATE FILE
                # ============================================

                filename = (
                    csv_file.name
                    .lower()
                )


                if not filename.endswith(
                    ".csv"
                ):

                    messages.error(
                        request,
                        (
                            "Please upload "
                            "a .csv file."
                        ),
                    )


                    return HttpResponseRedirect(
                        request.path
                    )


                # ============================================
                # READ CSV
                # ============================================

                try:

                    decoded_file = (

                        csv_file
                        .read()
                        .decode(
                            "utf-8-sig"
                        )
                        .splitlines()

                    )


                except UnicodeDecodeError:

                    messages.error(
                        request,
                        (
                            "CSV must use "
                            "UTF-8 encoding."
                        ),
                    )


                    return HttpResponseRedirect(
                        request.path
                    )


                reader = csv.DictReader(
                    decoded_file
                )


                # ============================================
                # HEADER
                # ============================================

                if not reader.fieldnames:

                    messages.error(
                        request,
                        (
                            "CSV does not "
                            "contain a header row."
                        ),
                    )


                    return HttpResponseRedirect(
                        request.path
                    )


                normalized_headers = {

                    clean_text(
                        field_name
                    ).lower()

                    for field_name
                    in reader.fieldnames

                }


                if "name" not in normalized_headers:

                    messages.error(
                        request,
                        (
                            "CSV must contain "
                            "a 'name' column."
                        ),
                    )


                    return HttpResponseRedirect(
                        request.path
                    )


                # ============================================
                # DATABASE RESTAURANTS
                # ============================================

                existing_restaurants = {}


                for existing in (
                    Restaurant.objects.all()
                ):

                    key = (
                        restaurant_duplicate_key(

                            existing.name,

                            existing.locality,

                            existing.city,

                        )
                    )


                    existing_restaurants[
                        key
                    ] = existing


                # ============================================
                # COUNTERS
                # ============================================

                created_count = 0

                updated_count = 0

                skipped_count = 0

                failed_count = 0

                geocoded_count = 0

                geocode_failed_count = 0


                errors = []


                new_restaurants = []


                seen_csv_keys = set()


                # ============================================
                # PROCESS CSV
                # ============================================

                for (
                    row_number,
                    row,
                ) in enumerate(
                    reader,
                    start=2,
                ):

                    try:

                        # ====================================
                        # NORMALIZE COLUMN NAMES
                        # ====================================

                        normalized_row = {

                            clean_text(
                                key
                            ).lower():
                                value

                            for (
                                key,
                                value
                            )
                            in row.items()

                            if key is not None

                        }


                        # ====================================
                        # BUILD VALUES
                        # ====================================

                        values = (
                            build_restaurant_values(
                                normalized_row
                            )
                        )


                        name = values[
                            "name"
                        ]


                        locality = (
                            clean_text(
                                values.get(
                                    "locality",
                                    "",
                                )
                            )
                        )


                        city = (
                            clean_text(
                                values.get(
                                    "city",
                                    "",
                                )
                            )
                        )


                        duplicate_key = (
                            restaurant_duplicate_key(

                                name,

                                locality,

                                city,

                            )
                        )


                        # ====================================
                        # DUPLICATE INSIDE CSV
                        # ====================================

                        if (
                            duplicate_key
                            in
                            seen_csv_keys
                        ):

                            skipped_count += 1


                            errors.append(
                                (
                                    f"Row {row_number}: "
                                    f"{name} skipped because "
                                    "the same Name + Locality "
                                    "+ City already exists "
                                    "in this CSV."
                                )
                            )


                            continue


                        seen_csv_keys.add(
                            duplicate_key
                        )


                        # ====================================
                        # EXISTING DATABASE RECORD
                        # ====================================

                        existing = (
                            existing_restaurants
                            .get(
                                duplicate_key
                            )
                        )


                        if existing:

                            if not update_existing:

                                skipped_count += 1

                                continue


                            # =================================
                            # UPDATE FIELDS
                            # =================================

                            update_values = dict(
                                values
                            )


                            update_values.pop(
                                "name",
                                None,
                            )


                            for (
                                field_name,
                                field_value,
                            ) in update_values.items():

                                setattr(
                                    existing,
                                    field_name,
                                    field_value,
                                )


                            # =================================
                            # GEOCODE EXISTING RECORD
                            # =================================

                            if (
                                geocode_missing
                                and
                                (
                                    existing.latitude is None
                                    or
                                    existing.longitude is None
                                )
                            ):

                                (
                                    geocode_success,
                                    geocode_error,
                                ) = (
                                    geocode_restaurant_if_needed(
                                        existing
                                    )
                                )


                                if geocode_success:

                                    geocoded_count += 1


                                else:

                                    geocode_failed_count += 1


                                    errors.append(
                                        (
                                            f"Row {row_number}: "
                                            f"{name} updated but "
                                            "coordinates could not "
                                            f"be found: {geocode_error}"
                                        )
                                    )


                            # =================================
                            # SAVE EXISTING
                            #
                            # Using normal model save()
                            # is fine for updated rows.
                            # =================================

                            existing.save()


                            updated_count += 1


                            continue


                        # ====================================
                        # NEW RESTAURANT
                        # ====================================

                        restaurant = Restaurant(
                            **values
                        )


                        # ====================================
                        # EXTERNAL IMPORT DEFAULTS
                        # ====================================

                        if (
                            "is_foodkindl_partner"
                            not in values
                        ):

                            restaurant.is_foodkindl_partner = False


                        if (
                            "accepts_foodkindl_booking"
                            not in values
                        ):

                            restaurant.accepts_foodkindl_booking = False


                        if (
                            "is_active"
                            not in values
                        ):

                            restaurant.is_active = True


                        # ====================================
                        # AUTO-GEOCODE
                        # ====================================

                        if (
                            geocode_missing
                            and
                            (
                                restaurant.latitude is None
                                or
                                restaurant.longitude is None
                            )
                        ):

                            (
                                geocode_success,
                                geocode_error,
                            ) = (
                                geocode_restaurant_if_needed(
                                    restaurant
                                )
                            )


                            if geocode_success:

                                geocoded_count += 1


                            else:

                                geocode_failed_count += 1


                                errors.append(
                                    (
                                        f"Row {row_number}: "
                                        f"{name} will be imported "
                                        "without coordinates. "
                                        f"{geocode_error}"
                                    )
                                )


                        new_restaurants.append(
                            restaurant
                        )


                    except Exception as exc:

                        failed_count += 1


                        errors.append(
                            (
                                f"Row {row_number}: "
                                f"{exc}"
                            )
                        )


                # ============================================
                # BULK INSERT NEW RESTAURANTS
                # ============================================

                if new_restaurants:

                    try:

                        with transaction.atomic():

                            Restaurant.objects.bulk_create(

                                new_restaurants,

                                batch_size=100,

                            )


                        created_count = len(
                            new_restaurants
                        )


                    except Exception as exc:

                        failed_count += len(
                            new_restaurants
                        )


                        errors.append(
                            (
                                "Bulk create failed: "
                                f"{exc}"
                            )
                        )


                # ============================================
                # SUCCESS MESSAGE
                # ============================================

                messages.success(
                    request,
                    (
                        "CSV import completed. "
                        f"Created: {created_count}. "
                        f"Updated: {updated_count}. "
                        f"Skipped: {skipped_count}. "
                        f"Failed: {failed_count}. "
                        f"Geocoded: {geocoded_count}. "
                        f"Geocode failed: "
                        f"{geocode_failed_count}."
                    ),
                )


                # ============================================
                # GEOCODE WARNING
                # ============================================

                if geocode_failed_count:

                    messages.warning(
                        request,
                        (
                            f"{geocode_failed_count} "
                            "restaurants were imported "
                            "without coordinates. "
                            "They will not appear in "
                            "Food Walk route recommendations "
                            "until coordinates are added."
                        ),
                    )


                # ============================================
                # SHOW FIRST 25 ERRORS
                # ============================================

                for error_message in errors[:25]:

                    messages.warning(
                        request,
                        error_message,
                    )


                if len(errors) > 25:

                    messages.warning(
                        request,
                        (
                            f"{len(errors) - 25} "
                            "additional warnings "
                            "were not displayed."
                        ),
                    )


                # ============================================
                # REDIRECT
                # ============================================

                changelist_url = reverse(
                    "admin:invites_restaurant_changelist"
                )


                return HttpResponseRedirect(
                    changelist_url
                )


        # ====================================================
        # GET
        # ====================================================

        else:

            form = (
                RestaurantCSVImportForm()
            )


        # ====================================================
        # TEMPLATE
        # ====================================================

        context = {

            **self.admin_site
            .each_context(
                request
            ),

            "title":
                "Import Restaurants from CSV",

            "form":
                form,

            "opts":
                self.model._meta,

        }


        return render(

            request,

            (
                "1admin/invites/"
                "restaurant/"
                "import_csv.html"
            ),

            context,

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

    )


    list_filter = (

        "is_active",

    )


    search_fields = (

        "restaurant__name",

        "caption",

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

        "restaurant",

        "name",

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

    )


    search_fields = (

        "name",

        "restaurant__name",

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

    )


    list_filter = (

        "status",

        "booking_date",

    )


    search_fields = (

        "booking_reference",

        "restaurant__name",

        "user__email",

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

        "locality",

        "city",

        "status",

        "submitted_by",

        "created_at",

    )


    list_filter = (

        "status",

        "restaurant_type",

        "city",

    )


    search_fields = (

        "name",

        "locality",

        "city",

        "address",

    )


# ============================================================
# FOOD INVITE ADMIN
# ============================================================

@admin.register(FoodInvite)
class FoodInviteAdmin(
    admin.ModelAdmin
):

    list_display = (

        "id",

        "title",

        "invite_type",

        "creator_user_id",

        "start_at",

        "status",

        "max_participants",

    )


    list_filter = (

        "invite_type",

        "status",

        "verified_only",

        "women_only",

    )


    search_fields = (

        "title",

        "location_label",

        "venue_name",

    )


# ============================================================
# FOOD INVITE PARTICIPANT ADMIN
# ============================================================

@admin.register(FoodInviteParticipant)
class FoodInviteParticipantAdmin(
    admin.ModelAdmin
):

    list_display = (

        "id",

        "invite",

        "user_id",

        "status",

        "responded_at",

    )


    list_filter = (

        "status",

    )
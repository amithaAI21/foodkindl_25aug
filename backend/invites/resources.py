from decimal import Decimal, InvalidOperation

from import_export import (
    fields,
    resources,
)

from import_export.widgets import (
    BooleanWidget,
    DecimalWidget,
    IntegerWidget,
)

from .models import Restaurant


# ============================================================
# BOOLEAN WIDGET
# ============================================================

class FoodKindlBooleanWidget(
    BooleanWidget
):

    def clean(
        self,
        value,
        row=None,
        **kwargs,
    ):

        if isinstance(
            value,
            bool,
        ):
            return value

        if value is None:
            return False

        normalized = (
            str(value)
            .strip()
            .lower()
        )

        if normalized in (
            "1",
            "true",
            "yes",
            "y",
            "on",
        ):
            return True

        if normalized in (
            "0",
            "false",
            "no",
            "n",
            "off",
            "",
            "none",
            "null",
            "nan",
        ):
            return False

        return False


# ============================================================
# OPTIONAL DECIMAL WIDGET
# ============================================================

class OptionalDecimalWidget(
    DecimalWidget
):

    def clean(
        self,
        value,
        row=None,
        **kwargs,
    ):

        if value is None:
            return None

        value = (
            str(value)
            .strip()
        )

        if (
            value.lower()
            in (
                "",
                "none",
                "null",
                "nan",
            )
        ):
            return None

        try:
            return Decimal(
                value
            )

        except (
            InvalidOperation,
            ValueError,
            TypeError,
        ):
            return None


# ============================================================
# OPTIONAL INTEGER WIDGET
# ============================================================

class OptionalIntegerWidget(
    IntegerWidget
):

    def clean(
        self,
        value,
        row=None,
        **kwargs,
    ):

        if value is None:
            return None

        value = (
            str(value)
            .strip()
        )

        if (
            value.lower()
            in (
                "",
                "none",
                "null",
                "nan",
            )
        ):
            return None

        try:
            return int(
                float(
                    value
                )
            )

        except (
            ValueError,
            TypeError,
        ):
            return None


# ============================================================
# RESTAURANT RESOURCE
# ============================================================

class RestaurantResource(
    resources.ModelResource
):

    # ========================================================
    # DECIMAL FIELDS
    # ========================================================

    latitude = fields.Field(
        column_name=
            "latitude",

        attribute=
            "latitude",

        widget=
            OptionalDecimalWidget(),
    )


    longitude = fields.Field(
        column_name=
            "longitude",

        attribute=
            "longitude",

        widget=
            OptionalDecimalWidget(),
    )


    rating = fields.Field(
        column_name=
            "rating",

        attribute=
            "rating",

        widget=
            OptionalDecimalWidget(),
    )


    # ========================================================
    # INTEGER FIELDS
    # ========================================================

    average_cost_for_two = (
        fields.Field(

            column_name=
                "average_cost_for_two",

            attribute=
                "average_cost_for_two",

            widget=
                OptionalIntegerWidget(),
        )
    )


    seating_capacity = (
        fields.Field(

            column_name=
                "seating_capacity",

            attribute=
                "seating_capacity",

            widget=
                OptionalIntegerWidget(),
        )
    )


    # ========================================================
    # BOOLEAN FIELDS
    # ========================================================

    has_parking = fields.Field(
        column_name=
            "has_parking",

        attribute=
            "has_parking",

        widget=
            FoodKindlBooleanWidget(),
    )


    has_wifi = fields.Field(
        column_name=
            "has_wifi",

        attribute=
            "has_wifi",

        widget=
            FoodKindlBooleanWidget(),
    )


    accepts_cards = fields.Field(
        column_name=
            "accepts_cards",

        attribute=
            "accepts_cards",

        widget=
            FoodKindlBooleanWidget(),
    )


    family_friendly = fields.Field(
        column_name=
            "family_friendly",

        attribute=
            "family_friendly",

        widget=
            FoodKindlBooleanWidget(),
    )


    outdoor_seating = fields.Field(
        column_name=
            "outdoor_seating",

        attribute=
            "outdoor_seating",

        widget=
            FoodKindlBooleanWidget(),
    )


    wheelchair_accessible = (
        fields.Field(

            column_name=
                "wheelchair_accessible",

            attribute=
                "wheelchair_accessible",

            widget=
                FoodKindlBooleanWidget(),
        )
    )


    serves_vegetarian = (
        fields.Field(

            column_name=
                "serves_vegetarian",

            attribute=
                "serves_vegetarian",

            widget=
                FoodKindlBooleanWidget(),
        )
    )


    serves_non_vegetarian = (
        fields.Field(

            column_name=
                "serves_non_vegetarian",

            attribute=
                "serves_non_vegetarian",

            widget=
                FoodKindlBooleanWidget(),
        )
    )


    is_foodkindl_partner = (
        fields.Field(

            column_name=
                "is_foodkindl_partner",

            attribute=
                "is_foodkindl_partner",

            widget=
                FoodKindlBooleanWidget(),
        )
    )


    accepts_foodkindl_booking = (
        fields.Field(

            column_name=
                "accepts_foodkindl_booking",

            attribute=
                "accepts_foodkindl_booking",

            widget=
                FoodKindlBooleanWidget(),
        )
    )


    is_active = fields.Field(
        column_name=
            "is_active",

        attribute=
            "is_active",

        widget=
            FoodKindlBooleanWidget(),
    )


    # ========================================================
    # META
    # ========================================================

    class Meta:

        model = Restaurant

        fields = (
            "id",

            "name",

            "restaurant_type",

            "description",

            "cuisine",

            "phone_number",

            "email",

            "website",

            "address",

            "locality",

            "city",

            "pincode",

            "latitude",

            "longitude",

            "rating",

            "price_range",

            "average_cost_for_two",

            "opening_time",

            "closing_time",

            "seating_capacity",

            "has_parking",

            "has_wifi",

            "accepts_cards",

            "family_friendly",

            "outdoor_seating",

            "wheelchair_accessible",

            "serves_vegetarian",

            "serves_non_vegetarian",

            "image_blob_key",

            "image_url",

            "image_original_name",

            "image_content_type",

            "is_foodkindl_partner",

            "accepts_foodkindl_booking",

            "is_active",
        )


        # ====================================================
        # DUPLICATE CHECK
        #
        # Same name + locality + city will update,
        # rather than creating another duplicate row.
        # ====================================================

        import_id_fields = (
            "name",
            "locality",
            "city",
        )


        skip_unchanged = True

        report_skipped = True

        use_bulk = False


    # ========================================================
    # CLEAN EACH CSV ROW
    # ========================================================

    def before_import_row(
        self,
        row,
        **kwargs,
    ):

        # ====================================================
        # TEXT CLEANUP
        # ====================================================

        text_fields = (
            "name",

            "restaurant_type",

            "description",

            "cuisine",

            "phone_number",

            "email",

            "website",

            "address",

            "locality",

            "city",

            "pincode",

            "price_range",

            "opening_time",

            "closing_time",

            "image_blob_key",

            "image_url",

            "image_original_name",

            "image_content_type",
        )


        for field_name in text_fields:

            value = row.get(
                field_name
            )

            if value is None:
                continue

            row[
                field_name
            ] = (
                str(value)
                .strip()
            )


        # ====================================================
        # RESTAURANT TYPE NORMALIZATION
        # ====================================================

        restaurant_type = (
            str(
                row.get(
                    "restaurant_type",
                    "",
                )
                or ""
            )
            .strip()
            .lower()
        )


        restaurant_type_mapping = {

            "restaurant":
                "restaurant",

            "resturant":
                "restaurant",

            "restaurants":
                "restaurant",

            "hotel":
                "hotel",

            "hotels":
                "hotel",

            "cafe":
                "cafe",

            "café":
                "cafe",

            "cafes":
                "cafe",
        }


        if restaurant_type:

            row[
                "restaurant_type"
            ] = (
                restaurant_type_mapping
                .get(
                    restaurant_type,

                    restaurant_type,
                )
            )

        else:

            row[
                "restaurant_type"
            ] = (
                "restaurant"
            )


        # ====================================================
        # CITY NORMALIZATION
        # ====================================================

        city = (
            str(
                row.get(
                    "city",
                    "",
                )
                or ""
            )
            .strip()
        )


        if (
            city.lower()
            in (
                "bangalore",
                "bengaluru",
                "bangaluru",
            )
        ):

            row[
                "city"
            ] = (
                "Bengaluru"
            )


        # ====================================================
        # CUISINE NORMALIZATION
        # ====================================================

        cuisine = (
            str(
                row.get(
                    "cuisine",
                    "",
                )
                or ""
            )
            .strip()
            .lower()
        )


        cuisine_mapping = {

            "south indian":
                "south_indian",

            "south_indian":
                "south_indian",

            "north indian":
                "north_indian",

            "north_indian":
                "north_indian",

            "kerala":
                "kerala",

            "karnataka":
                "karnataka",

            "tamil":
                "tamil",

            "andhra":
                "andhra",

            "telangana":
                "telangana",

            "hyderabadi":
                "hyderabadi",

            "punjabi":
                "punjabi",

            "bengali":
                "bengali",

            "rajasthani":
                "rajasthani",

            "gujarati":
                "gujarati",

            "maharashtrian":
                "maharashtrian",

            "goan":
                "goan",

            "kashmiri":
                "kashmiri",

            "chinese":
                "chinese",

            "indo chinese":
                "indo_chinese",

            "indo-chinese":
                "indo_chinese",

            "indo_chinese":
                "indo_chinese",

            "italian":
                "italian",

            "continental":
                "continental",

            "mediterranean":
                "mediterranean",

            "mexican":
                "mexican",

            "thai":
                "thai",

            "japanese":
                "japanese",

            "korean":
                "korean",

            "arabian":
                "arabian",

            "middle eastern":
                "middle_eastern",

            "middle_eastern":
                "middle_eastern",

            "lebanese":
                "lebanese",

            "biryani":
                "biryani",

            "seafood":
                "seafood",

            "street food":
                "street_food",

            "street_food":
                "street_food",

            "fast food":
                "fast_food",

            "fast_food":
                "fast_food",

            "cafe":
                "cafe",

            "bakery":
                "bakery",

            "desserts":
                "desserts",

            "barbecue":
                "barbecue",

            "bbq":
                "barbecue",

            "barbecue / grill":
                "barbecue",

            "vegetarian":
                "vegetarian",

            "vegan":
                "vegan",

            "jain":
                "jain",

            "multi cuisine":
                "multi_cuisine",

            "multi-cuisine":
                "multi_cuisine",

            "multi_cuisine":
                "multi_cuisine",

            "other":
                "other",
        }


        if cuisine:

            normalized_cuisine = (
                cuisine_mapping
                .get(
                    cuisine
                )
            )


            if normalized_cuisine:

                row[
                    "cuisine"
                ] = (
                    normalized_cuisine
                )

            else:

                row[
                    "cuisine"
                ] = (
                    "other"
                )


        # ====================================================
        # PRICE RANGE NORMALIZATION
        # ====================================================

        price_range = (
            str(
                row.get(
                    "price_range",
                    "",
                )
                or ""
            )
            .strip()
            .lower()
        )


        price_mapping = {

            "₹":
                "budget",

            "₹₹":
                "moderate",

            "₹₹₹":
                "premium",

            "budget":
                "budget",

            "moderate":
                "moderate",

            "premium":
                "premium",
        }


        if price_range:

            row[
                "price_range"
            ] = (
                price_mapping
                .get(
                    price_range,

                    price_range,
                )
            )


        # ====================================================
        # TIME NORMALIZATION
        # ====================================================

        for field_name in (
            "opening_time",
            "closing_time",
        ):

            value = row.get(
                field_name
            )


            if not value:
                continue


            value = (
                str(value)
                .strip()
            )


            if (
                value.lower()
                in (
                    "none",
                    "null",
                    "nan",
                )
            ):

                row[
                    field_name
                ] = ""

                continue


            pieces = (
                value.split(":")
            )


            if len(
                pieces
            ) == 2:

                row[
                    field_name
                ] = (
                    f"{value}:00"
                )


        # ====================================================
        # IMPORTANT:
        # ALL CSV-IMPORTED RESTAURANTS BECOME
        # FOODKINDL ACTIVE PARTNERS AUTOMATICALLY.
        #
        # CSV values are deliberately overridden.
        # ====================================================

        row[
            "is_foodkindl_partner"
        ] = "True"


        row[
            "accepts_foodkindl_booking"
        ] = "True"


        row[
            "is_active"
        ] = "True"


    # ========================================================
    # FINAL CLEANUP BEFORE DATABASE SAVE
    # ========================================================

    def before_save_instance(
        self,
        instance,
        row,
        **kwargs,
    ):

        # ====================================================
        # NAME REQUIRED
        # ====================================================

        if (
            not instance.name
            or
            not instance.name.strip()
        ):

            raise ValueError(
                "Restaurant name is required."
            )


        # ====================================================
        # PARTNERSHIP SAFETY
        #
        # Set these again on the model instance.
        # This guarantees they remain True even if CSV
        # processing behavior changes.
        # ====================================================

        instance.is_foodkindl_partner = (
            True
        )

        instance.accepts_foodkindl_booking = (
            True
        )

        instance.is_active = (
            True
        )


        # ====================================================
        # COORDINATES — MAXIMUM 6 DECIMAL PLACES
        # ====================================================

        if (
            instance.latitude
            is not None
        ):

            instance.latitude = (
                instance.latitude
                .quantize(
                    Decimal(
                        "0.000001"
                    )
                )
            )


        if (
            instance.longitude
            is not None
        ):

            instance.longitude = (
                instance.longitude
                .quantize(
                    Decimal(
                        "0.000001"
                    )
                )
            )
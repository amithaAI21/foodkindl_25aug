from django.contrib.auth.models import User
from django.db import transaction

from rest_framework import serializers

from .models import (
    CookVenueType,
    DineVenueType,
    FoodInvite,
    FoodInviteParticipant,
    InviteType,
    Restaurant,
    RestaurantBooking,
    RestaurantImage,
    RestaurantMenuItem,
)


# ============================================================
# FOOD INVITE PARTICIPANT SERIALIZER
# ============================================================

class FoodInviteParticipantSerializer(
    serializers.ModelSerializer
):

    user_name = serializers.SerializerMethodField()

    user_email = serializers.SerializerMethodField()


    class Meta:

        model = FoodInviteParticipant

        fields = (
            "id",
            "user_id",
            "user_name",
            "user_email",
            "status",
            "responded_at",
            "created_at",
        )

        read_only_fields = (
            "id",
            "user_id",
            "user_name",
            "user_email",
            "status",
            "responded_at",
            "created_at",
        )


    # ========================================================
    # USER
    # ========================================================

    def get_user(
        self,
        obj,
    ):

        return (
            User.objects
            .filter(
                id=obj.user_id
            )
            .first()
        )


    # ========================================================
    # USER NAME
    # ========================================================

    def get_user_name(
        self,
        obj,
    ):

        user = self.get_user(
            obj
        )


        if not user:

            return (
                "FoodKindl Member"
            )


        full_name = (
            user
            .get_full_name()
            .strip()
        )


        return (
            full_name
            or user.first_name
            or user.email
            or user.username
            or "FoodKindl Member"
        )


    # ========================================================
    # USER EMAIL
    # ========================================================

    def get_user_email(
        self,
        obj,
    ):

        user = self.get_user(
            obj
        )


        if not user:

            return ""


        return (
            user.email
            or ""
        )


# ============================================================
# FOOD INVITE SERIALIZER
# ============================================================

class FoodInviteSerializer(
    serializers.ModelSerializer
):

    recipient_user_ids = serializers.ListField(
        child=serializers.IntegerField(
            min_value=1
        ),
        write_only=True,
        required=False,
        default=list,
    )


    participants = (
        FoodInviteParticipantSerializer(
            many=True,
            read_only=True,
        )
    )


    creator_name = (
        serializers.SerializerMethodField()
    )


    creator_email = (
        serializers.SerializerMethodField()
    )


    is_creator = (
        serializers.SerializerMethodField()
    )


    my_participant_status = (
        serializers.SerializerMethodField()
    )


    accepted_count = (
        serializers.SerializerMethodField()
    )


    invited_count = (
        serializers.SerializerMethodField()
    )


    declined_count = (
        serializers.SerializerMethodField()
    )


    class Meta:

        model = FoodInvite

        fields = (
            "id",

            "creator_user_id",
            "creator_name",
            "creator_email",
            "is_creator",
            "my_participant_status",

            "recipient_user_ids",

            "invite_type",

            "title",
            "description",
            "cuisine",

            "start_at",
            "end_at",

            "cook_venue_type",
            "dine_venue_type",

            "venue_name",
            "location_label",
            "private_address",

            "food_walk_stops",

            "max_participants",

            "verified_only",
            "women_only",

            "kitchen_contribution",

            "status",

            "accepted_count",
            "invited_count",
            "declined_count",

            "participants",

            "created_at",
            "updated_at",
        )


        read_only_fields = (
            "id",

            "creator_user_id",
            "creator_name",
            "creator_email",
            "is_creator",
            "my_participant_status",

            "participants",

            "status",

            "accepted_count",
            "invited_count",
            "declined_count",

            "created_at",
            "updated_at",
        )


    # ========================================================
    # CREATOR USER
    # ========================================================

    def get_creator_user(
        self,
        obj,
    ):

        return (
            User.objects
            .filter(
                id=obj.creator_user_id
            )
            .first()
        )


    # ========================================================
    # CREATOR NAME
    # ========================================================

    def get_creator_name(
        self,
        obj,
    ):

        user = self.get_creator_user(
            obj
        )


        if not user:

            return (
                "FoodKindl Member"
            )


        full_name = (
            user
            .get_full_name()
            .strip()
        )


        return (
            full_name
            or user.first_name
            or user.email
            or user.username
            or "FoodKindl Member"
        )


    # ========================================================
    # CREATOR EMAIL
    # ========================================================

    def get_creator_email(
        self,
        obj,
    ):

        user = self.get_creator_user(
            obj
        )


        if not user:

            return ""


        return (
            user.email
            or ""
        )


    # ========================================================
    # IS CREATOR
    # ========================================================

    def get_is_creator(
        self,
        obj,
    ):

        request = (
            self.context.get(
                "request"
            )
        )


        if (
            not request
            or not request.user
            or not request.user.is_authenticated
        ):

            return False


        return (
            int(
                obj.creator_user_id
            )
            ==
            int(
                request.user.id
            )
        )


    # ========================================================
    # CURRENT USER PARTICIPANT STATUS
    # ========================================================

    def get_my_participant_status(
        self,
        obj,
    ):

        request = (
            self.context.get(
                "request"
            )
        )


        if (
            not request
            or not request.user
            or not request.user.is_authenticated
        ):

            return None


        if (
            int(
                obj.creator_user_id
            )
            ==
            int(
                request.user.id
            )
        ):

            return None


        participant = (
            obj.participants
            .filter(
                user_id=
                    request.user.id
            )
            .first()
        )


        if not participant:

            return None


        return (
            participant.status
        )


    # ========================================================
    # COUNTS
    # ========================================================

    def get_accepted_count(
        self,
        obj,
    ):

        return (
            obj.participants
            .filter(
                status=
                    "accepted"
            )
            .count()
        )


    def get_invited_count(
        self,
        obj,
    ):

        return (
            obj.participants
            .filter(
                status=
                    "invited"
            )
            .count()
        )


    def get_declined_count(
        self,
        obj,
    ):

        return (
            obj.participants
            .filter(
                status=
                    "declined"
            )
            .count()
        )


    # ========================================================
    # VALIDATION
    # ========================================================

    def validate(
        self,
        attrs,
    ):

        request = (
            self.context.get(
                "request"
            )
        )


        invite_type = (
            attrs.get(
                "invite_type"
            )
            or getattr(
                self.instance,
                "invite_type",
                None,
            )
        )


        # ====================================================
        # RECIPIENTS
        # ====================================================

        recipient_ids = (
            attrs.get(
                "recipient_user_ids",
                [],
            )
        )


        recipient_ids = list(
            dict.fromkeys(
                recipient_ids
            )
        )


        # ====================================================
        # SELF INVITE
        # ====================================================

        if (
            request
            and request.user
            and request.user.is_authenticated
            and request.user.id
            in recipient_ids
        ):

            raise serializers.ValidationError(
                {
                    "recipient_user_ids":
                        (
                            "You cannot send a "
                            "Food Invite to yourself."
                        )
                }
            )


        # ====================================================
        # CHECK USER IDS
        # ====================================================

        if recipient_ids:

            existing_ids = set(
                User.objects
                .filter(
                    id__in=
                        recipient_ids
                )
                .values_list(
                    "id",
                    flat=True,
                )
            )


            invalid_ids = [
                user_id

                for user_id
                in recipient_ids

                if user_id
                not in existing_ids
            ]


            if invalid_ids:

                raise serializers.ValidationError(
                    {
                        "recipient_user_ids":
                            (
                                "One or more selected "
                                "FoodKindl members do not exist."
                            )
                    }
                )


        attrs[
            "recipient_user_ids"
        ] = recipient_ids


        # ====================================================
        # COOK TOGETHER
        # ====================================================

        if (
            invite_type ==
            InviteType.COOK_TOGETHER
        ):

            cook_venue_type = (
                attrs.get(
                    "cook_venue_type"
                )
                or getattr(
                    self.instance,
                    "cook_venue_type",
                    "",
                )
            )


            if not cook_venue_type:

                raise serializers.ValidationError(
                    {
                        "cook_venue_type":
                            (
                                "Choose Home, Clubhouse "
                                "or Other Venue."
                            )
                    }
                )


            if (
                cook_venue_type
                not in
                CookVenueType.values
            ):

                raise serializers.ValidationError(
                    {
                        "cook_venue_type":
                            (
                                "Invalid cooking venue."
                            )
                    }
                )


        # ====================================================
        # DINE OUT
        # ====================================================

        if (
            invite_type ==
            InviteType.DINE_OUT
        ):

            dine_venue_type = (
                attrs.get(
                    "dine_venue_type"
                )
                or getattr(
                    self.instance,
                    "dine_venue_type",
                    "",
                )
            )


            if not dine_venue_type:

                raise serializers.ValidationError(
                    {
                        "dine_venue_type":
                            (
                                "Choose Restaurant "
                                "or Cafe."
                            )
                    }
                )


            if (
                dine_venue_type
                not in
                DineVenueType.values
            ):

                raise serializers.ValidationError(
                    {
                        "dine_venue_type":
                            (
                                "Invalid dining venue."
                            )
                    }
                )


            venue_name = (
                attrs.get(
                    "venue_name"
                )
                or getattr(
                    self.instance,
                    "venue_name",
                    "",
                )
            )


            if not venue_name:

                raise serializers.ValidationError(
                    {
                        "venue_name":
                            (
                                "Enter the restaurant "
                                "or cafe name."
                            )
                    }
                )


        # ====================================================
        # FOOD WALK
        # ====================================================

        if (
            invite_type ==
            InviteType.FOOD_WALK
        ):

            stops = (
                attrs.get(
                    "food_walk_stops"
                )
                or getattr(
                    self.instance,
                    "food_walk_stops",
                    [],
                )
            )


            valid_stops = []


            for stop in stops:

                if isinstance(
                    stop,
                    dict,
                ):

                    name = str(
                        stop.get(
                            "name",
                            "",
                        )
                    ).strip()


                    if name:

                        valid_stops.append(
                            {
                                **stop,
                                "name":
                                    name,
                            }
                        )


                elif isinstance(
                    stop,
                    str,
                ):

                    name = (
                        stop.strip()
                    )


                    if name:

                        valid_stops.append(
                            {
                                "name":
                                    name,
                            }
                        )


            if (
                len(
                    valid_stops
                )
                <
                2
            ):

                raise serializers.ValidationError(
                    {
                        "food_walk_stops":
                            (
                                "Food Walk requires "
                                "at least two food stops."
                            )
                    }
                )


            attrs[
                "food_walk_stops"
            ] = valid_stops


        # ====================================================
        # MAX PARTICIPANTS
        # ====================================================

        max_participants = (
            attrs.get(
                "max_participants"
            )
            or getattr(
                self.instance,
                "max_participants",
                2,
            )
        )


        if (
            max_participants <
            2
        ):

            raise serializers.ValidationError(
                {
                    "max_participants":
                        (
                            "A Food Invite must allow "
                            "at least two people."
                        )
                }
            )


        if (
            len(
                recipient_ids
            )
            + 1
            >
            max_participants
        ):

            raise serializers.ValidationError(
                {
                    "max_participants":
                        (
                            "Participant limit is smaller "
                            "than the number of people invited."
                        )
                }
            )


        return attrs


    # ========================================================
    # CREATE FOOD INVITE
    # ========================================================

    @transaction.atomic
    def create(
        self,
        validated_data,
    ):

        request = (
            self.context[
                "request"
            ]
        )


        recipient_ids = (
            validated_data.pop(
                "recipient_user_ids",
                [],
            )
        )


        invite = (
            FoodInvite.objects.create(

                creator_user_id=
                    request.user.id,

                **validated_data,
            )
        )


        unique_ids = set(
            recipient_ids
        )


        unique_ids.discard(
            request.user.id
        )


        FoodInviteParticipant.objects.bulk_create(
            [
                FoodInviteParticipant(
                    invite=
                        invite,

                    user_id=
                        user_id,

                    status=
                        "invited",
                )

                for user_id
                in unique_ids
            ]
        )


        return invite


# ============================================================
# RESTAURANT IMAGE SERIALIZER
#
# Actual image lives in Netlify Blob.
# Django stores:
#
# image_blob_key
# image_url
# image_original_name
# image_content_type
# ============================================================

class RestaurantImageSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = RestaurantImage

        fields = (
            "id",

            "image_url",

            "image_blob_key",

            "image_original_name",

            "image_content_type",

            "caption",

            "sort_order",

            "is_active",

            "created_at",

            "updated_at",
        )


        read_only_fields = (
            "id",

            "image_blob_key",

            "image_url",

            "image_original_name",

            "image_content_type",

            "created_at",

            "updated_at",
        )


# ============================================================
# RESTAURANT MENU ITEM SERIALIZER
# ============================================================

class RestaurantMenuItemSerializer(
    serializers.ModelSerializer
):

    is_vegetarian = (
        serializers.SerializerMethodField()
    )


    class Meta:

        model = RestaurantMenuItem

        fields = (
            "id",

            "name",

            "description",

            "category",

            "food_type",

            "price",

            # -----------------------------------------------
            # NETLIFY BLOB IMAGE
            # -----------------------------------------------

            "image_url",

            "image_blob_key",

            "image_original_name",

            "image_content_type",

            # -----------------------------------------------

            "is_vegetarian",

            "is_popular",

            "is_available",

            "sort_order",

            "created_at",

            "updated_at",
        )


        read_only_fields = (
            "id",

            "image_url",

            "image_blob_key",

            "image_original_name",

            "image_content_type",

            "is_vegetarian",

            "created_at",

            "updated_at",
        )


    # ========================================================
    # VEGETARIAN
    # ========================================================

    def get_is_vegetarian(
        self,
        obj,
    ):

        return (
            obj.food_type
            in
            (
                "vegetarian",
                "vegan",
            )
        )


# ============================================================
# RESTAURANT SERIALIZER
# ============================================================

class RestaurantSerializer(
    serializers.ModelSerializer
):

    images = serializers.SerializerMethodField()

    menu_items = serializers.SerializerMethodField()

    facilities = serializers.SerializerMethodField()


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

            # NEW
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

            "image_url",
            "image_blob_key",
            "image_original_name",
            "image_content_type",

            "images",
            "menu_items",
            "facilities",

            "is_foodkindl_partner",
            "accepts_foodkindl_booking",

            "is_active",

            "created_at",
            "updated_at",
        )


        read_only_fields = (
            "id",

            # Coordinates generated by admin geocoder.
            "latitude",
            "longitude",

            "image_url",
            "image_blob_key",
            "image_original_name",
            "image_content_type",

            "images",
            "menu_items",
            "facilities",

            "created_at",
            "updated_at",
        )


    def get_images(
        self,
        obj,
    ):

        images = (
            obj.images
            .filter(
                is_active=True
            )
            .order_by(
                "sort_order",
                "id",
            )
        )


        return RestaurantImageSerializer(
            images,
            many=True,
            context=self.context,
        ).data


    def get_menu_items(
        self,
        obj,
    ):

        menu_items = (
            obj.menu_items
            .filter(
                is_available=True
            )
            .order_by(
                "sort_order",
                "category",
                "name",
            )
        )


        return RestaurantMenuItemSerializer(
            menu_items,
            many=True,
            context=self.context,
        ).data


    def get_facilities(
        self,
        obj,
    ):

        facilities = []


        if obj.has_parking:
            facilities.append(
                "Parking"
            )


        if obj.has_wifi:
            facilities.append(
                "Wi-Fi"
            )


        if obj.accepts_cards:
            facilities.append(
                "Card Payments"
            )


        if obj.family_friendly:
            facilities.append(
                "Family Friendly"
            )


        if obj.outdoor_seating:
            facilities.append(
                "Outdoor Seating"
            )


        if obj.wheelchair_accessible:
            facilities.append(
                "Wheelchair Accessible"
            )


        if obj.serves_vegetarian:
            facilities.append(
                "Vegetarian Options"
            )


        if obj.serves_non_vegetarian:
            facilities.append(
                "Non Vegetarian Options"
            )


        return facilities
    
# ============================================================
# RESTAURANT BOOKING SERIALIZER
# ============================================================

class RestaurantBookingSerializer(
    serializers.ModelSerializer
):

    # ========================================================
    # RESTAURANT DETAILS
    # ========================================================

    restaurant_name = (
        serializers.SerializerMethodField()
    )


    restaurant_image_url = (
        serializers.SerializerMethodField()
    )


    restaurant_city = (
        serializers.SerializerMethodField()
    )


    restaurant_locality = (
        serializers.SerializerMethodField()
    )


    restaurant_address = (
        serializers.SerializerMethodField()
    )


    # ========================================================
    # USER DETAILS
    # ========================================================

    user_name = (
        serializers.SerializerMethodField()
    )


    user_email = (
        serializers.SerializerMethodField()
    )


    class Meta:

        model = RestaurantBooking

        fields = (
            "id",

            # -----------------------------------------------
            # USER
            # -----------------------------------------------

            "user",

            "user_name",

            "user_email",

            # -----------------------------------------------
            # RESTAURANT
            # -----------------------------------------------

            "restaurant",

            "restaurant_name",

            "restaurant_image_url",

            "restaurant_city",

            "restaurant_locality",

            "restaurant_address",

            # -----------------------------------------------
            # BOOKING
            # -----------------------------------------------

            "booking_date",

            "booking_time",

            "guest_count",

            "special_request",

            "food_invite_id",

            # -----------------------------------------------
            # BOOKING REFERENCE
            # -----------------------------------------------

            "booking_reference",

            # -----------------------------------------------
            # STATUS
            # -----------------------------------------------

            "status",

            # -----------------------------------------------
            # TIMESTAMPS
            # -----------------------------------------------

            "created_at",

            "updated_at",
        )


        read_only_fields = (
            "id",

            "user",

            "user_name",

            "user_email",

            "restaurant_name",

            "restaurant_image_url",

            "restaurant_city",

            "restaurant_locality",

            "restaurant_address",

            "booking_reference",

            "status",

            "created_at",

            "updated_at",
        )


    # ========================================================
    # VALIDATE RESTAURANT
    # ========================================================

    def validate_restaurant(
        self,
        restaurant,
    ):

        if not restaurant:

            raise serializers.ValidationError(
                "Restaurant is required."
            )


        if (
            not restaurant.is_active
        ):

            raise serializers.ValidationError(
                (
                    "This restaurant is "
                    "currently unavailable."
                )
            )


        if (
            not restaurant
            .is_foodkindl_partner
        ):

            raise serializers.ValidationError(
                (
                    "This restaurant is not "
                    "a FoodKindl partner."
                )
            )


        if (
            not restaurant
            .accepts_foodkindl_booking
        ):

            raise serializers.ValidationError(
                (
                    "This restaurant is not "
                    "accepting FoodKindl bookings."
                )
            )


        return restaurant


    # ========================================================
    # VALIDATE GUEST COUNT
    # ========================================================

    def validate_guest_count(
        self,
        guest_count,
    ):

        if (
            guest_count <
            1
        ):

            raise serializers.ValidationError(
                (
                    "At least one "
                    "guest is required."
                )
            )


        return guest_count


    # ========================================================
    # RESTAURANT NAME
    # ========================================================

    def get_restaurant_name(
        self,
        obj,
    ):

        if not obj.restaurant:

            return ""


        return (
            obj.restaurant.name
        )


    # ========================================================
    # RESTAURANT MAIN HTTPS IMAGE
    # ========================================================

    def get_restaurant_image_url(
        self,
        obj,
    ):

        restaurant = (
            obj.restaurant
        )


        if not restaurant:

            return None


        image_url = (
            restaurant.image_url
            or ""
        )


        # Restaurant photos are public.
        # Return only HTTPS URLs.

        if (
            image_url
            and image_url.startswith(
                "https://"
            )
        ):

            return image_url


        return None


    # ========================================================
    # RESTAURANT CITY
    # ========================================================

    def get_restaurant_city(
        self,
        obj,
    ):

        if not obj.restaurant:

            return ""


        return (
            obj.restaurant.city
            or ""
        )


    # ========================================================
    # RESTAURANT LOCALITY
    # ========================================================

    def get_restaurant_locality(
        self,
        obj,
    ):

        if not obj.restaurant:

            return ""


        return (
            obj.restaurant.locality
            or ""
        )


    # ========================================================
    # RESTAURANT ADDRESS
    # ========================================================

    def get_restaurant_address(
        self,
        obj,
    ):

        if not obj.restaurant:

            return ""


        restaurant = (
            obj.restaurant
        )


        return (
            ", ".join(
                [
                    value

                    for value
                    in (
                        restaurant.address,
                        restaurant.locality,
                        restaurant.city,
                        restaurant.pincode,
                    )

                    if value
                ]
            )
        )


    # ========================================================
    # USER NAME
    # ========================================================

    def get_user_name(
        self,
        obj,
    ):

        if not obj.user:

            return (
                "FoodKindl Member"
            )


        full_name = (
            obj.user
            .get_full_name()
            .strip()
        )


        return (
            full_name
            or obj.user.first_name
            or obj.user.email
            or obj.user.username
            or "FoodKindl Member"
        )


    # ========================================================
    # USER EMAIL
    # ========================================================

    def get_user_email(
        self,
        obj,
    ):

        if not obj.user:

            return ""


        return (
            obj.user.email
            or ""
        )


    # ========================================================
    # OBJECT-LEVEL VALIDATION
    # ========================================================

    def validate(
        self,
        attrs,
    ):

        booking_date = (
            attrs.get(
                "booking_date"
            )
        )


        booking_time = (
            attrs.get(
                "booking_time"
            )
        )


        guest_count = (
            attrs.get(
                "guest_count",
                2,
            )
        )


        if not booking_date:

            raise serializers.ValidationError(
                {
                    "booking_date":
                        (
                            "Booking date "
                            "is required."
                        )
                }
            )


        if not booking_time:

            raise serializers.ValidationError(
                {
                    "booking_time":
                        (
                            "Booking time "
                            "is required."
                        )
                }
            )


        if (
            guest_count <
            1
        ):

            raise serializers.ValidationError(
                {
                    "guest_count":
                        (
                            "At least one "
                            "guest is required."
                        )
                }
            )


        return attrs


    # ========================================================
    # CREATE BOOKING
    # ========================================================

    def create(
        self,
        validated_data,
    ):

        request = (
            self.context.get(
                "request"
            )
        )


        if (
            not request
            or not request.user
            or not request.user.is_authenticated
        ):

            raise serializers.ValidationError(
                (
                    "Authentication "
                    "is required."
                )
            )


        booking = (
            RestaurantBooking.objects.create(
                user=
                    request.user,

                **validated_data,
            )
        )


        return booking
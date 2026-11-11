from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers
from django.core.exceptions import ObjectDoesNotExist
from .models import DineOut, DineOutResponse


User = get_user_model()


class DineOutMemberSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    locality = serializers.SerializerMethodField()
    occupation = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "name",
            "bio",
            "city",
            "locality",
            "occupation",
            "profile_image_url",
        )

    def get_name(self, user):
        full_name = user.get_full_name().strip()
        return full_name or user.get_username()

    def _profile(self, user):
        try:
            return user.profile
        except (AttributeError, ObjectDoesNotExist):
            return None

    def _details_are_public(self, profile):
        if profile is None:
            return True

        for flag in ("is_private", "is_profile_private", "private_profile"):
            if getattr(profile, flag, False):
                return False

        visibility = getattr(profile, "visibility", "")
        if visibility and str(visibility).lower() not in {"public", "everyone"}:
            return False

        return True

    def _first_text(self, user, *attribute_names):
        profile = self._profile(user)
        if not self._details_are_public(profile):
            return ""

        for source in (profile, user):
            if source is None:
                continue
            for attribute in attribute_names:
                value = getattr(source, attribute, "")
                if isinstance(value, str) and value.strip():
                    return value.strip()
        return ""

    def get_bio(self, user):
        return self._first_text(user, "bio", "about_me", "about", "description")

    def get_city(self, user):
        return self._first_text(user, "city")

    def get_locality(self, user):
        return self._first_text(user, "locality", "area", "neighborhood")

    def get_occupation(self, user):
        return self._first_text(user, "occupation", "profession", "job_title", "workplace")

    def get_profile_image_url(self, user):
        profile = self._profile(user)
        if not self._details_are_public(profile):
            return ""

        candidates = (
            "profile_image_url",
            "profile_photo_url",
            "avatar_url",
            "image_url",
            "profile_image",
            "profile_photo",
            "profile_picture",
            "avatar",
        )
        for source in (profile, user):
            if source is None:
                continue
            for attribute in candidates:
                value = getattr(source, attribute, None)
                if not value:
                    continue
                try:
                    return value.url if hasattr(value, "url") else str(value)
                except (ValueError, AttributeError):
                    continue
        return ""                                     


class DineOutSerializer(serializers.ModelSerializer):
    host = DineOutMemberSerializer(read_only=True)
    is_host = serializers.SerializerMethodField()
    
    accepted_guest_members = serializers.SerializerMethodField()

    # Returned by the API for displaying selected guests
    invited_members = DineOutMemberSerializer(
        many=True,
        read_only=True,
    )

    # Sent by React when creating or updating a Dine Out
    invited_member_ids = serializers.PrimaryKeyRelatedField(
        source="invited_members",
        queryset=User.objects.filter(
            is_active=True,
            is_staff=False,
            is_superuser=False,
            profile__account_type="member",
            profile__member_profile_enabled=True,
        ),
        many=True,
        write_only=True,
        required=False,
    )

    accepted_guests = serializers.SerializerMethodField()
    my_response_status = serializers.SerializerMethodField()

    class Meta:
        model = DineOut

        fields = (
            "id",
            "host",
            "title",
            "description",
            "restaurant_external_id",
            "restaurant_name",
            "restaurant_address",
            "restaurant_cuisine",
            "restaurant_phone",
            "restaurant_website",
            "restaurant_image_url",
            "latitude",
            "longitude",
            "starts_at",
            "maximum_guests",
            "budget_label",
            "booking_status",
            "dietary_notes",
            "meetup_notes",
            "verified_only",
            "women_only",
            "visibility",
            "status",
            "invited_member_ids",
            "invited_members",
            "accepted_guests",
            "my_response_status",
            "created_at",
            "updated_at",
            "is_host",
            
            "restaurant_website",
            "restaurant_image_url",
            "searched_food",
            "food_description",
            "food_image_url",
            "food_description_source",
            "restaurant_menu_items",
            "accepted_guest_members",
        )

        read_only_fields = (
            "host",
            "created_at",
            "updated_at",
        )

    def get_is_host(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return obj.host_id == request.user.id
    
    def get_accepted_guest_members(self, obj):
        accepted_responses = (
            obj.responses
            .filter(status=DineOutResponse.Status.ACCEPTED)
            .select_related("guest")
            .order_by("created_at")
        )
        guests = [response.guest for response in accepted_responses]

        return DineOutMemberSerializer(
            guests,
            many=True,
            context=self.context,
        ).data

    def validate(self, attrs):
        latitude = attrs.get(
            "latitude",
            getattr(self.instance, "latitude", None),
        )

        longitude = attrs.get(
            "longitude",
            getattr(self.instance, "longitude", None),
        )

        visibility = attrs.get(
            "visibility",
            getattr(
                self.instance,
                "visibility",
                DineOut.Visibility.PUBLIC,
            ),
        )

        invited_members = attrs.get("invited_members")

        maximum_guests = attrs.get(
            "maximum_guests",
            getattr(self.instance, "maximum_guests", 4),
        )

        if latitude is not None and not -90 <= latitude <= 90:
            raise serializers.ValidationError({
                "latitude": "Invalid latitude.",
            })

        if longitude is not None and not -180 <= longitude <= 180:
            raise serializers.ValidationError({
                "longitude": "Invalid longitude.",
            })

        if invited_members is not None:
            invited_count = len(invited_members)
        elif self.instance:
            invited_count = self.instance.invited_members.count()
        else:
            invited_count = 0

        if (
            visibility == DineOut.Visibility.INVITED_ONLY
            and invited_count == 0
        ):
            raise serializers.ValidationError({
                "invited_member_ids": (
                    "Select at least one guest for a "
                    "selected-guests-only Dine Out."
                ),
            })

        if invited_count > maximum_guests:
            raise serializers.ValidationError({
                "invited_member_ids": (
                    f"You selected {invited_count} guests, but "
                    f"the maximum allowed is {maximum_guests}."
                ),
            })

        request = self.context.get("request")

        if (
            request
            and request.user.is_authenticated
            and invited_members is not None
            and request.user in invited_members
        ):
            raise serializers.ValidationError({
                "invited_member_ids": (
                    "You cannot add yourself to the invited guest list."
                ),
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        invited_members = validated_data.pop("invited_members", [])

        dine_out = DineOut.objects.create(**validated_data)
        dine_out.invited_members.set(invited_members)

        DineOutResponse.objects.bulk_create(
            [
                DineOutResponse(
                    dine_out=dine_out,
                    guest=user,
                    status=DineOutResponse.Status.PENDING,
                )
                for user in invited_members
            ],
            ignore_conflicts=True,
        )

        return dine_out

    @transaction.atomic
    def update(self, instance, validated_data):
        invited_members = validated_data.pop("invited_members", None)

        instance = super().update(instance, validated_data)

        if invited_members is not None:
            invited_ids = [user.id for user in invited_members]
            instance.invited_members.set(invited_members)

            # Remove responses for users who are no longer invited
            instance.responses.exclude(
                guest_id__in=invited_ids
            ).delete()

            existing_guest_ids = set(
                instance.responses.values_list("guest_id", flat=True)
            )

            new_responses = [
                DineOutResponse(
                    dine_out=instance,
                    guest=user,
                    status=DineOutResponse.Status.PENDING,
                )
                for user in invited_members
                if user.id not in existing_guest_ids
            ]

            DineOutResponse.objects.bulk_create(
                new_responses,
                ignore_conflicts=True,
            )

        return instance

    def get_accepted_guests(self, obj):
        return obj.responses.filter(
            status=DineOutResponse.Status.ACCEPTED,
        ).count()

    def get_my_response_status(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return None

        response = obj.responses.filter(guest=request.user).first()
        return response.status if response else None


class DineOutResponseSerializer(serializers.ModelSerializer):
    guest = DineOutMemberSerializer(read_only=True)

    class Meta:
        model = DineOutResponse
        fields = (
            "id",
            "dine_out",
            "guest",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "dine_out",
            "guest",
            "created_at",
            "updated_at",
        )
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import DineOut, DineOutResponse


User = get_user_model()


class DineOutMemberSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "name",
        )

    def get_name(self, user):
        return (
            user.get_full_name()
            or user.get_username()
        )


class DineOutSerializer(serializers.ModelSerializer):
    host = DineOutMemberSerializer(
        read_only=True,
    )

    # Returned by the API for displaying selected guests
    invited_members = DineOutMemberSerializer(
        many=True,
        read_only=True,
    )

    # Sent by React when creating/updating a Dine Out
    invited_member_ids = serializers.PrimaryKeyRelatedField(
        source="invited_members",
        queryset=User.objects.all(),
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
        )

        read_only_fields = (
            "host",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        latitude = attrs.get(
            "latitude",
            getattr(
                self.instance,
                "latitude",
                None,
            ),
        )

        longitude = attrs.get(
            "longitude",
            getattr(
                self.instance,
                "longitude",
                None,
            ),
        )

        visibility = attrs.get(
            "visibility",
            getattr(
                self.instance,
                "visibility",
                DineOut.Visibility.PUBLIC,
            ),
        )

        invited_members = attrs.get(
            "invited_members",
            None,
        )

        maximum_guests = attrs.get(
            "maximum_guests",
            getattr(
                self.instance,
                "maximum_guests",
                4,
            ),
        )

        # Validate latitude
        if (
            latitude is not None
            and not -90 <= latitude <= 90
        ):
            raise serializers.ValidationError({
                "latitude": "Invalid latitude.",
            })

        # Validate longitude
        if (
            longitude is not None
            and not -180 <= longitude <= 180
        ):
            raise serializers.ValidationError({
                "longitude": "Invalid longitude.",
            })

        # Work out how many invited members the event will have
        if invited_members is not None:
            invited_count = len(invited_members)
        elif self.instance:
            invited_count = (
                self.instance
                .invited_members
                .count()
            )
        else:
            invited_count = 0

        # Private events must have at least one selected guest
        if (
            visibility
            == DineOut.Visibility.INVITED_ONLY
            and invited_count == 0
        ):
            raise serializers.ValidationError({
                "invited_member_ids": (
                    "Select at least one guest for a "
                    "selected-guests-only Dine Out."
                ),
            })

        # Do not allow more invited guests than maximum_guests
        if invited_count > maximum_guests:
            raise serializers.ValidationError({
                "invited_member_ids": (
                    f"You selected {invited_count} guests, "
                    f"but the maximum allowed is "
                    f"{maximum_guests}."
                ),
            })

        # Do not allow the host to invite themselves
        request = self.context.get("request")

        if (
            request
            and request.user.is_authenticated
            and invited_members is not None
            and request.user in invited_members
        ):
            raise serializers.ValidationError({
                "invited_member_ids": (
                    "You cannot add yourself to the "
                    "invited guest list."
                ),
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        invited_members = validated_data.pop(
            "invited_members",
            [],
        )

        dine_out = DineOut.objects.create(
            **validated_data
        )

        dine_out.invited_members.set(
            invited_members
        )

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
        invited_members = validated_data.pop(
            "invited_members",
            None,
        )

        instance = super().update(
            instance,
            validated_data,
        )

        # Only update guests if invited_member_ids
        # was included in the request
        if invited_members is not None:
            invited_ids = [
                user.id
                for user in invited_members
            ]

            instance.invited_members.set(
                invited_members
            )

            # Remove responses belonging to users
            # who are no longer invited
            instance.responses.exclude(
                guest_id__in=invited_ids
            ).delete()

            # Create pending responses for newly added guests
            existing_guest_ids = set(
                instance.responses.values_list(
                    "guest_id",
                    flat=True,
                )
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

        if (
            not request
            or not request.user.is_authenticated
        ):
            return None

        invitation_response = (
            obj.responses
            .filter(guest=request.user)
            .first()
        )

        if invitation_response:
            return invitation_response.status

        return None


class DineOutResponseSerializer(
    serializers.ModelSerializer
):
    guest = DineOutMemberSerializer(
        read_only=True,
    )

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
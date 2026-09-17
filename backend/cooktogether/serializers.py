from django.contrib.auth import get_user_model

from rest_framework import serializers

from .models import (
    CookTogether,
    CookTogetherRequest,
)


User = get_user_model()


class UserSummarySerializer(
    serializers.ModelSerializer
):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User

        fields = (
            "id",
            "name",
            "email",
        )

        read_only_fields = fields

    def get_name(self, user):
        return (
            user.get_full_name()
            or user.get_username()
            or user.email
        )


class InvitedMemberSerializer(
    serializers.ModelSerializer
):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User

        fields = (
            "id",
            "full_name",
            "email",
        )

        read_only_fields = fields

    def get_full_name(self, user):
        return (
            user.get_full_name()
            or user.get_username()
            or user.email
        )


class CookTogetherSerializer(
    serializers.ModelSerializer
):
    host = UserSummarySerializer(
        read_only=True
    )

    host_name = serializers.SerializerMethodField()

    invited_member_ids = (
        serializers.PrimaryKeyRelatedField(
            source="invited_members",
            queryset=User.objects.all(),
            many=True,
            write_only=True,
            required=False,
        )
    )

    invited_members = InvitedMemberSerializer(
        many=True,
        read_only=True,
    )

    is_host = serializers.SerializerMethodField()

    is_invited = serializers.SerializerMethodField()

    my_invitation_status = (
        serializers.SerializerMethodField()
    )

    my_invitation_type = (
        serializers.SerializerMethodField()
    )

    approved_guest_count = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = CookTogether

        fields = (
            "id",
            "host",
            "host_name",
            "title",
            "dish",
            "description",
            "event_date",
            "start_time",
            "location_name",
            "exact_address",
            "cover_photo",
            "visibility",
            "verified_only",
            "women_only",
            "host_approval_required",
            "maximum_guests",
            "dietary_notes",
            "status",
            "published_at",
            "created_at",
            "updated_at",
            "invited_member_ids",
            "invited_members",
            "is_host",
            "is_invited",
            "my_invitation_status",
            "my_invitation_type",
            "approved_guest_count",
        )

        read_only_fields = (
            "id",
            "host",
            "host_name",
            "status",
            "published_at",
            "created_at",
            "updated_at",
            "invited_members",
            "is_host",
            "is_invited",
            "my_invitation_status",
            "my_invitation_type",
            "approved_guest_count",
        )

    def get_host_name(self, obj):
        return (
            obj.host.get_full_name()
            or obj.host.get_username()
            or obj.host.email
        )

    def get_is_host(self, obj):
        request = self.context.get("request")

        return bool(
            request
            and request.user.is_authenticated
            and obj.host_id == request.user.id
        )

    def _get_my_request(self, obj):
        request = self.context.get("request")

        if (
            not request
            or not request.user.is_authenticated
        ):
            return None

        prefetched_requests = getattr(
            obj,
            "_prefetched_objects_cache",
            {},
        ).get("join_requests")

        if prefetched_requests is not None:
            return next(
                (
                    item
                    for item in prefetched_requests
                    if item.guest_id
                    == request.user.id
                ),
                None,
            )

        return obj.join_requests.filter(
            guest=request.user
        ).first()

    def get_is_invited(self, obj):
        invitation = self._get_my_request(obj)

        return bool(
            invitation
            and invitation.invitation_type
            == CookTogetherRequest
            .InvitationType
            .HOST_INVITE
        )

    def get_my_invitation_status(self, obj):
        invitation = self._get_my_request(obj)

        return (
            invitation.status
            if invitation
            else None
        )

    def get_my_invitation_type(self, obj):
        invitation = self._get_my_request(obj)

        return (
            invitation.invitation_type
            if invitation
            else None
        )

    def get_approved_guest_count(self, obj):
        return obj.join_requests.filter(
            status=(
                CookTogetherRequest
                .Status
                .APPROVED
            )
        ).count()

    def validate_invited_members(self, members):
        request = self.context.get("request")

        if (
            request
            and request.user.is_authenticated
            and request.user in members
        ):
            raise serializers.ValidationError(
                "You cannot invite yourself."
            )

        return members

    def validate(self, attrs):
        maximum_guests = attrs.get(
            "maximum_guests",
            getattr(
                self.instance,
                "maximum_guests",
                6,
            ),
        )

        invited_members = attrs.get(
            "invited_members"
        )

        if (
            invited_members is not None
            and len(invited_members)
            > maximum_guests
        ):
            raise serializers.ValidationError(
                {
                    "invited_member_ids": (
                        "The number of invited "
                        "members cannot exceed "
                        "the maximum guest count."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        invited_members = validated_data.pop(
            "invited_members",
            [],
        )

        cook_together = (
            CookTogether.objects.create(
                **validated_data
            )
        )

        if invited_members:
            cook_together.invited_members.set(
                invited_members
            )

        return cook_together

    def update(
        self,
        instance,
        validated_data,
    ):
        invited_members = validated_data.pop(
            "invited_members",
            None,
        )

        instance = super().update(
            instance,
            validated_data,
        )

        if invited_members is not None:
            instance.invited_members.set(
                invited_members
            )

        return instance

    # def to_representation(self, instance):
    #     data = super().to_representation(
    #         instance
    #     )

    #     request = self.context.get("request")

    #     if (
    #         not request
    #         or not request.user.is_authenticated
    #     ):
    #         data["exact_address"] = ""
    #         return data

    #     if instance.host_id == request.user.id:
    #         return data

    #     is_approved = (
    #         instance.join_requests.filter(
    #             guest=request.user,
    #             status=(
    #                 CookTogetherRequest
    #                 .Status
    #                 .APPROVED
    #             ),
    #         ).exists()
    #     )

    #     if not is_approved:
    #         data["exact_address"] = ""

    #     return data


class JoinRequestSerializer(
    serializers.ModelSerializer
):
    guest = UserSummarySerializer(
        read_only=True
    )

    cook_together_details = (
        CookTogetherSerializer(
            source="cook_together",
            read_only=True,
        )
    )

    class Meta:
        model = CookTogetherRequest

        fields = (
            "id",
            "cook_together",
            "cook_together_details",
            "guest",
            "note",
            "status",
            "invitation_type",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "guest",
            "status",
            "invitation_type",
            "created_at",
            "updated_at",
        )
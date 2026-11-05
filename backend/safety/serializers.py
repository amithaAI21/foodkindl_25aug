from rest_framework import serializers

from .models import (
    SOSEvent,
    TrustedContact,
)


class TrustedContactSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = TrustedContact

        fields = (
            "id",
            "name",
            "relationship",
            "phone_number",
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )


    def validate_name(
        self,
        value,
    ):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Contact name is required."
            )

        return value


    def validate_relationship(
        self,
        value,
    ):
        return value.strip()


    def validate_phone_number(
        self,
        value,
    ):
        value = (
            value
            .strip()
            .replace(" ", "")
            .replace("-", "")
        )


        if not value:
            raise serializers.ValidationError(
                "Phone number is required."
            )


        if value.startswith("+"):
            digits = value[1:]
        else:
            digits = value


        if not digits.isdigit():
            raise serializers.ValidationError(
                "Enter a valid phone number."
            )


        if len(digits) < 8:
            raise serializers.ValidationError(
                "Phone number is too short."
            )


        if len(digits) > 15:
            raise serializers.ValidationError(
                "Phone number is too long."
            )


        return value


class SOSEventSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = SOSEvent

        fields = (
            "id",
            "latitude",
            "longitude",
            "location_accuracy",
            "status",
            "activated_at",
            "resolved_at",
            "tracking_token",
            "location_updated_at",
        )

        read_only_fields = (
            "id",
            "status",
            "activated_at",
            "resolved_at",
            "tracking_token",
            "location_updated_at",
        )


    def validate_latitude(
        self,
        value,
    ):
        if value is None:
            return value


        if (
            value < -90
            or value > 90
        ):
            raise serializers.ValidationError(
                "Latitude must be between -90 and 90."
            )


        return value


    def validate_longitude(
        self,
        value,
    ):
        if value is None:
            return value


        if (
            value < -180
            or value > 180
        ):
            raise serializers.ValidationError(
                "Longitude must be between -180 and 180."
            )


        return value


    def validate_location_accuracy(
        self,
        value,
    ):
        if value is None:
            return value


        if value < 0:
            raise serializers.ValidationError(
                "Location accuracy cannot be negative."
            )


        return value
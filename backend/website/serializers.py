from rest_framework import serializers
from .models import WaitlistEntry, Feedback, HomepageVideo


class WaitlistEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WaitlistEntry
        fields = (
            "id",
            "full_name",
            "email",
            "city",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = (
            "id",
            "name",
            "email",
            "feedback_type",
            "rating",
            "message",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class HomepageVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepageVideo
        fields = (
            "id",
            "title",
            "video_url",
            "poster_url",
            "updated_at",
        )
        read_only_fields = fields
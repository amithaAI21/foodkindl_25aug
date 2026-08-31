import os

import requests

from django import forms
from django.conf import settings
from django.contrib import admin

from .models import (
    Feedback,
    HomepageVideo,
    WaitlistEntry,
)


# ============================================================
# HOMEPAGE VIDEO ADMIN FORM
# ============================================================

class HomepageVideoAdminForm(forms.ModelForm):

    video_file = forms.FileField(
        required=False,
        help_text=(
            "Upload MP4, WebM or MOV. "
            "The video will be stored in Netlify Blobs."
        ),
    )

    class Meta:
        model = HomepageVideo

        fields = (
            "title",
            "video_file",
            "video_url",
            "poster_url",
            "is_active",
        )


    # ========================================================
    # VALIDATE + UPLOAD VIDEO
    # ========================================================

    def clean(self):

        cleaned_data = super().clean()

        video_file = cleaned_data.get(
            "video_file"
        )

        # ----------------------------------------------------
        # NO NEW FILE
        # ----------------------------------------------------

        if not video_file:
            return cleaned_data


        # ----------------------------------------------------
        # FILE TYPE
        # ----------------------------------------------------

        allowed_types = {
            "video/mp4",
            "video/webm",
            "video/quicktime",
        }

        content_type = (
            getattr(
                video_file,
                "content_type",
                "",
            )
            or ""
        ).lower()


        if content_type not in allowed_types:

            raise forms.ValidationError(
                (
                    "Only MP4, WebM and MOV "
                    "videos are allowed."
                )
            )


        # ----------------------------------------------------
        # FILE SIZE
        # ----------------------------------------------------

        max_size = (
            150
            * 1024
            * 1024
        )

        if video_file.size > max_size:

            raise forms.ValidationError(
                "Video must be smaller than 150 MB."
            )


        # ----------------------------------------------------
        # READ SETTINGS
        # ----------------------------------------------------

        upload_url = getattr(
            settings,
            "NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL",
            "",
        )

        upload_secret = getattr(
            settings,
            "NETLIFY_VIDEO_UPLOAD_SECRET",
            "",
        )


        if not upload_url:

            raise forms.ValidationError(
                (
                    "NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL "
                    "is missing in Render."
                )
            )


        if not upload_secret:

            raise forms.ValidationError(
                (
                    "NETLIFY_VIDEO_UPLOAD_SECRET "
                    "is missing in Render."
                )
            )


        # ----------------------------------------------------
        # SEND VIDEO TO NETLIFY
        # ----------------------------------------------------

        try:

            video_file.seek(0)

            response = requests.post(
                upload_url,

                data=video_file.read(),

                headers={
                    "Content-Type":
                        content_type,

                    "X-File-Name":
                        video_file.name,

                    "X-FoodKindl-Upload-Secret":
                        upload_secret,
                },

                timeout=180,
            )


        except requests.RequestException as exc:

            raise forms.ValidationError(
                (
                    "Unable to contact Netlify "
                    f"video upload service: {exc}"
                )
            )


        # ----------------------------------------------------
        # HANDLE NETLIFY ERROR
        # ----------------------------------------------------

        if not response.ok:

            try:

                error_data = (
                    response.json()
                )

                error_message = (
                    error_data.get(
                        "error"
                    )
                    or
                    error_data.get(
                        "detail"
                    )
                    or
                    response.text
                )

            except Exception:

                error_message = (
                    response.text
                    or
                    "Unknown Netlify error."
                )


            raise forms.ValidationError(
                (
                    "Homepage video upload failed. "
                    f"Netlify returned "
                    f"{response.status_code}: "
                    f"{error_message}"
                )
            )


        # ----------------------------------------------------
        # PARSE SUCCESS RESPONSE
        # ----------------------------------------------------

        try:

            result = response.json()

        except ValueError:

            raise forms.ValidationError(
                (
                    "Netlify upload succeeded "
                    "but returned invalid JSON."
                )
            )


        blob_key = (
            result.get("key")
            or
            result.get("blob_key")
            or
            ""
        )


        video_url = (
            result.get("video_url")
            or
            result.get("url")
            or
            ""
        )


        if not blob_key:

            raise forms.ValidationError(
                (
                    "Netlify response did not "
                    "contain a video key."
                )
            )


        if not video_url:

            raise forms.ValidationError(
                (
                    "Netlify response did not "
                    "contain a video URL."
                )
            )


        # ----------------------------------------------------
        # TEMPORARILY STORE VALUES FOR SAVE()
        # ----------------------------------------------------

        self._uploaded_blob_key = (
            blob_key
        )

        self._uploaded_video_url = (
            video_url
        )


        return cleaned_data


    # ========================================================
    # SAVE NETLIFY VALUES TO DATABASE
    # ========================================================

    def save(
        self,
        commit=True,
    ):

        instance = super().save(
            commit=False
        )


        if hasattr(
            self,
            "_uploaded_blob_key",
        ):

            instance.video_blob_key = (
                self._uploaded_blob_key
            )


        if hasattr(
            self,
            "_uploaded_video_url",
        ):

            instance.video_url = (
                self._uploaded_video_url
            )


        if commit:

            instance.save()

            self.save_m2m()


        return instance


# ============================================================
# HOMEPAGE VIDEO ADMIN
# ============================================================

@admin.register(HomepageVideo)
class HomepageVideoAdmin(admin.ModelAdmin):

    form = HomepageVideoAdminForm

    list_display = (
        "title",
        "is_active",
        "has_video_status",
        "updated_at",
    )

    list_filter = (
        "is_active",
    )

    search_fields = (
        "title",
    )

    readonly_fields = (
        "video_blob_key",
        "video_url",
        "created_at",
        "updated_at",
    )

    fieldsets = (

        (
            "Homepage Video",
            {
                "fields": (
                    "title",
                    "video_file",
                    "is_active",
                )
            },
        ),

        (
            "Uploaded Video",
            {
                "fields": (
                    "video_blob_key",
                    "video_url",
                    "poster_url",
                )
            },
        ),

        (
            "Dates",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )


    @admin.display(
        boolean=True,
        description="Video uploaded",
    )
    def has_video_status(
        self,
        obj,
    ):

        return obj.has_video


# ============================================================
# WAITLIST ADMIN
# ============================================================

@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(
    admin.ModelAdmin
):

    list_display = (
        "full_name",
        "email",
        "city",
        "created_at",
    )

    search_fields = (
        "full_name",
        "email",
        "city",
    )

    readonly_fields = (
        "created_at",
    )


# ============================================================
# FEEDBACK ADMIN
# ============================================================

@admin.register(Feedback)
class FeedbackAdmin(
    admin.ModelAdmin
):

    list_display = (
        "name",
        "feedback_type",
        "rating",
        "status",
        "created_at",
    )

    list_filter = (
        "feedback_type",
        "status",
        "rating",
    )

    search_fields = (
        "name",
        "email",
        "message",
    )

    readonly_fields = (
        "created_at",
    )
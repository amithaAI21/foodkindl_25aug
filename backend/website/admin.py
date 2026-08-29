import os
import uuid

import requests

from django import forms
from django.conf import settings
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from .models import (
    WaitlistEntry,
    Feedback,
    HomepageVideo,
)


# ============================================================
# WAITLIST ADMIN
# ============================================================

@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(admin.ModelAdmin):

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
class FeedbackAdmin(admin.ModelAdmin):

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


# ============================================================
# HOMEPAGE VIDEO ADMIN FORM
# ============================================================

class HomepageVideoAdminForm(forms.ModelForm):

    upload_video = forms.FileField(
        required=False,
        label="Upload homepage video",
        help_text=(
            "Choose an MP4, WebM or MOV video "
            "from your computer or phone."
        ),
        widget=forms.ClearableFileInput(
            attrs={
                "accept": (
                    "video/mp4,"
                    "video/webm,"
                    "video/quicktime"
                )
            }
        ),
    )

    class Meta:

        model = HomepageVideo

        fields = (
            "title",
            "upload_video",
            "poster_url",
            "is_active",
        )

    def clean_upload_video(self):

        video = self.cleaned_data.get(
            "upload_video"
        )

        if not video:
            return video

        allowed_content_types = (
            "video/mp4",
            "video/webm",
            "video/quicktime",
        )

        if (
            video.content_type
            not in allowed_content_types
        ):
            raise ValidationError(
                "Please upload an MP4, WebM or MOV video."
            )

        return video


# ============================================================
# HOMEPAGE VIDEO ADMIN
# ============================================================

@admin.register(HomepageVideo)
class HomepageVideoAdmin(admin.ModelAdmin):

    form = HomepageVideoAdminForm

    list_display = (
        "title",
        "is_active",
        "video_uploaded",
        "video_storage",
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
                    "upload_video",
                    "poster_url",
                    "is_active",
                )
            },
        ),

        (
            "Video Information",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "video_blob_key",
                    "video_url",
                    "created_at",
                    "updated_at",
                ),
            },
        ),

    )

    # ========================================================
    # ADMIN LIST - VIDEO UPLOADED
    # ========================================================

    @admin.display(
        boolean=True,
        description="Video uploaded",
    )
    def video_uploaded(self, obj):

        return bool(
            obj.video_url
        )

    # ========================================================
    # ADMIN LIST - STORAGE
    # ========================================================

    @admin.display(
        description="Storage",
    )
    def video_storage(self, obj):

        if not obj.video_url:
            return "-"

        if (
            "/media/" in obj.video_url
            or obj.video_url.startswith("/media/")
        ):
            return "Local"

        return "Netlify Blob"

    # ========================================================
    # SAVE MODEL
    # ========================================================

    def save_model(
        self,
        request,
        obj,
        form,
        change,
    ):

        video = form.cleaned_data.get(
            "upload_video"
        )

        # ====================================================
        # NEW VIDEO SELECTED
        # ====================================================

        if video:

            # ================================================
            # DEVELOPMENT
            # SAVE VIDEO LOCALLY
            # ================================================

            if settings.DEBUG:

                self._save_video_locally(
                    request=request,
                    obj=obj,
                    video=video,
                )

            # ================================================
            # PRODUCTION
            # UPLOAD VIDEO TO NETLIFY BLOB
            # ================================================

            else:

                self._upload_video_to_netlify(
                    obj=obj,
                    video=video,
                )

        # ====================================================
        # ONLY ONE ACTIVE HOMEPAGE VIDEO
        # ====================================================

        if obj.is_active:

            HomepageVideo.objects.exclude(
                pk=obj.pk
            ).update(
                is_active=False
            )

        # ====================================================
        # SAVE DATABASE RECORD
        # ====================================================

        super().save_model(
            request,
            obj,
            form,
            change,
        )

    # ========================================================
    # DEVELOPMENT LOCAL STORAGE
    # ========================================================

    def _save_video_locally(
        self,
        request,
        obj,
        video,
    ):

        try:

            video.seek(0)

            # --------------------------------------------
            # GET ORIGINAL EXTENSION
            # --------------------------------------------

            original_name = (
                video.name
                or "homepage-video.mp4"
            )

            extension = os.path.splitext(
                original_name
            )[1].lower()

            if extension not in (
                ".mp4",
                ".webm",
                ".mov",
            ):
                extension = ".mp4"

            # --------------------------------------------
            # UNIQUE FILE NAME
            # --------------------------------------------

            unique_name = (
                f"{uuid.uuid4().hex}"
                f"{extension}"
            )

            relative_path = (
                f"homepage/videos/"
                f"{unique_name}"
            )

            # --------------------------------------------
            # SAVE FILE
            # --------------------------------------------

            saved_path = default_storage.save(
                relative_path,
                ContentFile(
                    video.read()
                ),
            )

            # --------------------------------------------
            # BUILD MEDIA URL
            # --------------------------------------------

            media_url = default_storage.url(
                saved_path
            )

            absolute_video_url = (
                request.build_absolute_uri(
                    media_url
                )
            )

            # --------------------------------------------
            # SAVE DETAILS TO MODEL
            # --------------------------------------------

            obj.video_blob_key = (
                saved_path
            )

            obj.video_url = (
                absolute_video_url
            )

            print(
                "======================================"
            )

            print(
                "FOODKINDL HOMEPAGE VIDEO"
            )

            print(
                "MODE: DEVELOPMENT"
            )

            print(
                "LOCAL FILE:",
                saved_path,
            )

            print(
                "VIDEO URL:",
                absolute_video_url,
            )

            print(
                "======================================"
            )

        except Exception as exc:

            raise ValidationError(
                "Could not save homepage video "
                f"locally: {exc}"
            )

    # ========================================================
    # PRODUCTION NETLIFY BLOB STORAGE
    # ========================================================

    def _upload_video_to_netlify(
        self,
        obj,
        video,
    ):

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

        # --------------------------------------------
        # CHECK CONFIGURATION
        # --------------------------------------------

        if not upload_url:

            raise ValidationError(
                "NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL "
                "is not configured in settings."
            )

        if not upload_secret:

            raise ValidationError(
                "NETLIFY_VIDEO_UPLOAD_SECRET "
                "is not configured in settings."
            )

        try:

            video.seek(0)

            # ----------------------------------------
            # REQUEST HEADERS
            # ----------------------------------------

            headers = {

                "Content-Type": (
                    video.content_type
                    or "video/mp4"
                ),

                "X-FoodKindl-Upload-Secret": (
                    upload_secret
                ),

                "X-File-Name": (
                    video.name
                    or "homepage-video.mp4"
                ),

            }

            # ----------------------------------------
            # SEND VIDEO TO NETLIFY
            # ----------------------------------------

            response = requests.post(
                upload_url,
                data=video.read(),
                headers=headers,
                timeout=120,
            )

            # ----------------------------------------
            # NETLIFY RETURNED ERROR
            # ----------------------------------------

            if not response.ok:

                try:

                    error_data = (
                        response.json()
                    )

                    error_message = (
                        error_data.get(
                            "error"
                        )
                    )

                except Exception:

                    error_message = (
                        response.text
                    )

                raise ValidationError(
                    "Video upload failed. "
                    f"{error_message or response.status_code}"
                )

            # ----------------------------------------
            # PARSE RESPONSE
            # ----------------------------------------

            try:

                result = response.json()

            except Exception:

                raise ValidationError(
                    "Netlify returned an invalid "
                    "response while uploading video."
                )

            blob_key = result.get(
                "key"
            )

            video_url = result.get(
                "video_url"
            )

            # ----------------------------------------
            # VALIDATE RESPONSE
            # ----------------------------------------

            if (
                not blob_key
                or not video_url
            ):

                raise ValidationError(
                    "Netlify upload completed but "
                    "did not return the blob key "
                    "and video URL."
                )

            # ----------------------------------------
            # SAVE NETLIFY DETAILS
            # ----------------------------------------

            obj.video_blob_key = (
                blob_key
            )

            obj.video_url = (
                video_url
            )

            print(
                "======================================"
            )

            print(
                "FOODKINDL HOMEPAGE VIDEO"
            )

            print(
                "MODE: PRODUCTION"
            )

            print(
                "NETLIFY BLOB KEY:",
                blob_key,
            )

            print(
                "VIDEO URL:",
                video_url,
            )

            print(
                "======================================"
            )

        # --------------------------------------------
        # TIMEOUT
        # --------------------------------------------

        except requests.Timeout:

            raise ValidationError(
                "Video upload timed out. "
                "Please try a smaller video."
            )

        # --------------------------------------------
        # NETWORK ERROR
        # --------------------------------------------

        except requests.RequestException as exc:

            raise ValidationError(
                "Could not connect to the "
                "Netlify video upload service. "
                f"{exc}"
            )
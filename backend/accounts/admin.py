from django.contrib import admin
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    AdminNotification,
    Profile,
)


# ============================================================
# PROFILE ADMIN
# ============================================================

@admin.register(Profile)
class ProfileAdmin(
    admin.ModelAdmin
):

    # --------------------------------------------------------
    # LIST PAGE
    # --------------------------------------------------------

    list_display = (
        "user",
        "city",
        "gender",
        "dietary_preference",

        "government_id_status",

        "verification_status",
        "is_verified",
        "created_at",
    )


    # --------------------------------------------------------
    # FILTERS
    # --------------------------------------------------------

    list_filter = (
        "verification_status",
        "is_verified",
        "government_id_type",
        "gender",
        "dietary_preference",
        "women_only_mode",
    )


    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "city",
        "locality",
    )


    # --------------------------------------------------------
    # READ ONLY
    # --------------------------------------------------------

    readonly_fields = (
        "created_at",
        "updated_at",
        "verified_at",
        "government_id_preview",
    )


    # --------------------------------------------------------
    # MANY TO MANY
    # --------------------------------------------------------

    filter_horizontal = (
        "blocked_users",
    )


    # --------------------------------------------------------
    # GOVERNMENT ID STATUS
    # --------------------------------------------------------

    @admin.display(
        description="Government ID",
    )
    def government_id_status(
        self,
        obj,
    ):

        has_id = bool(
            obj.government_id_blob_key
            or
            obj.government_id_url
            or
            obj.government_id
        )

        if not has_id:

            return format_html(
                '<span style="color:#888;">'
                'Not uploaded'
                '</span>'
            )


        if obj.verification_status == "approved":

            return format_html(
                '<strong style="color:#1b8a3b;">'
                '✓ Approved'
                '</strong>'
            )


        if obj.verification_status == "rejected":

            return format_html(
                '<strong style="color:#c62828;">'
                '✕ Rejected'
                '</strong>'
            )


        return format_html(
            '<strong style="color:#d97706;">'
            '● Review required'
            '</strong>'
        )


    # --------------------------------------------------------
    # GOVERNMENT ID PREVIEW / LINK
    # --------------------------------------------------------

    @admin.display(
        description="Government ID Proof",
    )
    def government_id_preview(
        self,
        obj,
    ):

        if obj.government_id_url:

            return format_html(
                '<a href="{}" '
                'target="_blank" '
                'rel="noopener noreferrer">'
                'Open Government ID'
                '</a>',
                obj.government_id_url,
            )


        if obj.government_id:

            try:

                return format_html(
                    '<a href="{}" '
                    'target="_blank" '
                    'rel="noopener noreferrer">'
                    'Open Government ID'
                    '</a>',
                    obj.government_id.url,
                )

            except ValueError:

                pass


        if obj.government_id_blob_key:

            return format_html(
                '<span>'
                'Government ID uploaded to private storage.'
                '</span>'
            )


        return "No Government ID uploaded"


# ============================================================
# ADMIN NOTIFICATION ADMIN
# ============================================================

@admin.register(AdminNotification)
class AdminNotificationAdmin(
    admin.ModelAdmin
):

    # --------------------------------------------------------
    # LIST PAGE
    # --------------------------------------------------------

    list_display = (
        "notification_indicator",
        "title",
        "user",
        "profile_link",
        "notification_type",
        "is_read",
        "created_at",
    )


    # --------------------------------------------------------
    # FILTER
    # --------------------------------------------------------

    list_filter = (
        "is_read",
        "notification_type",
        "created_at",
    )


    # --------------------------------------------------------
    # SEARCH
    # --------------------------------------------------------

    search_fields = (
        "title",
        "message",
        "user__email",
        "user__first_name",
        "user__last_name",
    )


    # --------------------------------------------------------
    # READ ONLY
    # --------------------------------------------------------

    readonly_fields = (
        "notification_type",
        "title",
        "message",
        "user",
        "profile",
        "created_at",
        "read_at",
    )


    # --------------------------------------------------------
    # ACTIONS
    # --------------------------------------------------------

    actions = (
        "mark_as_read",
        "mark_as_unread",
    )


    # --------------------------------------------------------
    # NOTIFICATION ICON
    # --------------------------------------------------------

    @admin.display(
        description="",
    )
    def notification_indicator(
        self,
        obj,
    ):

        if obj.is_read:

            return format_html(
                '<span style="color:#888;">'
                '✓'
                '</span>'
            )


        return format_html(
            '<span style="font-size:18px;">'
            '🔔'
            '</span>'
        )


    # --------------------------------------------------------
    # PROFILE LINK
    # --------------------------------------------------------

    @admin.display(
        description="Review profile",
    )
    def profile_link(
        self,
        obj,
    ):

        if not obj.profile:

            return "-"


        url = reverse(
            "admin:accounts_profile_change",
            args=[
                obj.profile.pk,
            ],
        )


        return format_html(
            '<a href="{}">'
            '<strong>Review ID →</strong>'
            '</a>',
            url,
        )


    # --------------------------------------------------------
    # MARK READ
    # --------------------------------------------------------

    @admin.action(
        description=
            "Mark selected notifications as read"
    )
    def mark_as_read(
        self,
        request,
        queryset,
    ):

        queryset.update(
            is_read=True,
            read_at=timezone.now(),
        )


    # --------------------------------------------------------
    # MARK UNREAD
    # --------------------------------------------------------

    @admin.action(
        description=
            "Mark selected notifications as unread"
    )
    def mark_as_unread(
        self,
        request,
        queryset,
    ):

        queryset.update(
            is_read=False,
            read_at=None,
        )
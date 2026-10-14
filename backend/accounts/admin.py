
from django.contrib import admin
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html

from .models import AdminNotification, Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):

    # -----------------------------------------
    # ADMIN LIST DISPLAY
    # -----------------------------------------

    list_display = (
        "user",
        "phone_number_display",
        "account_type_badge",
        "preferred_portal",
        "member_profile_enabled",
        "profile_visibility",
        "city",
        "gender",
        "dietary_preference",
        "email_verified_badge",
        "created_at",
    )

    # -----------------------------------------
    # FILTERS
    # -----------------------------------------

    list_filter = (
        "account_type",
        "preferred_portal",
        "member_profile_enabled",
        "profile_visibility",
        ("email_verified_at", admin.EmptyFieldListFilter),
        "gender",
        "dietary_preference",
        "women_only_mode",
        "created_at",
    )

    # -----------------------------------------
    # SEARCH
    # -----------------------------------------

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "phone_number",
        "city",
        "locality",
        "postcode",
        "college_workplace",
        "role",
    )

    ordering = ("-created_at",)

    list_select_related = ("user",)

    # -----------------------------------------
    # READ ONLY FIELDS
    # -----------------------------------------

    readonly_fields = (
        "created_at",
        "updated_at",
        "email_address",
        "email_verified_at",
        "email_verified_badge",
        "account_type_summary",
        "verification_summary",
    )

    filter_horizontal = ("blocked_users",)

    # -----------------------------------------
    # ADMIN PROFILE SECTIONS
    # -----------------------------------------

    fieldsets = (

        (
            "Account",
            {
                "fields": (
                    "user",
                    "phone_number",
                    "account_type",
                    "preferred_portal",
                    "member_profile_enabled",
                    "profile_visibility",
                    "account_type_summary",
                )
            },
        ),

        (
            "Profile Information",
            {
                "fields": (
                    "bio",
                    "city",
                    "locality",
                    "postcode",
                    "college_workplace",
                    "role",
                    "gender",
                    "dietary_preference",
                    "women_only_mode",
                )
            },
        ),

        (
            "Food Preferences",
            {
                "fields": (
                    "interests",
                    "favorite_cuisines",
                    "food_connection_preferences",
                )
            },
        ),

        (
            "Profile Photos",
            {
                "fields": (
                    "profile_image_1",
                    "profile_image_1_blob_key",
                    "profile_image_1_url",
                    "profile_image_2",
                    "profile_image_2_blob_key",
                    "profile_image_2_url",
                    "profile_image_3",
                    "profile_image_3_blob_key",
                    "profile_image_3_url",
                ),
                "classes": ("collapse",),
            },
        ),

        (
            "Email Verification",
            {
                "fields": (
                    "email_address",
                    "email_verified_badge",
                    "email_verified_at",
                    "verification_summary",
                )
            },
        ),

        (
            "Blocked Members",
            {
                "fields": ("blocked_users",),
                "classes": ("collapse",),
            },
        ),

        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    # -----------------------------------------
    # BULK ADMIN ACTIONS
    # -----------------------------------------

    actions = (
        "mark_as_member",
        "mark_as_restaurant_partner",
        "enable_member_profile",
        "disable_member_profile",
    )

    # -----------------------------------------
    # PHONE NUMBER DISPLAY
    # -----------------------------------------

    @admin.display(
        description="Phone Number",
        ordering="phone_number",
    )
    def phone_number_display(self, obj):
        if not obj:
            return "-"

        return obj.phone_number or "-"

    # -----------------------------------------
    # ACCOUNT TYPE BADGE
    # -----------------------------------------

    @admin.display(
        description="Account Type",
        ordering="account_type",
    )
    def account_type_badge(self, obj):

        partner = obj.account_type == "partner"

        return format_html(
            '<strong style="color:{};background:{};'
            'padding:5px 9px;border-radius:999px;'
            'font-size:12px;">{}</strong>',
            "#c2410c" if partner else "#166534",
            "#fff7ed" if partner else "#ecfdf5",
            "Restaurant Partner"
            if partner
            else "FoodKindl Member",
        )

    # -----------------------------------------
    # EMAIL ADDRESS
    # -----------------------------------------

    @admin.display(description="Email Address")
    def email_address(self, obj):

        if not obj or not obj.user_id:
            return "-"

        return obj.user.email or "-"

    # -----------------------------------------
    # EMAIL VERIFICATION BADGE
    # -----------------------------------------

    @admin.display(
        description="Email Verified",
        boolean=True,
        ordering="email_verified_at",
    )
    def email_verified_badge(self, obj):

        return bool(
            obj and obj.is_email_verified
        )

    # -----------------------------------------
    # EMAIL VERIFICATION INFORMATION
    # -----------------------------------------

    @admin.display(
        description="Email Verification Information"
    )
    def verification_summary(self, obj):

        if not obj or not obj.pk:
            return "Save the profile first."

        if obj.is_email_verified:
            return (
                "Email verified through the verification link. "
                "This confirms access to the email address, "
                "not the person's identity."
            )

        return (
            "Email not verified. The user must open the "
            "verification email and click its link "
            "before logging in."
        )

    # -----------------------------------------
    # ACCOUNT EXPERIENCE
    # -----------------------------------------

    @admin.display(description="Account Experience")
    def account_type_summary(self, obj):

        if not obj or not obj.pk:
            return "Save the profile first."

        if obj.account_type == "partner":
            return (
                "Restaurant Partner: restaurant ownership, "
                "team access and permissions are managed "
                "through RestaurantTeamMember."
            )

        return (
            "FoodKindl Member: discover people, "
            "share food experiences and create food plans."
        )

    # -----------------------------------------
    # READONLY FIELD CONTROL
    # -----------------------------------------

    def get_readonly_fields(self, request, obj=None):

        fields = super().get_readonly_fields(
            request,
            obj,
        )

        # Keep verification attached to the
        # original user account.
        if obj:
            return (*fields, "user")

        return fields

    # -----------------------------------------
    # MARK AS MEMBER
    # -----------------------------------------

    @admin.action(
        description="Set selected profiles as FoodKindl Members"
    )
    def mark_as_member(self, request, queryset):

        count = queryset.update(
            account_type="member",
            preferred_portal="member",
            member_profile_enabled=True,
            updated_at=timezone.now(),
        )

        self.message_user(
            request,
            f"{count} profile(s) set as FoodKindl Member.",
        )

    # -----------------------------------------
    # MARK AS RESTAURANT PARTNER
    # -----------------------------------------

    @admin.action(
        description="Set selected profiles as Restaurant Partners"
    )
    def mark_as_restaurant_partner(
        self,
        request,
        queryset,
    ):

        count = queryset.update(
            account_type="partner",
            preferred_portal="restaurant",
            member_profile_enabled=False,
            updated_at=timezone.now(),
        )

        self.message_user(
            request,
            f"{count} profile(s) set as Restaurant Partner.",
        )

    # -----------------------------------------
    # ENABLE MEMBER PROFILE
    # -----------------------------------------

    @admin.action(
        description="Enable FoodKindl member profile"
    )
    def enable_member_profile(
        self,
        request,
        queryset,
    ):

        count = queryset.update(
            member_profile_enabled=True,
            updated_at=timezone.now(),
        )

        self.message_user(
            request,
            f"{count} member profile(s) enabled.",
        )

    # -----------------------------------------
    # DISABLE PARTNER MEMBER PROFILE
    # -----------------------------------------

    @admin.action(
        description="Disable member profile for restaurant partners"
    )
    def disable_member_profile(
        self,
        request,
        queryset,
    ):

        count = queryset.filter(
            account_type="partner"
        ).update(
            member_profile_enabled=False,
            updated_at=timezone.now(),
        )

        self.message_user(
            request,
            f"{count} partner member profile(s) disabled. "
            "Member accounts remain enabled.",
        )


# =============================================
# ADMIN NOTIFICATIONS
# =============================================

@admin.register(AdminNotification)
class AdminNotificationAdmin(admin.ModelAdmin):

    list_display = (
        "notification_indicator",
        "title",
        "user",
        "profile_link",
        "notification_type",
        "is_read",
        "created_at",
    )

    list_filter = (
        "is_read",
        "notification_type",
        "created_at",
    )

    search_fields = (
        "title",
        "message",
        "user__email",
        "user__first_name",
        "user__last_name",
    )

    readonly_fields = (
        "notification_type",
        "title",
        "message",
        "user",
        "profile",
        "created_at",
        "read_at",
    )

    ordering = ("-created_at",)

    list_select_related = (
        "user",
        "profile",
    )

    actions = (
        "mark_as_read",
        "mark_as_unread",
    )

    # -----------------------------------------
    # NOTIFICATION INDICATOR
    # -----------------------------------------

    @admin.display(description="Status")
    def notification_indicator(self, obj):

        return format_html(
            '<span style="color:{};font-size:18px;">'
            "{}</span>",
            "#9ca3af" if obj.is_read else "#d97706",
            "✓" if obj.is_read else "🔔",
        )

    # -----------------------------------------
    # PROFILE LINK
    # -----------------------------------------

    @admin.display(description="View Profile")
    def profile_link(self, obj):

        if not obj.profile_id:
            return "-"

        url = reverse(
            "admin:accounts_profile_change",
            args=[obj.profile_id],
            current_app=self.admin_site.name,
        )

        return format_html(
            '<a href="{}" style="font-weight:600;'
            'text-decoration:none;">'
            "View profile →</a>",
            url,
        )

    # -----------------------------------------
    # MARK NOTIFICATIONS AS READ
    # -----------------------------------------

    @admin.action(
        description="Mark selected notifications as read"
    )
    def mark_as_read(self, request, queryset):

        count = queryset.update(
            is_read=True,
            read_at=timezone.now(),
        )

        self.message_user(
            request,
            f"{count} notification(s) marked as read.",
        )

    # -----------------------------------------
    # MARK NOTIFICATIONS AS UNREAD
    # -----------------------------------------

    @admin.action(
        description="Mark selected notifications as unread"
    )
    def mark_as_unread(self, request, queryset):

        count = queryset.update(
            is_read=False,
            read_at=None,
        )

        self.message_user(
            request,
            f"{count} notification(s) marked as unread.",
        )

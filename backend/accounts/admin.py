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
class ProfileAdmin(admin.ModelAdmin):

    # ========================================================
    # LIST PAGE
    # ========================================================

    list_display = (
        "user",
        "account_type_badge",
        "preferred_portal",
        "member_profile_enabled",
        "profile_visibility",
        "city",
        "gender",
        "dietary_preference",
        "government_id_status",
        "verification_status_badge",
        "is_verified",
        "created_at",
    )

    # ========================================================
    # FILTERS
    # ========================================================

    list_filter = (
        "account_type",
        "preferred_portal",
        "member_profile_enabled",
        "profile_visibility",
        "verification_status",
        "is_verified",
        "government_id_type",
        "gender",
        "dietary_preference",
        "women_only_mode",
        "created_at",
    )

    # ========================================================
    # SEARCH
    # ========================================================

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "city",
        "locality",
        "postcode",
        "college_workplace",
        "role",
        "government_id_original_name",
    )

    # ========================================================
    # ORDERING
    # ========================================================

    ordering = (
        "-created_at",
    )

    # ========================================================
    # READ ONLY
    # ========================================================

    readonly_fields = (
        "created_at",
        "updated_at",
        "verified_at",
        "government_id_preview",
        "account_type_summary",
        "verification_summary",
    )

    # ========================================================
    # MANY TO MANY
    # ========================================================

    filter_horizontal = (
        "blocked_users",
    )

    # ========================================================
    # FIELDSETS
    # ========================================================

    fieldsets = (

        # ----------------------------------------------------
        # ACCOUNT
        # ----------------------------------------------------

        (
            "Account",
            {
                "fields": (
                    "user",
                    "account_type",
                    "preferred_portal",
                    "member_profile_enabled",
                    "profile_visibility",
                    "account_type_summary",
                )
            },
        ),

        # ----------------------------------------------------
        # PROFILE
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # FOOD PREFERENCES
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # PROFILE PHOTOS
        # ----------------------------------------------------

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
                "classes": (
                    "collapse",
                ),
            },
        ),

        # ----------------------------------------------------
        # GOVERNMENT ID
        # ----------------------------------------------------

        (
            "Government ID",
            {
                "fields": (
                    "government_id_type",

                    "government_id_preview",

                    "government_id",

                    "government_id_blob_key",

                    "government_id_url",

                    "government_id_original_name",

                    "government_id_content_type",
                )
            },
        ),

        # ----------------------------------------------------
        # VERIFICATION
        # ----------------------------------------------------

        (
            "Verification",
            {
                "fields": (
                    "verification_summary",

                    "verification_status",

                    "is_verified",

                    "rejection_reason",

                    "verified_by",

                    "verified_at",
                )
            },
        ),

        # ----------------------------------------------------
        # BLOCKED USERS
        # ----------------------------------------------------

        (
            "Blocked Members",
            {
                "fields": (
                    "blocked_users",
                ),
                "classes": (
                    "collapse",
                ),
            },
        ),

        # ----------------------------------------------------
        # TIMESTAMPS
        # ----------------------------------------------------

        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": (
                    "collapse",
                ),
            },
        ),
    )

    # ========================================================
    # ADMIN ACTIONS
    # ========================================================

    actions = (
        "mark_as_member",
        "mark_as_restaurant_partner",
        "enable_member_profile",
        "disable_member_profile",
        "approve_verification",
        "mark_verification_pending",
        "mark_verification_needs_attention",
    )

    # ========================================================
    # ACCOUNT TYPE BADGE
    # ========================================================

    @admin.display(
        description="Account Type",
        ordering="account_type",
    )
    def account_type_badge(
        self,
        obj,
    ):

        # IMPORTANT:
        # Profile.ACCOUNT_TYPE_CHOICES uses:
        #
        # member
        # partner

        if obj.account_type == "partner":

            return format_html(
                '<strong style="'
                'color:#c2410c;'
                'background:#fff7ed;'
                'padding:5px 9px;'
                'border-radius:999px;'
                'font-size:12px;'
                '">'
                'Restaurant Partner'
                '</strong>'
            )

        return format_html(
            '<strong style="'
            'color:#166534;'
            'background:#ecfdf5;'
            'padding:5px 9px;'
            'border-radius:999px;'
            'font-size:12px;'
            '">'
            'FoodKindl Member'
            '</strong>'
        )

    # ========================================================
    # ACCOUNT SUMMARY
    # ========================================================

    @admin.display(
        description="Account Experience",
    )
    def account_type_summary(
        self,
        obj,
    ):

        if not obj:
            return "-"

        if obj.account_type == "partner":

            return format_html(
                '<div style="'
                'background:#fff7ed;'
                'border:1px solid #fed7aa;'
                'padding:14px;'
                'border-radius:10px;'
                '">'
                '<strong style="color:#c2410c;">'
                'Restaurant Partner'
                '</strong>'
                '<br>'
                '<span style="color:#57534e;">'
                'This account opens the FoodKindl Restaurant Partner '
                'experience. Restaurant ownership, team access and '
                'permissions should be managed through '
                'RestaurantTeamMember.'
                '</span>'
                '</div>'
            )

        return format_html(
            '<div style="'
            'background:#ecfdf5;'
            'border:1px solid #bbf7d0;'
            'padding:14px;'
            'border-radius:10px;'
            '">'
            '<strong style="color:#166534;">'
            'FoodKindl Member'
            '</strong>'
            '<br>'
            '<span style="color:#57534e;">'
            'This account can use the normal FoodKindl member '
            'experience including Connect, Food Matches, '
            'Food Invites, CommuniQ and AI Kitchen.'
            '</span>'
            '</div>'
        )

    # ========================================================
    # GOVERNMENT ID STATUS
    # ========================================================

    @admin.display(
        description="Government ID",
    )
    def government_id_status(
        self,
        obj,
    ):

        # ----------------------------------------------------
        # RESTAURANT-ONLY PARTNER
        # ----------------------------------------------------

        if (
            obj.account_type == "partner"
            and
            not obj.member_profile_enabled
        ):

            return format_html(
                '<span style="'
                'color:#6b7280;'
                '">'
                'Not required'
                '</span>'
            )

        # ----------------------------------------------------
        # CHECK ID
        # ----------------------------------------------------

        has_id = bool(
            obj.government_id_blob_key
            or
            obj.government_id_url
            or
            obj.government_id
        )

        if not has_id:

            return format_html(
                '<span style="'
                'color:#9ca3af;'
                '">'
                'Not uploaded'
                '</span>'
            )

        # ----------------------------------------------------
        # APPROVED
        # ----------------------------------------------------

        if obj.verification_status == "approved":

            return format_html(
                '<strong style="'
                'color:#15803d;'
                '">'
                '✓ Approved'
                '</strong>'
            )

        # ----------------------------------------------------
        # REJECTED / NEEDS ATTENTION
        # ----------------------------------------------------

        if obj.verification_status == "rejected":

            return format_html(
                '<strong style="'
                'color:#dc2626;'
                '">'
                '● Needs attention'
                '</strong>'
            )

        # ----------------------------------------------------
        # PENDING
        # ----------------------------------------------------

        return format_html(
            '<strong style="'
            'color:#d97706;'
            '">'
            '● Review required'
            '</strong>'
        )

    # ========================================================
    # VERIFICATION STATUS BADGE
    # ========================================================

    @admin.display(
        description="Verification",
        ordering="verification_status",
    )
    def verification_status_badge(
        self,
        obj,
    ):

        status_value = (
            obj.verification_status
            or
            "not_submitted"
        )

        if status_value == "approved":

            return format_html(
                '<span style="'
                'background:#dcfce7;'
                'color:#166534;'
                'padding:4px 9px;'
                'border-radius:999px;'
                'font-weight:600;'
                '">'
                'Approved'
                '</span>'
            )

        if status_value == "rejected":

            return format_html(
                '<span style="'
                'background:#fee2e2;'
                'color:#991b1b;'
                'padding:4px 9px;'
                'border-radius:999px;'
                'font-weight:600;'
                '">'
                'Needs attention'
                '</span>'
            )

        if status_value == "pending":

            return format_html(
                '<span style="'
                'background:#fef3c7;'
                'color:#92400e;'
                'padding:4px 9px;'
                'border-radius:999px;'
                'font-weight:600;'
                '">'
                'Pending review'
                '</span>'
            )

        return format_html(
            '<span style="'
            'background:#f3f4f6;'
            'color:#6b7280;'
            'padding:4px 9px;'
            'border-radius:999px;'
            'font-weight:600;'
            '">'
            'Not submitted'
            '</span>'
        )

    # ========================================================
    # VERIFICATION SUMMARY
    # ========================================================

    @admin.display(
        description="Verification Information",
    )
    def verification_summary(
        self,
        obj,
    ):

        if not obj or not obj.pk:
            return "Save the profile first."

        if obj.verification_status == "approved":

            return format_html(
                '<div style="'
                'background:#ecfdf5;'
                'border:1px solid #bbf7d0;'
                'padding:14px;'
                'border-radius:10px;'
                '">'
                '<strong style="color:#166534;">'
                '✓ Identity Verified'
                '</strong>'
                '<br>'
                '<span style="color:#4b5563;">'
                'This member is currently verified.'
                '</span>'
                '</div>'
            )

        if obj.verification_status == "rejected":

            reason = (
                obj.rejection_reason
                or
                "No reason has been provided."
            )

            return format_html(
                '<div style="'
                'background:#fff7ed;'
                'border:1px solid #fed7aa;'
                'padding:14px;'
                'border-radius:10px;'
                '">'
                '<strong style="color:#c2410c;">'
                'More information required'
                '</strong>'
                '<br>'
                '<span style="color:#57534e;">'
                '{}'
                '</span>'
                '</div>',
                reason,
            )

        if obj.verification_status == "pending":

            return format_html(
                '<div style="'
                'background:#fffbeb;'
                'border:1px solid #fde68a;'
                'padding:14px;'
                'border-radius:10px;'
                '">'
                '<strong style="color:#92400e;">'
                'Government ID waiting for review'
                '</strong>'
                '</div>'
            )

        return format_html(
            '<div style="'
            'background:#f9fafb;'
            'border:1px solid #e5e7eb;'
            'padding:14px;'
            'border-radius:10px;'
            '">'
            '<span style="color:#6b7280;">'
            'Government ID has not been submitted.'
            '</span>'
            '</div>'
        )

    # ========================================================
    # GOVERNMENT ID PREVIEW / LINK
    # ========================================================

    @admin.display(
        description="Government ID Proof",
    )
    def government_id_preview(
        self,
        obj,
    ):

        if not obj or not obj.pk:
            return "Save the profile first."

        # ----------------------------------------------------
        # NETLIFY HTTPS URL
        # ----------------------------------------------------

        if obj.government_id_url:

            return format_html(
                '<a href="{}" '
                'target="_blank" '
                'rel="noopener noreferrer" '
                'style="'
                'display:inline-block;'
                'background:#111827;'
                'color:white;'
                'padding:8px 14px;'
                'border-radius:8px;'
                'text-decoration:none;'
                '">'
                'Open Government ID →'
                '</a>',
                obj.government_id_url,
            )

        # ----------------------------------------------------
        # LEGACY DJANGO FILE
        # ----------------------------------------------------

        if obj.government_id:

            try:

                return format_html(
                    '<a href="{}" '
                    'target="_blank" '
                    'rel="noopener noreferrer" '
                    'style="'
                    'display:inline-block;'
                    'background:#111827;'
                    'color:white;'
                    'padding:8px 14px;'
                    'border-radius:8px;'
                    'text-decoration:none;'
                    '">'
                    'Open Government ID →'
                    '</a>',
                    obj.government_id.url,
                )

            except (
                ValueError,
                AttributeError,
            ):
                pass

        # ----------------------------------------------------
        # PRIVATE BLOB EXISTS
        # ----------------------------------------------------

        if obj.government_id_blob_key:

            return format_html(
                '<span style="'
                'color:#6b7280;'
                '">'
                'Government ID exists in private storage, '
                'but no accessible preview URL is available.'
                '</span>'
            )

        return "No Government ID uploaded"

    # ========================================================
    # SAVE MODEL
    #
    # THIS IS THE IMPORTANT VERIFICATION LOGIC.
    #
    # approved -> is_verified = True
    #
    # pending / rejected / not_submitted
    #          -> is_verified = False
    # ========================================================

    def save_model(
        self,
        request,
        obj,
        form,
        change,
    ):

        previous_status = None

        # ----------------------------------------------------
        # GET OLD STATUS
        # ----------------------------------------------------

        if (
            change
            and
            obj.pk
        ):

            previous_status = (
                Profile.objects
                .filter(
                    pk=obj.pk
                )
                .values_list(
                    "verification_status",
                    flat=True,
                )
                .first()
            )

        # ----------------------------------------------------
        # NORMALIZE STATUS
        # ----------------------------------------------------

        verification_status = (
            str(
                obj.verification_status
                or
                "not_submitted"
            )
            .strip()
            .lower()
        )

        obj.verification_status = (
            verification_status
        )

        # ====================================================
        # APPROVED
        # ====================================================

        if verification_status == "approved":

            obj.is_verified = True

            obj.verified_by = (
                request.user
            )

            if not obj.verified_at:

                obj.verified_at = (
                    timezone.now()
                )

            # Once approved, old rejection message must go.
            obj.rejection_reason = ""

        # ====================================================
        # REJECTED
        # ====================================================

        elif verification_status == "rejected":

            # IMPORTANT:
            # rejection must always change is_verified to False.

            obj.is_verified = False

            obj.verified_by = None

            obj.verified_at = None

            # If admin did not enter a reason, provide safe
            # generic wording for the user's notification.

            if not (
                obj.rejection_reason
                or ""
            ).strip():

                obj.rejection_reason = (
                    "We need a little more information "
                    "to complete your identity verification. "
                    "Please review your Government ID "
                    "and submit it again."
                )

        # ====================================================
        # PENDING
        # ====================================================

        elif verification_status == "pending":

            obj.is_verified = False

            obj.verified_by = None

            obj.verified_at = None

            # A newly submitted ID should not continue
            # showing an old rejection reason.

            if previous_status == "rejected":

                obj.rejection_reason = ""

        # ====================================================
        # NOT SUBMITTED / ANYTHING ELSE
        # ====================================================

        else:

            obj.is_verified = False

            obj.verified_by = None

            obj.verified_at = None

            if verification_status == "not_submitted":

                obj.rejection_reason = ""

        # ====================================================
        # PARTNER ACCOUNT
        # ====================================================

        # IMPORTANT:
        #
        # The model uses:
        #     account_type = "partner"
        #
        # NOT:
        #     "restaurant_partner"

        if obj.account_type == "partner":

            obj.preferred_portal = (
                "restaurant"
            )

            # Restaurant-only users do not participate
            # in FoodKindl member verification/discovery.

            if not obj.member_profile_enabled:

                obj.is_verified = False

        # ====================================================
        # MEMBER ACCOUNT
        # ====================================================

        else:

            obj.account_type = "member"

            obj.preferred_portal = (
                "member"
            )

        # ====================================================
        # SAVE
        # ====================================================

        super().save_model(
            request,
            obj,
            form,
            change,
        )

    # ========================================================
    # ACTION — SET AS MEMBER
    # ========================================================

    @admin.action(
        description=
            "Set selected profiles as FoodKindl Members"
    )
    def mark_as_member(
        self,
        request,
        queryset,
    ):

        updated = (
            queryset.update(

                account_type=
                    "member",

                preferred_portal=
                    "member",

                member_profile_enabled=
                    True,
            )
        )

        self.message_user(
            request,
            (
                f"{updated} profile(s) set "
                "as FoodKindl Member."
            ),
        )

    # ========================================================
    # ACTION — SET AS RESTAURANT PARTNER
    # ========================================================

    @admin.action(
        description=
            "Set selected profiles as Restaurant Partners"
    )
    def mark_as_restaurant_partner(
        self,
        request,
        queryset,
    ):

        # IMPORTANT:
        # value must be "partner"

        updated = (
            queryset.update(

                account_type=
                    "partner",

                preferred_portal=
                    "restaurant",

                member_profile_enabled=
                    False,

                is_verified=
                    False,

                verified_by=
                    None,

                verified_at=
                    None,
            )
        )

        self.message_user(
            request,
            (
                f"{updated} profile(s) set "
                "as Restaurant Partner."
            ),
        )

    # ========================================================
    # ACTION — ENABLE MEMBER PROFILE
    # ========================================================

    @admin.action(
        description=
            "Enable FoodKindl member profile"
    )
    def enable_member_profile(
        self,
        request,
        queryset,
    ):

        updated = (
            queryset.update(
                member_profile_enabled=True,
            )
        )

        self.message_user(
            request,
            (
                f"{updated} member profile(s) enabled."
            ),
        )

    # ========================================================
    # ACTION — DISABLE MEMBER PROFILE
    # ========================================================

    @admin.action(
        description=
            "Disable FoodKindl member profile"
    )
    def disable_member_profile(
        self,
        request,
        queryset,
    ):

        updated = (
            queryset.update(

                member_profile_enabled=
                    False,

                is_verified=
                    False,

                verified_by=
                    None,

                verified_at=
                    None,
            )
        )

        self.message_user(
            request,
            (
                f"{updated} member profile(s) disabled."
            ),
        )

    # ========================================================
    # ACTION — APPROVE VERIFICATION
    # ========================================================

    @admin.action(
        description=
            "✓ Approve identity verification"
    )
    def approve_verification(
        self,
        request,
        queryset,
    ):

        updated = (
            queryset.update(

                verification_status=
                    "approved",

                is_verified=
                    True,

                verified_by=
                    request.user,

                verified_at=
                    timezone.now(),

                rejection_reason=
                    "",
            )
        )

        self.message_user(
            request,
            (
                f"{updated} profile(s) "
                "successfully verified."
            ),
        )

    # ========================================================
    # ACTION — PENDING
    # ========================================================

    @admin.action(
        description=
            "Mark verification as Pending Review"
    )
    def mark_verification_pending(
        self,
        request,
        queryset,
    ):

        updated = (
            queryset.update(

                verification_status=
                    "pending",

                is_verified=
                    False,

                verified_by=
                    None,

                verified_at=
                    None,

                rejection_reason=
                    "",
            )
        )

        self.message_user(
            request,
            (
                f"{updated} profile(s) marked "
                "as pending review."
            ),
        )

    # ========================================================
    # ACTION — NEEDS ATTENTION
    # ========================================================

    @admin.action(
        description=
            "Mark verification as Needs Attention"
    )
    def mark_verification_needs_attention(
        self,
        request,
        queryset,
    ):

        default_reason = (
            "We need a little more information "
            "to complete your identity verification. "
            "Please review your Government ID "
            "and submit it again."
        )

        updated_count = 0

        for profile in queryset:

            profile.verification_status = (
                "rejected"
            )

            profile.is_verified = False

            profile.verified_by = None

            profile.verified_at = None

            if not (
                profile.rejection_reason
                or ""
            ).strip():

                profile.rejection_reason = (
                    default_reason
                )

            profile.save(
                update_fields=[
                    "verification_status",
                    "is_verified",
                    "verified_by",
                    "verified_at",
                    "rejection_reason",
                    "updated_at",
                ]
            )

            updated_count += 1

        self.message_user(
            request,
            (
                f"{updated_count} profile(s) marked "
                "as needing additional information."
            ),
        )


# ============================================================
# ADMIN NOTIFICATION ADMIN
# ============================================================

@admin.register(AdminNotification)
class AdminNotificationAdmin(admin.ModelAdmin):

    # ========================================================
    # LIST
    # ========================================================

    list_display = (
        "notification_indicator",
        "title",
        "user",
        "profile_link",
        "notification_type",
        "is_read",
        "created_at",
    )

    # ========================================================
    # FILTERS
    # ========================================================

    list_filter = (
        "is_read",
        "notification_type",
        "created_at",
    )

    # ========================================================
    # SEARCH
    # ========================================================

    search_fields = (
        "title",
        "message",
        "user__email",
        "user__first_name",
        "user__last_name",
    )

    # ========================================================
    # READ ONLY
    # ========================================================

    readonly_fields = (
        "notification_type",
        "title",
        "message",
        "user",
        "profile",
        "created_at",
        "read_at",
    )

    # ========================================================
    # ORDER
    # ========================================================

    ordering = (
        "-created_at",
    )

    # ========================================================
    # ACTIONS
    # ========================================================

    actions = (
        "mark_as_read",
        "mark_as_unread",
    )

    # ========================================================
    # ICON
    # ========================================================

    @admin.display(
        description="",
    )
    def notification_indicator(
        self,
        obj,
    ):

        if obj.is_read:

            return format_html(
                '<span style="'
                'color:#9ca3af;'
                'font-size:16px;'
                '">'
                '✓'
                '</span>'
            )

        return format_html(
            '<span style="'
            'font-size:18px;'
            '">'
            '🔔'
            '</span>'
        )

    # ========================================================
    # PROFILE LINK
    # ========================================================

    @admin.display(
        description="Review Profile",
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
            '<a href="{}" '
            'style="'
            'font-weight:600;'
            'text-decoration:none;'
            '">'
            'Review profile →'
            '</a>',
            url,
        )

    # ========================================================
    # MARK READ
    # ========================================================

    @admin.action(
        description=
            "Mark selected notifications as read"
    )
    def mark_as_read(
        self,
        request,
        queryset,
    ):

        updated = (
            queryset.update(
                is_read=True,
                read_at=timezone.now(),
            )
        )

        self.message_user(
            request,
            (
                f"{updated} notification(s) "
                "marked as read."
            ),
        )

    # ========================================================
    # MARK UNREAD
    # ========================================================

    @admin.action(
        description=
            "Mark selected notifications as unread"
    )
    def mark_as_unread(
        self,
        request,
        queryset,
    ):

        updated = (
            queryset.update(
                is_read=False,
                read_at=None,
            )
        )

        self.message_user(
            request,
            (
                f"{updated} notification(s) "
                "marked as unread."
            ),
        )
from django.contrib import admin

from .models import (
    SOSEvent,
    TrustedContact,
)


@admin.register(
    TrustedContact
)
class TrustedContactAdmin(
    admin.ModelAdmin
):

    list_display = (
        "name",
        "user",
        "relationship",
        "phone_number",
        "is_active",
        "created_at",
    )


    list_filter = (
        "is_active",
        "created_at",
    )


    search_fields = (
        "name",
        "phone_number",
        "relationship",
        "user__email",
        "user__first_name",
        "user__last_name",
    )


    readonly_fields = (
        "created_at",
        "updated_at",
    )


    ordering = (
        "-created_at",
    )


@admin.register(
    SOSEvent
)
class SOSEventAdmin(
    admin.ModelAdmin
):

    list_display = (
        "id",
        "user",
        "status",
        "latitude",
        "longitude",
        "location_accuracy",
        "activated_at",
        "resolved_at",
    )


    list_filter = (
        "status",
        "activated_at",
        "resolved_at",
    )


    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
    )


    readonly_fields = (
        "user",
        "latitude",
        "longitude",
        "location_accuracy",
        "activated_at",
        "resolved_at",
    )


    ordering = (
        "-activated_at",
    )
    
from .models import (
    AdminSystemAlert,
)


@admin.register(AdminSystemAlert)
class AdminSystemAlertAdmin(
    admin.ModelAdmin
):

    list_display = (
        "title",
        "source",
        "level",
        "balance",
        "is_read",
        "created_at",
    )

    list_filter = (
        "level",
        "source",
        "is_read",
    )

    search_fields = (
        "title",
        "message",
    )

    readonly_fields = (
        "source",
        "level",
        "title",
        "message",
        "balance",
        "created_at",
    )
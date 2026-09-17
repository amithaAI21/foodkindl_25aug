from django.contrib import admin

from .models import (
    DineOut,
    DineOutResponse,
)


@admin.register(DineOut)
class DineOutAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "restaurant_name",
        "host",
        "starts_at",
        "maximum_guests",
        "visibility",
        "invited_guest_count",
        "invited_guest_names",
        "status",
    )

    list_filter = (
        "status",
        "visibility",
        "booking_status",
        "verified_only",
        "women_only",
    )

    search_fields = (
        "title",
        "restaurant_name",
        "restaurant_address",
        "host__username",
        "host__email",
        "invited_members__username",
        "invited_members__email",
    )

    filter_horizontal = (
        "invited_members",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    @admin.display(
        description="Invited count",
    )
    def invited_guest_count(self, obj):
        return obj.invited_members.count()

    @admin.display(
        description="Invited guests",
    )
    def invited_guest_names(self, obj):
        guest_names = []

        for user in obj.invited_members.all():
            name = (
                user.get_full_name()
                or user.get_username()
                or user.email
            )

            guest_names.append(name)

        if guest_names:
            return ", ".join(guest_names)

        return "No selected guests"

    def get_queryset(self, request):
        queryset = super().get_queryset(request)

        return (
            queryset
            .select_related("host")
            .prefetch_related("invited_members")
        )
        
        
@admin.register(DineOutResponse)
class DineOutResponseAdmin(
    admin.ModelAdmin
):
    list_display = (
        "dine_out",
        "guest",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
    )

    search_fields = (
        "dine_out__title",
        "guest__username",
        "guest__email",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )
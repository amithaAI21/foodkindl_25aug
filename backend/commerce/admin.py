from django.contrib import admin

from .models import (
    GroceryPartner,
    GroceryPartnerClick,
)


@admin.register(GroceryPartner)
class GroceryPartnerAdmin(
    admin.ModelAdmin
):

    list_display = [
        "name",
        "slug",
        "is_active",
        "created_at",
    ]

    list_filter = [
        "is_active",
    ]

    search_fields = [
        "name",
        "slug",
    ]

    prepopulated_fields = {
        "slug": (
            "name",
        )
    }


@admin.register(GroceryPartnerClick)
class GroceryPartnerClickAdmin(
    admin.ModelAdmin
):

    list_display = [
        "tracking_code",
        "partner",
        "user",
        "recipe_title",
        "converted",
        "order_value",
        "commission_amount",
        "clicked_at",
    ]

    list_filter = [
        "partner",
        "converted",
        "clicked_at",
    ]

    search_fields = [
        "tracking_code",
        "recipe_title",
        "user__email",
        "partner_order_id",
    ]

    readonly_fields = [
        "tracking_code",
        "clicked_at",
    ]
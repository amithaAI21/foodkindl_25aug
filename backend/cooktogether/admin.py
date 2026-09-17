from django.contrib import admin
from .models import CookTogether, CookTogetherRequest

@admin.register(CookTogether)
class CookTogetherAdmin(admin.ModelAdmin):
    list_display = ("title", "host", "event_date", "visibility", "status", "maximum_guests")
    list_filter = ("status", "visibility", "verified_only", "women_only")
    search_fields = ("title", "dish", "host__username", "location_name")
    readonly_fields = ("created_at", "updated_at", "published_at")

@admin.register(CookTogetherRequest)
class CookTogetherRequestAdmin(admin.ModelAdmin):
    list_display = ("cook_together", "guest", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("cook_together__title", "guest__username")

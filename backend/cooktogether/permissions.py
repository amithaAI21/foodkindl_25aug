from rest_framework.permissions import SAFE_METHODS, BasePermission

class IsHostOrPublishedReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return obj.status == "published" or obj.host_id == request.user.id
        return obj.host_id == request.user.id

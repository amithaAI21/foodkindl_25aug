
from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)


class IsOwnerOrReadOnly(BasePermission):
    """
    Anyone with access can read an object.
    Only the owner can update or delete it.
    """

    message = "You do not have permission to modify this item."

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        object_owner = (
            getattr(obj, "author", None)
            or getattr(obj, "owner", None)
            or getattr(obj, "sender", None)
        )

        return object_owner == request.user


class IsVerifiedMember(BasePermission):
    """
    Allow any authenticated user to access member features.
    Government ID verification is NOT required.

    The original class name is retained for compatibility
    with existing views that import IsVerifiedMember.
    """

    message = "Please log in to access this feature."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
        )

# ============================================================
# ACCOUNTS SIGNALS
# ============================================================

from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import (
    AdminNotification,
    Profile,
)


# ============================================================
# GOVERNMENT ID UPLOAD NOTIFICATION
# ============================================================

@receiver(
    pre_save,
    sender=Profile,
)
def government_id_upload_notification(
    sender,
    instance,
    **kwargs,
):
    """
    Create an admin notification when a user uploads
    or replaces their Government ID.

    This checks all Government ID storage methods:

    1. Netlify Blob key
    2. Netlify HTTPS URL
    3. Legacy Django FileField

    It only creates a notification when the ID actually
    changes, so normal profile edits will not create
    unnecessary notifications.
    """

    # --------------------------------------------------------
    # New profile
    # --------------------------------------------------------

    if not instance.pk:
        return


    # --------------------------------------------------------
    # Get existing profile from database
    # --------------------------------------------------------

    try:

        old_profile = (
            Profile.objects.get(
                pk=instance.pk
            )
        )

    except Profile.DoesNotExist:

        return


    # --------------------------------------------------------
    # OLD GOVERNMENT ID VALUES
    # --------------------------------------------------------

    old_blob_key = (
        old_profile.government_id_blob_key
        or ""
    )

    old_url = (
        old_profile.government_id_url
        or ""
    )

    old_file_name = ""

    if old_profile.government_id:

        old_file_name = (
            old_profile.government_id.name
            or ""
        )


    # --------------------------------------------------------
    # NEW GOVERNMENT ID VALUES
    # --------------------------------------------------------

    new_blob_key = (
        instance.government_id_blob_key
        or ""
    )

    new_url = (
        instance.government_id_url
        or ""
    )

    new_file_name = ""

    if instance.government_id:

        new_file_name = (
            instance.government_id.name
            or ""
        )


    # --------------------------------------------------------
    # DETECT CHANGE
    # --------------------------------------------------------

    government_id_changed = (

        (
            new_blob_key
            and
            new_blob_key != old_blob_key
        )

        or

        (
            new_url
            and
            new_url != old_url
        )

        or

        (
            new_file_name
            and
            new_file_name != old_file_name
        )
    )


    if not government_id_changed:
        return


    # --------------------------------------------------------
    # Close older unread ID-upload notifications
    #
    # This prevents multiple unread notifications when the
    # same user replaces their ID several times.
    # --------------------------------------------------------

    AdminNotification.objects.filter(
        profile=instance,
        notification_type=
            "government_id_uploaded",
        is_read=False,
    ).update(
        is_read=True,
        read_at=timezone.now(),
    )


    # --------------------------------------------------------
    # USER DISPLAY NAME
    # --------------------------------------------------------

    user = instance.user

    display_name = (
        user.get_full_name().strip()
        or
        user.email
        or
        user.username
        or
        f"User #{user.pk}"
    )


    # --------------------------------------------------------
    # CREATE ADMIN NOTIFICATION
    # --------------------------------------------------------

    AdminNotification.objects.create(

        notification_type=
            "government_id_uploaded",

        title=
            "Government ID awaiting review",

        message=(
            f"{display_name} uploaded a Government ID "
            "and is waiting for verification."
        ),

        user=user,

        profile=instance,

        is_read=False,
    )

# ============================================================
# ACCOUNTS SIGNALS
# ============================================================

from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Profile


# ============================================================
# PROFILE UPDATE SIGNAL
# ============================================================

@receiver(pre_save, sender=Profile)
def profile_update_signal(sender, instance, **kwargs):
    """
    Handle profile updates.

    Government ID upload notifications have been removed.

    Mobile OTP generation, SMS delivery and verification
    should be handled by the authentication views/services,
    not this signal.
    """

    if not instance.pk:
        return

    # Add profile-update logic here only when required.
    return

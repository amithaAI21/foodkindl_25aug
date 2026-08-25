from .models import AdminNotification


def admin_notifications(
    request,
):

    if (
        not request.user.is_authenticated
        or
        not request.user.is_staff
    ):

        return {}


    unread_notifications = (
        AdminNotification.objects
        .filter(
            is_read=False
        )
        .select_related(
            "user"
        )
        [:5]
    )


    return {

        "admin_notification_count":
            AdminNotification.objects
            .filter(
                is_read=False
            )
            .count(),

        "admin_latest_notifications":
            unread_notifications,
    }
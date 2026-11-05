
import uuid

from django.db import migrations, models


def repair_sos_table(apps, schema_editor):
    connection = schema_editor.connection
    table = "safety_sosevent"
    quote = connection.ops.quote_name

    with connection.cursor() as cursor:
        existing_columns = {
            column.name
            for column in connection.introspection.get_table_description(
                cursor, table
            )
        }

        # Add tracking_token only if it is missing.
        if "tracking_token" not in existing_columns:
            field = models.UUIDField()
            db_type = field.db_type(connection)
            cursor.execute(
                f"ALTER TABLE {quote(table)} "
                f"ADD COLUMN {quote('tracking_token')} {db_type}"
            )

        # Add location_updated_at only if it is missing.
        if "location_updated_at" not in existing_columns:
            field = models.DateTimeField(null=True, blank=True)
            db_type = field.db_type(connection)
            cursor.execute(
                f"ALTER TABLE {quote(table)} "
                f"ADD COLUMN {quote('location_updated_at')} {db_type}"
            )

        # Give every existing SOS event its own UUID.
        cursor.execute(
            f"SELECT id, tracking_token FROM {quote(table)}"
        )

        for event_id, token in cursor.fetchall():
            if not token:
                cursor.execute(
                    f"UPDATE {quote(table)} "
                    f"SET {quote('tracking_token')} = %s "
                    f"WHERE id = %s",
                    [uuid.uuid4().hex, event_id],
                )

        # Enforce uniqueness at database level.
        cursor.execute(
            f"CREATE UNIQUE INDEX IF NOT EXISTS "
            f"{quote('safety_sos_tracking_token_unique')} "
            f"ON {quote(table)} ({quote('tracking_token')})"
        )


class Migration(migrations.Migration):

    dependencies = [
        ("safety", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    repair_sos_table,
                    migrations.RunPython.noop,
                ),
            ],
            # 0001_initial already declares both fields in Django's state.
            state_operations=[],
        ),
    ]

from django.db import migrations


FIELDS_TO_REPAIR = [
    "account_type",
    "member_profile_enabled",
    "preferred_portal",
    "profile_visibility",
]


def add_missing_profile_columns(apps, schema_editor):
    Profile = apps.get_model("accounts", "Profile")
    table_name = Profile._meta.db_table

    with schema_editor.connection.cursor() as cursor:
        description = (
            schema_editor.connection.introspection
            .get_table_description(
                cursor,
                table_name,
            )
        )

    existing_columns = {
        column.name
        for column in description
    }

    for field_name in FIELDS_TO_REPAIR:
        field = Profile._meta.get_field(field_name)
        column_name = field.column

        if column_name in existing_columns:
            print(
                f"{table_name}.{column_name} already exists - skipping."
            )
            continue

        print(
            f"Adding missing column: {table_name}.{column_name}"
        )

        schema_editor.add_field(
            Profile,
            field,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            add_missing_profile_columns,
            migrations.RunPython.noop,
        ),
    ]
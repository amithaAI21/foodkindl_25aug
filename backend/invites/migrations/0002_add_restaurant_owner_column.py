from django.db import migrations


def add_owner_column(apps, schema_editor):
    Restaurant = apps.get_model("invites", "Restaurant")

    table_name = Restaurant._meta.db_table

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

    if "owner_id" in existing_columns:
        print(
            "invites_restaurant.owner_id already exists - skipping."
        )
        return

    owner_field = Restaurant._meta.get_field("owner")

    print(
        "Adding missing column: invites_restaurant.owner_id"
    )

    schema_editor.add_field(
        Restaurant,
        owner_field,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("invites", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            add_owner_column,
            migrations.RunPython.noop,
        ),
    ]
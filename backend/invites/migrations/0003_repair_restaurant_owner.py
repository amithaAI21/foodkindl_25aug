from django.db import migrations


def repair_owner(apps, schema_editor):
    Restaurant = apps.get_model("invites", "Restaurant")
    table_name = Restaurant._meta.db_table

    with schema_editor.connection.cursor() as cursor:
        description = (
            schema_editor.connection.introspection
            .get_table_description(cursor, table_name)
        )

    existing_columns = {column.name for column in description}

    if "owner_id" in existing_columns:
        print("owner_id already exists - skipping.")
        return

    field = Restaurant._meta.get_field("owner")

    print("Repairing missing invites_restaurant.owner_id")

    schema_editor.add_field(
        Restaurant,
        field,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("invites", "0001_add_restaurant_owner_column"),
    ]

    operations = [
        migrations.RunPython(
            repair_owner,
            migrations.RunPython.noop,
        ),
    ]
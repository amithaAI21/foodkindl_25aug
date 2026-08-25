from django.db import migrations


def create_missing_restaurant_tables(apps, schema_editor):
    """
    Production database was created using an older version of
    0001_initial.py.

    Django migration state believes these models/tables already exist,
    but some of the actual PostgreSQL tables may be missing.

    Create only the tables that are missing.
    """

    existing_tables = set(
        schema_editor.connection.introspection.table_names()
    )

    model_names = [
        "RestaurantImage",
        "RestaurantMenuItem",
        "RestaurantSubmission",
        "RestaurantBooking",
    ]

    for model_name in model_names:
        model = apps.get_model("invites", model_name)
        table_name = model._meta.db_table

        if table_name not in existing_tables:
            schema_editor.create_model(model)
            existing_tables.add(table_name)


def noop_reverse(apps, schema_editor):
    # Do not automatically delete production tables on reverse migration.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("invites", "0003_add_restaurant_media_columns"),
    ]

    operations = [

        # =====================================================
        # CREATE MISSING TABLES FIRST
        # =====================================================
        migrations.RunPython(
            create_missing_restaurant_tables,
            noop_reverse,
        ),

        # =====================================================
        # RESTAURANT IMAGE
        # Add columns when table already existed but had old schema.
        # =====================================================
        migrations.RunSQL(
            sql="""
                ALTER TABLE invites_restaurantimage
                ADD COLUMN IF NOT EXISTS image_blob_key
                VARCHAR(1000) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurantimage
                ADD COLUMN IF NOT EXISTS image_url
                VARCHAR(1500) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurantimage
                ADD COLUMN IF NOT EXISTS image_original_name
                VARCHAR(500) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurantimage
                ADD COLUMN IF NOT EXISTS image_content_type
                VARCHAR(120) NOT NULL DEFAULT '';
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # =====================================================
        # RESTAURANT MENU ITEM
        # =====================================================
        migrations.RunSQL(
            sql="""
                ALTER TABLE invites_restaurantmenuitem
                ADD COLUMN IF NOT EXISTS image_blob_key
                VARCHAR(1000) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurantmenuitem
                ADD COLUMN IF NOT EXISTS image_url
                VARCHAR(1500) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurantmenuitem
                ADD COLUMN IF NOT EXISTS image_original_name
                VARCHAR(500) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurantmenuitem
                ADD COLUMN IF NOT EXISTS image_content_type
                VARCHAR(120) NOT NULL DEFAULT '';
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # =====================================================
        # RESTAURANT SUBMISSION
        # =====================================================
        migrations.RunSQL(
            sql="""
                ALTER TABLE invites_restaurantsubmission
                ADD COLUMN IF NOT EXISTS image_blob_key
                VARCHAR(1000) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurantsubmission
                ADD COLUMN IF NOT EXISTS image_url
                VARCHAR(1500) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurantsubmission
                ADD COLUMN IF NOT EXISTS image_original_name
                VARCHAR(500) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurantsubmission
                ADD COLUMN IF NOT EXISTS image_content_type
                VARCHAR(120) NOT NULL DEFAULT '';
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
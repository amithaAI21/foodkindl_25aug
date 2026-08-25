from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("invites", "0003_add_restaurant_media_columns"),
    ]

    operations = [

        # =====================================================
        # RESTAURANT IMAGE
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
            reverse_sql="""
                ALTER TABLE invites_restaurantimage
                DROP COLUMN IF EXISTS image_content_type;

                ALTER TABLE invites_restaurantimage
                DROP COLUMN IF EXISTS image_original_name;

                ALTER TABLE invites_restaurantimage
                DROP COLUMN IF EXISTS image_url;

                ALTER TABLE invites_restaurantimage
                DROP COLUMN IF EXISTS image_blob_key;
            """,
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
            reverse_sql="""
                ALTER TABLE invites_restaurantmenuitem
                DROP COLUMN IF EXISTS image_content_type;

                ALTER TABLE invites_restaurantmenuitem
                DROP COLUMN IF EXISTS image_original_name;

                ALTER TABLE invites_restaurantmenuitem
                DROP COLUMN IF EXISTS image_url;

                ALTER TABLE invites_restaurantmenuitem
                DROP COLUMN IF EXISTS image_blob_key;
            """,
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
            reverse_sql="""
                ALTER TABLE invites_restaurantsubmission
                DROP COLUMN IF EXISTS image_content_type;

                ALTER TABLE invites_restaurantsubmission
                DROP COLUMN IF EXISTS image_original_name;

                ALTER TABLE invites_restaurantsubmission
                DROP COLUMN IF EXISTS image_url;

                ALTER TABLE invites_restaurantsubmission
                DROP COLUMN IF EXISTS image_blob_key;
            """,
        ),
    ]
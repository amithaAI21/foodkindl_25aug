from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("invites", "0004_fix_related_restaurant_media_columns"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                -- =============================================
                -- RESTAURANT IMAGE
                -- =============================================

                ALTER TABLE invites_restaurantimage
                ADD COLUMN IF NOT EXISTS updated_at
                TIMESTAMP WITH TIME ZONE
                NOT NULL DEFAULT CURRENT_TIMESTAMP;


                -- =============================================
                -- RESTAURANT MENU ITEM
                -- =============================================

                ALTER TABLE invites_restaurantmenuitem
                ADD COLUMN IF NOT EXISTS updated_at
                TIMESTAMP WITH TIME ZONE
                NOT NULL DEFAULT CURRENT_TIMESTAMP;


                -- =============================================
                -- RESTAURANT SUBMISSION
                -- =============================================

                ALTER TABLE invites_restaurantsubmission
                ADD COLUMN IF NOT EXISTS updated_at
                TIMESTAMP WITH TIME ZONE
                NOT NULL DEFAULT CURRENT_TIMESTAMP;


                -- =============================================
                -- RESTAURANT BOOKING
                -- =============================================

                ALTER TABLE invites_restaurantbooking
                ADD COLUMN IF NOT EXISTS updated_at
                TIMESTAMP WITH TIME ZONE
                NOT NULL DEFAULT CURRENT_TIMESTAMP;
            """,

            reverse_sql="""
                ALTER TABLE invites_restaurantimage
                DROP COLUMN IF EXISTS updated_at;

                ALTER TABLE invites_restaurantmenuitem
                DROP COLUMN IF EXISTS updated_at;

                ALTER TABLE invites_restaurantsubmission
                DROP COLUMN IF EXISTS updated_at;

                ALTER TABLE invites_restaurantbooking
                DROP COLUMN IF EXISTS updated_at;
            """,
        ),
    ]
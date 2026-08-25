from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("invites", "0002_add_restaurant_location_columns"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE invites_restaurant
                ADD COLUMN IF NOT EXISTS image_blob_key
                VARCHAR(1000) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurant
                ADD COLUMN IF NOT EXISTS image_url
                VARCHAR(1500) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurant
                ADD COLUMN IF NOT EXISTS image_original_name
                VARCHAR(500) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurant
                ADD COLUMN IF NOT EXISTS image_content_type
                VARCHAR(120) NOT NULL DEFAULT '';

                ALTER TABLE invites_restaurant
                ADD COLUMN IF NOT EXISTS is_foodkindl_partner
                BOOLEAN NOT NULL DEFAULT FALSE;

                ALTER TABLE invites_restaurant
                ADD COLUMN IF NOT EXISTS accepts_foodkindl_booking
                BOOLEAN NOT NULL DEFAULT FALSE;

                ALTER TABLE invites_restaurant
                ADD COLUMN IF NOT EXISTS is_active
                BOOLEAN NOT NULL DEFAULT TRUE;

                CREATE INDEX IF NOT EXISTS
                invites_restaurant_is_foodkindl_partner_idx
                ON invites_restaurant (is_foodkindl_partner);

                CREATE INDEX IF NOT EXISTS
                invites_restaurant_accepts_foodkindl_booking_idx
                ON invites_restaurant (accepts_foodkindl_booking);

                CREATE INDEX IF NOT EXISTS
                invites_restaurant_is_active_idx
                ON invites_restaurant (is_active);

                CREATE INDEX IF NOT EXISTS
                restaurant_partner_idx
                ON invites_restaurant (
                    is_active,
                    is_foodkindl_partner,
                    accepts_foodkindl_booking
                );
            """,

            reverse_sql="""
                DROP INDEX IF EXISTS restaurant_partner_idx;
                DROP INDEX IF EXISTS invites_restaurant_is_foodkindl_partner_idx;
                DROP INDEX IF EXISTS invites_restaurant_accepts_foodkindl_booking_idx;
                DROP INDEX IF EXISTS invites_restaurant_is_active_idx;

                ALTER TABLE invites_restaurant
                DROP COLUMN IF EXISTS image_content_type;

                ALTER TABLE invites_restaurant
                DROP COLUMN IF EXISTS image_original_name;

                ALTER TABLE invites_restaurant
                DROP COLUMN IF EXISTS image_url;

                ALTER TABLE invites_restaurant
                DROP COLUMN IF EXISTS image_blob_key;

                ALTER TABLE invites_restaurant
                DROP COLUMN IF EXISTS accepts_foodkindl_booking;

                ALTER TABLE invites_restaurant
                DROP COLUMN IF EXISTS is_foodkindl_partner;

                ALTER TABLE invites_restaurant
                DROP COLUMN IF EXISTS is_active;
            """,
        ),
    ]
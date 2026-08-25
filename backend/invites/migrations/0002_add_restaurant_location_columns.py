from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("invites", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE invites_restaurant
                ADD COLUMN IF NOT EXISTS latitude
                NUMERIC(9, 6) NULL;

                ALTER TABLE invites_restaurant
                ADD COLUMN IF NOT EXISTS longitude
                NUMERIC(9, 6) NULL;

                CREATE INDEX IF NOT EXISTS
                invites_restaurant_latitude_idx
                ON invites_restaurant (latitude);

                CREATE INDEX IF NOT EXISTS
                invites_restaurant_longitude_idx
                ON invites_restaurant (longitude);

                CREATE INDEX IF NOT EXISTS
                restaurant_geo_idx
                ON invites_restaurant (latitude, longitude);
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS restaurant_geo_idx;
                DROP INDEX IF EXISTS invites_restaurant_latitude_idx;
                DROP INDEX IF EXISTS invites_restaurant_longitude_idx;

                ALTER TABLE invites_restaurant
                DROP COLUMN IF EXISTS longitude;

                ALTER TABLE invites_restaurant
                DROP COLUMN IF EXISTS latitude;
            """,
        ),
    ]
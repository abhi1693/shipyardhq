from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_clerk_id"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE accounts_user
                    DROP COLUMN IF EXISTS username,
                    DROP COLUMN IF EXISTS is_staff,
                    DROP COLUMN IF EXISTS display_name,
                    DROP COLUMN IF EXISTS slug,
                    DROP COLUMN IF EXISTS avatar_url,
                    DROP COLUMN IF EXISTS website_url,
                    DROP COLUMN IF EXISTS bio;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

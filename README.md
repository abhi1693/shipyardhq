# Shipyard HQ

Shipyard HQ is being rebuilt as a Django application with a NetBox-style configuration split:

- `shipyardhq/settings.py` contains committed Django settings and validation.
- `shipyardhq/configuration.py` contains local deployment values and is ignored by Git.
- `shipyardhq/configuration_example.py` documents the required and optional local settings.

## Local Setup

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
cp shipyardhq/configuration_example.py shipyardhq/configuration.py
python generate_secret_key.py
```

Create the PostgreSQL database and role referenced by `shipyardhq/configuration.py`:

```sql
CREATE DATABASE shipyardhq;
CREATE USER shipyardhq WITH PASSWORD 'shipyardhq';
ALTER DATABASE shipyardhq OWNER TO shipyardhq;
\connect shipyardhq;
GRANT CREATE ON SCHEMA public TO shipyardhq;
```

Then run:

```bash
python manage.py migrate
python manage.py seed_dev_data
python manage.py runserver
```

To seed sample products for a specific existing user:

```bash
python manage.py seed_dev_data --with-products --user-email desk.abhimanyu@gmail.com
```

Set `SHIPYARDHQ_CONFIGURATION` to a dotted Python module path to load a configuration file other than `shipyardhq.configuration`.

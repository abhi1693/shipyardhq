# Shipyard HQ Django Rewrite

This branch replaces the previous Next.js/Prisma application with a Django + PostgreSQL foundation while preserving the existing public, member, admin, and API URL structure.

## Stack

- Django 5
- PostgreSQL via `psycopg`
- Server-rendered templates and custom in-house page shells
- Custom user model and role-based member/admin areas

## Project Layout

```text
.
├── manage.py
├── shipyardhq/
├── core/
├── accounts/
├── catalog/
├── billing/
├── analytics/
├── rewards/
├── events/
├── api/
├── templates/
├── static/
└── project-level route aggregators in `shipyardhq/public_urls.py`,
   `shipyardhq/member_urls.py`, and `shipyardhq/admin_urls.py`
```

## Quick Start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Required Environment

- `DATABASE_URL`
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `DEBUG`

See [.env.example](.env.example).

## Current State

The current codebase preserves the route surface across:

- public pages
- member pages
- admin pages
- API endpoints
- sitemap and `llms.txt` endpoints

Remaining implementation work includes:

1. complete domain model parity with the old Prisma schema
2. real admin CRUD for plans, rewards, analytics, and operations
3. payment connector syncing and event processing
4. public discovery, ranking, and analytics behavior

#!/usr/bin/env python3
from dataclasses import dataclass, field
import argparse
import logging
import os
from pathlib import Path
import re
import sys
from time import perf_counter
from typing import Any

from sqlalchemy import MetaData, Table, create_engine, func, insert, select, text
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.engine.url import make_url

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import models  # noqa: F401
from models import SQLModel

LOGGER = logging.getLogger("migrate_prisma_data")


@dataclass(frozen=True)
class TablePlan:
    new_name: str
    old_name: str | None = None
    pk: str | None = "id"
    fk_map: dict[str, tuple[str, str]] = field(default_factory=dict)

    def resolve_old_name(self) -> str:
        return self.old_name or snake_to_pascal(self.new_name)


def snake_to_pascal(name: str) -> str:
    return "".join(part.capitalize() for part in name.split("_") if part)


def camel_to_snake(name: str) -> str:
    first_pass = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", first_pass).lower()


TABLE_PLANS: list[TablePlan] = [
    TablePlan("user"),
    TablePlan(
        "member_feedback",
        fk_map={"user_id": ("userId", "user")},
    ),
    TablePlan("category"),
    TablePlan("plan"),
    TablePlan("plan_feature"),
    TablePlan("reward_rule"),
    TablePlan("reward_catalog_item"),
    TablePlan("alternative_product"),
    TablePlan("use_case"),
    TablePlan("leaderboard_run"),
    TablePlan("monthly_leaderboard_notification"),
    TablePlan("analytics_ingestion_run"),
    TablePlan(
        "product",
        fk_map={
            "user_id": ("userId", "user"),
            "category_id": ("categoryId", "category"),
            "plan_id": ("planId", "plan"),
        },
    ),
    TablePlan(
        "use_case_category",
        pk=None,
        fk_map={
            "use_case_id": ("useCaseId", "use_case"),
            "category_id": ("categoryId", "category"),
        },
    ),
    TablePlan(
        "alternative_product_category",
        old_name="_AlternativeProductCategories",
        pk=None,
        fk_map={
            "alternative_product_id": ("A", "alternative_product"),
            "category_id": ("B", "category"),
        },
    ),
    TablePlan(
        "product_alternative_product",
        old_name="_ProductAlternativeProducts",
        pk=None,
        fk_map={
            "alternative_product_id": ("A", "alternative_product"),
            "product_id": ("B", "product"),
        },
    ),
    TablePlan(
        "plan_feature_assignment",
        fk_map={
            "plan_id": ("planId", "plan"),
            "feature_id": ("featureId", "plan_feature"),
        },
    ),
    TablePlan(
        "user_plan_purchase",
        fk_map={
            "user_id": ("userId", "user"),
            "plan_id": ("planId", "plan"),
        },
    ),
    TablePlan(
        "product_metadata",
        fk_map={"product_id": ("productId", "product")},
    ),
    TablePlan(
        "product_analytics",
        fk_map={"product_id": ("productId", "product")},
    ),
    TablePlan(
        "product_verification",
        fk_map={"product_id": ("productId", "product")},
    ),
    TablePlan(
        "payment_connector",
        fk_map={"product_id": ("productId", "product")},
    ),
    TablePlan(
        "payment_connector_credential",
        fk_map={"connector_id": ("connectorId", "payment_connector")},
    ),
    TablePlan(
        "payment_revenue_snapshot",
        fk_map={"connector_id": ("connectorId", "payment_connector")},
    ),
    TablePlan(
        "product_media",
        fk_map={"product_id": ("productId", "product")},
    ),
    TablePlan(
        "product_claim_attempt",
        fk_map={
            "product_id": ("productId", "product"),
            "user_id": ("userId", "user"),
        },
    ),
    TablePlan(
        "product_badge",
        fk_map={"product_id": ("productId", "product")},
    ),
    TablePlan(
        "product_upvote",
        fk_map={
            "product_id": ("productId", "product"),
            "user_id": ("userId", "user"),
        },
    ),
    TablePlan(
        "product_traffic_daily",
        fk_map={
            "product_id": ("productId", "product"),
            "ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run"),
        },
    ),
    TablePlan(
        "product_traffic_referrer_daily",
        fk_map={
            "product_id": ("productId", "product"),
            "ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run"),
        },
    ),
    TablePlan(
        "product_traffic_channel_daily",
        fk_map={
            "product_id": ("productId", "product"),
            "ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run"),
        },
    ),
    TablePlan(
        "product_traffic_browser_daily",
        fk_map={
            "product_id": ("productId", "product"),
            "ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run"),
        },
    ),
    TablePlan(
        "product_traffic_operating_system_daily",
        fk_map={
            "product_id": ("productId", "product"),
            "ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run"),
        },
    ),
    TablePlan(
        "product_traffic_device_daily",
        fk_map={
            "product_id": ("productId", "product"),
            "ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run"),
        },
    ),
    TablePlan(
        "product_traffic_country_daily",
        fk_map={
            "product_id": ("productId", "product"),
            "ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run"),
        },
    ),
    TablePlan(
        "product_traffic_city_daily",
        fk_map={
            "product_id": ("productId", "product"),
            "ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run"),
        },
    ),
    TablePlan(
        "site_traffic_daily",
        fk_map={"ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run")},
    ),
    TablePlan(
        "site_traffic_referrer_daily",
        fk_map={"ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run")},
    ),
    TablePlan(
        "site_traffic_browser_daily",
        fk_map={"ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run")},
    ),
    TablePlan(
        "site_traffic_operating_system_daily",
        fk_map={"ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run")},
    ),
    TablePlan(
        "site_traffic_device_daily",
        fk_map={"ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run")},
    ),
    TablePlan(
        "site_traffic_country_daily",
        fk_map={"ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run")},
    ),
    TablePlan(
        "site_traffic_region_daily",
        fk_map={"ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run")},
    ),
    TablePlan(
        "site_traffic_city_daily",
        fk_map={"ingestion_run_id": ("ingestionRunId", "analytics_ingestion_run")},
    ),
    TablePlan(
        "product_leaderboard_score",
        fk_map={
            "run_id": ("runId", "leaderboard_run"),
            "product_id": ("productId", "product"),
        },
    ),
    TablePlan(
        "reward_balance",
        pk=None,
        fk_map={"user_id": ("userId", "user")},
    ),
    TablePlan(
        "redemption",
        fk_map={
            "user_id": ("userId", "user"),
            "product_id": ("productId", "product"),
        },
    ),
    TablePlan(
        "feature_entitlement",
        fk_map={
            "user_id": ("userId", "user"),
            "redemption_id": ("redemptionId", "redemption"),
            "product_id": ("productId", "product"),
        },
    ),
    TablePlan(
        "placement_schedule",
        fk_map={
            "entitlement_id": ("entitlementId", "feature_entitlement"),
            "redemption_id": ("redemptionId", "redemption"),
            "product_id": ("productId", "product"),
        },
    ),
    TablePlan(
        "reward_transaction",
        fk_map={
            "user_id": ("userId", "user"),
            "rule_id": ("ruleId", "reward_rule"),
            "redemption_id": ("redemptionId", "redemption"),
            "product_id": ("productId", "product"),
            "acted_by_user_id": ("actedByUserId", "user"),
        },
    ),
    TablePlan("event_envelope"),
    TablePlan(
        "event_attempt",
        fk_map={"envelope_id": ("envelopeId", "event_envelope")},
    ),
]


def load_old_tables(engine: Engine, plans: list[TablePlan]) -> dict[str, Table]:
    metadata = MetaData()
    tables: dict[str, Table] = {}
    for plan in plans:
        name = plan.resolve_old_name()
        if name in tables:
            continue
        tables[name] = Table(name, metadata, autoload_with=engine)
        LOGGER.debug("Loaded source table %s", name)
    return tables


def load_new_tables() -> dict[str, Table]:
    return SQLModel.metadata.tables


def iter_rows(conn: Connection, table: Table):
    result = conn.execution_options(stream_results=True).execute(select(table))
    for row in result.mappings():
        yield dict(row)

def count_rows(conn: Connection, table: Table) -> int:
    return int(conn.execute(select(func.count()).select_from(table)).scalar_one())


def build_row(
    row: dict[str, Any],
    *,
    new_columns: set[str],
    plan: TablePlan,
    id_maps: dict[str, dict[str, int]],
) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for old_key, value in row.items():
        new_key = camel_to_snake(old_key)
        if new_key in new_columns:
            data[new_key] = value

    for new_key, (old_key, ref_table) in plan.fk_map.items():
        old_value = row.get(old_key)
        if old_value is None:
            data[new_key] = None
            continue
        mapping = id_maps.get(ref_table)
        if mapping is None or old_value not in mapping:
            raise KeyError(f"Missing mapping for {ref_table}:{old_value}")
        data[new_key] = mapping[old_value]

    if plan.pk and plan.pk in data:
        data.pop(plan.pk, None)
    return data


def insert_batch(
    conn: Connection,
    table: Table,
    rows: list[dict[str, Any]],
    *,
    returning: str | None,
) -> list[Any]:
    if not rows:
        return []
    stmt = insert(table)
    if returning:
        stmt = stmt.returning(table.c[returning])
    result = conn.execute(stmt, rows)
    if returning:
        return [row[0] for row in result.fetchall()]
    return []


def migrate_table(
    plan: TablePlan,
    *,
    old_conn: Connection,
    new_engine: Engine,
    old_tables: dict[str, Table],
    new_tables: dict[str, Table],
    id_maps: dict[str, dict[str, int]],
    batch_size: int,
) -> int:
    old_table = old_tables[plan.resolve_old_name()]
    new_table = new_tables[plan.new_name]
    new_columns = set(new_table.columns.keys())
    old_columns = {camel_to_snake(column.name) for column in old_table.columns}
    ignored_columns = sorted(
        old_columns - new_columns - set(plan.fk_map.keys())
    )
    if ignored_columns:
        LOGGER.debug(
            "%s: ignoring columns not in target: %s",
            plan.new_name,
            ", ".join(ignored_columns),
        )

    inserted = 0
    loaded = 0
    batch: list[dict[str, Any]] = []
    old_ids: list[str] = []
    start = perf_counter()
    source_total = count_rows(old_conn, old_table)
    LOGGER.info(
        "%s: source table %s has %s rows",
        plan.new_name,
        old_table.name,
        source_total,
    )
    if source_total == 0:
        LOGGER.info(
            "Skipping table %s -> %s (0 rows)",
            old_table.name,
            plan.new_name,
        )
        LOGGER.info("%s: loaded 0 rows", plan.new_name)
        return 0
    LOGGER.info("Migrating table %s -> %s", old_table.name, plan.new_name)

    with new_engine.begin() as new_conn:
        for row in iter_rows(old_conn, old_table):
            loaded += 1
            try:
                data = build_row(
                    row,
                    new_columns=new_columns,
                    plan=plan,
                    id_maps=id_maps,
                )
            except KeyError as exc:
                row_id = row.get(plan.pk) if plan.pk else None
                LOGGER.error(
                    "%s: missing FK mapping for row %s (%s)",
                    plan.new_name,
                    row_id,
                    exc,
                )
                raise

            batch.append(data)
            if plan.pk:
                old_ids.append(row[plan.pk])

            if len(batch) >= batch_size:
                new_ids = insert_batch(
                    new_conn, new_table, batch, returning=plan.pk
                )
                if plan.pk:
                    id_maps.setdefault(plan.new_name, {})
                    id_maps[plan.new_name].update(dict(zip(old_ids, new_ids)))
                inserted += len(batch)
                LOGGER.debug(
                    "%s: inserted batch of %s (total %s/%s)",
                    plan.new_name,
                    len(batch),
                    inserted,
                    source_total,
                )
                batch.clear()
                old_ids.clear()

        if batch:
            new_ids = insert_batch(new_conn, new_table, batch, returning=plan.pk)
            if plan.pk:
                id_maps.setdefault(plan.new_name, {})
                id_maps[plan.new_name].update(dict(zip(old_ids, new_ids)))
            inserted += len(batch)

    duration = perf_counter() - start
    LOGGER.info(
        "%s: migrated %s rows in %.2fs",
        plan.new_name,
        inserted,
        duration,
    )
    LOGGER.info("%s: loaded %s rows", plan.new_name, loaded)
    if loaded != source_total:
        LOGGER.warning(
            "%s: source count %s does not match loaded %s",
            plan.new_name,
            source_total,
            loaded,
        )
    return inserted


def truncate_new_db(conn: Connection, plans: list[TablePlan]) -> None:
    table_names = ", ".join(f"\"{plan.new_name}\"" for plan in plans)
    conn.execute(text(f"TRUNCATE {table_names} CASCADE"))

def redact_url(raw_url: str) -> str:
    try:
        return make_url(raw_url).render_as_string(hide_password=True)
    except Exception:
        return "<invalid-url>"

def ensure_psycopg_url(raw_url: str) -> str:
    url = make_url(raw_url)
    driver = url.drivername
    if driver in {"postgresql", "postgres"}:
        url = url.set(drivername="postgresql+psycopg")
        return url.render_as_string(hide_password=False)
    if driver == "postgresql+psycopg":
        return raw_url
    if driver.startswith("postgresql+"):
        raise ValueError(f"Unsupported Postgres driver '{driver}'. Use psycopg.")
    raise ValueError(f"Unsupported database URL '{driver}'.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate data from a Prisma Postgres DB to the SQLModel schema."
    )
    parser.add_argument(
        "--old-db-url",
        default=os.getenv("OLD_DATABASE_URL"),
        help="Prisma database URL (OLD_DATABASE_URL).",
    )
    parser.add_argument(
        "--new-db-url",
        default=os.getenv("DATABASE_URL"),
        help="Target database URL (DATABASE_URL).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Rows to insert per batch.",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="TRUNCATE all target tables before migrating.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        help="Log level (DEBUG, INFO, WARNING, ERROR).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
    )
    if not args.old_db_url or not args.new_db_url:
        LOGGER.error("Missing database URLs. Set OLD_DATABASE_URL and DATABASE_URL.")
        return 1

    LOGGER.info("Old DB: %s", redact_url(args.old_db_url))
    LOGGER.info("New DB: %s", redact_url(args.new_db_url))
    LOGGER.info("Batch size: %s", args.batch_size)
    LOGGER.info("Truncate target: %s", args.truncate)
    LOGGER.debug("Migration order: %s", ", ".join(plan.new_name for plan in TABLE_PLANS))

    try:
        old_db_url = ensure_psycopg_url(args.old_db_url)
        new_db_url = ensure_psycopg_url(args.new_db_url)
    except ValueError as exc:
        LOGGER.error("%s", exc)
        return 1

    old_engine = create_engine(old_db_url)
    new_engine = create_engine(new_db_url)

    new_tables = load_new_tables()
    LOGGER.info("Loaded %s target tables.", len(new_tables))
    for plan in TABLE_PLANS:
        if plan.new_name not in new_tables:
            raise KeyError(f"Missing target table: {plan.new_name}")

    old_tables = load_old_tables(old_engine, TABLE_PLANS)
    LOGGER.info("Loaded %s source tables.", len(old_tables))
    for plan in TABLE_PLANS:
        if plan.resolve_old_name() not in old_tables:
            raise KeyError(f"Missing source table: {plan.resolve_old_name()}")

    id_maps: dict[str, dict[str, int]] = {}

    with old_engine.connect() as old_conn:
        if args.truncate:
            with new_engine.begin() as new_conn:
                LOGGER.warning("Truncating target tables before migration.")
                truncate_new_db(new_conn, TABLE_PLANS)

        for plan in TABLE_PLANS:
            count = migrate_table(
                plan,
                old_conn=old_conn,
                new_engine=new_engine,
                old_tables=old_tables,
                new_tables=new_tables,
                id_maps=id_maps,
                batch_size=args.batch_size,
            )
            LOGGER.info("%s: %s rows", plan.new_name, count)

    LOGGER.info("Migration complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

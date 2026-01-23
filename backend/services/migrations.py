from pathlib import Path

from alembic import command
from alembic.config import Config

from services.logger import AppLogger

logger = AppLogger.get_logger(__name__)


def run_migrations() -> None:
    base_dir = Path(__file__).resolve().parents[1]
    alembic_cfg = Config(str(base_dir / "alembic.ini"))
    alembic_cfg.attributes["configure_logger"] = False
    logger.info("Running database migrations.")
    command.upgrade(alembic_cfg, "head")
    logger.info("Database migrations complete.")

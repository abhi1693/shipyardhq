from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export FastAPI OpenAPI schema to a JSON file."
    )
    parser.add_argument(
        "--output",
        "-o",
        default="openapi.json",
        help="Output path for the exported OpenAPI JSON (default: openapi.json)",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON indentation level (default: 2)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # Import app lazily so argparse --help works without loading app modules.
    backend_root = Path(__file__).resolve().parents[1]
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))
    from main import app

    schema = app.openapi()
    output_path = Path(args.output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(schema, indent=args.indent, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"OpenAPI schema exported to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

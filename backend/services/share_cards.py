from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from io import BytesIO
import html
import re

from PIL import Image, ImageDraw, ImageFont
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from models import ScoreSnapshot
from services.display import EM_DASH, format_count, format_month_year, format_momentum_label, format_score
from services.scoring import (
    ActivitySummary,
    PeriodWindow,
    get_activity_summary_for_period,
    get_period_window,
    get_rank_for_snapshot,
    get_streak_days,
    get_score_snapshot_for_period,
    resolve_score_period,
    to_utc_datetime,
)
from services.settings import get_user_settings_or_default
from services.users import get_user_by_handle

BADGE_METRICS = {
    "score",
    "rank",
    "momentum",
    "streak",
    "prs_merged",
    "reviews",
    "repos_touched",
    "issues_closed",
    "commits",
    "active_days",
}

BADGE_LABELS = {
    "score": "score",
    "rank": "rank",
    "momentum": "momentum",
    "streak": "streak",
    "prs_merged": "prs merged",
    "reviews": "reviews",
    "repos_touched": "repos touched",
    "issues_closed": "issues closed",
    "commits": "commits",
    "active_days": "active days",
}

BADGE_COLORS = {
    "score": "#22c55e",
    "rank": "#3b82f6",
    "momentum": "#f59e0b",
    "streak": "#14b8a6",
    "prs_merged": "#8b5cf6",
    "reviews": "#ec4899",
    "repos_touched": "#06b6d4",
    "issues_closed": "#f97316",
    "commits": "#a855f7",
    "active_days": "#10b981",
}

OG_IMAGE_WIDTH = 1200
OG_IMAGE_HEIGHT = 630
OG_SAFE_MARGIN = 64

_HEX_COLOR_RE = re.compile(r"^#?[0-9a-fA-F]{6}$")


@dataclass(frozen=True)
class ShareStats:
    handle: str
    display_name: str | None
    avatar_url: str | None
    window: PeriodWindow
    summary: ActivitySummary
    snapshot: ScoreSnapshot | None
    rank: int | None
    streak_days: int
    show_repos: bool
    show_commits: bool


def parse_period_value(value: str | None) -> date | None:
    if not value:
        return None
    parts = value.split("-")
    if len(parts) != 2:
        return None
    try:
        year = int(parts[0])
        month = int(parts[1])
        return date(year, month, 1)
    except ValueError:
        return None


def resolve_period_window(period_key: str | None, period: str | None) -> PeriodWindow:
    score_period = resolve_score_period(period_key)
    parsed_period = parse_period_value(period)
    if parsed_period:
        return get_period_window(score_period, to_utc_datetime(parsed_period))
    return get_period_window(score_period)


async def build_share_stats(
    session: Session,
    handle: str,
    *,
    period_key: str | None = None,
    period: str | None = None,
) -> ShareStats:
    user = await get_user_by_handle(session, handle)
    if not user:
        raise LookupError("User not found.")

    settings = await get_user_settings_or_default(session, user.id)
    if not settings.profile_public:
        raise LookupError("User not found.")

    window = resolve_period_window(period_key, period)
    summary = await get_activity_summary_for_period(session, user.id, window)
    snapshot = await get_score_snapshot_for_period(session, user.id, window)
    rank = await get_rank_for_snapshot(session, snapshot) if snapshot else None
    streak_end = min(window.end, datetime.now(timezone.utc))
    streak_days = get_streak_days(summary.activity_day_totals, streak_end)

    resolved_handle = user.handle or handle
    return ShareStats(
        handle=resolved_handle,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        window=window,
        summary=summary,
        snapshot=snapshot,
        rank=rank,
        streak_days=streak_days,
        show_repos=settings.show_repos,
        show_commits=settings.show_commits,
    )


def _normalize_display_value(value: str | None, fallback: str = "n/a") -> str:
    if not value or value == EM_DASH:
        return fallback
    return value


def _resolve_score_value(stats: ShareStats) -> str:
    if stats.snapshot:
        return _normalize_display_value(format_score(stats.snapshot.total_score), "n/a")
    if stats.summary.has_data:
        return "Unranked"
    return "No data"


def _resolve_rank_value(stats: ShareStats) -> str:
    if stats.rank:
        return f"#{stats.rank}"
    if stats.summary.has_data:
        return "Unranked"
    return "No data"


def _resolve_momentum_value(stats: ShareStats) -> str:
    if stats.snapshot:
        return _normalize_display_value(
            format_momentum_label(stats.snapshot.momentum_score),
            "n/a",
        )
    return "n/a"


def _resolve_badge_value(stats: ShareStats, metric: str) -> str:
    if metric == "score":
        return _resolve_score_value(stats)
    if metric == "rank":
        return _resolve_rank_value(stats)
    if metric == "momentum":
        return _resolve_momentum_value(stats)
    if metric == "streak":
        return f"{stats.streak_days} days"
    if metric == "active_days":
        return f"{stats.summary.active_days}/{stats.window.days}"

    totals = stats.summary.totals or {}
    if metric == "repos_touched":
        repos_touched = stats.summary.repos_touched or totals.get("repos_touched", 0)
        return format_count(repos_touched)

    value = totals.get(metric, 0)
    return format_count(value)


def _coerce_badge_color(value: str | None, default: str) -> str:
    if value and _HEX_COLOR_RE.match(value):
        return value if value.startswith("#") else f"#{value}"
    return default


def _estimate_text_width(text: str, font_size: int) -> int:
    return int(len(text) * font_size * 0.62) + 10


def render_badge_svg(
    stats: ShareStats,
    metric: str,
    color: str | None = None,
    theme: str | None = None,
) -> str:
    label = BADGE_LABELS.get(metric, metric)
    value = _resolve_badge_value(stats, metric)
    label = html.escape(label)
    value = html.escape(value)

    color_value = _coerce_badge_color(color, BADGE_COLORS.get(metric, "#4b5563"))
    theme_key = (theme or "dark").strip().lower()
    is_light = theme_key == "light"
    label_background = "#e5e7eb" if is_light else "#555"
    label_text = "#111827" if is_light else "#ffffff"
    value_text = "#ffffff"
    border = "#d1d5db" if is_light else None
    height = 20
    font_size = 11
    label_width = max(40, _estimate_text_width(label, font_size))
    value_width = max(50, _estimate_text_width(value, font_size))
    total_width = label_width + value_width
    label_x = label_width / 2
    value_x = label_width + value_width / 2
    border_rect = (
        f'<rect width="{total_width}" height="{height}" fill="none" stroke="{border}" '
        'stroke-width="1"/>'
        if border
        else ""
    )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_width}" height="{height}"'
        f' role="img" aria-label="{label}: {value}">'
        '<linearGradient id="s" x2="0" y2="100%">'
        '<stop offset="0" stop-color="#fff" stop-opacity=".1"/>'
        '<stop offset="1" stop-opacity=".1"/>'
        "</linearGradient>"
        f'<rect width="{total_width}" height="{height}" fill="{label_background}"/>'
        f'<rect x="{label_width}" width="{value_width}" height="{height}" fill="{color_value}"/>'
        f'<rect width="{total_width}" height="{height}" fill="url(#s)"/>'
        f"{border_rect}"
        '<g text-anchor="middle" '
        'font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">'
        f'<text x="{label_x}" y="14" fill="{label_text}">{label}</text>'
        f'<text x="{value_x}" y="14" fill="{value_text}">{value}</text>'
        "</g>"
        "</svg>"
    )


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        ]
    else:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        ]

    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue

    return ImageFont.load_default()


def _text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> int:
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0]


def _text_height(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> int:
    box = draw.textbbox((0, 0), text, font=font)
    return box[3] - box[1]


def _truncate_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
) -> str:
    if _text_width(draw, text, font) <= max_width:
        return text
    trimmed = text
    while trimmed and _text_width(draw, f"{trimmed}...", font) > max_width:
        trimmed = trimmed[:-1]
    return f"{trimmed}..." if trimmed else "..."


def _apply_grid(canvas: Image.Image, theme_key: str) -> Image.Image:
    width, height = canvas.size
    grid = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid)
    grid_spacing = 48
    if theme_key == "dark":
        minor = (255, 255, 255, 12)
        major = (255, 255, 255, 20)
    else:
        minor = (0, 0, 0, 12)
        major = (0, 0, 0, 20)

    for x in range(0, width + 1, grid_spacing):
        grid_draw.line([(x, 0), (x, height)], fill=minor, width=1)
    for y in range(0, height + 1, grid_spacing):
        grid_draw.line([(0, y), (width, y)], fill=minor, width=1)
    for x in range(0, width + 1, grid_spacing * 4):
        grid_draw.line([(x, 0), (x, height)], fill=major, width=1)
    for y in range(0, height + 1, grid_spacing * 4):
        grid_draw.line([(0, y), (width, y)], fill=major, width=1)

    return Image.alpha_composite(canvas.convert("RGBA"), grid)


def render_share_card_png(stats: ShareStats, theme: str | None = None) -> bytes:
    width = OG_IMAGE_WIDTH
    height = OG_IMAGE_HEIGHT
    theme_key = (theme or "light").strip().lower()
    if theme_key == "dark":
        background = (15, 15, 15)
        text_primary = (245, 245, 245)
        text_muted = (224, 224, 224)
        text_soft = (198, 198, 198)
        border = (43, 43, 43)
        row_divider = (255, 255, 255, 36)
    else:
        background = (255, 255, 255)
        text_primary = (26, 26, 26)
        text_muted = (68, 68, 68)
        text_soft = (96, 96, 96)
        border = (229, 229, 229)
        row_divider = (0, 0, 0, 24)

    canvas = Image.new("RGB", (width, height), background)
    canvas = _apply_grid(canvas, theme_key)
    draw = ImageDraw.Draw(canvas)

    font_logo = _load_font(20, bold=True)
    font_date = _load_font(16, bold=False)
    font_handle = _load_font(80, bold=True)
    font_handle_small = _load_font(64, bold=True)
    font_name = _load_font(26, bold=False)
    font_label = _load_font(14, bold=False)
    font_score = _load_font(96, bold=True)
    font_score_small = _load_font(82, bold=True)
    font_stat_label = _load_font(14, bold=False)
    font_stat_value = _load_font(32, bold=True)
    font_stat_value_small = _load_font(26, bold=True)
    font_url = _load_font(14, bold=False)

    margin = 80
    gap = 80
    content_width = width - margin * 2
    left_width = int((content_width - gap) * 2 / 3)
    right_width = content_width - gap - left_width
    left_x = margin
    right_x = left_x + left_width + gap

    logo_text = "GitRank"
    date_text = format_month_year(stats.window.start)
    logo_height = _text_height(draw, logo_text, font_logo)
    date_height = _text_height(draw, date_text, font_date)
    header_height = max(logo_height, date_height)
    header_y = margin
    logo_y = header_y + (header_height - logo_height)
    date_y = header_y + (header_height - date_height)
    draw.text((left_x, logo_y), logo_text, font=font_logo, fill=text_primary)
    date_width = _text_width(draw, date_text, font_date)
    draw.text((width - margin - date_width, date_y), date_text, font=font_date, fill=text_soft)

    main_top = header_y + header_height + 60
    handle_text_raw = f"@{stats.handle}"
    handle_font = font_handle if _text_width(draw, handle_text_raw, font_handle) <= left_width else font_handle_small
    handle_text = _truncate_text(draw, handle_text_raw, handle_font, left_width)
    draw.text((left_x, main_top), handle_text, font=handle_font, fill=text_primary)
    handle_bbox = draw.textbbox((left_x, main_top), handle_text, font=handle_font)

    current_y = handle_bbox[3] + 18
    if stats.display_name:
        name_text = _truncate_text(draw, stats.display_name, font_name, left_width)
        draw.text((left_x, current_y), name_text, font=font_name, fill=text_muted)
        name_bbox = draw.textbbox((left_x, current_y), name_text, font=font_name)
        current_y = name_bbox[3] + 30
    else:
        current_y += 16

    score_label = "TOTAL SCORE"
    draw.text((left_x, current_y), score_label, font=font_label, fill=text_soft)
    label_height = _text_height(draw, score_label, font=font_label)
    score_value = _resolve_score_value(stats)
    score_font = font_score if _text_width(draw, score_value, font_score) <= left_width else font_score_small
    score_text = _truncate_text(draw, score_value, score_font, left_width)
    score_y = current_y + label_height + 8
    draw.text((left_x, score_y), score_text, font=score_font, fill=text_primary)
    score_bbox = draw.textbbox((left_x, score_y), score_text, font=score_font)
    underline_y = score_bbox[3] + 12
    underline_width = max(160, int(left_width * 0.5))
    draw.rectangle(
        (left_x, underline_y, left_x + underline_width, underline_y + 8),
        fill=text_primary,
    )

    left_block_bottom = underline_y + 8
    left_block_center = (main_top + left_block_bottom) / 2

    stat_rows = [
        ("RANK", _resolve_rank_value(stats)),
        ("MOMENTUM", _resolve_momentum_value(stats)),
        ("STREAK", f"{stats.streak_days} days"),
    ]
    row_height = 72
    row_gap = 24
    right_block_height = row_height * len(stat_rows) + row_gap * (len(stat_rows) - 1)
    right_top = int(left_block_center - right_block_height / 2)

    for idx, (label, value) in enumerate(stat_rows):
        row_top = right_top + idx * (row_height + row_gap)
        label_height = _text_height(draw, label, font=font_stat_label)
        value_font = (
            font_stat_value
            if _text_width(draw, value, font_stat_value) <= right_width
            else font_stat_value_small
        )
        value_text = _truncate_text(draw, value, value_font, right_width)
        value_height = _text_height(draw, value_text, font=value_font)

        baseline_y = row_top + row_height - 18
        label_y = baseline_y - label_height
        value_y = baseline_y - value_height
        draw.text((right_x, label_y), label, font=font_stat_label, fill=text_soft)
        value_width = _text_width(draw, value_text, value_font)
        draw.text((right_x + right_width - value_width, value_y), value_text, font=value_font, fill=text_primary)

        line_y = row_top + row_height
        draw.line([(right_x, line_y), (right_x + right_width, line_y)], fill=row_divider, width=1)

    profile_url = f"git-rank.dev/u/{stats.handle}"
    url_height = _text_height(draw, profile_url, font_url)
    url_y = height - margin - url_height
    footer_line_y = url_y - 20
    draw.line([(left_x, footer_line_y), (width - margin, footer_line_y)], fill=border, width=1)
    draw.text((left_x, url_y), profile_url, font=font_url, fill=text_soft)

    output = BytesIO()
    canvas.convert("RGB").save(output, format="PNG", optimize=True)
    return output.getvalue()

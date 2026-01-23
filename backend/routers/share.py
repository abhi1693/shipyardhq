from __future__ import annotations

from fastapi import Depends, HTTPException, Query, Response
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from database import get_session
from routers.base import api_prefix
from routers.generics import AssetAPIView, APIView
from services.rate_limit import public_rate_limit
from services.share_cards import (
    BADGE_METRICS,
    build_share_stats,
    render_badge_svg,
    render_share_card_png,
)

CACHE_HEADERS = {"Cache-Control": "public, max-age=900, s-maxage=3600"}


Action = APIView.Action


class ShareView(AssetAPIView):
    actions = (
        Action(
            path="/{handle}/badge.svg",
            methods=["GET"],
            handler="profile_badge",
            operation_id="profile_badge",
        ),
        Action(
            path="/{handle}/opengraph.png",
            methods=["GET"],
            handler="profile_open_graph_card",
            operation_id="profile_open_graph_card",
        ),
    )

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("profiles"), tags=["share"])

    async def profile_badge(
        self,
        handle: str,
        _: None = Depends(public_rate_limit),
        metric: str = Query(default="score"),
        period: str | None = None,
        period_key: str | None = Query(default=None, alias="periodKey"),
        color: str | None = None,
        theme: str | None = Query(default=None),
        session: Session = Depends(get_session),
    ):
        metric_key = metric.lower()
        if metric_key not in BADGE_METRICS:
            raise HTTPException(status_code=400, detail="Unsupported badge metric.")

        theme_key = (theme or "dark").strip().lower()
        if theme_key not in {"dark", "light"}:
            raise HTTPException(status_code=400, detail="Unsupported badge theme.")

        try:
            stats = await build_share_stats(
                session,
                handle,
                period_key=period_key,
                period=period,
            )
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

        if metric_key == "commits" and not stats.show_commits:
            raise HTTPException(status_code=404, detail="User not found.")
        if metric_key == "repos_touched" and not stats.show_repos:
            raise HTTPException(status_code=404, detail="User not found.")

        svg = render_badge_svg(stats, metric_key, color=color, theme=theme_key)
        return Response(content=svg, media_type="image/svg+xml", headers=CACHE_HEADERS)

    async def profile_open_graph_card(
        self,
        handle: str,
        _: None = Depends(public_rate_limit),
        period: str | None = None,
        period_key: str | None = Query(default=None, alias="periodKey"),
        theme: str | None = Query(default=None),
        session: Session = Depends(get_session),
    ):
        theme_key = (theme or "light").strip().lower()
        if theme_key not in {"dark", "light"}:
            raise HTTPException(status_code=400, detail="Unsupported card theme.")
        try:
            stats = await build_share_stats(
                session,
                handle,
                period_key=period_key,
                period=period,
            )
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

        image = render_share_card_png(stats, theme=theme_key)
        return Response(content=image, media_type="image/png", headers=CACHE_HEADERS)


router = ShareView().router

"""Exercise the actual built image against a disposable synthetic database."""

import json
import subprocess
import sys
import time
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import ProxyHandler, Request, build_opener

base = sys.argv[1]
token = "ci-runtime-only"
opener = build_opener(ProxyHandler({}))


def get(path, authorization=None, accept="*/*"):
    headers = {"Accept": accept}
    if authorization is not None:
        headers["Authorization"] = authorization
    try:
        response = opener.open(Request(base + path, headers=headers), timeout=15)
    except HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read(8 * 1024 * 1024)


deadline = time.monotonic() + 600
while time.monotonic() < deadline:
    if subprocess.check_output(
        ["docker", "inspect", "--format", "{{.State.Running}}", sys.argv[2]], text=True
    ).strip() != "true":
        raise AssertionError("Disposable application build/server exited before readiness")
    try:
        status, headers, body = get("/", accept="text/html")
        if status == 200:
            break
    except (URLError, TimeoutError, ConnectionError):
        pass
    time.sleep(2)
else:
    raise AssertionError("Actual production build never served its homepage within 600s")

html = body.decode()
assert "Shipyard" in html
assert "NEXT_REDIRECT" not in html and "__next-page-redirect" not in html


class Assets(HTMLParser):
    paths = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        path = attrs.get("src") if tag == "script" else attrs.get("href")
        if path and path.startswith("/_next/static/") and path.endswith((".js", ".css")):
            self.paths.add(path)


assets = Assets()
assets.feed(html)
assert any(path.endswith(".js") for path in assets.paths)
assert any(path.endswith(".css") for path in assets.paths)
for path in sorted(assets.paths):
    status, headers, body = get(path)
    assert status == 200 and body, f"Missing compiled asset: {path}"
    assert ("text/css" if path.endswith(".css") else "javascript") in headers.get(
        "Content-Type", ""
    )

status, headers, body = get("/api/products")
assert status == 401 and json.loads(body) == {"error": "unauthorized"}
assert headers.get("WWW-Authenticate") == "Bearer"
assert "private" in headers.get("Cache-Control", "")
# Next appends separate Vary field lines. HTTPMessage.get() returns only the
# first one, so combine every field before checking the case-insensitive tokens.
vary_lines = headers.get_all("Vary", [])
vary = {value.strip().lower() for line in vary_lines for value in line.split(",")}
assert "authorization" in vary, f"Missing Authorization variation: {vary_lines}"
status, _, body = get("/api/products", "Bearer incorrect-fixture-token")
assert status == 401 and json.loads(body) == {"error": "unauthorized"}
status, _, body = get("/api/products?limit=0", "Bearer " + token)
assert status == 400 and json.loads(body) == {"error": "invalid_pagination"}
status, _, body = get("/api/products?limit=1&planId=smoke-other-plan", "Bearer " + token)
first = json.loads(body)
assert status == 200 and first["hasMore"] is True and first["nextCursor"]
assert [item["id"] for item in first["items"]] == ["smoke-product-two"]
item = first["items"][0]
assert item["plan"]["id"] == "smoke-plan"
# Production deliberately rejects an insecure localhost public base URL and
# returns the canonical HTTPS origin rather than leaking the fixture address.
assert item["url"] == "https://shipyardhq.dev/products/smoke-product-two"
assert not ({"userId", "subscriptionId", "planGrants"} & item.keys())
status, _, body = get(
    "/api/products?limit=1&cursor=" + quote(first["nextCursor"]), "Bearer " + token
)
second = json.loads(body)
assert status == 200 and second["hasMore"] is False and second["nextCursor"] is None
assert [item["id"] for item in second["items"]] == ["smoke-product-one"]

# The configured custom image loader serves local files unchanged and uses the
# external media service for remote transformations. Next's /_next/image is
# intentionally disabled; native Sharp/WebP is checked separately in the image.
status, headers, body = get("/runtime-smoke.png", accept="image/png")
assert status == 200 and headers.get("Content-Type", "").startswith("image/png")
assert body[:8] == b"\x89PNG\r\n\x1a\n" and len(body) > 24
assert int.from_bytes(body[16:20], "big") == 32
assert int.from_bytes(body[20:24], "big") == 32
print(json.dumps({"checks": ["homepage", "compiled-js-css", "products-auth", "products-db-pagination", "plan-isolation", "private-field-boundary", "local-image-http"], "assetCount": len(assets.paths), "authorizationVary": "authorization" in vary, "database": "isolated synthetic PostgreSQL"}))

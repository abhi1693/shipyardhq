#!/usr/bin/env python3
"""Read-only HTTP checks against a seeded local production server."""
import json
import sys
from html.parser import HTMLParser
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


class Document(HTMLParser):
    def __init__(self, body):
        super().__init__()
        self.canonical = None
        self.robots = []
        self.anchors = []
        self.scripts = []
        self.script = None
        self.feed(body)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")
        if tag == "meta" and attrs.get("name") == "robots":
            self.robots.append(attrs.get("content", ""))
        if tag == "a":
            self.anchors.append(attrs)
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.script = ""

    def handle_data(self, value):
        if self.script is not None:
            self.script += value

    def handle_endtag(self, tag):
        if tag == "script" and self.script is not None:
            self.scripts.append(json.loads(self.script))
            self.script = None

    def listing(self):
        for script in self.scripts:
            if script.get("@type") == "ItemList" and script.get("@id", "").endswith("#itemlist"):
                return script["itemListElement"]
        return []


def main():
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3140").rstrip("/")
    assert urlsplit(base).hostname in ("localhost", "127.0.0.1"), "Local server required"
    results = []

    def fetch(path, method="GET"):
        req = Request(base + path, headers={"Accept": "text/html", "User-Agent": "Googlebot"}, method=method)
        try:
            response = urlopen(req)
        except HTTPError as error:
            response = error
        body = response.read().decode()
        return response.status, response.headers, Document(body)

    for path in ("/browse", "/categories/developer-tools"):
        seen = set()
        for page in (1, 2, 3):
            suffix = "" if page == 1 else f"?page={page}"
            status, headers, doc = fetch(path + suffix)
            assert status == 200
            records = doc.listing()
            links = [row["url"] for row in records]
            assert len(links) == 12, (path, page, len(links))
            assert not seen.intersection(links), (path, page, "duplicate results")
            seen.update(links)
            assert records[0]["position"] == (page - 1) * 12 + 1
            canonical = urlsplit(doc.canonical)
            assert canonical.path + ("?" + canonical.query if canonical.query else "") == path + suffix
            assert "noindex" not in headers.get("X-Robots-Tag", "")
            assert not any("noindex" in value for value in doc.robots)
            assert any(a.get("rel") == "next" and a.get("href") == path + f"?page={page+1}" for a in doc.anchors)
            if page > 1:
                previous = path if page == 2 else path + f"?page={page-1}"
                assert any(a.get("rel") == "prev" and a.get("href") == previous for a in doc.anchors)
            _, head, _ = fetch(path + suffix, "HEAD")
            assert "noindex" not in head.get("X-Robots-Tag", "")
            results.append({"path": path + suffix, "status": status, "products": len(links), "canonical": doc.canonical, "robotsHeader": headers.get("X-Robots-Tag"), "distinct": True, "anchors": True})
        for suffix in ("?page=0", "?page=2&page=3", "?page=100000"):
            status, headers, doc = fetch(path + suffix)
            assert not doc.listing(), (path, suffix, "repeated listing")
            assert "noindex" in headers.get("X-Robots-Tag", "") or any("noindex" in value for value in doc.robots)
            results.append({"path": path + suffix, "status": status, "noRepeatedListing": True, "noindex": True})
    for path in ("/browse?page=2&q=email", "/browse?page=2&sort=votes", "/categories/developer-tools?page=2&sort=votes"):
        _, headers, doc = fetch(path)
        assert "noindex" in headers.get("X-Robots-Tag", "")
        assert any("noindex" in value for value in doc.robots)
        results.append({"path": path, "noindexHeaderAndMetadata": True})
    print(json.dumps({"localFixtureData": True, "checks": results}, indent=2))


if __name__ == "__main__":
    main()

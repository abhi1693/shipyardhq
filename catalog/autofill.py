from __future__ import annotations

import html
import ipaddress
import json
import os
import re
import socket
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.core.exceptions import ValidationError

USER_AGENT = "ShipyardHQ-Autofill/1.0"
FETCH_TIMEOUT_SECONDS = 8
MAX_HTML_BYTES = 5_000_000
MAX_TEXT_CHARS = 12000
PRICE_RE = re.compile(
    r"(?P<currency>USD|EUR|GBP|CAD|AUD|INR|JPY|\$|€|£|₹)\s*(?P<amount>\d+(?:[.,]\d{1,2})?)",
    re.I,
)
CURRENCY_SYMBOLS = {
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "₹": "INR",
}


def build_product_autofill(url, *, categories, product_types, pricing_models, platforms):
    target_url = normalize_target_url(url)
    html_text = fetch_html(target_url)
    context = extract_page_context(target_url, html_text)
    suggestion = suggest_from_page_context(context, categories, product_types, pricing_models, platforms)
    ai_suggestion = suggest_with_ai(context, categories, product_types, pricing_models, platforms)
    suggestion.update({key: value for key, value in ai_suggestion.items() if value not in (None, "", [], {})})
    return normalize_suggestion(suggestion, categories, product_types, pricing_models, platforms)


def normalize_target_url(raw_url):
    value = str(raw_url or "").strip()
    if not value:
        raise ValidationError("Enter a website URL first.")
    if not re.match(r"^https?://", value, flags=re.I):
        value = f"https://{value.lstrip('/')}"

    parsed = urllib.parse.urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValidationError("Enter a valid website URL.")

    validate_public_hostname(parsed.hostname)
    return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, parsed.path or "/", parsed.params, parsed.query, ""))


def validate_public_hostname(hostname):
    try:
        addresses = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise ValidationError("This website could not be reached.") from exc

    for _family, _socktype, _proto, _canonname, sockaddr in addresses:
        address = sockaddr[0]
        try:
            ip = ipaddress.ip_address(address)
        except ValueError:
            continue
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
            raise ValidationError("This website cannot be used for autofill.")


def fetch_html(url):
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT_SECONDS) as response:
            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type:
                raise ValidationError("This website did not return a page we can read.")
            data = response.read(MAX_HTML_BYTES)[:MAX_HTML_BYTES]
    except (urllib.error.URLError, TimeoutError) as exc:
        raise ValidationError("This website could not be reached.") from exc

    return data.decode("utf-8", errors="replace")


def extract_page_context(url, html_text):
    meta = parse_meta_tags(html_text)
    title = clean_text(extract_title(html_text))
    description = (
        meta.get("description")
        or meta.get("og:description")
        or meta.get("twitter:description")
        or first_sentence(strip_html_noise(html_text))
    )
    keywords = [
        keyword.strip().lower()
        for keyword in re.split(r"[,;]", meta.get("keywords", ""))
        if keyword.strip()
    ][:12]

    return {
        "url": url,
        "host": urllib.parse.urlparse(url).hostname or "",
        "title": title,
        "site_name": clean_text(meta.get("og:site_name", "")),
        "description": clean_text(description),
        "image": absolute_url(url, meta.get("og:image") or meta.get("twitter:image") or extract_icon_href(html_text)),
        "keywords": keywords,
        "text": strip_html_noise(html_text)[:MAX_TEXT_CHARS],
    }


def suggest_from_page_context(context, categories, product_types, pricing_models, platforms):
    name = context["site_name"] or infer_name_from_title(context["title"], context["host"])
    description = context["description"] or context["text"][:500]
    tagline = first_sentence(description)[:160] if description else ""
    page_text = " ".join(
        [
            context["title"],
            context["description"],
            " ".join(context["keywords"]),
            context["text"][:3000],
        ]
    ).lower()
    price = infer_price(page_text)

    return {
        "name": name[:160],
        "tagline": tagline[:220],
        "summary": description[:700],
        "description": description[:2000],
        "category_ids": best_category_ids(page_text, categories),
        "product_type_id": best_taxonomy_id(page_text, product_types),
        "pricing_model_id": best_pricing_id(page_text, pricing_models, price),
        "platform_ids": best_platform_ids(page_text, platforms),
        "starting_price": price["starting_price"],
        "currency_code": price["currency_code"],
    }


def suggest_with_ai(context, categories, product_types, pricing_models, platforms):
    api_key = getattr(settings, "OPENAI_API_KEY", os.getenv("OPENAI_API_KEY", ""))
    if not api_key:
        return {}

    prompt = {
        "page": context,
        "categories": [{"id": str(category.pk), "name": category.name} for category in categories],
        "product_types": [{"id": str(item.pk), "name": item.name} for item in product_types],
        "pricing_models": [{"id": str(item.pk), "name": item.name, "slug": item.slug} for item in pricing_models],
        "platforms": [{"id": str(item.pk), "name": item.name} for item in platforms],
    }
    payload = {
        "model": getattr(settings, "OPENAI_AUTOFILL_MODEL", "gpt-4o-mini"),
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Return JSON only. Infer a product listing from the website content. "
                    "Use only provided IDs for categories, product_type, pricing_model, and platforms. "
                    "Fields: name, tagline, summary, description, category_ids, product_type_id, "
                    "pricing_model_id, platform_ids, starting_price, currency_code."
                ),
            },
            {"role": "user", "content": json.dumps(prompt)[:18000]},
        ],
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = json.loads(response.read().decode("utf-8"))
        content = raw["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception:
        return {}


def normalize_suggestion(suggestion, categories, product_types, pricing_models, platforms):
    return {
        "name": str(suggestion.get("name") or "")[:160],
        "tagline": str(suggestion.get("tagline") or "")[:220],
        "summary": str(suggestion.get("summary") or "")[:1200],
        "description": str(suggestion.get("description") or "")[:4000],
        "category_ids": valid_ids(suggestion.get("category_ids"), categories)[:3],
        "product_type_id": first_valid_id(suggestion.get("product_type_id"), product_types),
        "pricing_model_id": first_valid_id(suggestion.get("pricing_model_id"), pricing_models),
        "platform_ids": valid_ids(suggestion.get("platform_ids"), platforms),
        "starting_price": normalize_price_value(suggestion.get("starting_price")),
        "currency_code": normalize_currency(suggestion.get("currency_code")),
    }


def parse_meta_tags(html_text):
    meta = {}
    for tag in re.findall(r"<meta\s+[^>]*>", html_text, flags=re.I):
        attrs = dict(
            (key.lower(), html.unescape(double_quoted or single_quoted or bare or "").strip())
            for key, double_quoted, single_quoted, bare in re.findall(
                r"([\w:-]+)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s\"'>]+))",
                tag,
                flags=re.I,
            )
        )
        key = (attrs.get("name") or attrs.get("property") or "").lower()
        if key and attrs.get("content"):
            meta[key] = attrs["content"]
    return meta


def extract_title(html_text):
    match = re.search(r"<title[^>]*>(.*?)</title>", html_text, flags=re.I | re.S)
    if not match:
        return ""
    return html.unescape(match.group(1))


def extract_icon_href(html_text):
    for tag in re.findall(r"<link\s+[^>]*>", html_text, flags=re.I):
        attrs = dict(
            (key.lower(), html.unescape(double_quoted or single_quoted or bare or "").strip())
            for key, double_quoted, single_quoted, bare in re.findall(
                r"([\w:-]+)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s\"'>]+))",
                tag,
                flags=re.I,
            )
        )
        rel = attrs.get("rel", "").lower()
        if "icon" in rel and attrs.get("href"):
            return attrs["href"]
    return ""


def strip_html_noise(html_text):
    text = re.sub(r"<script[\s\S]*?</script>", " ", html_text, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<!--.*?-->", " ", text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return clean_text(text)


def clean_text(value):
    return re.sub(r"\s+", " ", html.unescape(str(value or ""))).strip()


def first_sentence(value):
    match = re.match(r"^(.{20,240}?[.!?])\s", value or "")
    if match:
        return match.group(1).strip()
    return (value or "").strip()


def infer_name_from_title(title, host):
    value = title or host.replace("www.", "")
    for separator in (" | ", " - ", " — ", " · "):
        if separator in value:
            value = value.split(separator)[0]
            break
    return value.strip() or host


def absolute_url(base_url, value):
    if not value:
        return ""
    return urllib.parse.urljoin(base_url, value)


def best_category_ids(text, categories):
    scored = []
    for category in categories:
        score = taxonomy_score(text, category.name, category.slug)
        if score:
            scored.append((score, category.pk))
    return [str(pk) for _score, pk in sorted(scored, reverse=True)[:3]]


def best_taxonomy_id(text, objects):
    scored = [(taxonomy_score(text, obj.name, obj.slug), obj.pk) for obj in objects]
    scored = [(score, pk) for score, pk in scored if score]
    if not scored:
        return ""
    return str(sorted(scored, reverse=True)[0][1])


def best_pricing_id(text, pricing_models, price):
    target_slug = ""
    if "free trial" in text or "free plan" in text or "freemium" in text:
        target_slug = "freemium"
    elif "contact sales" in text or "custom pricing" in text:
        target_slug = "custom"
    elif price["starting_price"] and ("one-time" in text or "lifetime" in text):
        target_slug = "one-time"
    elif price["starting_price"] or "/mo" in text or "monthly" in text or "subscription" in text:
        target_slug = "subscription"
    elif "free" in text:
        target_slug = "free"

    if target_slug:
        for pricing_model in pricing_models:
            if pricing_model.slug == target_slug:
                return str(pricing_model.pk)
    return best_taxonomy_id(text, pricing_models)


def best_platform_ids(text, platforms):
    matches = []
    for platform in platforms:
        score = taxonomy_score(text, platform.name, platform.slug)
        if score:
            matches.append((score, platform.pk))
    if not matches:
        for platform in platforms:
            if platform.slug == "web":
                return [str(platform.pk)]
    return [str(pk) for _score, pk in sorted(matches, reverse=True)]


def taxonomy_score(text, name, slug):
    terms = {slug, slug.replace("-", " "), name.lower()}
    return sum(1 for term in terms if term and term in text)


def infer_price(text):
    match = PRICE_RE.search(text)
    if not match:
        return {"starting_price": "", "currency_code": ""}
    raw_currency = match.group("currency").upper()
    currency_code = CURRENCY_SYMBOLS.get(match.group("currency"), raw_currency)
    amount = match.group("amount").replace(",", ".")
    return {"starting_price": amount, "currency_code": normalize_currency(currency_code)}


def valid_ids(values, objects):
    allowed = {str(obj.pk) for obj in objects}
    if not isinstance(values, list):
        values = [values] if values else []
    return [str(value) for value in values if str(value) in allowed]


def first_valid_id(value, objects):
    ids = valid_ids(value, objects)
    return ids[0] if ids else ""


def normalize_price_value(value):
    if value in (None, ""):
        return ""
    value = str(value).strip().replace(",", ".")
    return value if re.match(r"^\d+(?:\.\d{1,2})?$", value) else ""


def normalize_currency(value):
    if not value:
        return ""
    value = str(value).upper()
    return value if re.match(r"^[A-Z]{3}$", value) else ""

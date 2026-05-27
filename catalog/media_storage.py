from __future__ import annotations

import mimetypes
import uuid
from dataclasses import dataclass
from io import BytesIO
from pathlib import PurePosixPath
from urllib.parse import unquote, urlparse

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.utils import timezone
from django.utils.text import get_valid_filename

MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024
WEBP_SKIP_CONTENT_TYPES = {"image/gif", "image/svg+xml", "image/webp"}


class MediaUploadError(Exception):
    pass


@dataclass(frozen=True)
class R2Config:
    access_key_id: str
    secret_access_key: str
    bucket: str
    endpoint: str
    public_base_url: str


@dataclass(frozen=True)
class PreparedImage:
    data: bytes
    content_type: str
    extension: str
    width: int | None = None
    height: int | None = None


def get_r2_config() -> R2Config:
    config = getattr(settings, "R2", {}) or {}
    access_key_id = config.get("ACCESS_KEY_ID") or getattr(settings, "R2_ACCESS_KEY_ID", "")
    secret_access_key = config.get("SECRET_ACCESS_KEY") or getattr(settings, "R2_SECRET_ACCESS_KEY", "")
    bucket = config.get("BUCKET") or getattr(settings, "R2_BUCKET", "")
    endpoint = config.get("ENDPOINT") or getattr(settings, "R2_ENDPOINT", "")
    public_base_url = (config.get("PUBLIC_BASE_URL") or getattr(settings, "R2_PUBLIC_BASE_URL", "")).rstrip("/")

    missing = [
        name
        for name, value in (
            ("ACCESS_KEY_ID", access_key_id),
            ("SECRET_ACCESS_KEY", secret_access_key),
            ("BUCKET", bucket),
            ("ENDPOINT", endpoint),
            ("PUBLIC_BASE_URL", public_base_url),
        )
        if not value
    ]
    if missing:
        raise ImproperlyConfigured(f"R2 media storage is missing: {', '.join(missing)}")

    return R2Config(
        access_key_id=access_key_id,
        secret_access_key=secret_access_key,
        bucket=bucket,
        endpoint=endpoint,
        public_base_url=public_base_url,
    )


def validate_image_upload(uploaded_file):
    if uploaded_file.size > MAX_IMAGE_UPLOAD_BYTES:
        raise ValidationError("Images must be 5 MB or smaller.")

    content_type = getattr(uploaded_file, "content_type", "") or mimetypes.guess_type(uploaded_file.name)[0] or ""
    if not content_type.startswith("image/"):
        raise ValidationError("Upload an image file.")


def prepare_image(uploaded_file) -> PreparedImage:
    validate_image_upload(uploaded_file)
    original_data = uploaded_file.read()
    content_type = getattr(uploaded_file, "content_type", "") or mimetypes.guess_type(uploaded_file.name)[0]
    content_type = content_type or "application/octet-stream"
    extension = _extension_for(uploaded_file.name, content_type)
    width = None
    height = None

    if content_type in WEBP_SKIP_CONTENT_TYPES:
        return PreparedImage(original_data, content_type, extension, width, height)

    try:
        from PIL import Image, UnidentifiedImageError
    except ImportError:
        return PreparedImage(original_data, content_type, extension, width, height)

    try:
        with Image.open(BytesIO(original_data)) as image:
            width, height = image.size
            converted = BytesIO()
            image.save(converted, format="WEBP", lossless=True, quality=90, method=6)
            webp_data = converted.getvalue()
    except (OSError, UnidentifiedImageError):
        return PreparedImage(original_data, content_type, extension, width, height)

    if len(webp_data) < len(original_data):
        return PreparedImage(webp_data, "image/webp", "webp", width, height)
    return PreparedImage(original_data, content_type, extension, width, height)


def upload_product_image(product, uploaded_file, folder: str) -> tuple[str, PreparedImage]:
    prepared = prepare_image(uploaded_file)
    key = product_media_key(product, uploaded_file.name, folder, prepared.extension)
    url = put_blob(key, prepared.data, prepared.content_type)
    return url, prepared


def put_blob(key: str, data: bytes, content_type: str) -> str:
    try:
        config = get_r2_config()
    except ImproperlyConfigured as exc:
        raise MediaUploadError("Media uploads are not available right now.") from exc

    try:
        import boto3
        from botocore.config import Config
    except ImportError as exc:
        raise MediaUploadError("Media uploads are not available right now.") from exc

    try:
        client = boto3.client(
            "s3",
            endpoint_url=config.endpoint,
            region_name="auto",
            aws_access_key_id=config.access_key_id,
            aws_secret_access_key=config.secret_access_key,
            config=Config(s3={"addressing_style": "path"}),
        )
        client.put_object(
            Bucket=config.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
            CacheControl="public, max-age=31536000, immutable",
        )
    except Exception as exc:
        raise MediaUploadError("Media uploads are not available right now.") from exc

    return f"{config.public_base_url}/{key}"


def delete_blob(value: str) -> None:
    key = managed_blob_key(value)
    if not key:
        return

    try:
        config = get_r2_config()
    except ImproperlyConfigured as exc:
        raise MediaUploadError("Media uploads are not available right now.") from exc
    try:
        import boto3
        from botocore.config import Config
    except ImportError as exc:
        raise MediaUploadError("Media uploads are not available right now.") from exc

    try:
        client = boto3.client(
            "s3",
            endpoint_url=config.endpoint,
            region_name="auto",
            aws_access_key_id=config.access_key_id,
            aws_secret_access_key=config.secret_access_key,
            config=Config(s3={"addressing_style": "path"}),
        )
        client.delete_object(Bucket=config.bucket, Key=key)
    except Exception as exc:
        raise MediaUploadError("Media uploads are not available right now.") from exc


def delete_blob_if_managed(value: str) -> None:
    if not value:
        return

    try:
        if not managed_blob_key(value):
            return
        delete_blob(value)
    except (ImproperlyConfigured, MediaUploadError):
        pass


def delete_product_media_files(product) -> None:
    delete_media_urls(product_media_urls(product))


def delete_media_urls(urls) -> None:
    for url in urls:
        delete_blob_if_managed(url)


def product_media_urls(product) -> list[str]:
    return [
        url
        for url in (
            product.logo_url,
            product.hero_image_url,
            *(media.url for media in product.media.all()),
        )
        if url
    ]


def managed_blob_key(value: str) -> str:
    if not value:
        return ""

    config = get_r2_config()
    parsed_base = urlparse(config.public_base_url)
    parsed_value = urlparse(value)

    if parsed_value.scheme and parsed_value.netloc:
        if parsed_value.netloc != parsed_base.netloc:
            return ""
        return unquote(parsed_value.path).lstrip("/")

    return unquote(str(PurePosixPath(value))).lstrip("/")


def product_media_key(product, filename: str, folder: str, extension: str) -> str:
    owner_id = product.owner.clerk_id or f"user-{product.owner_id}"
    base_name = get_valid_filename(PurePosixPath(filename).stem) or "image"
    timestamp = int(timezone.now().timestamp() * 1000)
    suffix = uuid.uuid4().hex[:12]
    return f"{owner_id}/products/{product.pk}/{folder}/{timestamp}-{suffix}-{base_name}.{extension}"


def _extension_for(filename: str, content_type: str) -> str:
    extension = PurePosixPath(filename).suffix.lower().lstrip(".")
    if extension:
        return extension

    guessed = mimetypes.guess_extension(content_type or "")
    if guessed:
        return guessed.lstrip(".")

    return "bin"

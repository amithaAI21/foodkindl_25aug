import mimetypes
import os
import uuid

import requests
from django.conf import settings
from django.core.exceptions import ValidationError


MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


def _get_setting(name, default=""):
    value = getattr(settings, name, default)
    if value is None:
        return ""
    return str(value).strip()


def _get_upload_url():
    upload_url = _get_setting("NETLIFY_BLOB_UPLOAD_URL")

    if not upload_url:
        raise ValidationError(
            "NETLIFY_BLOB_UPLOAD_URL is not configured in Django settings."
        )

    if upload_url.startswith(("http://localhost:", "http://127.0.0.1:")):
        if not settings.DEBUG:
            raise ValidationError(
                "NETLIFY_BLOB_UPLOAD_URL cannot use localhost in production."
            )
        return upload_url.rstrip("/")

    if not upload_url.startswith("https://"):
        raise ValidationError(
            "NETLIFY_BLOB_UPLOAD_URL must use HTTPS."
        )

    return upload_url.rstrip("/")


def _get_upload_secret():
    secret = _get_setting("NETLIFY_BLOB_UPLOAD_SECRET")

    if not secret:
        raise ValidationError(
            "Django does not have NETLIFY_BLOB_UPLOAD_SECRET configured."
        )

    return secret


def _get_timeout():
    try:
        return int(
            getattr(
                settings,
                "NETLIFY_BLOB_UPLOAD_TIMEOUT",
                60,
            )
        )
    except (TypeError, ValueError):
        return 60


def _safe_filename(filename):
    filename = os.path.basename(filename or "image.jpg")

    _, extension = os.path.splitext(filename)
    extension = extension.lower()

    if extension not in ALLOWED_EXTENSIONS:
        extension = ".jpg"

    return f"{uuid.uuid4().hex}{extension}"


def _detect_content_type(uploaded_file):
    content_type = getattr(uploaded_file, "content_type", "")

    if content_type:
        return (
            str(content_type)
            .split(";")[0]
            .strip()
            .lower()
        )

    filename = getattr(uploaded_file, "name", "")
    guessed_type, _ = mimetypes.guess_type(filename)

    return (
        guessed_type
        or "application/octet-stream"
    ).lower()


def _validate_image(uploaded_file):
    if not uploaded_file:
        raise ValidationError("Please select an image.")

    filename = getattr(uploaded_file, "name", "")
    _, extension = os.path.splitext(filename)
    extension = extension.lower()

    if extension and extension not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            "Unsupported image extension. "
            "Please upload JPG, JPEG, PNG or WebP."
        )

    content_type = _detect_content_type(uploaded_file)

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationError(
            f"Unsupported image type '{content_type}'. "
            "Please upload JPG, PNG or WebP."
        )

    size = getattr(uploaded_file, "size", 0)

    if size and size > MAX_IMAGE_SIZE:
        raise ValidationError(
            "Image is too large. Maximum image size is 10 MB."
        )

    return content_type


def _extract_error_message(response):
    try:
        data = response.json()
    except ValueError:
        data = None

    if isinstance(data, dict):
        return (
            data.get("detail")
            or data.get("error")
            or data.get("message")
            or ""
        )

    return (response.text or "").strip()


def _raise_netlify_error(response, upload_url):
    status_code = response.status_code
    message = _extract_error_message(response)

    if status_code == 404:
        raise ValidationError(
            "Netlify upload function was not found. "
            f"Django called: {upload_url}"
        )

    if status_code in (401, 403):
        raise ValidationError(
            "Netlify rejected the image upload. "
            f"HTTP {status_code}. "
            "The NETLIFY_BLOB_UPLOAD_SECRET configured in Django/Render "
            "must exactly match the secret configured in Netlify Functions."
        )

    if (
        "NETLIFY_BLOB_UPLOAD_SECRET" in message
        and "not configured" in message.lower()
    ):
        raise ValidationError(
            "Netlify Function does not have "
            "NETLIFY_BLOB_UPLOAD_SECRET configured. "
            "Add it in Netlify Project configuration -> Environment variables, "
            "make it available to Functions, and redeploy the Netlify site."
        )

    if len(message) > 500:
        message = message[:500] + "..."

    raise ValidationError(
        f"Netlify image upload failed. HTTP {status_code}. "
        f"{message or 'No error message returned.'}"
    )


def upload_image_to_netlify(
    uploaded_file,
    category="restaurants",
):
    """
    Upload one image from Django to the FoodKindl Netlify Function.

    Required Django settings:
        NETLIFY_BLOB_UPLOAD_URL
        NETLIFY_BLOB_UPLOAD_SECRET

    Required Netlify Function environment:
        NETLIFY_BLOB_UPLOAD_SECRET

    Django sends the uploaded file to Netlify using multipart field "file".
    """

    content_type = _validate_image(uploaded_file)

    upload_url = _get_upload_url()
    upload_secret = _get_upload_secret()
    timeout = _get_timeout()

    category = (
        str(category or "restaurants")
        .strip()
        .replace("\\", "/")
        .replace("..", "")
        .strip("/")
    )

    if not category:
        category = "restaurants"

    original_filename = getattr(
        uploaded_file,
        "name",
        "image.jpg",
    )

    safe_filename = _safe_filename(original_filename)

    try:
        uploaded_file.seek(0)
    except Exception:
        pass

    files = {
        "file": (
            safe_filename,
            uploaded_file,
            content_type,
        )
    }

    data = {
        "category": category,
        "original_name": original_filename,
    }

    headers = {
        "x-foodkindl-upload-secret": upload_secret,
        "Accept": "application/json",
    }

    try:
        response = requests.post(
            upload_url,
            files=files,
            data=data,
            headers=headers,
            timeout=timeout,
            allow_redirects=False,
        )

    except requests.Timeout as exc:
        raise ValidationError(
            "Image upload timed out. Please try again."
        ) from exc

    except requests.ConnectionError as exc:
        raise ValidationError(
            "Could not connect to the Netlify image upload service. "
            f"URL: {upload_url}"
        ) from exc

    except requests.RequestException as exc:
        raise ValidationError(
            f"Image upload request failed: {exc}"
        ) from exc

    if response.status_code in (301, 302, 307, 308):
        redirect_url = response.headers.get("Location", "")

        raise ValidationError(
            "Image upload request was redirected. "
            f"From: {upload_url} "
            f"To: {redirect_url}"
        )

    if not response.ok:
        _raise_netlify_error(response, upload_url)

    try:
        result = response.json()
    except ValueError as exc:
        response_type = response.headers.get(
            "content-type",
            "unknown",
        )

        raise ValidationError(
            "Image upload service returned an invalid response. "
            f"Expected JSON but received: {response_type}"
        ) from exc

    if not isinstance(result, dict):
        raise ValidationError(
            "Image upload service returned an unexpected response."
        )

    if result.get("success") is False:
        message = (
            result.get("error")
            or result.get("detail")
            or result.get("message")
            or "Image upload failed."
        )
        raise ValidationError(message)

    blob_key = str(
        result.get("key")
        or result.get("blob_key")
        or ""
    ).strip()

    public_url = str(
        result.get("url")
        or result.get("public_url")
        or ""
    ).strip()

    if not blob_key:
        raise ValidationError(
            "The image was uploaded but Netlify did not return the Blob key."
        )

    if not public_url:
        raise ValidationError(
            "The image was uploaded but Netlify did not return the image URL."
        )

    if public_url.startswith(("http://localhost:", "http://127.0.0.1:")):
        if not settings.DEBUG:
            raise ValidationError(
                "Netlify returned a localhost image URL in production."
            )
    elif not public_url.startswith("https://"):
        raise ValidationError(
            "Netlify returned a non-HTTPS image URL."
        )

    return {
        "key": blob_key,
        "url": public_url,
        "original_name": (
            result.get("original_name")
            or original_filename
        ),
        "content_type": (
            result.get("content_type")
            or content_type
        ),
    }

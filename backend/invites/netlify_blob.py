import mimetypes
import os
import uuid

import requests

from django.conf import settings
from django.core.exceptions import ValidationError


# ============================================================
# CONFIGURATION
# ============================================================

DEFAULT_TIMEOUT = 60

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


# ============================================================
# SETTINGS HELPER
# ============================================================

def _get_setting(name, default=""):

    value = getattr(
        settings,
        name,
        default,
    )

    if value is None:
        return ""

    return str(value).strip()


# ============================================================
# CHECK LOCAL DEVELOPMENT URL
# ============================================================

def _is_local_url(url):

    if not url:
        return False

    return (
        url.startswith("http://localhost:")
        or url.startswith("http://127.0.0.1:")
        or url == "http://localhost"
        or url == "http://127.0.0.1"
    )


# ============================================================
# CHECK ALLOWED URL
# ============================================================

def _is_allowed_url(url):

    if not url:
        return False

    # Production
    if url.startswith("https://"):
        return True

    # Development only
    if settings.DEBUG and _is_local_url(url):
        return True

    return False


# ============================================================
# SAFE FILE NAME
# ============================================================

def _safe_filename(filename):

    filename = os.path.basename(
        filename or "image.jpg"
    )

    _, extension = os.path.splitext(
        filename
    )

    extension = extension.lower()

    if extension not in ALLOWED_EXTENSIONS:
        extension = ".jpg"

    return (
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )


# ============================================================
# CONTENT TYPE
# ============================================================

def _detect_content_type(uploaded_file):

    content_type = getattr(
        uploaded_file,
        "content_type",
        "",
    )

    if content_type:

        return (
            str(content_type)
            .split(";")[0]
            .strip()
            .lower()
        )

    filename = getattr(
        uploaded_file,
        "name",
        "",
    )

    guessed_type, _ = mimetypes.guess_type(
        filename
    )

    return (
        guessed_type
        or "application/octet-stream"
    ).lower()


# ============================================================
# VALIDATE IMAGE
# ============================================================

def _validate_image(uploaded_file):

    if not uploaded_file:

        raise ValidationError(
            "Please select an image."
        )

    filename = getattr(
        uploaded_file,
        "name",
        "",
    )

    _, extension = os.path.splitext(
        filename
    )

    extension = extension.lower()

    # --------------------------------------------------------
    # Validate extension
    # --------------------------------------------------------

    if (
        extension
        and extension not in ALLOWED_EXTENSIONS
    ):

        raise ValidationError(
            (
                "Unsupported image extension. "
                "Please upload JPG, JPEG, PNG "
                "or WebP."
            )
        )

    # --------------------------------------------------------
    # Validate MIME type
    # --------------------------------------------------------

    content_type = _detect_content_type(
        uploaded_file
    )

    if content_type not in ALLOWED_CONTENT_TYPES:

        raise ValidationError(
            (
                "Unsupported image type "
                f"'{content_type}'. "
                "Please upload JPG, PNG "
                "or WebP."
            )
        )

    # --------------------------------------------------------
    # Validate size
    # --------------------------------------------------------

    size = getattr(
        uploaded_file,
        "size",
        0,
    )

    if size and size > MAX_IMAGE_SIZE:

        raise ValidationError(
            (
                "Image is too large. "
                "Maximum image size is 10 MB."
            )
        )

    return content_type


# ============================================================
# GET NETLIFY UPLOAD URL
# ============================================================

def _get_upload_url():

    upload_url = _get_setting(
        "NETLIFY_BLOB_UPLOAD_URL"
    )

    if not upload_url:

        raise ValidationError(
            (
                "NETLIFY_BLOB_UPLOAD_URL "
                "is not configured in settings.py."
            )
        )

    # --------------------------------------------------------
    # PRODUCTION
    # --------------------------------------------------------
    # Must use HTTPS
    #
    # DEVELOPMENT
    # --------------------------------------------------------
    # DEBUG=True allows:
    #
    # http://localhost:8888
    # http://127.0.0.1:8888
    # --------------------------------------------------------

    if not _is_allowed_url(upload_url):

        if settings.DEBUG:

            raise ValidationError(
                (
                    "Invalid NETLIFY_BLOB_UPLOAD_URL. "
                    "During development use a localhost URL, "
                    "for example:\n\n"
                    "http://localhost:8888/"
                    ".netlify/functions/"
                    "upload-restaurant-image"
                )
            )

        raise ValidationError(
            (
                "NETLIFY_BLOB_UPLOAD_URL "
                "must use HTTPS in production."
            )
        )

    return upload_url.rstrip("/")


# ============================================================
# GET UPLOAD SECRET
# ============================================================

def _get_upload_secret():

    secret = _get_setting(
        "NETLIFY_BLOB_UPLOAD_SECRET"
    )

    if not secret:

        raise ValidationError(
            (
                "NETLIFY_BLOB_UPLOAD_SECRET "
                "is not configured in settings.py."
            )
        )

    return secret


# ============================================================
# NETLIFY ERROR HANDLER
# ============================================================

def _raise_netlify_error(
    response,
    upload_url,
):

    status_code = response.status_code

    content_type = (
        response.headers
        .get(
            "content-type",
            "",
        )
        .lower()
    )

    response_text = (
        response.text
        or ""
    ).strip()

    is_html = (
        "text/html" in content_type
        or response_text.lower().startswith(
            "<!doctype html"
        )
        or response_text.lower().startswith(
            "<html"
        )
    )

    # ========================================================
    # 404
    # ========================================================

    if status_code == 404:

        if _is_local_url(upload_url):

            raise ValidationError(
                (
                    "Local Netlify upload function "
                    "was not found.\n\n"
                    "Django called:\n"
                    f"{upload_url}\n\n"
                    "Make sure Netlify Dev is running "
                    "and upload-restaurant-image.mjs "
                    "exists in your Netlify functions "
                    "directory."
                )
            )

        raise ValidationError(
            (
                "Netlify upload function returned 404.\n\n"
                "Django called:\n"
                f"{upload_url}\n\n"
                "The upload-restaurant-image function "
                "is not deployed at this URL."
            )
        )

    # ========================================================
    # UNAUTHORIZED
    # ========================================================

    if status_code in (
        401,
        403,
    ):

        raise ValidationError(
            (
                "Netlify rejected the image upload. "
                f"HTTP {status_code}.\n\n"
                "Check NETLIFY_BLOB_UPLOAD_SECRET. "
                "The secret used by Django must match "
                "the secret used by the Netlify Function."
            )
        )

    # ========================================================
    # HTML ERROR
    # ========================================================

    if is_html:

        raise ValidationError(
            (
                "The image upload service returned "
                "an HTML page instead of JSON.\n\n"
                f"HTTP status: {status_code}\n"
                f"URL: {upload_url}"
            )
        )

    # ========================================================
    # JSON ERROR
    # ========================================================

    try:

        data = response.json()

    except ValueError:

        data = None

    if isinstance(
        data,
        dict,
    ):

        message = (
            data.get("detail")
            or data.get("error")
            or data.get("message")
        )

        if message:

            raise ValidationError(
                (
                    "Image upload failed: "
                    f"{message}"
                )
            )

    # ========================================================
    # FALLBACK
    # ========================================================

    if len(response_text) > 400:

        response_text = (
            response_text[:400]
            + "..."
        )

    raise ValidationError(
        (
            "Image upload failed. "
            f"HTTP {status_code}. "
            f"{response_text}"
        )
    )


# ============================================================
# UPLOAD IMAGE
# ============================================================

def upload_image_to_netlify(
    uploaded_file,
    category="restaurants",
):

    """
    Upload image from Django Admin to the
    FoodKindl Netlify upload function.

    Development:

        Django:
        http://127.0.0.1:8000

        Netlify Dev:
        http://localhost:8888

    Production:

        Django/Render
            ->
        https://foodkindl.org/.netlify/functions/...

    Expected response:

    {
        "success": true,
        "key": "restaurants/abc.jpg",
        "url": "https://..."
    }
    """

    # ========================================================
    # VALIDATE IMAGE
    # ========================================================

    content_type = _validate_image(
        uploaded_file
    )

    # ========================================================
    # GET CONFIG
    # ========================================================

    upload_url = _get_upload_url()

    upload_secret = _get_upload_secret()

    # ========================================================
    # CLEAN CATEGORY
    # ========================================================

    category = (
        str(
            category
            or "restaurants"
        )
        .strip()
        .replace("\\", "/")
        .strip("/")
    )

    if not category:
        category = "restaurants"

    # Prevent strange path values

    category = category.replace(
        "..",
        ""
    )

    # ========================================================
    # ORIGINAL FILE NAME
    # ========================================================

    original_filename = getattr(
        uploaded_file,
        "name",
        "image.jpg",
    )

    # ========================================================
    # GENERATE UNIQUE FILE NAME
    # ========================================================

    safe_filename = _safe_filename(
        original_filename
    )

    # ========================================================
    # RESET FILE POINTER
    # ========================================================

    try:

        uploaded_file.seek(0)

    except Exception:

        pass

    # ========================================================
    # MULTIPART FILE
    # ========================================================

    files = {

        "file": (

            safe_filename,

            uploaded_file,

            content_type,
        )
    }

    # ========================================================
    # FORM DATA
    # ========================================================

    data = {

        "category":
            category,

        "original_name":
            original_filename,
    }

    # ========================================================
    # HEADERS
    # ========================================================

    headers = {

        "X-FoodKindl-Upload-Secret":
            upload_secret,

        "Accept":
            "application/json",
    }

    # ========================================================
    # SEND REQUEST
    # ========================================================

    try:

        response = requests.post(

            upload_url,

            files=files,

            data=data,

            headers=headers,

            timeout=DEFAULT_TIMEOUT,

            allow_redirects=False,
        )

    # ========================================================
    # TIMEOUT
    # ========================================================

    except requests.Timeout as exc:

        raise ValidationError(
            (
                "Image upload timed out. "
                "Please try again."
            )
        ) from exc

    # ========================================================
    # CONNECTION ERROR
    # ========================================================

    except requests.ConnectionError as exc:

        if _is_local_url(upload_url):

            raise ValidationError(
                (
                    "Could not connect to the local "
                    "Netlify development server.\n\n"
                    "Start Netlify Dev using:\n\n"
                    "npx netlify dev"
                )
            ) from exc

        raise ValidationError(
            (
                "Could not connect to the "
                "Netlify image upload service."
            )
        ) from exc

    # ========================================================
    # OTHER REQUEST ERROR
    # ========================================================

    except requests.RequestException as exc:

        raise ValidationError(
            (
                "Image upload request failed: "
                f"{exc}"
            )
        ) from exc

    # ========================================================
    # REDIRECT
    # ========================================================

    if response.status_code in (
        301,
        302,
        307,
        308,
    ):

        redirect_url = (
            response.headers.get(
                "Location",
                "",
            )
        )

        raise ValidationError(
            (
                "Image upload request was redirected.\n\n"
                f"From:\n{upload_url}\n\n"
                f"To:\n{redirect_url}"
            )
        )

    # ========================================================
    # HTTP ERROR
    # ========================================================

    if not response.ok:

        _raise_netlify_error(
            response,
            upload_url,
        )

    # ========================================================
    # READ JSON
    # ========================================================

    try:

        result = response.json()

    except ValueError as exc:

        response_type = (
            response.headers.get(
                "content-type",
                "unknown",
            )
        )

        raise ValidationError(
            (
                "Image upload service returned "
                "an invalid response.\n\n"
                "Expected JSON but received:\n"
                f"{response_type}"
            )
        ) from exc

    # ========================================================
    # VALIDATE RESPONSE
    # ========================================================

    if not isinstance(
        result,
        dict,
    ):

        raise ValidationError(
            (
                "Image upload service returned "
                "an unexpected response."
            )
        )

    # ========================================================
    # FUNCTION FAILURE
    # ========================================================

    if result.get("success") is False:

        message = (
            result.get("error")
            or result.get("detail")
            or result.get("message")
            or "Image upload failed."
        )

        raise ValidationError(
            message
        )

    # ========================================================
    # GET BLOB KEY
    # ========================================================

    blob_key = (
        result.get("key")
        or result.get("blob_key")
        or ""
    )

    blob_key = str(
        blob_key
    ).strip()

    # ========================================================
    # GET PUBLIC URL
    # ========================================================

    public_url = (
        result.get("url")
        or result.get("public_url")
        or ""
    )

    public_url = str(
        public_url
    ).strip()

    # ========================================================
    # CHECK BLOB KEY
    # ========================================================

    if not blob_key:

        raise ValidationError(
            (
                "The image was uploaded but "
                "Netlify did not return the Blob key."
            )
        )

    # ========================================================
    # CHECK PUBLIC URL
    # ========================================================

    if not public_url:

        raise ValidationError(
            (
                "The image was uploaded but "
                "Netlify did not return the image URL."
            )
        )

    # ========================================================
    # URL SECURITY
    # ========================================================

    if not _is_allowed_url(
        public_url
    ):

        if settings.DEBUG:

            raise ValidationError(
                (
                    "The upload service returned an "
                    "invalid image URL:\n\n"
                    f"{public_url}\n\n"
                    "Development URLs may use localhost. "
                    "Production image URLs must use HTTPS."
                )
            )

        raise ValidationError(
            (
                "The upload service returned a "
                "non-HTTPS image URL. "
                "HTTPS is required in production."
            )
        )

    # ========================================================
    # SUCCESS
    # ========================================================

    return {

        "key":
            blob_key,

        "url":
            public_url,
    }
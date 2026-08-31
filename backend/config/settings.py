from datetime import timedelta
import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv


# ============================================================
# BASE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

# Load backend/.env first.
# If you keep a second .env one level above backend, load it as a fallback.
load_dotenv(
    BASE_DIR / ".env",
    override=False,
)

load_dotenv(
    BASE_DIR.parent / ".env",
    override=False,
)


# ============================================================
# ENV HELPERS
# ============================================================

def get_env_list(name, default=""):
    """
    Read comma-separated environment values.
    """

    value = os.environ.get(name)

    if value is None:
        value = default

    if isinstance(value, (list, tuple)):
        return [
            str(item).strip().rstrip("/")
            for item in value
            if str(item).strip()
        ]

    return [
        item.strip().rstrip("/")
        for item in str(value).split(",")
        if item.strip()
    ]


# ============================================================
# SECURITY
# ============================================================

SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    "django-insecure-local-development-key",
)

DEBUG = (
    os.environ.get(
        "DEBUG",
        "True",
    )
    .strip()
    .lower()
    == "true"
)


# ============================================================
# ALLOWED HOSTS
# ============================================================

ALLOWED_HOSTS = get_env_list(
    "DJANGO_ALLOWED_HOSTS",
    (
        "127.0.0.1,"
        "localhost,"
        "foodkindl-25aug.onrender.com,"
        ".onrender.com,"
        "foodkindl.org,"
        "www.foodkindl.org"
    ),
)


# ============================================================
# FAST2SMS
# ============================================================

FAST2SMS_API_KEY = (
    os.environ.get(
        "FAST2SMS_API_KEY",
        "",
    )
    .strip()
)


# ============================================================
# OPENROUTESERVICE
# ============================================================

ORS_API_KEY = (
    os.environ.get(
        "ORS_API_KEY",
        "",
    )
    .strip()
)


# ============================================================
# NETLIFY BLOB
# ============================================================
#
# Local backend/.env example:
#
# NETLIFY_BLOB_UPLOAD_SECRET=your-secret
# NETLIFY_BLOB_UPLOAD_URL=http://localhost:8888/.netlify/functions/upload-restaurant-image
#
# Production (Render) example:
#
# NETLIFY_BLOB_UPLOAD_SECRET=your-secret
# NETLIFY_BLOB_UPLOAD_URL=https://YOUR-NETLIFY-SITE/.netlify/functions/upload-restaurant-image
#
# Never hard-code the secret in this file.
# ============================================================

NETLIFY_BLOB_UPLOAD_SECRET = (
    os.environ.get(
        "NETLIFY_BLOB_UPLOAD_SECRET",
        "",
    )
    .strip()
)


if DEBUG:
    NETLIFY_BLOB_UPLOAD_URL = (
        os.environ.get(
            "NETLIFY_BLOB_UPLOAD_URL",
            (
                "http://localhost:8888/"
                ".netlify/functions/"
                "upload-restaurant-image"
            ),
        )
        .strip()
    )
else:
    NETLIFY_BLOB_UPLOAD_URL = (
        os.environ.get(
            "NETLIFY_BLOB_UPLOAD_URL",
            "",
        )
        .strip()
    )


NETLIFY_BLOB_UPLOAD_TIMEOUT = int(
    os.environ.get(
        "NETLIFY_BLOB_UPLOAD_TIMEOUT",
        "60",
    )
)


# Validate the production configuration early.
if not DEBUG:

    if not NETLIFY_BLOB_UPLOAD_URL:
        raise RuntimeError(
            "NETLIFY_BLOB_UPLOAD_URL must be configured in production."
        )

    if not NETLIFY_BLOB_UPLOAD_SECRET:
        raise RuntimeError(
            "NETLIFY_BLOB_UPLOAD_SECRET must be configured in production."
        )


# ============================================================
# NETLIFY HOMEPAGE VIDEO
# ============================================================

# Django Admin sends the selected homepage video to this
# Netlify Function. The actual MP4 is not stored permanently
# in Django/Render.
#
# Development .env example:
# NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL=http://localhost:8888/upload-homepage-video
# NETLIFY_VIDEO_UPLOAD_SECRET=<your-generated-secret>
#
# If you want local Django to upload to the deployed Netlify
# function instead, set:
# NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL=https://foodkindl.org/upload-homepage-video

NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL = (
    os.environ.get(
        "NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL",
        (
            "http://localhost:8888/"
            "upload-homepage-video"
            if DEBUG
            else ""
        ),
    )
    .strip()
)


NETLIFY_VIDEO_UPLOAD_SECRET = (
    os.environ.get(
        "NETLIFY_VIDEO_UPLOAD_SECRET",
        "",
    )
    .strip()
)


if not DEBUG:
    if not NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL:
        raise RuntimeError(
            "NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL "
            "must be configured in production."
        )

    if not NETLIFY_VIDEO_UPLOAD_SECRET:
        raise RuntimeError(
            "NETLIFY_VIDEO_UPLOAD_SECRET "
            "must be configured in production."
        )


# ============================================================
# APPLICATIONS
# ============================================================

INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third party
    "corsheaders",
    "rest_framework",
    "import_export",

    # FoodKindl
    "accounts.apps.AccountsConfig",
    "community",
    "website",
    "safety",
    "invites",
    "commerce",
    "restaurant_discovery",
]


# ============================================================
# MIDDLEWARE
# ============================================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",

    "whitenoise.middleware.WhiteNoiseMiddleware",

    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",

    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",

    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ============================================================
# URLS / WSGI
# ============================================================

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"


# ============================================================
# TEMPLATES
# ============================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",

        "DIRS": [
            BASE_DIR / "templates",
        ],

        "APP_DIRS": True,

        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "accounts.context_processors.admin_notifications",
            ],
        },
    },
]


# ============================================================
# DATABASE
# ============================================================

DATABASE_URL = (
    os.environ.get(
        "DATABASE_URL",
        "",
    )
    .strip()
)


if DEBUG:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
            "OPTIONS": {
                "timeout": 30,
            },
        },
    }

else:
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is required when DEBUG=False."
        )

    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True,
        )
    }


# ============================================================
# PASSWORD VALIDATION
# ============================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth."
            "password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth."
            "password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth."
            "password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth."
            "password_validation."
            "NumericPasswordValidator"
        ),
    },
]


# ============================================================
# LANGUAGE / TIME
# ============================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True


# ============================================================
# STATIC FILES
# ============================================================

STATIC_URL = "/static/"

STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": (
            "django.core.files.storage."
            "FileSystemStorage"
        ),
    },

    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage."
            "CompressedManifestStaticFilesStorage"
        ),
    },
}


# ============================================================
# MEDIA
# ============================================================

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"


# ============================================================
# CORS
# ============================================================

CORS_ALLOWED_ORIGINS = get_env_list(
    "CORS_ALLOWED_ORIGINS",
    (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:8888,"
        "http://127.0.0.1:8888,"
        "https://foodkindlapp.netlify.app,"
        "https://myfoodkindlapp.netlify.app,"
        "https://foodkindl.org,"
        "https://www.foodkindl.org"
    ),
)

CORS_ALLOW_CREDENTIALS = True


# ============================================================
# CSRF
# ============================================================

CSRF_TRUSTED_ORIGINS = get_env_list(
    "CSRF_TRUSTED_ORIGINS",
    (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:8888,"
        "http://127.0.0.1:8888,"
        "https://foodkindlapp.netlify.app,"
        "https://myfoodkindlapp.netlify.app,"
        "https://foodkindl-25aug.onrender.com,"
        "https://foodkindl.org,"
        "https://www.foodkindl.org"
    ),
)


# ============================================================
# REST FRAMEWORK
# ============================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        (
            "rest_framework_simplejwt."
            "authentication."
            "JWTAuthentication"
        ),
    ),

    "DEFAULT_PERMISSION_CLASSES": (
        (
            "rest_framework.permissions."
            "IsAuthenticatedOrReadOnly"
        ),
    ),

    "DEFAULT_PAGINATION_CLASS": (
        "rest_framework.pagination."
        "PageNumberPagination"
    ),

    "PAGE_SIZE": 12,
}


# ============================================================
# JWT
# ============================================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=4),

    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),

    "ROTATE_REFRESH_TOKENS": True,

    "BLACKLIST_AFTER_ROTATION": False,
}


# ============================================================
# HTTPS / SECURITY
# ============================================================

SECURE_PROXY_SSL_HEADER = (
    "HTTP_X_FORWARDED_PROTO",
    "https",
)

SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = "DENY"


# ============================================================
# DEVELOPMENT SECURITY
# ============================================================

if DEBUG:
    SECURE_SSL_REDIRECT = False

    SESSION_COOKIE_SECURE = False

    CSRF_COOKIE_SECURE = False

    SECURE_HSTS_SECONDS = 0

    SECURE_HSTS_INCLUDE_SUBDOMAINS = False

    SECURE_HSTS_PRELOAD = False


# ============================================================
# PRODUCTION SECURITY
# ============================================================

else:
    SECURE_SSL_REDIRECT = True

    SESSION_COOKIE_SECURE = True

    CSRF_COOKIE_SECURE = True

    SECURE_HSTS_SECONDS = 31536000

    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

    SECURE_HSTS_PRELOAD = True


# ============================================================
# DEFAULT PRIMARY KEY
# ============================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ============================================================
# LOGGING
# ============================================================

LOGGING = {
    "version": 1,

    "disable_existing_loggers": False,

    "formatters": {
        "verbose": {
            "format": (
                "{levelname} "
                "{asctime} "
                "{name} "
                "{module} "
                "{message}"
            ),
            "style": "{",
        },
    },

    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },

    "loggers": {
        "django": {
            "handlers": [
                "console",
            ],
            "level": "INFO",
            "propagate": False,
        },

        "django.request": {
            "handlers": [
                "console",
            ],
            "level": "ERROR",
            "propagate": False,
        },
    },

    "root": {
        "handlers": [
            "console",
        ],
        "level": "INFO",
    },
}


# ============================================================
# DEVELOPMENT DEBUG INFORMATION
# ============================================================

if DEBUG:
    print("======================================")
    print("FOODKINDL LOCAL DEVELOPMENT")
    print("DEBUG:", DEBUG)
    print("DATABASE:", "SQLite")
    print("DATABASE FILE:", BASE_DIR / "db.sqlite3")
    print(
        "NETLIFY BLOB UPLOAD URL:",
        NETLIFY_BLOB_UPLOAD_URL,
    )
    print(
        "NETLIFY BLOB SECRET LOADED:",
        bool(NETLIFY_BLOB_UPLOAD_SECRET),
    )
    print(
        "HOMEPAGE VIDEO UPLOAD URL:",
        NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL,
    )
    print(
        "HOMEPAGE VIDEO SECRET LOADED:",
        bool(NETLIFY_VIDEO_UPLOAD_SECRET),
    )
    print(
        "ORS API KEY LOADED:",
        bool(ORS_API_KEY),
    )
    print(
        "SECURE_SSL_REDIRECT:",
        SECURE_SSL_REDIRECT,
    )
    print(
        "ALLOWED_HOSTS:",
        ALLOWED_HOSTS,
    )
    print(
        "CORS_ALLOWED_ORIGINS:",
        CORS_ALLOWED_ORIGINS,
    )
    print(
        "CSRF_TRUSTED_ORIGINS:",
        CSRF_TRUSTED_ORIGINS,
    )
    print("======================================")


# ============================================================
# FOODKINDL FRONTEND
# ============================================================

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
)


# ============================================================
# EMAIL
# ============================================================

EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend"
)

EMAIL_HOST = "smtp.gmail.com"

EMAIL_PORT = 587

EMAIL_USE_TLS = True

EMAIL_HOST_USER = os.getenv(
    "EMAIL_HOST_USER",
    "",
)

EMAIL_HOST_PASSWORD = os.getenv(
    "EMAIL_HOST_PASSWORD",
    "",
)

DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER,
)


# ============================================================
# PASSWORD RESET
# ============================================================

PASSWORD_RESET_TIMEOUT = 3600
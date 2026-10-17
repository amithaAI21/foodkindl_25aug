from datetime import timedelta

import os

from pathlib import Path

import dj_database_url

from dotenv import load_dotenv

FOODKINDL_REFERRAL_FEE = "25.00"

from decouple import config



# BASE / ENVIRONMENT

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env", override=False)

load_dotenv(BASE_DIR.parent / ".env", override=False)

def get_env_list(name, default=""):

    value = os.environ.get(name)

    if value is None:

        value = default

    return [

        item.strip().rstrip("/")

        for item in str(value).split(",")

        if item.strip()

    ]

# SECURITY

SECRET_KEY = os.environ.get(

    "SECRET_KEY",

    "django-insecure-local-development-key",

)

DEBUG = os.environ.get(

    "DEBUG",

    "False",

).strip().lower() == "true"

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

# FAST2SMS

FAST2SMS_API_KEY = os.environ.get(

    "FAST2SMS_API_KEY",

    "",

).strip()

# MAP / PLACES SERVICES

GOOGLE_MAPS_API_KEY = config("GOOGLE_MAPS_API_KEY", default="")

GEOAPIFY_API_KEY = config("GEOAPIFY_API_KEY", default="")

ORS_API_KEY = os.environ.get("ORS_API_KEY", "").strip()

FOODKINDL_HTTP_USER_AGENT = (

    "FoodKindl/1.0 (contact: support@foodkindl.online)"

)

FOODKINDL_OVERPASS_URL = (

    "https://overpass-api.de/api/interpreter"

)

FOODKINDL_OSRM_URL = "https://router.project-osrm.org"

FOURSQUARE_API_KEY = os.getenv("FOURSQUARE_API_KEY", "")

FOURSQUARE_API_VERSION = os.getenv(

    "FOURSQUARE_API_VERSION",

    "2025-06-17",

)

FOURSQUARE_DETAILS_LIMIT = int(

    os.getenv("FOURSQUARE_DETAILS_LIMIT", "6")

)

FOURSQUARE_PHOTOS_PER_PLACE = int(

    os.getenv("FOURSQUARE_PHOTOS_PER_PLACE", "3")

)

# WHATSAPP

WHATSAPP_ACCESS_TOKEN = os.environ.get(

    "WHATSAPP_ACCESS_TOKEN", ""

).strip()

WHATSAPP_PHONE_NUMBER_ID = os.environ.get(

    "WHATSAPP_PHONE_NUMBER_ID", ""

).strip()

WHATSAPP_TEMPLATE_NAME = os.environ.get(

    "WHATSAPP_TEMPLATE_NAME", "foodkindl_sos_alert"

).strip()

WHATSAPP_TEMPLATE_LANGUAGE = os.environ.get(

    "WHATSAPP_TEMPLATE_LANGUAGE", "en"

).strip()

WHATSAPP_API_VERSION = os.environ.get(

    "WHATSAPP_API_VERSION", "v23.0"

).strip()

WHATSAPP_TEMPLATE_BODY_PARAMETER_COUNT = int(

    os.environ.get("WHATSAPP_TEMPLATE_BODY_PARAMETER_COUNT", "1")

)

# NETLIFY BLOB UPLOADS

NETLIFY_BLOB_UPLOAD_SECRET = os.environ.get(

    "NETLIFY_BLOB_UPLOAD_SECRET", ""

).strip()

NETLIFY_BLOB_UPLOAD_URL = os.environ.get(

    "NETLIFY_BLOB_UPLOAD_URL",

    (

        "http://localhost:8888/"

        ".netlify/functions/upload-restaurant-image"

        if DEBUG else ""

    ),

).strip()

NETLIFY_BLOB_UPLOAD_TIMEOUT = int(

    os.environ.get("NETLIFY_BLOB_UPLOAD_TIMEOUT", "60")

)

NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL = os.environ.get(

    "NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL",

    "http://localhost:8888/upload-homepage-video" if DEBUG else "",

).strip()

NETLIFY_VIDEO_UPLOAD_SECRET = os.environ.get(

    "NETLIFY_VIDEO_UPLOAD_SECRET", ""

).strip()

if not DEBUG:

    for setting_name in (

        "NETLIFY_BLOB_UPLOAD_URL",

        "NETLIFY_BLOB_UPLOAD_SECRET",

        "NETLIFY_HOMEPAGE_VIDEO_UPLOAD_URL",

        "NETLIFY_VIDEO_UPLOAD_SECRET",

    ):

        if not globals()[setting_name]:

            raise RuntimeError(

                f"{setting_name} must be configured in production."

            )

# APPLICATIONS

INSTALLED_APPS = [

    "django.contrib.admin",

    "django.contrib.auth",

    "django.contrib.contenttypes",

    "django.contrib.sessions",

    "django.contrib.messages",

    "django.contrib.staticfiles",

    "corsheaders",

    "rest_framework",

    "import_export",

    "accounts.apps.AccountsConfig",

    "community",

    "website",

    "safety",

    "invites",

    "commerce",

    "aikitchen",

    "cooktogether",

    "dineout",

    "foodwalk",

]

# MIDDLEWARE

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

# URLS / WSGI

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"

# TEMPLATES

TEMPLATES = [

    {

        "BACKEND": "django.template.backends.django.DjangoTemplates",

        "DIRS": [BASE_DIR / "templates"],

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

# DATABASE

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

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

        ),

    }

# PASSWORD VALIDATION

AUTH_PASSWORD_VALIDATORS = [

    {

        "NAME": (

            "django.contrib.auth.password_validation."

            "UserAttributeSimilarityValidator"

        ),

    },

    {

        "NAME": (

            "django.contrib.auth.password_validation."

            "MinimumLengthValidator"

        ),

    },

    {

        "NAME": (

            "django.contrib.auth.password_validation."

            "CommonPasswordValidator"

        ),

    },

    {

        "NAME": (

            "django.contrib.auth.password_validation."

            "NumericPasswordValidator"

        ),

    },

]

# LANGUAGE / TIME

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True

# STATIC / MEDIA

STATIC_URL = "/static/"

STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {

    "default": {

        "BACKEND": "django.core.files.storage.FileSystemStorage",

    },

    "staticfiles": {

        "BACKEND": (

            "whitenoise.storage.CompressedStaticFilesStorage"

        ),

    },

}

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"

# CORS

CORS_ALLOWED_ORIGINS = get_env_list(

    "CORS_ALLOWED_ORIGINS",

    (

        "http://localhost:5173,"

        "http://127.0.0.1:5173,"

        "http://localhost:8888,"

        "http://127.0.0.1:8888,"

        "https://foodkindlapp.netlify.app,"

        "https://myfoodkindlapp.netlify.app,"

        "https://myfoodkindlapps.netlify.app,"

        "https://foodkindl.org,"

        "https://www.foodkindl.org"

    ),

)

CORS_ALLOW_CREDENTIALS = True

# CSRF

CSRF_TRUSTED_ORIGINS = get_env_list(

    "CSRF_TRUSTED_ORIGINS",

    (

        "http://localhost:5173,"

        "http://127.0.0.1:5173,"

        "http://localhost:8888,"

        "http://127.0.0.1:8888,"

        "https://foodkindlapp.netlify.app,"

        "https://myfoodkindlapp.netlify.app,"

        "https://myfoodkindlapps.netlify.app,"

        "https://foodkindl-25aug.onrender.com,"

        "https://foodkindl.org,"

        "https://www.foodkindl.org"

    ),

)

# REST FRAMEWORK

# Define OTP rates here, not before this dictionary exists.

REST_FRAMEWORK = {

    "DEFAULT_AUTHENTICATION_CLASSES": (

        "rest_framework_simplejwt.authentication.JWTAuthentication",

        "rest_framework.authentication.SessionAuthentication",

    ),

    "DEFAULT_PERMISSION_CLASSES": (

        "rest_framework.permissions.IsAuthenticatedOrReadOnly",

    ),

    "DEFAULT_PAGINATION_CLASS": (

        "rest_framework.pagination.PageNumberPagination"

    ),

    "PAGE_SIZE": 12,

    "DEFAULT_THROTTLE_RATES": {

        "mobile_otp_request": "10/hour",

        "mobile_otp_verify": "30/hour",

    },

}

# JWT

SIMPLE_JWT = {

    "ACCESS_TOKEN_LIFETIME": timedelta(hours=4),

    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),

    "ROTATE_REFRESH_TOKENS": True,

    "BLACKLIST_AFTER_ROTATION": False,

    "AUTH_HEADER_TYPES": ("Bearer",),

    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",

    "UPDATE_LAST_LOGIN": True,

}

# HTTPS / SECURITY

SECURE_PROXY_SSL_HEADER = (

    "HTTP_X_FORWARDED_PROTO",

    "https",

)

SECURE_CONTENT_TYPE_NOSNIFF = True

X_FRAME_OPTIONS = "DENY"

SECURE_SSL_REDIRECT = not DEBUG

SESSION_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_SECURE = not DEBUG

SECURE_HSTS_SECONDS = 0 if DEBUG else 31536000

SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG

SECURE_HSTS_PRELOAD = not DEBUG

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# LOGGING

LOGGING = {

    "version": 1,

    "disable_existing_loggers": False,

    "formatters": {

        "verbose": {

            "format": "{levelname} {asctime} {name} {module} {message}",

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

            "handlers": ["console"],

            "level": "INFO",

            "propagate": False,

        },

        "django.request": {

            "handlers": ["console"],

            "level": "ERROR",

            "propagate": False,

        },

    },

    "root": {

        "handlers": ["console"],

        "level": "INFO",

    },

}



# FRONTEND AND PUBLIC BACKEND LINKS

FRONTEND_URL = (

    os.environ.get("FRONTEND_URL", "").strip()

    or ("http://localhost:5173" if DEBUG else "https://myfoodkindlapps.netlify.app")

).rstrip("/")

PUBLIC_BACKEND_URL = (

    os.environ.get("PUBLIC_BACKEND_URL", "").strip()

    or ("http://localhost:8888" if DEBUG else "https://foodkindl-25aug.onrender.com")

).rstrip("/")



# EMAIL: Gmail SMTP, configured through environment variables.
# Port 587 uses STARTTLS; port 465 uses implicit SSL.
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 465
EMAIL_USE_SSL = True
EMAIL_USE_TLS = False

EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "").strip()
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "").replace(" ", "").strip()

DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
EMAIL_TIMEOUT = 30

REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["email_verification"] = "3/hour"

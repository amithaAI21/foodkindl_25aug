"""Short-lived Google photo redirects. No Google API key is exposed to React."""
import os
import re
import logging
import requests
from django.conf import settings
from django.core import signing
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.http import require_GET

logger = logging.getLogger(__name__)

@require_GET
def restaurant_photo(request, token):
    try:
        resource = signing.loads(token, salt="foodkindl-google-photo", max_age=3600)
        if not isinstance(resource, str) or not re.fullmatch(r"places/[^/]+/photos/[^/]+", resource):
            return HttpResponse(status=404)
    except (signing.BadSignature, signing.SignatureExpired):
        return HttpResponse(status=404)

    key = (getattr(settings, "GOOGLE_PLACES_API_KEY", "")
           or os.environ.get("GOOGLE_PLACES_API_KEY", "")
           or getattr(settings, "GOOGLE_MAPS_API_KEY", "")
           or os.environ.get("GOOGLE_MAPS_API_KEY", ""))
    if not key:
        return HttpResponse(status=503)
    try:
        response = requests.get(
            f"https://places.googleapis.com/v1/{resource}/media",
            params={"maxWidthPx": 800, "skipHttpRedirect": "true"},
            headers={"X-Goog-Api-Key": key},
            timeout=(3, 12),
        )
        response.raise_for_status()
        photo_uri = response.json().get("photoUri", "")
        if not photo_uri.startswith("https://"):
            return HttpResponse(status=502)
        output = HttpResponseRedirect(photo_uri)
        output["Cache-Control"] = "private, no-store"
        return output
    except (requests.RequestException, ValueError):
        logger.warning("Google Places photo media request failed")
        return HttpResponse(status=502)

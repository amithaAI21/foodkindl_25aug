"""Authenticated Google route proxy. Does not store GPS data or provider responses."""
import math
import os
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle

class RouteThrottle(UserRateThrottle):
    scope = 'foodkindl_routes'
    rate = '10/min'

def point(value):
    if not isinstance(value, dict):
        raise ValueError()
    lat, lon = float(value['latitude']), float(value['longitude'])
    if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError()
    return {'location': {'latLng': {'latitude': lat, 'longitude': lon}}}

class RestaurantRouteView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [RouteThrottle]

    def post(self, request):
        try:
            origin, destination = point(request.data.get('origin')), point(request.data.get('destination'))
            mode = request.data.get('travel_mode', 'DRIVE')
            if mode not in ('DRIVE', 'WALK', 'TWO_WHEELER'):
                raise ValueError()
        except (KeyError, ValueError, TypeError, OverflowError):
            return Response({'detail': 'Provide valid origin, destination and travel mode.'}, status=400)
        key = getattr(settings, 'GOOGLE_ROUTES_API_KEY', '') or os.environ.get('GOOGLE_ROUTES_API_KEY', '')
        if not key:
            return Response({'detail': 'Routes API is not configured on the backend.'}, status=503)
        try:
            response = requests.post('https://routes.googleapis.com/directions/v2:computeRoutes',
                headers={'X-Goog-Api-Key': key, 'Content-Type': 'application/json',
                         'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.polyline,routes.warnings'},
                json={'origin': origin, 'destination': destination, 'travelMode': mode,
                      'polylineEncoding': 'GEO_JSON_LINESTRING', 'languageCode': 'en-US', 'units': 'METRIC'},
                timeout=(3, 12))
            response.raise_for_status()
            routes = response.json().get('routes', [])
            if not routes:
                return Response({'detail': 'No route found for this travel mode.'}, status=404)
            return Response({'route': routes[0]})
        except (requests.RequestException, ValueError, TypeError, AttributeError):
            return Response({'detail': 'Route unavailable. Check Routes API, billing, key restrictions and travel-mode coverage.'}, status=503)

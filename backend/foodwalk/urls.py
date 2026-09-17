from django.urls import path
from .views import plan_route_with_osm_places  # Your Overpass-based view
urlpatterns = [
     path('plan-route-osm/', plan_route_with_osm_places, name='plan-route-osm'),
]

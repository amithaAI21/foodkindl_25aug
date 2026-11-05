import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from './googleMaps';
import api from '../api';

function coords(place) {
  const lat = Number(place?.latitude ?? place?.lat ?? place?.center?.lat);
  const lng = Number(place?.longitude ?? place?.lon ?? place?.lng ?? place?.center?.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng } : null;
}
function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];
  const output = []; let lat = 0, lng = 0, index = 0;
  try {
    while (index < encoded.length) {
      const read = () => {
        let result = 0, shift = 0, byte;
        do {
          if (index >= encoded.length) throw new Error('Invalid route polyline');
          byte = encoded.charCodeAt(index++) - 63;
          result |= (byte & 31) << shift; shift += 5;
        } while (byte >= 32);
        return result & 1 ? ~(result >> 1) : result >> 1;
      };
      lat += read(); lng += read(); output.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
  } catch { return []; }
  return output;
}
function routeGeometry(route) {
  // Google Routes may return GeoJSON, an encoded polyline, or a
  // backend-normalized array of positions. Never draw a straight-line fallback.
  const candidates = [
    route?.polyline?.geoJsonLinestring?.coordinates,
    route?.polyline?.geoJsonLineString?.coordinates,
    route?.geoJsonLinestring?.coordinates,
    route?.geoJsonLineString?.coordinates,
    route?.geometry?.coordinates,
    route?.coordinates,
    route?.route_coordinates,
    route?.path,
    route?.points,
  ];
  for (const raw of candidates) {
    if (!Array.isArray(raw) || !raw.length) continue;
    const points = raw.map(point => {
      if (Array.isArray(point) && point.length >= 2) {
        // GeoJSON geometry uses [longitude, latitude].
        return { lat: Number(point[1]), lng: Number(point[0]) };
      }
      if (point && typeof point === 'object') {
        return coords(point);
      }
      return null;
    }).filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
      Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
    if (points.length >= 2) return points;
  }
  const encoded = route?.polyline?.encodedPolyline || route?.encodedPolyline ||
    route?.geometry?.encodedPolyline || route?.polyline?.points ||
    (typeof route?.polyline === 'string' ? route.polyline : null);
  return decodePolyline(encoded);
}
function extractRoute(payload) {
  if (payload?.route) return payload.route;
  if (Array.isArray(payload?.routes)) return payload.routes[0];
  if (payload?.data?.route) return payload.data.route;
  if (Array.isArray(payload?.data?.routes)) return payload.data.routes[0];
  if (payload?.polyline || payload?.geometry || payload?.coordinates) return payload;
  return null;
}
const readableError = err => err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Unable to calculate the selected route.';

/**
 * Drop-in Dine Out restaurant-discovery map.
 * - Normal: pins for all restaurants, with no GPS request.
 * - Focus: ONLY the selected restaurant pin, optional current-location pin,
 *   and an actual route obtained from Django /dineout/route/.
 * Requires browser HTTPS or localhost for GPS. Never fabricates a route.
 */
export default function FocusedRestaurantMap({ center, restaurants = [], highlightedRestaurant, focusRequest = 0, currentLocation = null, onSelect }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const requestRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [gpsRetry, setGpsRetry] = useState(0);

  const [travelMode, setTravelMode] = useState("DRIVE");

const travelModes = [
  { value: "WALK", label: "🚶 Walk" },
  { value: "TWO_WHEELER", label: "🏍️ Bike" },
  { value: "DRIVE", label: "🚗 Car" },
];

  const [locatedOrigin, setLocatedOrigin] = useState(null);
  const [error, setError] = useState('');
  const [routeState, setRouteState] = useState({ status: 'idle', mode: null, path: [], origin: null, distance: null, duration: null, accuracy: null, message: '' });

  useEffect(() => {
    let disposed = false;
    loadGoogleMaps().then(gm => {
      if (disposed || !elRef.current) return;
      const start = Array.isArray(center) && center.length === 2 ? {lat: Number(center[0]), lng: Number(center[1])} : {lat:12.9716,lng:77.5946};
      mapRef.current = new gm.Map(elRef.current, { center: start, zoom: 13, streetViewControl:false, mapTypeControl:false, fullscreenControl:true });
      setReady(true);
    }).catch(err => { if (!disposed) setError(err.message || 'Map could not load.'); });
    return () => {
      disposed = true;
      requestRef.current?.abort();
      overlaysRef.current.forEach(item => item.setMap?.(null));
      overlaysRef.current = [];
      mapRef.current = null;
    };
  }, []);

  // Reuse GPS already obtained via Dine Out's "Use my location" button.
  // Request GPS only for a manual-area user who then clicks View on map.
  useEffect(() => {
    requestRef.current?.abort();
    const restaurantPoint = coords(highlightedRestaurant);
    if (!highlightedRestaurant) setLocatedOrigin(null);
    if (!restaurantPoint) {
      setRouteState({ status:'idle', path:[], origin:null, distance:null, duration:null, accuracy:null, message:'' });
      return;
    }

    let cancelled = false;
    const doRoute = async (origin, accuracy) => {
      const controller = new AbortController();
      requestRef.current = controller;
      setLocatedOrigin(origin); // Show the blue marker immediately, even if routing fails.
      setRouteState({ status:'routing', path:[], origin, distance:null, duration:null, accuracy,
        message:`Calculating ${travelMode === 'WALK' ? 'walking' : travelMode === 'TWO_WHEELER' ? 'motorbike' : 'driving'} route…` });
      try {
        const response = await api.post('/dineout/route/', {
          origin: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
          destination: {
            latitude: restaurantPoint.lat,
            longitude: restaurantPoint.lng,
          },
          travel_mode: travelMode,
        }, {
          signal: controller.signal,
          timeout: 30000,
        });
        if (cancelled || controller.signal.aborted) return;
        const route = extractRoute(response.data);
        if (!route) throw new Error('The Django route endpoint did not return a route. Check its response.');
        const path = routeGeometry(route);
        if (path.length < 2) {
          console.warn('[FoodKindl] Route geometry missing; response keys:', Object.keys(response.data || {}));
          throw new Error('The route API returned no drawable polyline. In Django, request routes.polyline.encodedPolyline in X-Goog-FieldMask.');
        }
        setRouteState({ status:'ready', mode: travelMode, path, origin, accuracy,
          distance:Number(route.distanceMeters ?? route.distance_meters ?? 0),
          duration:parseFloat(String(route.duration ?? route.duration_seconds ?? '0')),
          message:'' });
      } catch(err) {
        if (!cancelled && !controller.signal.aborted) {
          const status = err?.response?.status;
          setRouteState({ status:'error', path:[], origin, accuracy, distance:null, duration:null,
            message:`Route request failed${status ? ` (HTTP ${status})` : ''}: ${readableError(err)}` });
        }
      }
    };

    const existingGPS = coords(currentLocation);
    // A saved GPS fix is still useful for displaying the blue pin. Do not
    // require a timestamp just to render the user's detected position.
    if (existingGPS) setLocatedOrigin(existingGPS);
    const gpsTimestamp = Number(currentLocation?.timestamp);
    const isRecent = Number.isFinite(gpsTimestamp) && gpsTimestamp > 0 &&
      Date.now() - gpsTimestamp < 10 * 60 * 1000;
    if (existingGPS && isRecent && gpsRetry === 0) {
      doRoute(existingGPS, Number(currentLocation.accuracy) || null);
    } else if (!navigator.geolocation || !window.isSecureContext) {
      setRouteState({ status:'error', path:[], origin:null, distance:null, duration:null, accuracy:null,
        message:'GPS is unavailable. Enable location permission on HTTPS/localhost to preview a road route.' });
    } else {
      setRouteState({ status:'gps', path:[], origin:null, distance:null, duration:null, accuracy:null,
        message:'Getting GPS position to calculate your route…' });
      navigator.geolocation.getCurrentPosition(position => {
        if (!cancelled) {
          const point = { lat:position.coords.latitude, lng:position.coords.longitude };
          setLocatedOrigin(point);
          doRoute(point, Math.round(position.coords.accuracy || 0));
        }
      }, err => {
        if (cancelled) return;
        const reason = err.code === 1 ? 'Location permission denied' :
          err.code === 3 ? 'GPS timed out' : 'GPS location unavailable';
        setRouteState({status:'error',path:[],origin:null,accuracy:null,distance:null,duration:null,
          message:`${reason}. The restaurant pin remains visible. Use the Google Maps directions link below.`});
      }, { enableHighAccuracy:false, maximumAge:30000, timeout:12000 });
    }
    return () => { cancelled = true; requestRef.current?.abort(); };
  }, [highlightedRestaurant, focusRequest, currentLocation, gpsRetry, travelMode]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const gm = window.google.maps;
    const map = mapRef.current;
    overlaysRef.current.forEach(item => item.setMap?.(null));
    overlaysRef.current = [];
    const bounds = new gm.LatLngBounds();
    function pin(point, name, color, onClick) {
      if (!point) return;
      const marker = new gm.Marker({ map, position:point, title:name,
        icon: { path:gm.SymbolPath.CIRCLE, scale:11, fillColor:color, fillOpacity:1, strokeColor:'#fff', strokeWeight:2 } });
      if (onClick) marker.addListener('click', onClick);
      overlaysRef.current.push(marker); bounds.extend(point);
    }
    const selectedPoint = coords(highlightedRestaurant);
    if (selectedPoint) {
      pin(selectedPoint, highlightedRestaurant.name, '#f46a3f');
      // GPS pin must not depend on a successful Routes API response.
      const gpsPoint = coords(currentLocation) || locatedOrigin || routeState.origin;
      if (gpsPoint) {
        const gpsMarker = new gm.Marker({
          map, position:gpsPoint, title:'Your current location (GPS)',
          zIndex:100,
          icon:{ path:gm.SymbolPath.CIRCLE, scale:10, fillColor:'#1677ff',
            fillOpacity:1, strokeColor:'#ffffff', strokeWeight:4 }
        });
        overlaysRef.current.push(gpsMarker);
        bounds.extend(gpsPoint);
      }
      if (routeState.mode === travelMode && routeState.path.length > 1) {
        overlaysRef.current.push(new gm.Polyline({ map, path:routeState.path, strokeColor:'#ffffff', strokeWeight:10, strokeOpacity:1, zIndex:10 }));
        overlaysRef.current.push(new gm.Polyline({ map, path:routeState.path, strokeColor:'#f46a3f', strokeWeight:6, strokeOpacity:1, zIndex:11 }));
        routeState.path.forEach(p => bounds.extend(p));
      }
    } else {
      restaurants.forEach(r => pin(coords(r), r.name || 'Restaurant', '#f46a3f', () => onSelect?.(r)));
      // Keep selected area in view when results are empty.
      if (bounds.isEmpty() && Array.isArray(center) && center.length === 2) {
        map.setCenter({lat:Number(center[0]), lng:Number(center[1])}); map.setZoom(13);
      }
    }
    if (!bounds.isEmpty()) {
      if (selectedPoint && !coords(currentLocation) && !locatedOrigin && !routeState.origin) { map.setCenter(selectedPoint); map.setZoom(16); }
      else { map.fitBounds(bounds, 55); }
    }
  }, [ready, restaurants, center, highlightedRestaurant, routeState, onSelect, currentLocation, locatedOrigin]);

  return (
    <div className="fk-focused-map-root">
            {highlightedRestaurant && (
        <div className="fk-travel-modes">
          {travelModes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              className={
                travelMode === mode.value ? "active" : ""
              }
              onClick={() => setTravelMode(mode.value)}
              aria-pressed={travelMode === mode.value}
            >
              {mode.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="fk-focused-map-status" role="alert">{error}</p>}
      {highlightedRestaurant && (
        <div className="fk-focused-map-status" role="status">
          {routeState.status === 'ready' && routeState.mode === travelMode
            ? <>Route from your current location: <strong>{(routeState.distance / 1000).toFixed(1)} km</strong> · <strong>{Math.round(routeState.duration / 60)} min</strong>{routeState.accuracy > 100 ? ` · GPS accuracy ±${routeState.accuracy} m` : ''}. {travelMode === "WALK"
  ? "Walking route"
  : travelMode === "TWO_WHEELER"
    ? "Motorbike route"
    : "Driving route"}.</>
            : (routeState.mode && routeState.mode !== travelMode ? 'Calculating selected travel mode…' : routeState.message || 'Showing selected restaurant.')}
        </div>
      )}
      {highlightedRestaurant && (coords(currentLocation) || locatedOrigin) && (
        <div className="fk-gps-pin-legend" role="status">
          <span className="fk-gps-blue-dot" /> Blue: your current location
          <span className="fk-gps-orange-dot" /> Orange: selected restaurant
        </div>
      )}
      {highlightedRestaurant && !coords(currentLocation) && !locatedOrigin && (
        <button type="button" className="fk-retry-gps" onClick={() => setGpsRetry(n => n + 1)}>
          📍 Detect my current location
        </button>
      )}
      <div ref={elRef} className="fk-focused-map-canvas" aria-label="Restaurant map with route preview" />
      {highlightedRestaurant && travelMode !== 'DRIVE' && (
        <p className="fk-focused-map-status">Walking and two-wheeler routes may omit sidewalks or safe paths. Follow local signs and conditions.</p>
      )}
      {highlightedRestaurant && coords(highlightedRestaurant) && (
        <a className="fk-route-external-link"
          target="_blank" rel="noopener noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&destination=${coords(highlightedRestaurant).lat}%2C${coords(highlightedRestaurant).lng}&travelmode=${
  travelMode === "WALK"
    ? "walking"
    : travelMode === "TWO_WHEELER"
      ? "two-wheeler"
      : "driving"
}`}>
          Open directions in Google Maps
        </a>
      )}
    </div>
  );
}


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
const readableError = err => err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Unable to draw the driving route.';

/**
 * Drop-in Dine Out restaurant-discovery map.
 * - Normal: pins for all restaurants, with no GPS request.
 * - Focus: ONLY the selected restaurant pin, optional current-location pin,
 *   and an actual route obtained from Django /dineout/route/.
 * Requires browser HTTPS or localhost for GPS. Never fabricates a route.
 */
export default function FocusedRestaurantMap({ center, restaurants = [], highlightedRestaurant, focusRequest = 0, onSelect }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const requestRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [routeState, setRouteState] = useState({ status: 'idle', path: [], origin: null, distance: null, duration: null, accuracy: null, message: '' });

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

  // Prompt for GPS only when the user explicitly clicks View on map.
  useEffect(() => {
    requestRef.current?.abort();
    const restaurantPoint = coords(highlightedRestaurant);
    if (!restaurantPoint) {
      setRouteState({ status:'idle', path:[], origin:null, distance:null, duration:null, accuracy:null, message:'' });
      return;
    }
    if (!navigator.geolocation || !window.isSecureContext) {
      setRouteState({ status:'error', path:[], origin:null, distance:null, duration:null, accuracy:null,
        message:'Live route needs browser location access on HTTPS or localhost. Restaurant pin is still available.' });
      return;
    }
    let cancelled = false;
    setRouteState({ status:'gps', path:[], origin:null, distance:null, duration:null, accuracy:null, message:'Getting your current location…' });
    navigator.geolocation.getCurrentPosition(async position => {
      if (cancelled) return;
      const origin = { lat:position.coords.latitude, lng:position.coords.longitude };
      const accuracy = Math.round(position.coords.accuracy || 0);
      const controller = new AbortController();
      requestRef.current = controller;
      setRouteState({ status:'routing', path:[], origin, distance:null, duration:null, accuracy, message:'Calculating route…' });
      try {
        const response = await api.post('/dineout/route/', {
          origin: { latitude:origin.lat, longitude:origin.lng },
          destination: { latitude:restaurantPoint.lat, longitude:restaurantPoint.lng },
          travel_mode:'DRIVE'
        }, { signal: controller.signal, timeout:30000 });
        if (cancelled || controller.signal.aborted) return;
        const route = extractRoute(response.data);
        if (!route) throw new Error('Route API returned no route. Check the Network response for /dineout/route/.');
        const path = routeGeometry(route);
        if (path.length < 2) {
          console.warn('[FoodKindl route] No drawable geometry. Response keys:', Object.keys(response.data || {}), 'Route keys:', Object.keys(route || {}));
          throw new Error('Route found, but no drawable geometry returned. Django must include routes.polyline.encodedPolyline or routes.polyline.geoJsonLinestring.');
        }
        setRouteState({ status:'ready', path, origin, accuracy, distance:Number(route.distanceMeters ?? route.distance_meters ?? 0), duration:parseFloat(route.duration ?? route.duration_seconds ?? 0), message:'' });
      } catch(err) {
        if (!cancelled && !controller.signal.aborted) setRouteState({ status:'error', path:[], origin, accuracy, distance:null, duration:null, message:readableError(err) });
      }
    }, err => {
      if (cancelled) return;
      const detail = err.code === 1 ? 'Location permission denied.' : err.code === 3 ? 'GPS timed out.' : 'Current location unavailable.';
      setRouteState({ status:'error', path:[], origin:null, accuracy:null, distance:null, duration:null, message:`${detail} Allow location to preview a route. The restaurant pin remains visible.` });
    }, { enableHighAccuracy:true, maximumAge:10000, timeout:15000 });
    return () => { cancelled = true; requestRef.current?.abort(); };
  }, [highlightedRestaurant, focusRequest]);

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
      if (routeState.origin) pin(routeState.origin, 'Your current location', '#2678f6');
      if (routeState.path.length > 1) {
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
      if (selectedPoint && !routeState.origin) { map.setCenter(selectedPoint); map.setZoom(16); }
      else { map.fitBounds(bounds, 55); }
    }
  }, [ready, restaurants, center, highlightedRestaurant, routeState, onSelect]);

  return (
    <div className="fk-focused-map-root">
      <div ref={elRef} className="fk-focused-map-canvas" aria-label="Restaurant map with route preview" />
      {error && <p className="fk-focused-map-status" role="alert">{error}</p>}
      {highlightedRestaurant && (
        <div className="fk-focused-map-status" role="status">
          {routeState.status === 'ready'
            ? <>Route from your current location: <strong>{(routeState.distance / 1000).toFixed(1)} km</strong> · <strong>{Math.round(routeState.duration / 60)} min</strong>{routeState.accuracy > 100 ? ` · GPS accuracy ±${routeState.accuracy} m` : ''}. Driving route; follow actual road signs.</>
            : routeState.message || 'Showing selected restaurant.'}
        </div>
      )}
      {highlightedRestaurant && coords(highlightedRestaurant) && (
        <a className="fk-route-external-link"
          target="_blank" rel="noopener noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&destination=${coords(highlightedRestaurant).lat}%2C${coords(highlightedRestaurant).lng}&travelmode=driving`}>
          Open directions in Google Maps
        </a>
      )}
    </div>
  );
}


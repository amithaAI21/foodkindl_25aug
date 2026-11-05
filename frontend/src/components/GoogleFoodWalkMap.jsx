import { useEffect, useRef, useState } from 'react';
import { asLatLng, loadGoogleMaps } from './googleMaps';

const validPosition = p => {
  if (!p) return null;
  const lat = Number(p.latitude ?? p.lat);
  const lng = Number(p.longitude ?? p.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};
const safe = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default function GoogleFoodWalkMap({ route = [], start, end, places = [], selected = [], onToggle, focusedId, currentLocation }) {
  const element = useRef(null);
  const map = useRef(null);
  const lines = useRef([]);
  const pins = useRef([]);
  const placeMarkers = useRef(new Map());
  const onToggleRef = useRef(onToggle);
  const info = useRef(null);
  const accuracyCircle = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  onToggleRef.current = onToggle;

  function showPlace(place, marker) {
    if (!map.current || !info.current || !marker) return;
    const photo = place.photo_url || place.image_url || place.photoUrl;
    const image = photo && /^https:\/\//i.test(photo)
      ? `<img src="${safe(photo)}" alt="" style="width:100%;max-height:125px;object-fit:cover;border-radius:8px;margin-bottom:9px" />`
      : '';
    const rating = place.rating != null ? `<span style="color:#885125">★ ${safe(place.rating)}</span>` : '';
    const category = safe(place.category || place.cuisine || 'Restaurant / café');
    // Inline colors are deliberate: the site's dark-theme text rules must not make Google InfoWindows unreadable.
    info.current.setContent(`<div class="fw-map-info-content" style="font:14px/1.45 Arial,sans-serif;color:#241b16!important;background:#fff!important;min-width:205px;max-width:265px;padding:4px 5px">${image}<div style="font-size:16px;font-weight:700;color:#211712!important;margin-bottom:5px">${safe(place.name || 'Food stop')}</div><div style="font-size:12px;color:#53473f!important">${category} ${rating}</div><div style="font-size:12px;color:#53473f!important;margin-top:5px">${place.distance_from_route_km != null ? `${safe(place.distance_from_route_km)} km from route` : 'Along your route'}</div></div>`);
    info.current.open({ map: map.current, anchor: marker, shouldFocus: false });
  }

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(gm => {
      if (cancelled || !element.current) return;
      map.current = new gm.Map(element.current, {
        center: { lat: 12.9716, lng: 77.5946 }, zoom: 12,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
        gestureHandling: 'greedy',
      });
      info.current = new gm.InfoWindow({ maxWidth: 290 });
      setReady(true);
    }).catch(e => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
      pins.current.forEach(p => p.setMap(null));
      lines.current.forEach(p => p.setMap(null));
      info.current?.close();
      accuracyCircle.current?.setMap(null);
      placeMarkers.current.clear();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    const gm = window.google.maps;
    info.current?.close();
    pins.current.forEach(p => { gm.event.clearInstanceListeners(p); p.setMap(null); });
    lines.current.forEach(p => p.setMap(null));
    pins.current = []; lines.current = [];
    placeMarkers.current.clear();
    const bounds = new gm.LatLngBounds();
    const points = route.map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (points.length > 1) {
      lines.current.push(new gm.Polyline({ map: map.current, path: points, strokeColor: '#ffffff', strokeWeight: 10, strokeOpacity: 0.85 }));
      lines.current.push(new gm.Polyline({ map: map.current, path: points, strokeColor: '#f36d49', strokeWeight: 6, strokeOpacity: 1 }));
      points.forEach(p => bounds.extend(p));
    }
    const addPin = (point, label, color, title, place) => {
      const position = validPosition(point);
      if (!position) return null;
      const marker = new gm.Marker({ map: map.current, position, title, label: { text: String(label), color: '#fff', fontWeight: 'bold' },
        icon: { path: gm.SymbolPath.CIRCLE, scale: label === '●' ? 9 : 15, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 } });
      if (place) {
        placeMarkers.current.set(String(place.id), { marker, place });
        marker.addListener('click', () => showPlace(place, marker));
      }
      pins.current.push(marker);
      bounds.extend(position);
      return marker;
    };
    addPin(start, 'A', '#16866b', 'Start: ' + (start?.name || 'Start'));
    addPin(end, 'B', '#395bd5', 'Destination: ' + (end?.name || 'Destination'));
    const ids = new Set(selected.map(p => String(p.id)));
    places.forEach(place => {
      const chosen = ids.has(String(place.id));
      addPin(place, chosen ? String(selected.findIndex(p => String(p.id) === String(place.id)) + 1) : '●',
        chosen ? '#ef623f' : '#6d5645', place.name, place);
    });
    if (accuracyCircle.current) { accuracyCircle.current.setMap(null); accuracyCircle.current = null; }
    if (currentLocation) {
      addPin(currentLocation, '●', '#277cff', `GPS estimate (±${Math.round(currentLocation.accuracy || 0)}m)`);
      const pos = validPosition(currentLocation);
      if (pos && Number(currentLocation.accuracy) > 0) accuracyCircle.current = new gm.Circle({ map: map.current, center: pos, radius: Number(currentLocation.accuracy), strokeColor: '#287cfa', strokeOpacity: 0.75, strokeWeight: 1, fillColor: '#287cfa', fillOpacity: 0.12 });
    }
    if (!bounds.isEmpty()) map.current.fitBounds(bounds, 65);
  }, [ready, route, start, end, places, selected, currentLocation]);

  useEffect(() => {
    if (!ready || !focusedId || !map.current) return;
    const id = String(typeof focusedId === 'object' ? focusedId.id : focusedId);
    const target = placeMarkers.current.get(id);
    if (!target) return;
    const position = validPosition(target.place);
    if (!position) return;
    map.current.panTo(position);
    map.current.setZoom(Math.max(map.current.getZoom() || 0, 16));
    showPlace(target.place, target.marker);
  }, [focusedId, ready, places, selected, route, start, end, currentLocation]);

  return <div className="fw-google-map-wrap">
    {error && <div className="fw-map-error" role="alert">{error}</div>}
    {!ready && !error && <div className="fw-map-loading">Loading Google Maps…</div>}
    <div ref={element} className="fw-google-map" role="region" aria-label="Interactive Food Walk Google map" />
  </div>;
}

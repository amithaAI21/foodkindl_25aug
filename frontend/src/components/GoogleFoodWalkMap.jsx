import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from './googleMaps';

const toPosition = (value) => {
  if (!value) return null;
  const lat = Number(value.latitude ?? value.lat);
  const lng = Number(value.longitude ?? value.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export default function GoogleFoodWalkMap({
  route = [], start, end, places = [], selected = [], onToggle,
  focusedId, currentLocation,
}) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const infoRef = useRef(null);
  const markersRef = useRef([]);
  const markerByIdRef = useRef(new Map());
  const toggleRef = useRef(onToggle);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  toggleRef.current = onToggle;

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((googleMaps) => {
        if (cancelled || !elementRef.current) return;
        mapRef.current = new googleMaps.Map(elementRef.current, {
          center: { lat: 12.9716, lng: 77.5946 },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
        });
        infoRef.current = new googleMaps.InfoWindow({ maxWidth: 290 });
        setReady(true);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause?.message || 'Google Maps could not load.');
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      infoRef.current?.close();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    const googleMaps = window.google.maps;
    infoRef.current?.close();
    markersRef.current.forEach((marker) => {
      googleMaps.event.clearInstanceListeners(marker);
      marker.setMap(null);
    });
    markersRef.current = [];
    markerByIdRef.current.clear();

    const bounds = new googleMaps.LatLngBounds();
    const path = (Array.isArray(route) ? route : [])
      .filter((point) => Array.isArray(point) && point.length >= 2)
      .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

    if (path.length > 1) {
      const outline = new googleMaps.Polyline({
        map: mapRef.current, path, strokeColor: '#fff', strokeOpacity: 0.9, strokeWeight: 10, zIndex: 1,
      });
      const routeLine = new googleMaps.Polyline({
        map: mapRef.current, path, strokeColor: '#f36d49', strokeOpacity: 1, strokeWeight: 6, zIndex: 2,
      });
      markersRef.current.push(outline, routeLine);
      path.forEach((point) => bounds.extend(point));
    }

    const selectedIds = new Set(selected.map((place) => String(place.id)));
    const openPlaceInfo = (place, marker, isSelected) => {
      const photo = place.photo_url || place.image_url || place.photoUrl || '';
      const image = /^https:\/\//i.test(photo)
        ? `<img src="${escapeHtml(photo)}" alt="" style="width:100%;max-height:120px;object-fit:cover;border-radius:7px;margin-bottom:7px"/>`
        : '';
      const nearbyText = place.near_start ? '<div style="color:#a14b1e;font-weight:700;margin-top:4px">Near your starting point</div>' : '';
      const distance = place.distance_from_start_km != null
        ? `${escapeHtml(place.distance_from_start_km)} km from start`
        : place.distance_from_route_km != null
          ? `${escapeHtml(place.distance_from_route_km)} km from route`
          : '';
      const button = toggleRef.current
        ? `<button id="fw-foodwalk-toggle" type="button" style="margin-top:9px;padding:8px 11px;border:0;border-radius:7px;background:#f36d49;color:#fff;font-weight:700;cursor:pointer">${isSelected ? 'Remove stop' : 'Add to walk'}</button>`
        : '';
      infoRef.current.setContent(`<div style="font:14px/1.4 Arial,sans-serif;color:#211712;min-width:190px;max-width:260px">${image}<strong style="font-size:16px">${escapeHtml(place.name || 'Food stop')}</strong><div>${escapeHtml(place.category || place.cuisine || 'Restaurant')}</div>${nearbyText}<div style="margin-top:4px">${distance}</div>${button}</div>`);
      infoRef.current.open({ map: mapRef.current, anchor: marker, shouldFocus: false });
      if (toggleRef.current) {
        googleMaps.event.addListenerOnce(infoRef.current, 'domready', () => {
          const action = document.getElementById('fw-foodwalk-toggle');
          action?.addEventListener('click', () => toggleRef.current?.(place));
        });
      }
    };

    const addMarker = (position, { label, color, title, place, selectedPlace = false, prominent = false }) => {
      if (!position) return null;
      const marker = new googleMaps.Marker({
        map: mapRef.current,
        position,
        title,
        zIndex: place ? (prominent || selectedPlace ? 100 : 50) : 150,
        label: {
          text: String(label), color: '#fff', fontWeight: 'bold',
          fontSize: prominent ? '13px' : '12px',
        },
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: selectedPlace ? 16 : prominent ? 15 : 12,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2.5,
        },
      });
      markersRef.current.push(marker);
      bounds.extend(position);
      if (place) {
        markerByIdRef.current.set(String(place.id), { marker, place });
        marker.addListener('click', () => openPlaceInfo(place, marker, selectedPlace));
      }
      return marker;
    };

    const startPosition = toPosition(start);
    const endPosition = toPosition(end);
    addMarker(startPosition, { label: 'A', color: '#16866b', title: 'Starting point' });
    addMarker(endPosition, { label: 'B', color: '#375bd4', title: 'Destination' });

    places.forEach((place) => {
      const selectedPlace = selectedIds.has(String(place.id));
      const prominent = Boolean(place.near_start);
      const stopNumber = selected.findIndex((item) => String(item.id) === String(place.id)) + 1;
      const label = selectedPlace ? String(stopNumber) : prominent ? '🍴' : '•';
      addMarker(toPosition(place), {
        label,
        color: selectedPlace ? '#ef623f' : prominent ? '#e68a2e' : '#715a49',
        title: `${place.name || 'Food stop'}${prominent ? ' · near your start' : ''}`,
        place,
        selectedPlace,
        prominent,
      });
    });

    const current = toPosition(currentLocation);
    if (current) {
      addMarker(current, { label: '●', color: '#287cff', title: 'Your current location' });
      const accuracy = Number(currentLocation?.accuracy);
      if (accuracy > 0) {
        const circle = new googleMaps.Circle({
          map: mapRef.current, center: current, radius: accuracy,
          strokeColor: '#287cff', strokeOpacity: 0.7, strokeWeight: 1,
          fillColor: '#287cff', fillOpacity: 0.1,
        });
        markersRef.current.push(circle);
      }
    }

    if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds, 55);
  }, [ready, route, start, end, places, selected, currentLocation]);

  useEffect(() => {
    if (!ready || focusedId == null || !mapRef.current) return;
    const id = String(typeof focusedId === 'object' ? focusedId.id : focusedId);
    const target = markerByIdRef.current.get(id);
    if (!target) return;
    const position = toPosition(target.place);
    if (!position) return;
    mapRef.current.panTo(position);
    mapRef.current.setZoom(Math.max(mapRef.current.getZoom() || 0, 16));
    google.maps.event.trigger(target.marker, 'click');
  }, [ready, focusedId, places, selected, route]);

  return (
    <div className="fw-google-map-wrap">
      {error && <div className="fw-map-error" role="alert">{error}</div>}
      {!ready && !error && <div className="fw-map-loading">Loading map…</div>}
      <div ref={elementRef} className="fw-google-map" role="region" aria-label="Food Walk map with route and restaurant markers" />
    </div>
  );
}

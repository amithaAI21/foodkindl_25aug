import { useEffect, useRef, useState } from "react";

let mapsPromise;
function loadMaps() {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error("Set VITE_GOOGLE_MAPS_API_KEY and rebuild the frontend."));
  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const callback = "foodkindlGoogleMapsReady";
    const timer = window.setTimeout(() => {
      delete window[callback];
      reject(new Error("Google Maps took too long to load. Reload to retry."));
    }, 20000);
    window[callback] = () => {
      window.clearTimeout(timer);
      delete window[callback];
      resolve(window.google.maps);
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=${callback}&v=weekly`;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      delete window[callback];
      reject(new Error("Google Maps could not load. Check your key and website restrictions."));
    };
    document.head.appendChild(script);
  });
  return mapsPromise;
}

export default function GoogleRestaurantMap({ center, restaurants, highlightedRestaurant, onSelect }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const selectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  selectRef.current = onSelect;
  useEffect(() => {
    let disposed = false;
    loadMaps().then((maps) => {
      if (disposed) return;
      mapRef.current = new maps.Map(container.current, {
        center: { lat: center[0], lng: center[1] }, zoom: 13,
        streetViewControl: false, mapTypeControl: false,
      });
      setReady(true);
    }).catch((e) => { if (!disposed) setError(e.message); });
    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      if (mapRef.current) window.google?.maps?.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const maps = window.google.maps;
    markersRef.current.forEach((m) => { maps.event.clearInstanceListeners(m); m.setMap(null); });
    const bounds = new maps.LatLngBounds();
    markersRef.current = restaurants.filter((r) => r.latitude != null && r.longitude != null &&
      Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude))).map((r) => {
      const position = { lat: Number(r.latitude), lng: Number(r.longitude) };
      bounds.extend(position);
      const marker = new maps.Marker({ map: mapRef.current, position, title: r.name,
        icon: { path: maps.SymbolPath.CIRCLE, scale: highlightedRestaurant?.id === r.id ? 12 : 8,
          fillColor: r.is_foodkindl_partner ? "#168567" : "#f56532", fillOpacity: 1,
          strokeColor: "#fff", strokeWeight: 2 } });
      marker.addListener("click", () => selectRef.current(r));
      return marker;
    });
    if (highlightedRestaurant?.latitude != null) {
      mapRef.current.setCenter({ lat: Number(highlightedRestaurant.latitude), lng: Number(highlightedRestaurant.longitude) });
      mapRef.current.setZoom(15);
    } else if (markersRef.current.length > 1) {
      mapRef.current.fitBounds(bounds, 40);
    } else {
      const first = restaurants.find((r) => r.latitude != null && r.longitude != null);
      mapRef.current.setCenter(first ? { lat: Number(first.latitude), lng: Number(first.longitude) }
        : { lat: center[0], lng: center[1] });
      mapRef.current.setZoom(14);
    }
  }, [ready, center, restaurants, highlightedRestaurant]);
  return <>
    {error && <p role="alert">{error}</p>}
    {!ready && !error && <p role="status">Loading Google Maps…</p>}
    <div ref={container} aria-label="Restaurant locations on Google Maps"
      style={{ height: "min(65vh, 600px)", minHeight: 360, width: "100%", borderRadius: 16 }} />
  </>;
}

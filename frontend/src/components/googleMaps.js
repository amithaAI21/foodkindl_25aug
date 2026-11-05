let mapsPromise;
export function loadGoogleMaps() {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY."));
  mapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-foodkindl-google-maps]');
    const callback = '__foodkindlGoogleMapsReady';
    const timeout = window.setTimeout(() => { cleanup(); mapsPromise = null; reject(new Error('Google Maps loading timed out.')); }, 25000);
    const cleanup = () => { window.clearTimeout(timeout); delete window[callback]; };
    window[callback] = () => { cleanup(); resolve(window.google.maps); };
    if (existing) { existing.remove(); }
    const script = document.createElement('script');
    script.dataset.foodkindlGoogleMaps = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${callback}`;
    script.async = true;
    script.onerror = () => { cleanup(); mapsPromise = null; reject(new Error('Google Maps could not load. Check billing, API key and referrer restrictions.')); };
    document.head.appendChild(script);
  });
  return mapsPromise;
}
export function asLatLng(point) {
  return { lat: Number(point.latitude), lng: Number(point.longitude) };
}

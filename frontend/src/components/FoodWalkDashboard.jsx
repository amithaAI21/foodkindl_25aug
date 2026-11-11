import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import GoogleFoodWalkMap from '../components/GoogleFoodWalkMap';
import './FoodWalkDashboard.css';
import './FoodWalkPremium.css';
import './FoodWalkUX.css';

const money = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const short = name => String(name || '').split(',')[0];
const ROUTE_MODES = [
  { value: 'walking', label: '🚶 Walk', mapsMode: 'walking' },
  { value: 'bike', label: '🏍️ Bike', mapsMode: 'two-wheeler' },
  { value: 'car', label: '🚗 Car', mapsMode: 'driving' },
];

function LocationInput({ label, value, onChange, suggestions, onChoose, disabled }) {
  return <label className="fw-field">{label}
    <input aria-label={label} value={value} onChange={e => onChange(e.target.value)} autoComplete="off" disabled={disabled} placeholder={label.toLowerCase().includes("destination") ? "Search destination (e.g. Nandhana Palace, Nagasandra)" : "Search starting area or address"} />
    {!!suggestions.length && <div className="fw-autocomplete" role="listbox">{suggestions.map(s => <button key={s.id} type="button" onClick={() => onChoose(s)}>{s.display_name || s.label}</button>)}</div>}
  </label>;
}

export default function FoodWalk() {
  const navigate = useNavigate();
  const [start, setStart] = useState('Indiranagar, Bengaluru');
  const [end, setEnd] = useState('Whitefield, Bengaluru');
  const [gps, setGps] = useState(null);
  const [useGps, setUseGps] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsWarning, setGpsWarning] = useState('');
  const gpsWatchRef = useRef(null);
  const gpsTimerRef = useRef(null);
  const bestGpsRef = useRef(null);
  const [mode, setMode] = useState('walking');
  const [routeOptions, setRouteOptions] = useState({});
  const [selectedByMode, setSelectedByMode] = useState({});
  const [diet, setDiet] = useState('all');
  const [budget, setBudget] = useState(1000);
  const [meal, setMeal] = useState('');
  const [wish, setWish] = useState('');
  const [restaurantQuery, setRestaurantQuery] = useState('');
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [focusedId, setFocusedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggest, setSuggest] = useState({ start: [], end: [] });
  const [browse, setBrowse] = useState('recommended');
  const [search, setSearch] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [startPreview, setStartPreview] = useState(null);
  const [startPlaces, setStartPlaces] = useState([]);
  const [startPlacesLoading, setStartPlacesLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sortBy, setSortBy] = useState('route');
  const [imageFailed, setImageFailed] = useState({});
  const [preview, setPreview] = useState(null);


  useEffect(() => {
    let alive = true;
    if (!end || end.length < 3) { setSuggest(s => ({ ...s, end: [] })); return; }
    const timer = setTimeout(async () => {
      try { const r = await api.get('/foodwalk/location-suggestions/', { params: { q: end } }); if (alive) setSuggest(s => ({ ...s, end: Array.isArray(r.data) ? r.data : [] })); }
      catch { if (alive) setSuggest(s => ({ ...s, end: [] })); }
    }, 450);
    return () => { alive = false; clearTimeout(timer); };
  }, [end]);

  useEffect(() => {
    let alive = true;
    if (useGps || start.length < 3) { setSuggest(s => ({ ...s, start: [] })); return; }
    const timer = setTimeout(async () => {
      try { const r = await api.get('/foodwalk/location-suggestions/', { params: { q: start } }); if (alive) setSuggest(s => ({ ...s, start: Array.isArray(r.data) ? r.data : [] })); }
      catch { if (alive) setSuggest(s => ({ ...s, start: [] })); }
    }, 450);
    return () => { alive = false; clearTimeout(timer); };
  }, [start, useGps]);

  const previewPosition = useMemo(() => {
    if (useGps && gps) return { latitude: gps.latitude, longitude: gps.longitude };
    if (startPreview?.latitude != null && startPreview?.longitude != null) {
      return { latitude: startPreview.latitude, longitude: startPreview.longitude };
    }
    return null;
  }, [useGps, gps, startPreview]);

  useEffect(() => {
    let alive = true;
    if (!previewPosition) {
      setStartPlaces([]);
      return undefined;
    }

    setStartPlacesLoading(true);
    api.get('/foodwalk/nearby-restaurants/', {
      params: previewPosition,
      timeout: 20000,
    }).then(response => {
      if (!alive) return;
      const payload = response.data || {};
      setStartPlaces(Array.isArray(payload.places) ? payload.places : []);
    }).catch(() => {
      if (alive) setStartPlaces([]);
    }).finally(() => {
      if (alive) setStartPlacesLoading(false);
    });

    return () => { alive = false; };
  }, [previewPosition]);

  // Repeated fixes are often substantially better than the first desktop/Wi-Fi fix.
  // We never silently claim a coarse location is precise.
  function stopGpsSearch() {
    if (gpsWatchRef.current !== null) navigator.geolocation.clearWatch(gpsWatchRef.current);
    if (gpsTimerRef.current !== null) window.clearTimeout(gpsTimerRef.current);
    gpsWatchRef.current = null;
    gpsTimerRef.current = null;
    setGpsLoading(false);
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setError('Location is not supported by this browser.'); return; }
    stopGpsSearch();
    bestGpsRef.current = null;
    setGpsWarning(''); setError(''); setGpsLoading(true);
    const accept = (candidate) => {
      setGps(candidate);
      setCurrentLocation(candidate);
      setStartPreview(candidate);
      setUseGps(true);
      setData(null);
      setSelected([]);
      if (candidate.accuracy > 100) {
        setGpsWarning(`Your device estimates this position within about ${Math.round(candidate.accuracy)} metres. It may be inaccurate. You can retry GPS or enter a starting point manually.`);
      } else setGpsWarning('');
    };
    gpsWatchRef.current = navigator.geolocation.watchPosition(({ coords }) => {
      const candidate = { latitude: Number(coords.latitude), longitude: Number(coords.longitude), accuracy: Number(coords.accuracy) };
      if (![candidate.latitude, candidate.longitude, candidate.accuracy].every(Number.isFinite)) return;
      if (candidate.accuracy < (bestGpsRef.current?.accuracy ?? Infinity)) bestGpsRef.current = candidate;
      if (candidate.accuracy <= 75) { accept(candidate); stopGpsSearch(); }
    }, (e) => {
      stopGpsSearch();
      if (bestGpsRef.current) accept(bestGpsRef.current);
      else setError(e.code === 1 ? 'Location permission denied. Allow location for localhost or enter your start manually.' : 'GPS unavailable. Check Windows location settings or enter your start manually.');
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
    gpsTimerRef.current = window.setTimeout(() => {
      stopGpsSearch();
      if (bestGpsRef.current) accept(bestGpsRef.current);
      else setError('No GPS position available. Try again or enter your starting location.');
    }, 12000);
  }
  useEffect(() => () => {
    if (gpsWatchRef.current !== null) navigator.geolocation.clearWatch(gpsWatchRef.current);
    if (gpsTimerRef.current !== null) window.clearTimeout(gpsTimerRef.current);
  }, []);

  async function build(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    setData(null);
    setRouteOptions({});
    setSelected([]);
    setSelectedByMode({});
    try {
      const origin = useGps && gps ? `${gps.latitude},${gps.longitude}` : start;
      const results = await Promise.allSettled(ROUTE_MODES.map(async routeMode => {
        const response = await api.post('/foodwalk/build-food-walk/', {
          start: origin,
          end,
          travel_mode: routeMode.value,
          budget_per_person: Number(budget),
          food_type: diet,
          restaurant_query: restaurantQuery.trim(),
          food_wish: wish.trim(),
        });
        return [routeMode.value, response.data];
      }));

      const availableRoutes = Object.fromEntries(
        results.filter(result => result.status === 'fulfilled').map(result => result.value)
      );
      const failedModes = results
        .map((result, index) => result.status === 'rejected' ? ROUTE_MODES[index].label.replace(/^\S+\s/, '') : null)
        .filter(Boolean);

      if (!Object.keys(availableRoutes).length) {
        const failed = results.find(result => result.status === 'rejected')?.reason;
        throw failed || new Error('No route options were returned.');
      }

      const selections = Object.fromEntries(
        Object.entries(availableRoutes).map(([routeMode, routeData]) => [
          routeMode,
          routeData.recommended_stops || [],
        ])
      );
      const initialMode = availableRoutes[mode] ? mode : Object.keys(availableRoutes)[0];

      setRouteOptions(availableRoutes);
      setSelectedByMode(selections);
      setMode(initialMode);
      setData(availableRoutes[initialMode]);
      setSelected(selections[initialMode] || []);

      if (failedModes.length) {
        setError(`${failedModes.join(' and ')} route${failedModes.length > 1 ? 's are' : ' is'} unavailable. You can still use the route options that loaded.`);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Could not build the Food Walk. Check your Google API configuration and try again.');
    }
    finally { setLoading(false); }
  }

  function selectTravelMode(nextMode) {
    const nextRoute = routeOptions[nextMode];
    if (!nextRoute) return;
    setMode(nextMode);
    setData(nextRoute);
    setSelected(selectedByMode[nextMode] || nextRoute.recommended_stops || []);
    setFocusedId(null);
    setPreview(null);
  }

  const allPlaces = useMemo(() => {
    const unique = new Map();
    [...startPlaces, ...(data?.recommended_stops || []), ...(data?.other_places || []), ...(data?.places || [])]
      .forEach(p => {
        if (p.id == null) return;
        const key = String(p.id);
        const previous = unique.get(key) || {};
        unique.set(key, {
          ...previous,
          ...p,
          near_start: Boolean(p.near_start || previous.near_start),
        });
      });
    return [...unique.values()];
  }, [data, startPlaces]);
  const total = selected.reduce((sum, p) => sum + Number(p.estimated_cost || 0), 0);
  const showPlaces = allPlaces.filter(p => {
    const fits = !search || `${p.name} ${p.category} ${p.cuisine}`.toLowerCase().includes(search.toLowerCase());
    const categoryOk = categoryFilter === 'all' || String(p.category || '').toLowerCase().includes(categoryFilter);
    const openOk = !onlyOpen || p.open_now === true;
    return fits && categoryOk && openOk && (browse === 'all' || browse === 'selected' && selected.some(s => String(s.id) === String(p.id)) ||
      browse === 'recommended' && (p.is_requested_stop || p.matches_food_wish || p.near_start || (data?.recommended_stops || []).some(s => String(s.id) === String(p.id))));
  }).sort((a,b) => sortBy === 'rating' ? Number(b.rating || 0) - Number(a.rating || 0) : sortBy === 'detour' ? Number(a.distance_from_route_km || 99) - Number(b.distance_from_route_km || 99) : Number(a.route_progress || 0) - Number(b.route_progress || 0));
  function toggleStop(p) {
    const selectedNow = selected.some(s => String(s.id) === String(p.id));
    if (selectedNow) {
      const nextSelected = selected.filter(s => String(s.id) !== String(p.id));
      setSelected(nextSelected);
      setSelectedByMode(items => ({ ...items, [mode]: nextSelected }));
      setError('');
      return;
    }
    if (selected.length >= 4) { setError('Maximum four food stops per route.'); return; }
    if (total + Number(p.estimated_cost || 0) > Number(budget) && !window.confirm('Adding this stop exceeds your approximate budget. Continue?')) return;
    const nextSelected = [...selected, p].sort((a, b) => Number(a.route_progress) - Number(b.route_progress));
    setSelected(nextSelected);
    setSelectedByMode(items => ({ ...items, [mode]: nextSelected }));
    setError('');
  }

  function googleDirectionsUrl() {
    if (!data) return '#';
    const googleMode = ROUTE_MODES.find(item => item.value === mode)?.mapsMode || 'walking';
    const params = new URLSearchParams({
      api: '1',
      origin: data.start?.name || (useGps && gps ? `${gps.latitude},${gps.longitude}` : start),
      destination: data.end?.name || end,
      travelmode: googleMode,
    });
    if (selected.length) params.set('waypoints', selected.map(place => place.name).join('|'));
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
  function journey() {
    if (!data) return;
    const candidates = allPlaces.map(p => ({ ...p, routeMinutes: Math.round(Number(p.route_progress || 0) * Number(data.duration_minutes || 0) / 100), stopMinutes: 30, estimatedCost: p.estimated_cost }));
    navigate('/food-walk/journey', { state: { foodJourney: {
      origin: data.start?.name || start, destination: data.end?.name || end,
      travelMinutes: data.duration_minutes, travelMode: data.travel_mode,
      mealPreference: meal, foodWish: wish, places: candidates, routeCoordinates: data.route?.coordinates || [],
      selectedIds: selected.map(p => String(p.id)), budget: Number(budget),
    } } });
  }

  // The selected mode must match the route data actually loaded.
  const activeTravelMode = data?.travel_mode || mode;

  return <main className="foodwalk fw-v2 fw-premium">
    <aside className="fw-panel">
      <div className="fw-brand">♨ FoodKindl <span>MEET PEOPLE THROUGH FOOD</span></div>
      <h1>Plan a Food Walk</h1>
      <p className="fw-subtitle">Choose where to start and finish, then pick food stops that suit your group and budget.</p>
      <form onSubmit={build}>
        <div className="fw-field-heading"><b>1. Choose your route</b></div>
        <p className="fw-help-text">Set your starting point and destination. You can use your current location or enter an area.</p>
        <div className="fw-field-heading"><b>📍 Starting point</b>{useGps && <span className="fw-gps-chip">● GPS selected</span>}</div>
        {useGps ? <div className="fw-gps-selected">Using your device location (±{Math.round(gps?.accuracy || 0)} m). <button type="button" onClick={() => { setUseGps(false); setStartPreview(null); setGpsWarning(''); }}>Enter manually</button></div> :
          <LocationInput label="Starting area" value={start} onChange={value => { setStart(value); setStartPreview(null); }} suggestions={suggest.start} onChoose={v => {setStart(v.display_name || v.label || ''); setStartPreview(v); setUseGps(false); setSuggest(x=>({...x,start:[]}));}} />}
        <button className="fw-location-button" type="button" disabled={gpsLoading} onClick={useMyLocation}>{gpsLoading?'Finding your location…':'⌖ Use my current location as the start'}</button>
        {gpsWarning && <p className="fw-alert" role="status">{gpsWarning}</p>}
        <LocationInput label="📍 Destination" value={end} onChange={setEnd} suggestions={suggest.end} onChoose={v => {setEnd(v.display_name || v.label || '');setSuggest(x=>({...x,end:[]}));}} />
        <p className="fw-help-text">Search and select where you want the walk to finish. Your current location is used only as the starting point.</p>
        <p className="fw-filter-label">How are you travelling?</p>
        <div className="fw-chips fw-mode-chips">{ROUTE_MODES.map(({value,label})=><button key={value} type="button" onClick={()=>data ? selectTravelMode(value) : setMode(value)} disabled={loading || (Boolean(data) && !routeOptions[value])} className={activeTravelMode===value?'active':''} aria-pressed={activeTravelMode===value}>{label}{data && !routeOptions[value] ? ' — unavailable' : ''}</button>)}</div>
        <div className="fw-field-heading"><b>2. Set your preferences</b></div>
        <p className="fw-help-text">Choose a food preference, budget, or craving. Dietary labels may not be verified, so confirm with the restaurant.</p>
        <p className="fw-filter-label">Food preference</p>
        <div className="fw-chips">{[['all','🍽 All'],['veg','🥬 Vegetarian'],['non-veg','🍗 Non-Veg']].map(([v,l])=><button key={v} type="button" className={diet===v?'active':''} onClick={()=>setDiet(v)}>{l}</button>)}</div>
        <label className="fw-budget-label"><span>Budget per person</span><b>{money(budget)}</b></label>
        <input className="fw-budget-range" type="range" min="200" max="2000" step="100" value={budget} onChange={e=>setBudget(Number(e.target.value))}/>
        <div className="fw-range-ends"><span>₹200</span><span>₹2,000</span></div>
        <p className="fw-filter-label">What are you craving? <small>(optional)</small></p>
        <div className="fw-chips fw-meals">{['Biryani','Brunch','Quick bites','Coffee','Snacks','Vegetarian lunch'].map(v=><button type="button" key={v} className={meal===v?'active':''} onClick={()=>{setMeal(meal===v?'':v);setWish(meal===v?'':v);}}>{v}</button>)}</div>
        <label className="fw-field">Other cravings<input value={wish} maxLength={120} onChange={e=>setWish(e.target.value)} placeholder="e.g. South Indian breakfast"/></label>
        <label className="fw-field">Must-visit restaurant <small>(optional)</small>
          <input value={restaurantQuery} maxLength={120} onChange={e=>setRestaurantQuery(e.target.value)} placeholder="e.g. Nandhana Palace, Nagasandra"/>
        </label>
        <p className="fw-help-text">We’ll look for this restaurant near your route and show the detour, if any.</p>
        <button type="submit" className="fw-build" disabled={loading}>{loading?'Finding delicious stops…':'➤ Build My Food Walk →'}</button>
      </form>
      {error && <p className="fw-error" role="alert">{error}</p>}
      <div className="fw-privacy-note">🔒 GPS is optional for planning. You can type both locations manually.</div>
    </aside>
    <section className="fw-content">
      {data && <div className="fw-route-choice-panel" style={{ display: 'grid', gap: 14, marginBottom: 18, padding: 18, border: '1px solid rgba(255, 112, 67, .35)', borderRadius: 16, background: 'linear-gradient(145deg, #28150e, #160c08)' }}>
        <div><h2 style={{ margin: '0 0 6px' }}>Choose your route</h2><p style={{ margin: 0 }}>Compare separate walking, cycling, and driving routes. Your food stops are saved separately for each mode.</p></div>
        <div className="fw-chips fw-mode-chips" role="tablist" aria-label="Travel route options">
          {ROUTE_MODES.map(({value,label}) => {
            const route = routeOptions[value];
            return <button key={value} type="button" role="tab" aria-selected={mode===value} disabled={!route} onClick={()=>selectTravelMode(value)} className={mode===value?'active':''}>
              <span style={{ display: 'block' }}>{label}</span>
              {route && <small style={{ display: 'block', marginTop: 5 }}>{route.distance_km} km · {route.duration_minutes} min</small>}
              {!route && <small style={{ display: 'block', marginTop: 5 }}>Unavailable</small>}
            </button>;
          })}
        </div>
      </div>}
      <div className="fw-map-stage">
        <GoogleFoodWalkMap route={data?.route?.coordinates || []} start={data?.start || startPreview} end={data?.end} places={allPlaces} selected={selected} travelMode={activeTravelMode} onToggle={data ? toggleStop : undefined} focusedId={focusedId} currentLocation={useGps?currentLocation:null}/>
        <div className="fw-map-tip">🗺 {data?`Previewing the ${activeTravelMode==='walking'?'walking':activeTravelMode==='bike'?'motorbike':'driving'} route. Tap a restaurant marker to add or remove that stop.`:startPlacesLoading?'Finding popular restaurants around your starting point…':startPlaces.length?'Showing popular restaurants near your starting point. Build a route to explore stops along the whole way.':'Select a starting point or use your current location to see nearby restaurants.'}</div>
        {data && <a className="fw-journey" href={googleDirectionsUrl()} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', width: 'fit-content', marginTop: 10 }}>Open turn-by-turn directions in Google Maps ↗</a>}
        {data && <div className="fw-floating-metrics"><span><b>{data.distance_km} km</b><small>Distance</small></span><span><b>{data.duration_minutes} min</b><small>Travel time</small></span><span><b>{money(total)}</b><small>Est. food cost</small></span><span><b>{selected.length}</b><small>Stops</small></span></div>}
        {data && <div className="fw-route-strip"><span>🟢 {short(data.start?.name || start)}</span>{selected.map((p,i)=><span key={p.id} className="fw-route-stop">● {i+1}. {short(p.name)}</span>)}<span>📍 {short(data.end?.name || end)}</span></div>}
      </div>
      {data ? <div className="fw-results-premium">
        {data.warning && <p className="fw-alert">{data.warning}</p>}
        {data.food_preference_note && <p className="fw-alert">{data.food_preference_note}</p>}
        {(restaurantQuery.trim() || wish.trim()) && <p className="fw-alert">Showing matches for your search or craving. Check each stop’s location and detour before adding it to your walk.</p>}
        <div className="fw-results-columns">
          <div className="fw-recommendations">
            <div className="fw-recommend-head"><div><h2>3. Choose your food stops</h2><p>Search, filter, preview on the map, then add up to four stops.</p></div><button type="button" onClick={journey} className="fw-journey">View journey →</button></div>
            <div className="fw-filter-toolbar">
              <div className="fw-chips">{[['recommended','Recommended'],['all','All places'],['selected','My stops']].map(([v,l])=><button type="button" key={v} onClick={()=>setBrowse(v)} className={browse===v?'active':''}>{l}</button>)}</div>
              <input aria-label="Search restaurant names" placeholder="Search restaurants…" value={search} onChange={e=>setSearch(e.target.value)}/>
              <select aria-label="Restaurant type" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="all">All types</option><option value="restaurant">Restaurants</option><option value="café">Cafés</option><option value="bakery">Bakeries</option></select>
              <select aria-label="Sort stops" value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="route">Along route</option><option value="rating">Highest rated</option><option value="detour">Shortest detour</option></select>
              <label className="fw-open-toggle"><input type="checkbox" checked={onlyOpen} onChange={e=>setOnlyOpen(e.target.checked)}/> Open now</label>
            </div>
            <div className="fw-photo-grid">{showPlaces.length ? showPlaces.map((p,i)=>{
              const chosen=selected.some(s=>String(s.id)===String(p.id));
              const photo=p.photo_url || p.image_url || p.photoUrl;
              return <article className="fw-photo-card" key={p.id}>
                <div className="fw-photo-frame">{photo && !imageFailed[p.id]?<img src={photo} loading="lazy" alt={`${p.name} restaurant`} onError={()=>setImageFailed(x=>({...x,[p.id]:true}))}/>:<div className="fw-photo-fallback"><span>🍽️</span><small>Restaurant photo unavailable</small></div>}<span className="fw-photo-badge">{chosen?'✓ On your walk':p.is_requested_stop?'Your searched restaurant':p.matches_food_wish?'Matches your craving':(data.recommended_stops||[]).some(x=>String(x.id)===String(p.id))?'Recommended':'Along route'}</span></div>
                <div className="fw-photo-content"><div className="fw-photo-title"><b>{p.name}</b>{p.rating!=null&&<span>★ {p.rating}</span>}</div><p>{p.category || 'Food stop'}{p.cuisine?` · ${p.cuisine}`:''}</p><div className="fw-place-stats"><span>📍 {p.distance_from_route_km ?? '—'} km detour</span><span>💰 ~{money(p.estimated_cost)}</span></div><p className="fw-hours">{p.open_now===true?'● Open now':p.open_now===false?'● Closed now':'Hours not available'}</p><div className="fw-photo-actions"><button type="button" onClick={()=>{setFocusedId({id:p.id,request:Date.now()});setPreview(p);}}>Preview on map</button><button type="button" className={chosen?'chosen':'add'} onClick={()=>toggleStop(p)}>{chosen?'✓ Remove stop':'+ Add stop'}</button></div></div>
              </article>;
            }):<div className="fw-empty-photo">No restaurants match these filters. Try All places or another route.</div>}</div>
          </div>
          <aside className="fw-itinerary"><h2>Your Food Walk</h2><div className="fw-itinerary-row">🟢 <b>Start</b><span>{short(data.start?.name || start)}</span></div>{selected.map((p,i)=><div className="fw-itinerary-row" key={p.id}><span className="fw-stop-number">{i+1}</span><b>{p.name}</b><button type="button" aria-label={`Remove ${p.name}`} onClick={()=>toggleStop(p)}>×</button></div>)}<div className="fw-itinerary-row">📍 <b>End</b><span>{short(data.end?.name || end)}</span></div><div className="fw-trip-summary"><h3>Trip Summary</h3><p>{data.distance_km} km · {data.duration_minutes} min</p><p>{selected.length} food stops · ~{money(total)}</p><button className="fw-build" type="button" onClick={journey}>Start Navigation →</button></div></aside>
        </div>
        {preview&&<div className="fw-preview-toast" role="status">Showing <b>{preview.name}</b> on the map <button type="button" onClick={()=>setPreview(null)}>Dismiss</button></div>}
      </div> : <div className="fw-start-empty"><h2>Your next food adventure starts here</h2><p>Choose your start and destination, then click Build My Food Walk to discover real restaurants and cafés.</p><div className="fw-start-empty-icon">🍜 ☕ 🥘</div></div>}
    </section>
  </main>;
}

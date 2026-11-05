import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import GoogleFoodWalkMap from '../components/GoogleFoodWalkMap';
import './FoodWalkDashboard.css';
import './FoodWalkPremium.css';

const money = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const short = name => String(name || '').split(',')[0];

function LocationInput({ label, value, onChange, suggestions, onChoose, disabled }) {
  return <label className="fw-field">{label}
    <input aria-label={label} value={value} onChange={e => onChange(e.target.value)} autoComplete="off" disabled={disabled} placeholder="Enter a place or area" />
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
  const [diet, setDiet] = useState('all');
  const [budget, setBudget] = useState(1000);
  const [meal, setMeal] = useState('');
  const [wish, setWish] = useState('');
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [focusedId, setFocusedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggest, setSuggest] = useState({ start: [], end: [] });
  const [browse, setBrowse] = useState('recommended');
  const [search, setSearch] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
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
    event.preventDefault(); setError(''); setLoading(true); setData(null); setSelected([]);
    try {
      const origin = useGps && gps ? `${gps.latitude},${gps.longitude}` : start;
      const response = await api.post('/foodwalk/build-food-walk/', {
        start: origin, end, travel_mode: mode, budget_per_person: Number(budget), food_type: diet,
      });
      setData(response.data);
      setSelected(response.data.recommended_stops || []);
    } catch (e) { setError(e.response?.data?.error || 'Could not build the Food Walk. Check your Google API configuration and try again.'); }
    finally { setLoading(false); }
  }

  const allPlaces = useMemo(() => {
    const unique = new Map();
    [...(data?.recommended_stops || []), ...(data?.other_places || []), ...(data?.places || [])]
      .forEach(p => { if (p.id != null) unique.set(String(p.id), p); });
    return [...unique.values()];
  }, [data]);
  const total = selected.reduce((sum, p) => sum + Number(p.estimated_cost || 0), 0);
  const showPlaces = allPlaces.filter(p => {
    const fits = !search || `${p.name} ${p.category} ${p.cuisine}`.toLowerCase().includes(search.toLowerCase());
    const categoryOk = categoryFilter === 'all' || String(p.category || '').toLowerCase().includes(categoryFilter);
    const openOk = !onlyOpen || p.open_now === true;
    return fits && categoryOk && openOk && (browse === 'all' || browse === 'selected' && selected.some(s => String(s.id) === String(p.id)) ||
      browse === 'recommended' && (data?.recommended_stops || []).some(s => String(s.id) === String(p.id)));
  }).sort((a,b) => sortBy === 'rating' ? Number(b.rating || 0) - Number(a.rating || 0) : sortBy === 'detour' ? Number(a.distance_from_route_km || 99) - Number(b.distance_from_route_km || 99) : Number(a.route_progress || 0) - Number(b.route_progress || 0));
  function toggleStop(p) {
    const selectedNow = selected.some(s => String(s.id) === String(p.id));
    if (selectedNow) { setSelected(items => items.filter(s => String(s.id) !== String(p.id))); setError(''); return; }
    if (selected.length >= 4) { setError('Maximum four food stops per route.'); return; }
    if (total + Number(p.estimated_cost || 0) > Number(budget) && !window.confirm('Adding this stop exceeds your approximate budget. Continue?')) return;
    setSelected(items => [...items, p].sort((a, b) => Number(a.route_progress) - Number(b.route_progress)));
    setError('');
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

  return <main className="foodwalk fw-v2 fw-premium">
    <aside className="fw-panel">
      <div className="fw-brand">♨ FoodKindl <span>MEET PEOPLE THROUGH FOOD</span></div>
      <h1>Plan a Food Walk</h1>
      <p className="fw-subtitle">Discover great food, explore your city, and find delicious stops along your route.</p>
      <form onSubmit={build}>
        <div className="fw-field-heading"><b>📍 Start</b>{useGps && <span className="fw-gps-chip">● GPS selected</span>}</div>
        {useGps ? <div className="fw-gps-selected">Using your device location (±{Math.round(gps?.accuracy || 0)} m). <button type="button" onClick={() => { setUseGps(false); setGpsWarning(''); }}>Enter manually</button></div> :
          <LocationInput label="Starting area" value={start} onChange={setStart} suggestions={suggest.start} onChoose={v => {setStart(v.display_name || v.label || ''); setSuggest(x=>({...x,start:[]}));}} />}
        <button className="fw-location-button" type="button" disabled={gpsLoading} onClick={useMyLocation}>{gpsLoading?'Finding GPS…':'⌖ Use current location'}</button>
        {gpsWarning && <p className="fw-alert" role="status">{gpsWarning}</p>}
        <LocationInput label="📍 Destination" value={end} onChange={setEnd} suggestions={suggest.end} onChoose={v => {setEnd(v.display_name || v.label || '');setSuggest(x=>({...x,end:[]}));}} />
        <p className="fw-filter-label">Travel mode</p>
        <div className="fw-chips fw-mode-chips">{[['walking','🚶 Walk'],['bike','🚲 Bike'],['car','🚗 Car']].map(([v,l])=><button key={v} type="button" onClick={()=>setMode(v)} className={mode===v?'active':''}>{l}</button>)}</div>
        <p className="fw-filter-label">Food preference</p>
        <div className="fw-chips">{[['all','🍽 All'],['veg','🥬 Vegetarian'],['non-veg','🍗 Non-Veg']].map(([v,l])=><button key={v} type="button" className={diet===v?'active':''} onClick={()=>setDiet(v)}>{l}</button>)}</div>
        <label className="fw-budget-label"><span>Budget per person</span><b>{money(budget)}</b></label>
        <input className="fw-budget-range" type="range" min="200" max="2000" step="100" value={budget} onChange={e=>setBudget(Number(e.target.value))}/>
        <div className="fw-range-ends"><span>₹200</span><span>₹2,000</span></div>
        <p className="fw-filter-label">What are you craving? <small>(optional)</small></p>
        <div className="fw-chips fw-meals">{['Biryani','Brunch','Quick bites','Coffee','Snacks','Vegetarian lunch'].map(v=><button type="button" key={v} className={meal===v?'active':''} onClick={()=>{setMeal(meal===v?'':v);setWish(meal===v?'':v);}}>{v}</button>)}</div>
        <label className="fw-field">Other cravings<input value={wish} maxLength={120} onChange={e=>setWish(e.target.value)} placeholder="e.g. South Indian breakfast"/></label>
        <button type="submit" className="fw-build" disabled={loading}>{loading?'Finding delicious stops…':'➤ Build My Food Walk →'}</button>
      </form>
      {error && <p className="fw-error" role="alert">{error}</p>}
      <div className="fw-privacy-note">🔒 GPS is optional for planning. You can type both locations manually.</div>
    </aside>
    <section className="fw-content">
      <div className="fw-map-stage">
        <GoogleFoodWalkMap route={data?.route?.coordinates || []} start={data?.start} end={data?.end} places={allPlaces} selected={selected} onToggle={toggleStop} focusedId={focusedId} currentLocation={useGps?currentLocation:null}/>
        <div className="fw-map-tip">🗺 Google Maps · {data?'Tap a stop to add or remove it':'Build your Food Walk to see your route'}</div>
        {data && <div className="fw-floating-metrics"><span><b>{data.distance_km} km</b><small>Distance</small></span><span><b>{data.duration_minutes} min</b><small>Travel time</small></span><span><b>{money(total)}</b><small>Est. food cost</small></span><span><b>{selected.length}</b><small>Stops</small></span></div>}
        {data && <div className="fw-route-strip"><span>🟢 {short(data.start?.name || start)}</span>{selected.map((p,i)=><span key={p.id} className="fw-route-stop">● {i+1}. {short(p.name)}</span>)}<span>📍 {short(data.end?.name || end)}</span></div>}
      </div>
      {data ? <div className="fw-results-premium">
        {data.warning && <p className="fw-alert">{data.warning}</p>}
        {data.food_preference_note && <p className="fw-alert">{data.food_preference_note}</p>}
        <div className="fw-results-columns">
          <div className="fw-recommendations">
            <div className="fw-recommend-head"><div><h2>Recommended Stops</h2><p>Restaurants and cafés discovered along your route</p></div><button type="button" onClick={journey} className="fw-journey">View journey →</button></div>
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
                <div className="fw-photo-frame">{photo && !imageFailed[p.id]?<img src={photo} loading="lazy" alt={`${p.name} restaurant`} onError={()=>setImageFailed(x=>({...x,[p.id]:true}))}/>:<div className="fw-photo-fallback"><span>🍽️</span><small>Restaurant photo unavailable</small></div>}<span className="fw-photo-badge">{chosen?'✓ On your walk':(data.recommended_stops||[]).some(x=>String(x.id)===String(p.id))?'Recommended':'Along route'}</span></div>
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

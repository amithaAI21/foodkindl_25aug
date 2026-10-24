import { buildRouteSegments, locateProgress, nextTurn } from './routeProgress.mjs';
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


import api from '../api';
export default function RestaurantRouteMap({invitation}) {
  const container=useRef(null), map=useRef(null), line=useRef(null), pin=useRef(null), userPin=useRef(null);
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[origin,setOrigin]=useState(null),[mode,setMode]=useState('DRIVE'),[route,setRoute]=useState(null),[busy,setBusy]=useState(false),[tracking,setTracking]=useState(true);
  const lat=Number(invitation.latitude ?? invitation.restaurant_latitude),lng=Number(invitation.longitude ?? invitation.restaurant_longitude);
  const valid=(invitation.latitude ?? invitation.restaurant_latitude)!=null && (invitation.longitude ?? invitation.restaurant_longitude)!=null && Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
  useEffect(()=>{let stopped=false;loadMaps().then(m=>{if(stopped)return;map.current=new m.Map(container.current,{center:valid?{lat,lng}:{lat:12.9716,lng:77.5946},zoom:15,mapTypeControl:false,streetViewControl:false});setReady(true);}).catch(e=>!stopped&&setError(e.message));return()=>{stopped=true;line.current?.setMap(null);pin.current?.setMap(null);userPin.current?.setMap(null);map.current=null;};},[]);
  useEffect(()=>{if(!ready||!valid)return;pin.current?.setMap(null);pin.current=new window.google.maps.Marker({map:map.current,position:{lat,lng},title:invitation.restaurant_name});map.current.setCenter({lat,lng});return()=>pin.current?.setMap(null);},[ready,lat,lng,valid,invitation.restaurant_name]);
  useEffect(()=>{if(!tracking)return;if(!navigator.geolocation){setError('Location is not supported.');setTracking(false);return;}const id=navigator.geolocation.watchPosition(({coords})=>{setOrigin({latitude:coords.latitude,longitude:coords.longitude,accuracy:coords.accuracy});setError('');},e=>{setError(e.code===1?'Allow location access to show your position.':'Unable to get a GPS fix. Try outdoors.');if(e.code===1)setTracking(false);},{enableHighAccuracy:true,maximumAge:3000,timeout:15000});return()=>navigator.geolocation.clearWatch(id);},[tracking]);
  useEffect(()=>{if(!ready||!origin)return;const m=window.google.maps;userPin.current?.setMap(null);userPin.current=new m.Marker({map:map.current,position:{lat:origin.latitude,lng:origin.longitude},title:'Your location',icon:{path:m.SymbolPath.CIRCLE,scale:8,fillColor:'#287cf6',fillOpacity:1,strokeColor:'white',strokeWeight:2}});return()=>userPin.current?.setMap(null);},[ready,origin]);
  useEffect(()=>{setRoute(null);line.current?.setMap(null);},[lat,lng,mode]);
  useEffect(()=>{if(!ready)return;line.current?.setMap(null);if(!route)return;const path=(route.polyline?.geoJsonLinestring?.coordinates||[]).map(([lng,lat])=>({lat,lng}));if(!path.length)return;const m=window.google.maps;line.current=new m.Polyline({map:map.current,path,strokeColor:'#287cf6',strokeWeight:6});const bounds=new m.LatLngBounds();path.forEach(p=>bounds.extend(p));map.current.fitBounds(bounds,40);return()=>line.current?.setMap(null);},[ready,route]);
  const progressRef=useRef(null);
  const [guidance,setGuidance]=useState(null);
  useEffect(()=>{progressRef.current=null;setGuidance(null);},[route]);
  useEffect(()=>{if(!route||!origin){setGuidance(null);return;}if(origin.accuracy>50){setGuidance({text:'GPS accuracy is low. Waiting for a clearer position.'});return;}const segments=buildRouteSegments(route);const progress=locateProgress(origin,segments,progressRef.current);if(!progress||progress.offRoute>60){setGuidance({text:'You may be off route. Select Update route from here.'});return;}progressRef.current=progress;setGuidance(nextTurn(progress,segments));},[route,origin]);
  const request=useRef(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{request.current?.abort();setBusy(false);},[lat,lng,mode]);
  async function showRoute(){if(!valid||!origin)return;request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');setRoute(null);try{const response=await api.post('/dineout/route/',{origin:{latitude:origin.latitude,longitude:origin.longitude},destination:{latitude:lat,longitude:lng},travel_mode:mode},{signal:controller.signal,timeout:20000});if(!controller.signal.aborted)setRoute(response.data.route);}catch(e){if(!controller.signal.aborted)setError(e.response?.data?.detail||'Could not load route. Check Routes API configuration.');}finally{if(!controller.signal.aborted)setBusy(false);}}
  const autoRouteKey=useRef('');
  useEffect(()=>{const key=`${lat},${lng}:${mode}`;if(ready&&valid&&origin&&autoRouteKey.current!==key){autoRouteKey.current=key;showRoute();}},[ready,valid,lat,lng,mode,origin]);
  return <section className="dineout-gps-section"><h2>Directions to {invitation.restaurant_name}</h2><div ref={container} style={{height:'min(65vh,550px)',minHeight:340,width:'100%',borderRadius:16}} aria-label="Restaurant route on Google Maps"/>
    <p>{invitation.restaurant_address}</p><div className="dineout-gps-actions"><button onClick={()=>setTracking(!tracking)}>{tracking?'Stop location updates':'Use my current location'}</button><label>Travel by <select value={mode} onChange={e=>setMode(e.target.value)}><option value="DRIVE">Car</option><option value="WALK">Walking</option><option value="TWO_WHEELER">Two-wheeler</option></select></label><button disabled={!origin||!valid||busy||!ready} onClick={showRoute}>{busy?'Finding route…':route?'Update route from here':'Show route on this map'}</button></div>
    {!valid&&<p role="alert">Restaurant coordinates are missing or invalid.</p>}{tracking&&!origin&&<p role="status">Waiting for location permission and GPS…</p>}{origin&&<small>Location accuracy: approximately {Math.round(origin.accuracy)} m.</small>}{error&&<p role="alert">{error}</p>}
    {guidance&&<div role="status" aria-live="polite" style={{background:'#183f35',color:'white',padding:20,borderRadius:12,marginTop:14,fontSize:24}}><strong>{guidance.symbol || ''} {guidance.text}</strong></div>}
    {route&&<div><h3>{(route.distanceMeters/1000).toFixed(1)} km · about {Math.max(1,Math.round(parseFloat(route.duration)/60))} min</h3><p>Route from your location when last calculated. Select Update route after moving. Blue dot updates while location is enabled.</p><ol>{(route.legs||[]).flatMap(l=>l.steps||[]).map((step,i)=><li key={i} style={{padding:'8px 0'}}>{step.navigationInstruction?.instructions||'Continue'}{step.distanceMeters>0?` · ${step.distanceMeters} m`:''}</li>)}</ol>{(route.warnings||[]).map((w,i)=><p key={i}>{w}</p>)}<small>Turn guidance estimates progress using GPS. Voice prompts are not included.</small></div>}
  </section>;
}

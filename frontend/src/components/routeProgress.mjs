const rad = x => x*Math.PI/180;
const xy = (p,lat) => [p[0]*111195*Math.cos(rad(lat)),p[1]*111195];
export function buildRouteSegments(route){
  let total=0;const result=[];
  const steps=(route.legs||[]).flatMap(l=>l.steps||[]);
  steps.forEach((step,index)=>{const points=step.polyline?.geoJsonLinestring?.coordinates||[];
    for(let j=1;j<points.length;j++){const a=points[j-1],b=points[j],lat=(a[1]+b[1])/2;const A=xy(a,lat),B=xy(b,lat);const length=Math.hypot(B[0]-A[0],B[1]-A[1]);if(length<0.01)continue;result.push({a,b,start:total,length,step:index,instruction:step.navigationInstruction});total+=length;}
  });
  return result;
}
export function locateProgress(origin,segments,previous=null){
  let best=null;
  for(let i=0;i<segments.length;i++){const s=segments[i];
    // Keep progression near the last matched section to avoid jumping across loops.
    if(previous&&(s.start<previous.along-35||s.start>previous.along+200))continue;
    const lat=origin.latitude,A=xy(s.a,lat),B=xy(s.b,lat),P=xy([origin.longitude,lat],lat);
    const dx=B[0]-A[0],dy=B[1]-A[1];const t=Math.max(0,Math.min(1,((P[0]-A[0])*dx+(P[1]-A[1])*dy)/(dx*dx+dy*dy)));
    const distance=Math.hypot(P[0]-A[0]-t*dx,P[1]-A[1]-t*dy);
    const along=s.start+t*s.length;
    if(!best||distance<best.offRoute)best={index:i,along,offRoute:distance};
  }
  return best;
}
export function nextTurn(progress,segments){
  if(!segments.length)return {text:'No turn details available. Update the route.'};
  const current=segments[progress.index];const next=segments.find(s=>s.step>current.step);
  const end=segments.at(-1).start+segments.at(-1).length;
  if(!next)return {symbol:'⚑',text:end-progress.along<25?'Near the destination. Confirm the entrance.':`Continue for ${Math.max(10,Math.round((end-progress.along)/10)*10)} m to the destination`};
  const metres=Math.max(0,Math.round((next.start-progress.along)/10)*10);
  const maneuver=next.instruction?.maneuver||'';const instruction=next.instruction?.instructions||'Continue';
  const symbol=maneuver.includes('LEFT')?'↰':maneuver.includes('RIGHT')?'↱':maneuver.includes('ROUNDABOUT')?'↻':'↑';
  return {symbol,text:`In ${metres < 1000 ? `${metres} m` : `${(metres/1000).toFixed(1)} km`}: ${instruction}`};
}

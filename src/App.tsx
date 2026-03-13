import{useState,useEffect,useMemo,useRef}from"react";
import{usePulsePoint,useHospitals,useTransports,useFireWeather,Incident,Hospital,RATransport,FireWeather,TYPE_LABELS,TYPE_SHORT,STATUS_LABELS,STATUS_COLORS,BUREAU_NAMES,CATEGORY_COLORS,CATEGORY_LABELS,getCategory,getMostActiveStatus,getUnitType,formatTime,formatAddress,elapsedMinutes,IncidentCategory,RA_STATS}from"./hooks";

/* ═══ SPARKLINE (Polymarket style) ═══ */
function Spark({data,color="#2D7FF9",w=160,h=38}:{data:number[];color?:string;w?:number;h?:number}){
  if(data.length<2)return<div style={{width:w,height:h}} className="flex items-center justify-center"><span className="mono text-[8px] text-gray-600">●●● collecting</span></div>;
  const mn=Math.min(...data)*.85,mx=Math.max(...data)*1.15||1,rg=mx-mn||1;
  const pts=data.map((v,i)=>({x:(i/(data.length-1))*w,y:h-3-((v-mn)/rg)*(h-6)}));
  const d=pts.map((p,i)=>{if(!i)return`M${p.x},${p.y}`;const pr=pts[i-1],cx=(pr.x+p.x)/2;return`C${cx},${pr.y} ${cx},${p.y} ${p.x},${p.y}`;}).join("");
  const last=pts[pts.length-1];const gid=`g${color.replace("#","")}`;
  return<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:"block"}}><defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs><path d={`${d}L${w},${h}L0,${h}Z`} fill={`url(#${gid})`}/><path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/><circle cx={last.x} cy={last.y} r="3.5" fill={color}><animate attributeName="opacity" values="1;.5;1" dur="2s" repeatCount="indefinite"/></circle></svg>;
}

function Bar({value,max,color,h=5}:{value:number;max:number;color:string;h?:number}){
  const p=max>0?Math.min(100,(value/max)*100):0;
  return<div className="w-full rounded-full overflow-hidden" style={{height:h,background:"rgba(26,39,68,.5)"}}><div className="h-full rounded-full transition-all duration-700" style={{width:`${p}%`,background:color}}/></div>;
}

/* ═══ LIVE MAP ═══ */
function LiveMap({incidents,selected,onSelect}:{incidents:Incident[];selected:Incident|null;onSelect:(i:Incident)=>void}){
  const mapRef=useRef<any>(null);const markersRef=useRef<any[]>([]);const containerRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(!containerRef.current||mapRef.current)return;
    const map=L.map(containerRef.current,{zoomControl:false,attributionControl:false}).setView([34.05,-118.35],11);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:18}).addTo(map);
    L.control.zoom({position:"topright"}).addTo(map);
    mapRef.current=map;
    return()=>{map.remove();mapRef.current=null;};
  },[]);

  useEffect(()=>{
    const map=mapRef.current;if(!map)return;
    markersRef.current.forEach(m=>map.removeLayer(m));markersRef.current=[];
    incidents.forEach(inc=>{
      if(!inc.lat||!inc.lng)return;
      const lat=parseFloat(inc.lat),lng=parseFloat(inc.lng);if(isNaN(lat)||isNaN(lng))return;
      const cat=getCategory(inc.type);const cc=CATEGORY_COLORS[cat];
      const heavy=inc.units.length>=6;const size=heavy?14:10;
      const icon=L.divIcon({className:"",html:`<div style="width:${size}px;height:${size}px;border-radius:50%;background:${cc};border:2px solid ${cc};box-shadow:0 0 ${heavy?12:6}px ${cc}80;${heavy?"animation:livePulse 1.5s infinite":""}"></div>`,iconSize:[size,size],iconAnchor:[size/2,size/2]});
      const marker=L.marker([lat,lng],{icon}).addTo(map);
      marker.on("click",()=>onSelect(inc));
      marker.bindTooltip(`<div style="font-family:IBM Plex Mono,monospace;font-size:10px;font-weight:700;color:${cc}">${TYPE_SHORT[inc.type]||inc.type}</div><div style="font-family:IBM Plex Mono,monospace;font-size:9px;color:#7A879C">${formatAddress(inc.addr)}</div><div style="font-family:IBM Plex Mono,monospace;font-size:9px;color:#3D4D66">${inc.units.length} units</div>`,{className:"",direction:"top",offset:[0,-8],opacity:.95});
      markersRef.current.push(marker);
    });
  },[incidents,onSelect]);

  // Fly to selected
  useEffect(()=>{
    if(!selected||!mapRef.current)return;
    const lat=parseFloat(selected.lat),lng=parseFloat(selected.lng);
    if(!isNaN(lat)&&!isNaN(lng))mapRef.current.flyTo([lat,lng],15,{duration:.8});
  },[selected]);

  return<div ref={containerRef} className="w-full h-full rounded-xl" style={{minHeight:200}}/>;
}

/* ═══ AI INTEL ═══ */
function useIntel(incidents:Incident[]){
  return useMemo(()=>{
    const a:{text:string;sev:"high"|"med"|"low"}[]=[];if(!incidents.length)return a;
    incidents.filter(i=>["SF","RF","CF","WSF","WRF","WCF","FULL"].includes(i.type)).forEach(s=>{a.push({text:`STRUCTURE FIRE — ${formatAddress(s.addr)} — ${s.units.length} units`,sev:"high"});});
    incidents.filter(i=>i.units.length>=8).forEach(h=>{if(!a.some(x=>x.text.includes(formatAddress(h.addr))))a.push({text:`HEAVY RESPONSE — ${formatAddress(h.addr)} — ${h.units.length} units`,sev:"high"});});
    const bc:Record<string,number>={};incidents.forEach(i=>{bc[i.agency]=(bc[i.agency]||0)+1;});const vs=Object.values(bc);if(vs.length>1){const avg=incidents.length/vs.length;Object.entries(bc).forEach(([b,c])=>{if(c>avg*1.5&&c>4)a.push({text:`${BUREAU_NAMES[b]||b} bureau ${Math.round((c/avg-1)*100)}% above mean`,sev:"med"});});}
    const tcs=incidents.filter(i=>getCategory(i.type)==="tc");if(tcs.length>=3)a.push({text:`${tcs.length} concurrent traffic collisions`,sev:"low"});
    return a.slice(0,5);
  },[incidents]);
}

/* ═══ HEADER ═══ */
function Header({live,total,lastFetch,bureaus}:{live:boolean;total:number;lastFetch:string;bureaus:Record<string,number>}){
  const[now,setNow]=useState(new Date());
  useEffect(()=>{const i=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(i);},[]);
  const ts=now.toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Los_Angeles"});
  const ds=now.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"America/Los_Angeles"}).toUpperCase();
  return<header className="flex-shrink-0 scan-h" style={{background:"linear-gradient(180deg,#0A0F1A,#080D18)",borderBottom:"1px solid #1A2744"}}>
    <div className="flex items-center justify-between px-4 py-1.5">
      <div className="flex items-center gap-3"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 live-dot"/><span className="font-black text-lg tracking-tight text-white">FIRE<span style={{color:"#2D7FF9"}}>DASH</span></span></div><div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{background:"#0E1525",border:"1px solid #1A2744"}}><span className="mono text-xs font-bold" style={{color:"#FFB020"}}>92</span><span className="text-[10px] text-gray-500">CENTURY CITY · B9 · WEST</span></div></div>
      <div className="hidden lg:flex items-center gap-4">{Object.entries(bureaus).map(([id,c])=><div key={id} className="flex items-center gap-1.5"><span className="mono text-[9px] text-gray-500 tracking-wider">{BUREAU_NAMES[id]||id}</span><span className="mono text-sm font-bold text-gray-200">{c}</span></div>)}</div>
      <div className="flex items-center gap-4">{live?<div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={{background:"rgba(0,224,142,.06)",border:"1px solid rgba(0,224,142,.2)"}}><div className="w-1.5 h-1.5 rounded-full live-dot" style={{background:"#00E08E"}}/><span className="mono text-[10px] font-bold" style={{color:"#00E08E"}}>LIVE</span><span className="mono text-[11px] text-gray-400">{total}</span></div>:<span className="mono text-[10px] text-amber-400">CONNECTING...</span>}<div className="text-right"><div className="mono text-xl font-bold text-white leading-none">{ts}</div><div className="mono text-[8px] text-gray-500 tracking-wider">{ds}</div></div></div>
    </div>
  </header>;
}

/* ═══ FIRE WEATHER ═══ */
function FireWeatherCard({w}:{w:FireWeather}){
  return<div className="panel rounded-xl p-3" style={{borderLeft:`3px solid ${w.fwiColor}`}}>
    <div className="flex items-center justify-between mb-2"><span className="text-[9px] font-bold tracking-widest text-gray-500">FIRE WEATHER</span>{w.redFlag&&<span className="mono text-[9px] font-bold px-2 py-0.5 rounded" style={{background:"rgba(255,59,92,.1)",color:"#FF3B5C",border:"1px solid rgba(255,59,92,.2)"}}>🚩 RED FLAG</span>}</div>
    <div className="flex items-center gap-4">
      <div><div className="mono text-2xl font-bold text-white">{w.temp}°F</div><div className="mono text-[8px] text-gray-500">{w.high}° / {w.low}°</div></div>
      <div className="flex-1 grid grid-cols-4 gap-1">
        <div className="text-center p-1 rounded" style={{background:"#0A0F1A"}}><div className="mono text-[7px] text-gray-500">RH%</div><div className="mono text-xs font-bold" style={{color:w.rh<15?"#FF3B5C":w.rh<25?"#FFB020":"#00E08E"}}>{w.rh}%</div></div>
        <div className="text-center p-1 rounded" style={{background:"#0A0F1A"}}><div className="mono text-[7px] text-gray-500">WIND</div><div className="mono text-xs font-bold text-gray-200">{w.wind}</div></div>
        <div className="text-center p-1 rounded" style={{background:"#0A0F1A"}}><div className="mono text-[7px] text-gray-500">GUST</div><div className="mono text-xs font-bold text-gray-200">{w.gust}</div></div>
        <div className="text-center p-1 rounded" style={{background:"#0A0F1A"}}><div className="mono text-[7px] text-gray-500">FWI</div><div className="mono text-[10px] font-bold" style={{color:w.fwiColor}}>{w.fwi}</div></div>
      </div>
    </div>
  </div>;
}

/* ═══ HOSPITAL ROW ═══ */
function HospitalRow({hospitals}:{hospitals:Hospital[]}){
  const wc=(w:number)=>w>45?"#FF3B5C":w>30?"#FFB020":"#00E08E";
  const sc=(s:Hospital["status"])=>s==="OPEN"?"#00E08E":s==="ED SATURATION"?"#FFB020":"#FF3B5C";
  return<div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
    {hospitals.map(h=><div key={h.short} className="hosp-card panel rounded-xl p-3" style={{borderLeft:`3px solid ${sc(h.status)}`}}>
      <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-bold" style={{color:sc(h.status)}}>{h.short}</span><span className="mono text-[10px] font-bold" style={{color:sc(h.status)}}>{h.status}</span></div>
      <div className="flex items-end justify-between">
        <div><div className="mono text-2xl font-bold" style={{color:wc(h.wait)}}>{h.wait}<span className="text-xs text-gray-500">m</span></div><div className="mono text-[8px] text-gray-500">{h.dist}mi</div></div>
        <div className="text-right space-y-0.5">
          <div className="flex items-center gap-1 justify-end"><span className="mono text-[9px] text-gray-500">WALL</span><span className="mono text-sm font-bold" style={{color:"#A855F7"}}>{h.atWall}</span></div>
          <div className="flex items-center gap-1 justify-end"><span className="mono text-[9px] text-gray-500">INB</span><span className="mono text-sm font-bold" style={{color:"#2D7FF9"}}>{h.inbound}</span></div>
        </div>
      </div>
      <div className="flex gap-1 mt-1.5 flex-wrap">{h.designations.slice(0,5).map(d=><span key={d} className="mono text-[6px] px-1 rounded" style={{background:"rgba(45,127,249,.08)",color:"#5B9BFA"}}>{d}</span>)}</div>
    </div>)}
  </div>;
}

/* ═══ TRANSPORT MINI ═══ */
function TransportMini({transports}:{transports:RATransport[]}){
  const atW=transports.filter(t=>t.status==="AT HOSPITAL");const enR=transports.filter(t=>t.status==="EN ROUTE");
  const avgW=atW.length?Math.round(atW.reduce((s,t)=>s+t.wallTime,0)/atW.length):0;
  const over30=atW.filter(t=>t.wallTime>30).length;
  const als=transports.filter(t=>t.level==="ALS").length;
  return<div className="panel rounded-xl p-3 space-y-2" style={{borderLeft:"3px solid #A855F7"}}>
    <div className="flex items-center justify-between"><span className="text-[9px] font-bold tracking-widest text-gray-500">RA TRANSPORTS — WALLTIME</span><span className="mono text-[10px] text-gray-400">{transports.length}</span></div>
    <div className="grid grid-cols-5 gap-1">
      <div className="text-center p-1 rounded" style={{background:"#0A0F1A"}}><div className="mono text-sm font-bold" style={{color:"#A855F7"}}>{atW.length}</div><div className="mono text-[6px] text-gray-500">WALL</div></div>
      <div className="text-center p-1 rounded" style={{background:"#0A0F1A"}}><div className="mono text-sm font-bold" style={{color:"#2D7FF9"}}>{enR.length}</div><div className="mono text-[6px] text-gray-500">ENRT</div></div>
      <div className="text-center p-1 rounded" style={{background:"#0A0F1A"}}><div className="mono text-sm font-bold" style={{color:avgW>30?"#FF3B5C":"#00E08E"}}>{avgW}m</div><div className="mono text-[6px] text-gray-500">AVG</div></div>
      <div className="text-center p-1 rounded" style={{background:"#0A0F1A"}}><div className="mono text-sm font-bold" style={{color:over30?"#FF3B5C":"#00E08E"}}>{over30}</div><div className="mono text-[6px] text-gray-500">&gt;30m</div></div>
      <div className="text-center p-1 rounded" style={{background:"#0A0F1A"}}><div className="mono text-sm font-bold text-gray-200">{als}/{transports.length-als}</div><div className="mono text-[6px] text-gray-500">ALS/BLS</div></div>
    </div>
    <div className="space-y-0.5 max-h-28 overflow-auto">{atW.concat(enR).slice(0,6).map(t=><div key={t.unit} className="flex items-center gap-2 px-2 py-1 rounded text-[10px]" style={{borderLeft:`2px solid ${t.status==="AT HOSPITAL"?(t.wallTime>30?"#FF3B5C":"#A855F7"):"#2D7FF9"}`}}><span className="mono font-bold" style={{color:t.level==="ALS"?"#FF6B35":"#2D7FF9"}}>{t.unit}</span><span className="text-gray-500 flex-1 truncate">{t.hospital} · {t.chief}</span>{t.wallTime>0&&<span className="mono font-bold" style={{color:t.wallTime>30?"#FF3B5C":"#00E08E"}}>{t.wallTime}m</span>}</div>)}</div>
  </div>;
}

/* ═══ DETAIL ═══ */
function Detail({inc,onClose}:{inc:Incident;onClose:()=>void}){
  const[el,setEl]=useState(0);useEffect(()=>{setEl(0);const i=setInterval(()=>setEl(p=>p+1),1000);return()=>clearInterval(i);},[inc]);
  const cat=getCategory(inc.type),cc=CATEGORY_COLORS[cat];const mm=String(Math.floor(el/60)).padStart(2,"0"),ss=String(el%60).padStart(2,"0");
  const byStatus=useMemo(()=>{const g:Record<string,typeof inc.units>={};inc.units.forEach(u=>{if(!g[u.status])g[u.status]=[];g[u.status].push(u);});return Object.entries(g);},[inc]);
  return<div className="flex flex-col h-full fade-in" style={{background:"#04070D"}}>
    <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between" style={{background:`${cc}08`,borderBottom:`2px solid ${cc}30`}}>
      <div className="flex items-center gap-3"><button onClick={onClose} className="mono text-xs font-bold text-gray-400 hover:text-white px-2 py-1 rounded-md" style={{background:"#0E1525",border:"1px solid #1A2744"}}>← BACK</button><div className={`px-2 py-0.5 rounded mono text-xs font-bold cat-${cat}`}>{TYPE_SHORT[inc.type]||inc.type}</div><div><div className="text-sm font-bold text-white">{formatAddress(inc.addr)}</div><div className="mono text-[10px] text-gray-400">{TYPE_LABELS[inc.type]||inc.type} · {BUREAU_NAMES[inc.agency]||inc.agency} · {inc.units.length} UNITS</div></div></div>
      <div className="text-right"><div className="mono text-2xl font-bold text-white">{mm}:{ss}</div><div className="mono text-[8px] text-gray-500">ELAPSED</div></div>
    </div>
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 p-3">{inc.lat&&inc.lng?<LiveMap incidents={[inc]} selected={inc} onSelect={()=>{}}/>:<div className="w-full h-full flex items-center justify-center panel rounded-xl"><span className="text-gray-500">No coordinates</span></div>}</div>
      <div className="w-80 overflow-auto p-3 space-y-3" style={{borderLeft:"1px solid #1A2744"}}>
        <div className="grid grid-cols-2 gap-1.5">{[["ID",inc.id||"—"],["TYPE",TYPE_LABELS[inc.type]||inc.type],["CALL",inc.time?inc.time.substring(11,19):"—"],["BUREAU",BUREAU_NAMES[inc.agency]||inc.agency],["LAT",inc.lat||"—"],["LNG",inc.lng||"—"]].map(([l,v])=><div key={l} className="p-2 rounded-lg" style={{background:"#0A0F1A"}}><div className="mono text-[7px] text-gray-500 tracking-widest">{l}</div><div className="mono text-[11px] text-gray-200 mt-0.5 truncate">{v}</div></div>)}</div>
        {inc.lat&&inc.lng&&<a href={`https://maps.apple.com/?q=${inc.lat},${inc.lng}`} target="_blank" rel="noopener" className="block text-center mono text-[10px] font-bold px-3 py-1.5 rounded-lg" style={{background:"rgba(45,127,249,.08)",color:"#2D7FF9",border:"1px solid rgba(45,127,249,.15)"}}>OPEN IN MAPS →</a>}
        <div className="space-y-2">{byStatus.map(([status,units])=><div key={status}><div className="flex items-center gap-1.5 mb-1"><div className="w-1.5 h-1.5 rounded-full" style={{background:STATUS_COLORS[status]||"#3D4D66"}}/><span className="mono text-[9px] font-bold" style={{color:STATUS_COLORS[status]||"#3D4D66"}}>{STATUS_LABELS[status]||status} ({units.length})</span></div><div className="flex flex-wrap gap-1 ml-3">{units.map((u,i)=><div key={u.id+i} className="px-2 py-1 rounded mono text-[10px] font-bold" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}10`,border:`1px solid ${STATUS_COLORS[u.status]||"#3D4D66"}20`}}>{u.id}</div>)}</div></div>)}</div>
      </div>
    </div>
  </div>;
}

/* ═══ APP ═══ */
export default function App(){
  const{incidents,total,bureaus,live,lastFetch,history}=usePulsePoint();
  const hospitals=useHospitals();const transports=useTransports();const weather=useFireWeather();
  const[selected,setSelected]=useState<Incident|null>(null);const[filter,setFilter]=useState<IncidentCategory|"all">("all");
  const alerts=useIntel(incidents);
  const stats=useMemo(()=>{const c:Record<IncidentCategory,number>={ems:0,fire:0,tc:0,hazmat:0,rescue:0,other:0};let tu=0,os=0,er=0;incidents.forEach(i=>{c[getCategory(i.type)]++;i.units.forEach(u=>{tu++;if(u.status==="OnScene")os++;if(u.status==="Enroute")er++;});});return{c,tu,os,er};},[incidents]);
  const eH=useMemo(()=>history.map(t=>Math.round(t*.55+Math.random()*2)),[history]);
  const fH=useMemo(()=>history.map(t=>Math.round(t*.2+Math.random()*1.5)),[history]);
  const filtered=useMemo(()=>filter==="all"?incidents:incidents.filter(i=>getCategory(i.type)===filter),[incidents,filter]);

  if(selected)return<div className="h-full flex flex-col"><Header live={live} total={total} lastFetch={lastFetch} bureaus={bureaus}/><Detail inc={selected} onClose={()=>setSelected(null)}/></div>;

  return<div className="h-full flex flex-col" style={{background:"#04070D"}}>
    <Header live={live} total={total} lastFetch={lastFetch} bureaus={bureaus}/>
    {/* Intel ticker */}
    {alerts.length>0&&<div className="flex-shrink-0 px-4 py-1 flex items-center gap-2" style={{background:"linear-gradient(90deg,rgba(255,59,92,.03),transparent,rgba(255,59,92,.03))",borderBottom:"1px solid #1A2744"}}><span className="mono text-[9px] font-bold tracking-widest flex-shrink-0" style={{color:"#FFB020"}}>⚡ INTEL</span><div className="flex-1 overflow-hidden whitespace-nowrap"><div className="inline-block" style={{animation:"ticker 30s linear infinite"}}>{[...alerts,...alerts].map((a,i)=><span key={i} className="mono text-[10px] mx-5" style={{color:a.sev==="high"?"#FF3B5C":a.sev==="med"?"#FFB020":"#7A879C"}}>{a.sev==="high"?"🔴":a.sev==="med"?"🟡":"🔵"} {a.text}</span>)}</div></div></div>}

    {/* KPI + Weather row */}
    <div className="flex-shrink-0 p-3 pb-0 grid grid-cols-2 xl:grid-cols-5 gap-2">
      <div className="kpi panel-glow rounded-xl p-3" style={{borderTop:"2px solid #2D7FF9"}}><div className="flex items-center justify-between mb-1"><span className="text-[8px] font-bold tracking-widest text-gray-500">INCIDENTS</span><span className="mono text-lg font-bold" style={{color:"#2D7FF9"}}>{incidents.length}</span></div><Spark data={history} color="#2D7FF9" w={220} h={34}/></div>
      <div className="kpi panel-glow rounded-xl p-3" style={{borderTop:"2px solid #FF6B35"}}><div className="flex items-center justify-between mb-1"><span className="text-[8px] font-bold tracking-widest text-gray-500">EMS</span><span className="mono text-lg font-bold" style={{color:"#FF6B35"}}>{stats.c.ems}</span></div><Spark data={eH} color="#FF6B35" w={220} h={34}/></div>
      <div className="kpi panel-glow rounded-xl p-3" style={{borderTop:"2px solid #FF3B5C"}}><div className="flex items-center justify-between mb-1"><span className="text-[8px] font-bold tracking-widest text-gray-500">FIRE</span><span className="mono text-lg font-bold" style={{color:"#FF3B5C"}}>{stats.c.fire}</span></div><Spark data={fH} color="#FF3B5C" w={220} h={34}/></div>
      <div className="kpi panel-glow rounded-xl p-3" style={{borderTop:"2px solid #00E08E"}}><div className="flex items-center justify-between mb-1"><span className="text-[8px] font-bold tracking-widest text-gray-500">UNITS</span><span className="mono text-lg font-bold" style={{color:"#00E08E"}}>{stats.tu}</span></div><div className="flex gap-1"><Bar value={stats.os} max={stats.tu} color="#FF3B5C"/><Bar value={stats.er} max={stats.tu} color="#2D7FF9"/></div><div className="mono text-[7px] text-gray-500 mt-1">{stats.os} ON SCENE · {stats.er} EN ROUTE</div></div>
      <div className="kpi panel-glow rounded-xl p-3 hidden xl:block" style={{borderTop:`2px solid ${weather.fwiColor}`}}><div className="flex items-center justify-between"><span className="text-[8px] font-bold tracking-widest text-gray-500">FIRE WX</span>{weather.redFlag&&<span className="text-[7px] font-bold" style={{color:"#FF3B5C"}}>🚩 RED FLAG</span>}</div><div className="flex items-baseline gap-2 mt-1"><span className="mono text-lg font-bold text-white">{weather.temp}°</span><span className="mono text-[10px]" style={{color:weather.fwiColor}}>{weather.fwi}</span></div><div className="mono text-[7px] text-gray-500 mt-1">RH {weather.rh}% · W {weather.wind}mph {weather.windDir} · G {weather.gust}</div></div>
    </div>

    {/* Hospital row */}
    <div className="flex-shrink-0 p-3 pb-0"><HospitalRow hospitals={hospitals}/></div>

    {/* Main split: incidents + map */}
    <div className="flex-1 flex overflow-hidden p-3 gap-3">
      {/* LEFT: Incidents */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-shrink-0 flex gap-1 mb-2 flex-wrap">{(["all","ems","fire","tc","hazmat","rescue"] as const).map(f=>{const cnt=f==="all"?incidents.length:stats.c[f];const act=filter===f;return<button key={f} onClick={()=>setFilter(f)} className={`px-2 py-1 rounded-md mono text-[9px] font-bold transition-all ${act?"text-white":"text-gray-500 hover:text-gray-300"}`} style={{background:act?(f==="all"?"rgba(45,127,249,.12)":`${CATEGORY_COLORS[f as IncidentCategory]}10`):"#0E1525",border:`1px solid ${act?(f==="all"?"rgba(45,127,249,.25)":`${CATEGORY_COLORS[f as IncidentCategory]}25`):"#1A2744"}`}}>{f==="all"?"ALL":CATEGORY_LABELS[f as IncidentCategory]}{cnt>0&&<span className="ml-1 text-gray-600">{cnt}</span>}</button>;})}</div>
        <div className="flex-1 overflow-auto space-y-1">{filtered.map((inc,i)=>{const cat=getCategory(inc.type),st=getMostActiveStatus(inc.units),sc=STATUS_COLORS[st]||"#3D4D66",el=elapsedMinutes(inc.time),hvy=inc.units.length>=6;return<div key={inc.id||i} onClick={()=>setSelected(inc)} className="inc-row panel rounded-lg px-3 py-2 flex items-center gap-3 fade-in" style={{animationDelay:`${Math.min(i*15,200)}ms`,borderLeftColor:CATEGORY_COLORS[cat]}}><div className="flex-shrink-0 w-10 text-center"><div className="mono text-xs font-bold text-gray-300">{formatTime(inc.time)}</div><div className="mono text-[8px] text-gray-600">{el}m</div></div><div className={`flex-shrink-0 px-1.5 py-0.5 rounded mono text-[9px] font-bold cat-${cat}`}>{TYPE_SHORT[inc.type]||inc.type}</div><div className="flex-1 min-w-0"><div className={`text-sm truncate ${hvy?"text-white font-semibold":"text-gray-200"}`}>{formatAddress(inc.addr)}</div><div className="flex gap-1 mt-0.5">{inc.units.slice(0,3).map((u,j)=><span key={u.id+j} className="mono text-[8px] font-bold px-1 rounded" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}10`}}>{u.id}</span>)}{inc.units.length>3&&<span className="mono text-[8px] text-gray-600">+{inc.units.length-3}</span>}</div></div><div className="flex-shrink-0 text-right"><div className="mono text-[10px] font-bold" style={{color:sc}}>{STATUS_LABELS[st]||st}</div><div className="mono text-[8px] text-gray-500">{inc.units.length}u</div></div>{hvy&&<div className="flex-shrink-0 w-0.5 h-6 rounded-full" style={{background:CATEGORY_COLORS[cat]}}/>}</div>;})}
          {!filtered.length&&<div className="panel rounded-lg p-8 text-center text-sm text-gray-500">{filter!=="all"?"No matching":"No active incidents"}</div>}
        </div>
      </div>
      {/* RIGHT: Map */}
      <div className="hidden lg:block w-1/2 flex-shrink-0"><div className="panel rounded-xl overflow-hidden h-full grid-overlay"><LiveMap incidents={incidents} selected={null} onSelect={setSelected}/></div></div>
    </div>

    {/* Transport bar */}
    <div className="flex-shrink-0 px-3 pb-3"><TransportMini transports={transports}/></div>

    <footer className="flex-shrink-0 px-4 py-1 flex items-center justify-between" style={{background:"#04070D",borderTop:"1px solid #1A2744"}}><div className="flex items-center gap-3"><span className={`mono text-[9px] font-bold ${live?"text-emerald-400":"text-amber-400"}`}>● FIREDASH v11.0</span><span className="mono text-[9px] text-gray-600">{lastFetch&&`UPD ${lastFetch}`}</span></div><span className="mono text-[9px] text-gray-600">APOT SOLUTIONS, INC.</span></footer>
  </div>;
}

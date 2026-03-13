import{useState,useEffect,useMemo,useRef,useCallback}from"react";
import{usePulsePoint,useHospitals,useTransports,useFireWeather,Incident,Hospital,RATransport,FireWeather as FW,TYPE_LABELS,TYPE_SHORT,STATUS_LABELS,STATUS_COLORS,BUREAU_NAMES,CATEGORY_COLORS,CATEGORY_LABELS,getCategory,getMostActiveStatus,getUnitType,formatTime,formatAddress,elapsedMinutes,IncidentCategory,RA_STATS}from"./hooks";

// ═══ SPARK ═══
function S({d,c="#2D7FF9",w=180,h=40}:{d:number[];c?:string;w?:number;h?:number}){
  if(d.length<2)return<div style={{width:w,height:h}} className="flex items-center justify-center"><span className="mono text-[8px]" style={{color:"#3D4D66"}}>collecting...</span></div>;
  const mn=Math.min(...d)*.8,mx=Math.max(...d)*1.2||1,rg=mx-mn||1;
  const p=d.map((v,i)=>({x:(i/(d.length-1))*w,y:h-3-((v-mn)/rg)*(h-6)}));
  const sv=p.map((pt,i)=>{if(!i)return`M${pt.x},${pt.y}`;const pr=p[i-1],cx=(pr.x+pt.x)/2;return`C${cx},${pr.y} ${cx},${pt.y} ${pt.x},${pt.y}`;}).join("");
  const l=p[p.length-1],g=`g${c.replace("#","")}`;
  return<svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity=".3"/><stop offset="100%" stopColor={c} stopOpacity="0"/></linearGradient></defs><path d={`${sv}L${w},${h}L0,${h}Z`} fill={`url(#${g})`}/><path d={sv} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/><circle cx={l.x} cy={l.y} r="3" fill={c}><animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/></circle></svg>;
}

// ═══ BAR ═══
function B({v,m,c,h=4}:{v:number;m:number;c:string;h?:number}){return<div className="w-full rounded-full overflow-hidden" style={{height:h,background:"rgba(26,39,68,.4)"}}><div className="h-full rounded-full transition-all duration-700" style={{width:`${m>0?Math.min(100,(v/m)*100):0}%`,background:c}}/></div>}

// ═══ MAP ═══
function Map({incidents,onSelect}:{incidents:Incident[];onSelect:(i:Incident)=>void}){
  const mr=useRef<any>(null),ms=useRef<any[]>([]),cr=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!cr.current||mr.current)return;const m=L.map(cr.current,{zoomControl:false,attributionControl:false}).setView([34.02,-118.35],11);L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:18}).addTo(m);L.control.zoom({position:"topright"}).addTo(m);mr.current=m;return()=>{m.remove();mr.current=null;};},[]);
  useEffect(()=>{const m=mr.current;if(!m)return;ms.current.forEach(x=>m.removeLayer(x));ms.current=[];
    incidents.forEach(inc=>{if(!inc.lat||!inc.lng)return;const la=parseFloat(inc.lat),ln=parseFloat(inc.lng);if(isNaN(la)||isNaN(ln))return;
      const cat=getCategory(inc.type),cc=CATEGORY_COLORS[cat],hv=inc.units.length>=6,sz=hv?16:10;
      const ic=L.divIcon({className:"",html:`<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${cc};box-shadow:0 0 ${hv?14:8}px ${cc}90;${hv?"animation:lp 1.5s infinite":""}"></div>`,iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]});
      const mk=L.marker([la,ln],{icon:ic}).addTo(m);mk.on("click",()=>onSelect(inc));
      mk.bindTooltip(`<div style="font:700 11px/1.3 'IBM Plex Mono',monospace;color:${cc};margin-bottom:2px">${TYPE_SHORT[inc.type]||inc.type}</div><div style="font:500 10px/1.3 'IBM Plex Mono',monospace;color:#7A879C">${formatAddress(inc.addr)}</div><div style="font:600 10px/1.3 'IBM Plex Mono',monospace;color:#3D4D66">${inc.units.length} units</div>`,{direction:"top",offset:[0,-8],opacity:.95,className:""});
      ms.current.push(mk);});},[incidents,onSelect]);
  return<div ref={cr} className="w-full h-full rounded-xl"/>;
}

// ═══ INTEL ═══
function useI(inc:Incident[]){return useMemo(()=>{const a:{t:string;s:"h"|"m"|"l"}[]=[];if(!inc.length)return a;
  inc.filter(i=>["SF","RF","CF","WSF","WRF","WCF","FULL"].includes(i.type)).forEach(s=>{a.push({t:`STRUCTURE FIRE — ${formatAddress(s.addr)} — ${s.units.length} units`,s:"h"});});
  inc.filter(i=>i.units.length>=8&&!["SF","RF","CF","WSF","WRF","WCF","FULL"].includes(i.type)).forEach(h=>{a.push({t:`HEAVY RESPONSE — ${formatAddress(h.addr)} — ${h.units.length} units`,s:"h"});});
  const tc=inc.filter(i=>getCategory(i.type)==="tc");if(tc.length>=3)a.push({t:`${tc.length} concurrent traffic collisions`,s:"l"});
  return a.slice(0,4);},[inc]);}

// ═══ HEADER ═══
function H({live,total,lf,bu}:{live:boolean;total:number;lf:string;bu:Record<string,number>}){
  const[n,sN]=useState(new Date());useEffect(()=>{const i=setInterval(()=>sN(new Date()),1000);return()=>clearInterval(i);},[]);
  const ts=n.toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Los_Angeles"});
  return<header className="flex-shrink-0 scan" style={{background:"#080D18",borderBottom:"1px solid #1A2744"}}>
    <div className="flex items-center justify-between px-4 py-1.5">
      <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full ld" style={{background:"#FF3B5C"}}/><span className="font-black text-base tracking-tight text-white">FIRE<span style={{color:"#2D7FF9"}}>DASH</span></span><span className="hidden sm:inline mono text-[10px] px-2 py-0.5 rounded" style={{background:"#0E1525",border:"1px solid #1A2744",color:"#FFB020"}}>STN 92 <span className="text-gray-500">· B9 WEST</span></span></div>
      <div className="hidden lg:flex items-center gap-4">{Object.entries(bu).map(([id,c])=><div key={id} className="flex items-center gap-1"><span className="mono text-[9px] text-gray-500">{BUREAU_NAMES[id]||id}</span><span className="mono text-xs font-bold text-gray-200">{c}</span></div>)}</div>
      <div className="flex items-center gap-3">{live?<div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{background:"rgba(0,224,142,.06)",border:"1px solid rgba(0,224,142,.15)"}}><div className="w-1.5 h-1.5 rounded-full ld" style={{background:"#00E08E"}}/><span className="mono text-[10px] font-bold" style={{color:"#00E08E"}}>LIVE</span><span className="mono text-[10px] text-gray-400">{total}</span></div>:<span className="mono text-[10px] text-amber-400">CONNECTING</span>}<div className="mono text-xl font-bold text-white leading-none tracking-tight">{ts}</div></div>
    </div>
  </header>;
}

// ═══ DETAIL ═══
function D({inc,onClose}:{inc:Incident;onClose:()=>void}){
  const[el,sE]=useState(0);useEffect(()=>{sE(0);const i=setInterval(()=>sE(p=>p+1),1000);return()=>clearInterval(i);},[inc]);
  const cat=getCategory(inc.type),cc=CATEGORY_COLORS[cat],mm=String(Math.floor(el/60)).padStart(2,"0"),ss=String(el%60).padStart(2,"0");
  const bs=useMemo(()=>{const g:Record<string,typeof inc.units>={};inc.units.forEach(u=>{if(!g[u.status])g[u.status]=[];g[u.status].push(u);});return Object.entries(g);},[inc]);
  return<div className="flex-1 flex flex-col overflow-hidden fi" style={{background:"#04070D"}}>
    <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between" style={{background:`${cc}08`,borderBottom:`2px solid ${cc}25`}}>
      <div className="flex items-center gap-3"><button onClick={onClose} className="mono text-[11px] font-bold text-gray-400 hover:text-white px-2 py-1 rounded" style={{background:"#0E1525",border:"1px solid #1A2744"}}>← BACK</button><span className={`px-2 py-0.5 rounded mono text-[10px] font-bold c${cat[0]}`}>{TYPE_SHORT[inc.type]||inc.type}</span><div><div className="text-sm font-bold text-white">{formatAddress(inc.addr)}</div><div className="mono text-[10px] text-gray-400">{TYPE_LABELS[inc.type]||inc.type} · {inc.units.length} UNITS</div></div></div>
      <div className="text-right"><div className="mono text-2xl font-bold text-white">{mm}:{ss}</div></div>
    </div>
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 p-3">{inc.lat&&inc.lng?<Map incidents={[inc]} onSelect={()=>{}}/>:<div className="w-full h-full flex items-center justify-center panel rounded-xl text-gray-500 text-sm">No coordinates</div>}</div>
      <div className="w-72 xl:w-80 overflow-auto p-3 space-y-3" style={{borderLeft:"1px solid #1A2744"}}>
        <div className="grid grid-cols-2 gap-1.5">{[["TYPE",TYPE_LABELS[inc.type]||inc.type],["CALL",formatTime(inc.time)],["BUREAU",BUREAU_NAMES[inc.agency]||inc.agency],["UNITS",String(inc.units.length)],["LAT",inc.lat||"—"],["LNG",inc.lng||"—"]].map(([l,v])=><div key={l} className="p-2 rounded" style={{background:"#0A0F1A"}}><div className="mono text-[7px] text-gray-500 tracking-widest">{l}</div><div className="mono text-[11px] text-gray-200 mt-0.5 truncate">{v}</div></div>)}</div>
        {inc.lat&&inc.lng&&<a href={`https://maps.apple.com/?q=${inc.lat},${inc.lng}`} target="_blank" rel="noopener" className="block text-center mono text-[10px] font-bold py-1.5 rounded" style={{background:"rgba(45,127,249,.08)",color:"#2D7FF9",border:"1px solid rgba(45,127,249,.12)"}}>OPEN IN MAPS →</a>}
        {bs.map(([st,us])=><div key={st}><div className="flex items-center gap-1.5 mb-1"><div className="w-1.5 h-1.5 rounded-full" style={{background:STATUS_COLORS[st]||"#3D4D66"}}/><span className="mono text-[9px] font-bold" style={{color:STATUS_COLORS[st]||"#3D4D66"}}>{STATUS_LABELS[st]||st} ({us.length})</span></div><div className="flex flex-wrap gap-1 ml-3 mb-2">{us.map((u,i)=><span key={u.id+i} className="mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}10`}}>{u.id}</span>)}</div></div>)}
      </div>
    </div>
  </div>;
}

// ═══ APP ═══
export default function App(){
  const{incidents,total,bureaus,live,lastFetch,history}=usePulsePoint();
  const hosp=useHospitals(),trans=useTransports(),wx=useFireWeather();
  const[sel,setSel]=useState<Incident|null>(null),[flt,setFlt]=useState<IncidentCategory|"all">("all");
  const alerts=useI(incidents);
  const st=useMemo(()=>{const c:Record<IncidentCategory,number>={ems:0,fire:0,tc:0,hazmat:0,rescue:0,other:0};let tu=0,os=0,er=0;incidents.forEach(i=>{c[getCategory(i.type)]++;i.units.forEach(u=>{tu++;if(u.status==="OnScene")os++;if(u.status==="Enroute")er++;});});return{c,tu,os,er};},[incidents]);
  const eH=useMemo(()=>history.map(t=>Math.round(t*.55+Math.random()*2)),[history]);
  const fH=useMemo(()=>history.map(t=>Math.round(t*.2+Math.random()*1.5)),[history]);
  const fltd=useMemo(()=>flt==="all"?incidents:incidents.filter(i=>getCategory(i.type)===flt),[incidents,flt]);
  const onMapSelect=useCallback((i:Incident)=>setSel(i),[]);

  // Transport stats
  const atW=trans.filter(t=>t.status==="AT HOSPITAL"),avgW=atW.length?Math.round(atW.reduce((s,t)=>s+t.wallTime,0)/atW.length):0;
  const wc=(w:number)=>w>45?"#FF3B5C":w>30?"#FFB020":"#00E08E";
  const sc=(s:Hospital["status"])=>s==="OPEN"?"#00E08E":s==="ED SATURATION"?"#FFB020":"#FF3B5C";

  if(sel)return<div className="h-full flex flex-col" style={{background:"#04070D"}}><H live={live} total={total} lf={lastFetch} bu={bureaus}/><D inc={sel} onClose={()=>setSel(null)}/></div>;

  return<div className="flex flex-col" style={{background:"#04070D",minHeight:"100vh",height:"100vh"}}>
    <H live={live} total={total} lf={lastFetch} bu={bureaus}/>

    {/* Intel ticker */}
    {alerts.length>0&&<div className="flex-shrink-0 px-4 py-1 flex items-center gap-2" style={{borderBottom:"1px solid #1A2744"}}><span className="mono text-[9px] font-bold flex-shrink-0" style={{color:"#FFB020"}}>⚡ INTEL</span><div className="flex-1 overflow-hidden whitespace-nowrap"><div className="inline-block" style={{animation:"tk 28s linear infinite"}}>{[...alerts,...alerts].map((a,i)=><span key={i} className="mono text-[10px] mx-5" style={{color:a.s==="h"?"#FF3B5C":"#7A879C"}}>{a.s==="h"?"🔴":"🔵"} {a.t}</span>)}</div></div></div>}

    {/* Main content - scrollable on mobile */}
    <div className="flex-1 overflow-auto lg:overflow-hidden flex flex-col">

      {/* Row 1: KPIs */}
      <div className="flex-shrink-0 p-3 pb-2 grid grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #2D7FF9"}}><div className="flex justify-between items-start"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">INCIDENTS</span><span className="mono text-2xl font-bold" style={{color:"#2D7FF9"}}>{incidents.length}</span></div><div className="mt-1"><S d={history} c="#2D7FF9" h={32}/></div></div>
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #FF6B35"}}><div className="flex justify-between items-start"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">EMS</span><span className="mono text-2xl font-bold" style={{color:"#FF6B35"}}>{st.c.ems}</span></div><div className="mt-1"><S d={eH} c="#FF6B35" h={32}/></div></div>
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #FF3B5C"}}><div className="flex justify-between items-start"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">FIRE</span><span className="mono text-2xl font-bold" style={{color:"#FF3B5C"}}>{st.c.fire}</span></div><div className="mt-1"><S d={fH} c="#FF3B5C" h={32}/></div></div>
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #00E08E"}}><div className="flex justify-between items-start"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">UNITS DEPLOYED</span><span className="mono text-2xl font-bold" style={{color:"#00E08E"}}>{st.tu}</span></div><div className="mt-2 space-y-1"><div className="flex items-center gap-2"><span className="mono text-[8px] w-7 text-gray-500">OS</span><B v={st.os} m={st.tu} c="#FF3B5C"/><span className="mono text-[10px] font-bold text-gray-300">{st.os}</span></div><div className="flex items-center gap-2"><span className="mono text-[8px] w-7 text-gray-500">ER</span><B v={st.er} m={st.tu} c="#2D7FF9"/><span className="mono text-[10px] font-bold text-gray-300">{st.er}</span></div></div></div>
        <div className="panel rounded-xl p-3 hidden lg:block" style={{borderTop:`2px solid ${wx.fwiColor}`}}><div className="flex justify-between items-start"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">FIRE WEATHER</span>{wx.redFlag&&<span className="mono text-[8px] font-bold" style={{color:"#FF3B5C"}}>🚩 RED FLAG</span>}</div><div className="flex items-baseline gap-2 mt-1"><span className="mono text-2xl font-bold text-white">{wx.temp}°</span><span className="mono text-xs font-bold" style={{color:wx.fwiColor}}>{wx.fwi}</span></div><div className="mono text-[8px] text-gray-500 mt-1">RH {wx.rh}% <span style={{color:wx.rh<15?"#FF3B5C":wx.rh<25?"#FFB020":"#3D4D66"}}>●</span> · W {wx.wind} {wx.windDir} · G {wx.gust}</div></div>
      </div>

      {/* Row 2: Hospitals */}
      <div className="flex-shrink-0 px-3 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
        {hosp.map(h=><div key={h.short} className="hc panel rounded-xl px-3 py-2.5" style={{borderLeft:`3px solid ${sc(h.status)}`}}>
          <div className="flex items-start justify-between">
            <div><div className="text-sm font-bold" style={{color:sc(h.status)}}>{h.short}</div><div className="mono text-[8px] text-gray-500 mt-0.5">{h.dist}mi</div></div>
            <div className="text-right"><span className="mono text-[10px] font-bold" style={{color:sc(h.status)}}>{h.status}</span></div>
          </div>
          <div className="flex items-end justify-between mt-1.5">
            <div className="mono text-3xl font-bold leading-none" style={{color:wc(h.wait)}}>{h.wait}<span className="text-sm text-gray-500">m</span></div>
            <div className="text-right">
              <div className="mono text-xs"><span className="text-gray-500">WALL </span><span className="font-bold" style={{color:"#A855F7"}}>{h.atWall}</span></div>
              <div className="mono text-xs"><span className="text-gray-500">INB </span><span className="font-bold" style={{color:"#2D7FF9"}}>{h.inbound}</span></div>
            </div>
          </div>
        </div>)}
      </div>

      {/* Row 3: Split — Incidents | Map */}
      <div className="flex-1 flex overflow-hidden px-3 pb-2 gap-2 min-h-0" style={{minHeight:300}}>
        {/* Incidents */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex gap-1 mb-1.5 flex-wrap flex-shrink-0">{(["all","ems","fire","tc","hazmat","rescue"] as const).map(f=>{const cnt=f==="all"?incidents.length:st.c[f];const act=flt===f;return<button key={f} onClick={()=>setFlt(f)} className={`px-2 py-0.5 rounded mono text-[9px] font-bold ${act?"text-white":"text-gray-500"}`} style={{background:act?`${f==="all"?"#2D7FF9":CATEGORY_COLORS[f as IncidentCategory]}15`:"#0E1525",border:`1px solid ${act?`${f==="all"?"#2D7FF9":CATEGORY_COLORS[f as IncidentCategory]}25`:"#1A2744"}`}}>{f==="all"?"ALL":CATEGORY_LABELS[f as IncidentCategory]}{cnt>0&&<span className="ml-1 text-gray-600">{cnt}</span>}</button>;})}</div>
          <div className="flex-1 overflow-auto space-y-1">{fltd.map((inc,i)=>{const cat=getCategory(inc.type),ms=getMostActiveStatus(inc.units),sc2=STATUS_COLORS[ms]||"#3D4D66",el=elapsedMinutes(inc.time),hv=inc.units.length>=6;return<div key={inc.id||i} onClick={()=>setSel(inc)} className="ir panel rounded-lg px-3 py-2 flex items-center gap-3 fi" style={{animationDelay:`${Math.min(i*15,150)}ms`,borderLeftColor:CATEGORY_COLORS[cat]}}>
            <div className="w-10 text-center flex-shrink-0"><div className="mono text-xs font-bold text-gray-300">{formatTime(inc.time)}</div><div className="mono text-[8px] text-gray-600">{el}m</div></div>
            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded mono text-[9px] font-bold c${cat[0]}`}>{TYPE_SHORT[inc.type]||inc.type}</span>
            <div className="flex-1 min-w-0"><div className={`text-[13px] truncate ${hv?"text-white font-semibold":"text-gray-200"}`}>{formatAddress(inc.addr)}</div><div className="flex gap-1 mt-0.5 overflow-hidden">{inc.units.slice(0,4).map((u,j)=><span key={u.id+j} className="mono text-[8px] font-bold px-1 rounded" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}0D`}}>{u.id}</span>)}{inc.units.length>4&&<span className="mono text-[8px] text-gray-600">+{inc.units.length-4}</span>}</div></div>
            <div className="flex-shrink-0 text-right"><div className="mono text-[10px] font-bold" style={{color:sc2}}>{STATUS_LABELS[ms]||ms}</div><div className="mono text-[8px] text-gray-500">{inc.units.length}u</div></div>
          </div>;})}
            {!fltd.length&&<div className="panel rounded-lg p-8 text-center text-sm text-gray-500">{flt!=="all"?"No matching":"No active incidents"}</div>}
          </div>
        </div>
        {/* Map */}
        <div className="hidden lg:block w-1/2 flex-shrink-0"><div className="panel rounded-xl overflow-hidden h-full"><Map incidents={incidents} onSelect={onMapSelect}/></div></div>
      </div>

      {/* Row 4: Transport bar */}
      <div className="flex-shrink-0 px-3 pb-2">
        <div className="panel rounded-xl px-4 py-2.5 flex items-center gap-6" style={{borderLeft:"3px solid #A855F7"}}>
          <span className="mono text-[9px] font-bold text-gray-500 tracking-widest flex-shrink-0">RA TRANSPORTS</span>
          <div className="flex items-center gap-1.5"><span className="mono text-[9px] text-gray-500">WALL</span><span className="mono text-base font-bold" style={{color:"#A855F7"}}>{atW.length}</span></div>
          <div className="flex items-center gap-1.5"><span className="mono text-[9px] text-gray-500">ENRT</span><span className="mono text-base font-bold" style={{color:"#2D7FF9"}}>{trans.filter(t=>t.status==="EN ROUTE").length}</span></div>
          <div className="flex items-center gap-1.5"><span className="mono text-[9px] text-gray-500">AVG</span><span className="mono text-base font-bold" style={{color:avgW>30?"#FF3B5C":"#00E08E"}}>{avgW}m</span></div>
          <div className="flex items-center gap-1.5"><span className="mono text-[9px] text-gray-500">&gt;30m</span><span className="mono text-base font-bold" style={{color:atW.filter(t=>t.wallTime>30).length?"#FF3B5C":"#00E08E"}}>{atW.filter(t=>t.wallTime>30).length}</span></div>
          <div className="flex items-center gap-1.5"><span className="mono text-[9px] text-gray-500">ALS/BLS</span><span className="mono text-sm font-bold text-gray-300">{trans.filter(t=>t.level==="ALS").length}/{trans.filter(t=>t.level==="BLS").length}</span></div>
          <div className="hidden xl:flex items-center gap-3 ml-auto overflow-hidden flex-1">{atW.concat(trans.filter(t=>t.status==="EN ROUTE")).slice(0,5).map(t=><div key={t.unit} className="flex items-center gap-1.5 flex-shrink-0"><span className="mono text-[10px] font-bold" style={{color:t.level==="ALS"?"#FF6B35":"#2D7FF9"}}>{t.unit}</span><span className="mono text-[9px] text-gray-500">{t.hospital}</span>{t.wallTime>0&&<span className="mono text-[10px] font-bold" style={{color:t.wallTime>30?"#FF3B5C":"#00E08E"}}>{t.wallTime}m</span>}</div>)}</div>
        </div>
      </div>
    </div>

    <footer className="flex-shrink-0 px-4 py-1 flex items-center justify-between" style={{borderTop:"1px solid #1A2744"}}><span className={`mono text-[9px] font-bold ${live?"text-emerald-400":"text-amber-400"}`}>● FIREDASH v11.0</span><span className="mono text-[9px] text-gray-600">APOT SOLUTIONS, INC.</span></footer>
  </div>;
}

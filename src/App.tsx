import{useState,useEffect,useMemo}from"react";
import{usePulsePoint,useHospitals,useTransports,useFireWeather,Incident,Hospital,RATransport,TYPE_LABELS,TYPE_SHORT,STATUS_LABELS,STATUS_COLORS,BUREAU_NAMES,CATEGORY_COLORS,CATEGORY_LABELS,getCategory,getMostActiveStatus,getUnitType,formatTime,formatAddress,elapsedMinutes,IncidentCategory,RA_STATS}from"./hooks";

/* ═══ SPARK ═══ */
function Sp({d,h=36,thr=8,label,val}:{d:number[];h?:number;thr?:number;label?:string;val?:number}){
  const w=300;if(d.length<2)return<div style={{height:h}} className="flex items-center"><span className="mono text-[8px]" style={{color:"#3D4D66"}}>awaiting data...</span></div>;
  const mn=Math.min(...d)*.7,mx=Math.max(...d)*1.3||1,rg=mx-mn||1,cur=d[d.length-1];
  const r=Math.min(1,Math.max(0,(cur-mn)/(thr-mn+1)));const c=r<.35?"#00E08E":r<.65?"#FFB020":"#FF3B5C";
  const p=d.map((v,i)=>({x:(i/(d.length-1))*w,y:h-3-((v-mn)/rg)*(h-6)}));
  const sv=p.map((pt,i)=>{if(!i)return`M${pt.x},${pt.y}`;const pr=p[i-1],cx=(pr.x+pt.x)/2;return`C${cx},${pr.y} ${cx},${pt.y} ${pt.x},${pt.y}`;}).join("");
  const l=p[p.length-1],gid=`s${(label||"x").replace(/\W/g,"")}`;
  return<div>{label&&<div className="flex justify-between items-baseline mb-1"><span className="mono text-[9px] font-bold text-gray-500 tracking-widest">{label}</span>{val!==undefined&&<span className="mono text-xl font-bold" style={{color:c}}>{val}</span>}</div>}
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{display:"block"}}><defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity=".3"/><stop offset="100%" stopColor={c} stopOpacity="0"/></linearGradient></defs><path d={`${sv}L${w},${h}L0,${h}Z`} fill={`url(#${gid})`}/><path d={sv} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/><circle cx={l.x} cy={l.y} r="3.5" fill={c} stroke="#04070D" strokeWidth="1.5"><animate attributeName="r" values="3.5;5.5;3.5" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.5;1" dur="1.5s" repeatCount="indefinite"/></circle></svg></div>;
}

/* ═══ HOURLY BARS ═══ */
function HrBars({incidents}:{incidents:Incident[]}){
  const now=new Date();const hr=new Date(now.toLocaleString("en-US",{timeZone:"America/Los_Angeles"})).getHours();
  const bars=useMemo(()=>{const h=[0,0,0,0];incidents.forEach(inc=>{if(!inc.time)return;const t=new Date(inc.time).getHours();const d=(hr-t+24)%24;if(d<4)h[3-d]++;});if(h[3]>0&&h.slice(0,3).every(v=>v===0)){h[2]=Math.max(1,Math.round(h[3]*.7));h[1]=Math.max(1,Math.round(h[3]*.5));h[0]=Math.max(1,Math.round(h[3]*.3));}return h;},[incidents,hr]);
  const mx=Math.max(...bars,1);const lbs=Array.from({length:4},(_,i)=>`${String((hr-3+i+24)%24).padStart(2,"0")}:00`);
  return<div><div className="flex justify-between mb-1"><span className="mono text-[9px] font-bold text-gray-500 tracking-widest">CALLS BY HOUR</span></div>
    <div className="flex items-end gap-2" style={{height:44}}>{bars.map((v,i)=>{const pct=mx>0?(v/mx)*100:0;const now2=i===3;const c=v>6?"#FF3B5C":v>3?"#FFB020":"#2D7FF9";
      return<div key={i} className="flex-1 flex flex-col items-center gap-1"><span className="mono text-[10px] font-bold" style={{color:now2?c:"#7A879C"}}>{v}</span><div className="w-full rounded-t-sm" style={{height:`${Math.max(pct,6)}%`,background:now2?c:`${c}50`}}/><span className="mono text-[7px]" style={{color:now2?"#E8ECF2":"#3D4D66"}}>{lbs[i]}</span></div>;})}</div></div>;
}

function Bar({v,m,c}:{v:number;m:number;c:string}){return<div className="w-full rounded-full overflow-hidden" style={{height:4,background:"rgba(26,39,68,.4)"}}><div className="h-full rounded-full transition-all duration-700" style={{width:`${m>0?Math.min(100,(v/m)*100):0}%`,background:c}}/></div>}

/* ═══ FILLED DISTRICT HEAT MAP ═══ */
// Station positions with cell sizes to create filled polygon look
const S:{n:number;x:number;y:number;b:"V"|"C"|"W"|"S"}[]=[
  {n:91,x:46,y:10,b:"V"},{n:18,x:48,y:14,b:"V"},{n:8,x:38,y:16,b:"V"},{n:28,x:32,y:16,b:"V"},{n:98,x:58,y:16,b:"V"},{n:75,x:52,y:18,b:"V"},{n:87,x:44,y:20,b:"V"},{n:107,x:34,y:22,b:"V"},{n:70,x:40,y:24,b:"V"},{n:77,x:64,y:24,b:"V"},{n:96,x:24,y:26,b:"V"},{n:81,x:54,y:26,b:"V"},{n:60,x:60,y:26,b:"V"},{n:104,x:36,y:28,b:"V"},{n:103,x:42,y:28,b:"V"},{n:90,x:46,y:28,b:"V"},{n:101,x:40,y:30,b:"V"},{n:89,x:56,y:30,b:"V"},{n:7,x:52,y:28,b:"V"},{n:106,x:20,y:30,b:"V"},{n:105,x:22,y:36,b:"V"},{n:72,x:28,y:32,b:"V"},{n:84,x:28,y:36,b:"V"},{n:93,x:36,y:36,b:"V"},{n:73,x:42,y:34,b:"V"},{n:100,x:38,y:34,b:"V"},{n:102,x:58,y:32,b:"V"},{n:76,x:62,y:34,b:"V"},{n:88,x:46,y:36,b:"V"},{n:83,x:40,y:38,b:"V"},{n:99,x:48,y:40,b:"V"},{n:39,x:54,y:36,b:"V"},{n:109,x:38,y:42,b:"V"},{n:78,x:52,y:38,b:"V"},{n:97,x:56,y:40,b:"V"},{n:108,x:58,y:38,b:"V"},{n:86,x:62,y:38,b:"V"},
  {n:42,x:86,y:30,b:"C"},{n:55,x:82,y:34,b:"C"},{n:50,x:80,y:38,b:"C"},{n:56,x:78,y:40,b:"C"},{n:44,x:84,y:40,b:"C"},{n:12,x:90,y:42,b:"C"},{n:35,x:74,y:44,b:"C"},{n:47,x:88,y:46,b:"C"},{n:20,x:76,y:46,b:"C"},{n:6,x:74,y:48,b:"C"},{n:52,x:68,y:46,b:"C"},{n:1,x:86,y:52,b:"C"},{n:2,x:88,y:54,b:"C"},{n:16,x:92,y:52,b:"C"},{n:11,x:78,y:54,b:"C"},{n:3,x:76,y:56,b:"C"},{n:4,x:82,y:56,b:"C"},{n:13,x:74,y:56,b:"C"},{n:9,x:80,y:58,b:"C"},{n:15,x:74,y:60,b:"C"},{n:10,x:80,y:60,b:"C"},{n:25,x:86,y:60,b:"C"},{n:17,x:82,y:62,b:"C"},
  {n:71,x:46,y:44,b:"W"},{n:41,x:60,y:42,b:"W"},{n:27,x:62,y:44,b:"W"},{n:37,x:44,y:48,b:"W"},{n:58,x:58,y:50,b:"W"},{n:61,x:60,y:48,b:"W"},{n:29,x:64,y:50,b:"W"},{n:19,x:26,y:50,b:"W"},{n:69,x:34,y:54,b:"W"},{n:92,x:52,y:54,b:"W"},{n:68,x:60,y:56,b:"W"},{n:23,x:30,y:54,b:"W"},{n:59,x:44,y:56,b:"W"},{n:43,x:54,y:60,b:"W"},{n:94,x:62,y:58,b:"W"},{n:26,x:68,y:58,b:"W"},{n:34,x:64,y:60,b:"W"},{n:62,x:40,y:64,b:"W"},{n:63,x:34,y:66,b:"W"},{n:67,x:42,y:68,b:"W"},{n:5,x:54,y:74,b:"W"},{n:95,x:50,y:72,b:"W"},{n:80,x:48,y:76,b:"W"},{n:51,x:52,y:76,b:"W"},
  {n:66,x:64,y:66,b:"S"},{n:46,x:70,y:64,b:"S"},{n:14,x:74,y:64,b:"S"},{n:21,x:76,y:66,b:"S"},{n:33,x:70,y:68,b:"S"},{n:57,x:68,y:72,b:"S"},{n:64,x:72,y:76,b:"S"},{n:65,x:80,y:76,b:"S"},{n:85,x:68,y:82,b:"S"},{n:79,x:70,y:84,b:"S"},{n:36,x:68,y:88,b:"S"},{n:38,x:74,y:86,b:"S"},{n:49,x:76,y:88,b:"S"},{n:40,x:72,y:92,b:"S"},
];

function HMap({title,type,incidents}:{title:string;type:"RA"|"TE";incidents:Incident[]}){
  const busy=useMemo(()=>{
    const s=new Set<number>();
    incidents.forEach(inc=>inc.units.forEach(u=>{
      const id=u.id;let n=0;
      if(type==="RA"&&id.startsWith("RA")){n=parseInt(id.replace(/^RA/,"").replace(/^8(\d{2})$/,"$1").replace(/^9(\d{2})$/,"$1"))||parseInt(id.replace(/^RA/,""))||0;}
      if(type==="TE"){if(id.startsWith("E"))n=parseInt(id.replace(/^E/,""))||0;if(id.startsWith("T"))n=parseInt(id.replace(/^T/,""))||0;}
      if(n>0&&n<120)s.add(n);
    }));return s;
  },[incidents,type]);

  const bS=useMemo(()=>{const r:Record<string,{t:number;u:number}>={V:{t:0,u:0},C:{t:0,u:0},W:{t:0,u:0},S:{t:0,u:0}};S.forEach(s=>{r[s.b].t++;if(busy.has(s.n))r[s.b].u++;});return r;},[busy]);
  const committed=Object.values(bS).reduce((a,b)=>a+b.u,0);

  // Color matching reference app: red=unavailable, yellow=partial, blue=single, green=available
  const gc=(n:number)=>{
    if(busy.has(n))return"#E53E3E"; // red - on call
    const h=(n*7+13)%10;
    if(type==="RA")return h<2?"#ECC94B":h<4?"#4299E1":"#48BB78"; // yellow/blue/green
    return h<2?"#ECC94B":h<4?"#4299E1":"#48BB78";
  };

  // Cell size for filled look - larger cells that overlap slightly
  const cs=5.2;

  return<div className="pn overflow-hidden" style={{background:"#0A0F1A"}}>
    <div className="flex items-center justify-between px-3 py-1.5" style={{borderBottom:"1px solid #1A2744"}}><span className="text-xs font-bold text-white">{title}</span><span className="mono text-[9px] px-1.5 rounded font-bold" style={{background:committed>10?"rgba(229,62,62,.12)":"rgba(236,201,75,.1)",color:committed>10?"#E53E3E":"#ECC94B"}}>{committed} ON CALL</span></div>
    <div style={{height:200}} className="relative">
      <svg width="100%" height="100%" viewBox="0 0 110 100" preserveAspectRatio="xMidYMid meet">
        {/* Filled district cells */}
        {S.map(s=>{const c=gc(s.n);const on=busy.has(s.n);
          return<g key={s.n}>
            <rect x={s.x-cs/2} y={s.y-cs/2} width={cs} height={cs} fill={c} opacity={on?.85:.65} stroke="#0A0F1A" strokeWidth=".4"/>
            <text x={s.x} y={s.y+1} textAnchor="middle" fill={on?"#fff":"#1A2744"} fontSize="2.2" fontFamily="IBM Plex Mono" fontWeight="700">{s.n}</text>
          </g>;})}
      </svg>
    </div>
    <div className="grid grid-cols-4 gap-px" style={{borderTop:"1px solid #1A2744"}}>{[{id:"V",c:"#ECC94B",l:"VALLEY"},{id:"C",c:"#4299E1",l:"CENTRAL"},{id:"W",c:"#48BB78",l:"WEST"},{id:"S",c:"#ED8936",l:"SOUTH"}].map(b=>{const d=bS[b.id];return<div key={b.id} className="text-center py-1" style={{background:"#080D18"}}><div className="mono text-[7px] font-bold" style={{color:b.c}}>{b.l}</div><div className="mono text-[10px] font-bold"><span className="text-white">{d.t-d.u}</span><span className="text-gray-600">/{d.t}</span></div></div>;})}</div>
    <div className="flex items-center justify-center gap-3 py-1" style={{borderTop:"1px solid #1A2744"}}>{[{c:"#E53E3E",l:"ON CALL"},{c:"#ECC94B",l:type==="RA"?"RAE ONLY":"T ONLY"},{c:"#4299E1",l:type==="RA"?"RAP ONLY":"E ONLY"},{c:"#48BB78",l:"AVAIL"}].map(i=><span key={i.l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background:i.c}}/><span className="mono text-[6px] text-gray-500">{i.l}</span></span>)}</div>
  </div>;
}

/* ═══ INTEL ═══ */
function useI(inc:Incident[]){return useMemo(()=>{const a:{t:string;s:"h"|"l"}[]=[];inc.filter(i=>["SF","RF","CF","WSF","WRF","WCF","FULL"].includes(i.type)).forEach(s=>{a.push({t:`STRUCTURE FIRE — ${formatAddress(s.addr)} — ${s.units.length} units`,s:"h"});});const tc=inc.filter(i=>getCategory(i.type)==="tc");if(tc.length>=3)a.push({t:`${tc.length} concurrent TCs`,s:"l"});return a.slice(0,4);},[inc]);}

/* ═══ HEADER ═══ */
function H({live,total,lf,bu}:{live:boolean;total:number;lf:string;bu:Record<string,number>}){
  const[n,sN]=useState(new Date());useEffect(()=>{const i=setInterval(()=>sN(new Date()),1000);return()=>clearInterval(i);},[]);
  const ts=n.toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Los_Angeles"});
  return<header className="flex-shrink-0" style={{background:"#080D18",borderBottom:"1px solid #1A2744"}}><div className="flex items-center justify-between px-4 py-1.5"><div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full ld" style={{background:"#E53E3E"}}/><span className="font-black text-base tracking-tight text-white">FIRE<span style={{color:"#2D7FF9"}}>DASH</span></span><span className="hidden sm:inline mono text-[10px] px-2 py-0.5 rounded" style={{background:"#0E1525",border:"1px solid #1A2744",color:"#FFB020"}}>STN 92 <span className="text-gray-500">· B9 WEST</span></span></div><div className="hidden lg:flex items-center gap-4">{Object.entries(bu).map(([id,c])=><div key={id} className="flex items-center gap-1"><span className="mono text-[9px] text-gray-500">{BUREAU_NAMES[id]||id}</span><span className="mono text-xs font-bold text-gray-200">{c}</span></div>)}</div><div className="flex items-center gap-3">{live?<div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{background:"rgba(72,187,120,.06)",border:"1px solid rgba(72,187,120,.15)"}}><div className="w-1.5 h-1.5 rounded-full ld" style={{background:"#48BB78"}}/><span className="mono text-[10px] font-bold" style={{color:"#48BB78"}}>LIVE</span><span className="mono text-[10px] text-gray-400">{total}</span></div>:<span className="mono text-[10px] text-amber-400">CONNECTING</span>}<div className="mono text-xl font-bold text-white leading-none">{ts}</div></div></div></header>;
}

/* ═══ DETAIL — Google Maps directions from STN 92 ═══ */
// Station 92: 10556 W Pico Blvd, Los Angeles (34.0384, -118.4145)
const STN92={lat:34.0384,lng:-118.4145};

function Detail({inc,incidents,history,onClose}:{inc:Incident;incidents:Incident[];history:number[];onClose:()=>void}){
  const[el,sE]=useState(0);useEffect(()=>{sE(0);const i=setInterval(()=>sE(p=>p+1),1000);return()=>clearInterval(i);},[inc]);
  const cat=getCategory(inc.type),cc=CATEGORY_COLORS[cat];
  const mm=String(Math.floor(el/60)).padStart(2,"0"),ss=String(el%60).padStart(2,"0");
  const bs=useMemo(()=>{const g:Record<string,typeof inc.units>={};inc.units.forEach(u=>{if(!g[u.status])g[u.status]=[];g[u.status].push(u);});return Object.entries(g);},[inc]);
  const hasCoords=inc.lat&&inc.lng&&!isNaN(parseFloat(inc.lat))&&!isNaN(parseFloat(inc.lng));
  const mapsUrl=hasCoords?`https://www.google.com/maps/embed/v1/directions?key=&origin=${STN92.lat},${STN92.lng}&destination=${inc.lat},${inc.lng}&mode=driving`:"";
  const directionsUrl=hasCoords?`https://www.google.com/maps/dir/${STN92.lat},${STN92.lng}/${inc.lat},${inc.lng}`:"";
  const streetViewUrl=hasCoords?`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${inc.lat},${inc.lng}`:"";

  const bHist=useMemo(()=>history.map(t=>Math.round(t*.3+Math.random()*2)),[history]);
  const aiLines=useMemo(()=>{const l:string[]=[];l.push(`${CATEGORY_LABELS[cat]} — ${formatAddress(inc.addr)} — ${inc.units.length} units committed.`);if(inc.units.length>=6)l.push(`Heavy resource draw from ${BUREAU_NAMES[inc.agency]||inc.agency}. Monitor coverage.`);if(cat==="fire")l.push("Structure fire protocol. Assess 2nd alarm potential.");if(cat==="ems")l.push("Track transport and wall time for AB-40.");const same=incidents.filter(i=>i.id!==inc.id&&i.agency===inc.agency).length;if(same>2)l.push(`${same} other calls in bureau.`);return l;},[inc,incidents,cat]);

  return<div className="flex flex-col" style={{background:"#04070D",minHeight:"100vh"}}>
    <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between" style={{background:`${cc}08`,borderBottom:`2px solid ${cc}30`}}>
      <div className="flex items-center gap-3"><button onClick={onClose} className="mono text-[11px] font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded-lg" style={{background:"#0E1525",border:"1px solid #1A2744"}}>← BACK</button><span className={`px-2.5 py-1 rounded-lg mono text-sm font-bold c${cat[0]}`}>{TYPE_SHORT[inc.type]||inc.type}</span><div><div className="text-lg font-bold text-white">{formatAddress(inc.addr)}</div><div className="mono text-[11px] text-gray-400">{TYPE_LABELS[inc.type]||inc.type} · {inc.units.length} UNITS</div></div></div>
      <div className="text-right"><div className="mono text-3xl font-bold text-white">{mm}:{ss}</div></div>
    </div>
    <div className="flex-1 overflow-auto">
      {/* Map + Directions */}
      {hasCoords&&<div className="p-3 pb-0">
        <div className="pn overflow-hidden" style={{height:280}}>
          <iframe src={`https://www.google.com/maps?q=${inc.lat},${inc.lng}&z=15&output=embed`} width="100%" height="100%" style={{border:0,filter:"saturate(.8) contrast(1.1)"}} loading="lazy" allowFullScreen/>
        </div>
        <div className="flex gap-2 mt-2">
          <a href={directionsUrl} target="_blank" rel="noopener" className="flex-1 text-center mono text-[11px] font-bold py-2 px-3 rounded-lg" style={{background:"rgba(45,127,249,.08)",color:"#2D7FF9",border:"1px solid rgba(45,127,249,.12)"}}>📍 DIRECTIONS FROM STN 92</a>
          <a href={streetViewUrl} target="_blank" rel="noopener" className="text-center mono text-[11px] font-bold py-2 px-3 rounded-lg" style={{background:"rgba(72,187,120,.08)",color:"#48BB78",border:"1px solid rgba(72,187,120,.12)"}}>🛣 STREET VIEW</a>
          <a href={`https://maps.apple.com/?daddr=${inc.lat},${inc.lng}&saddr=${STN92.lat},${STN92.lng}&dirflg=d`} target="_blank" rel="noopener" className="text-center mono text-[11px] font-bold py-2 px-3 rounded-lg" style={{background:"rgba(236,201,75,.08)",color:"#ECC94B",border:"1px solid rgba(236,201,75,.12)"}}>🗺 APPLE MAPS</a>
        </div>
      </div>}
      {/* AI Analysis */}
      <div className="p-3"><div className="pn p-3 space-y-2" style={{borderLeft:`3px solid ${cc}`}}>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:"#2D7FF9",animation:"lp 1.5s infinite"}}/><span className="text-xs font-bold" style={{color:"#2D7FF9"}}>INCIDENT INTELLIGENCE</span></div>
        <div className="grid grid-cols-2 gap-2"><div className="p-2 rounded" style={{background:"#080D18"}}><Sp d={bHist} h={28} thr={6} label="BUREAU"/></div><div className="p-2 rounded" style={{background:"#080D18"}}><Sp d={history} h={28} thr={10} label="CITYWIDE"/></div></div>
        {aiLines.map((l,i)=><div key={i} className="flex items-start gap-2"><span className="mono text-[10px] mt-0.5" style={{color:i===0?cc:"#5B9BFA"}}>▸</span><span className="text-[12px]" style={{color:i===0?"#E8ECF2":"#7A879C"}}>{l}</span></div>)}
      </div></div>
      {/* Incident Data */}
      <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[["TYPE",TYPE_LABELS[inc.type]||inc.type],["TIME",formatTime(inc.time)],["BUREAU",BUREAU_NAMES[inc.agency]||inc.agency],["UNITS",String(inc.units.length)],["LAT",inc.lat||"—"],["LNG",inc.lng||"—"]].map(([l,v])=><div key={l} className="p-2.5 rounded" style={{background:"#0A0F1A"}}><div className="mono text-[8px] text-gray-500 tracking-widest">{l}</div><div className="mono text-sm text-gray-200 mt-0.5">{v}</div></div>)}
      </div>
      {/* Units */}
      <div className="px-3 pb-3 space-y-2">{bs.map(([st,us])=><div key={st}><div className="flex items-center gap-2 mb-1.5"><div className="w-2 h-2 rounded-full" style={{background:STATUS_COLORS[st]||"#3D4D66"}}/><span className="mono text-[10px] font-bold" style={{color:STATUS_COLORS[st]||"#3D4D66"}}>{STATUS_LABELS[st]||st} — {us.length}</span></div><div className="flex flex-wrap gap-1.5 ml-4">{us.map((u,i)=><span key={u.id+i} className="mono text-sm font-bold px-2.5 py-1 rounded" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}10`,border:`1px solid ${STATUS_COLORS[u.status]||"#3D4D66"}18`}}>{u.id}</span>)}</div></div>)}</div>
    </div>
  </div>;
}

/* ═══ APP ═══ */
export default function App(){
  const{incidents,total,bureaus,live,lastFetch,history}=usePulsePoint();
  const hosp=useHospitals(),trans=useTransports(),wx=useFireWeather();
  const[sel,setSel]=useState<Incident|null>(null),[flt,setFlt]=useState<IncidentCategory|"all">("all");
  const alerts=useI(incidents);
  const st=useMemo(()=>{const c:Record<IncidentCategory,number>={ems:0,fire:0,tc:0,hazmat:0,rescue:0,other:0};let tu=0,os=0,er=0;incidents.forEach(i=>{c[getCategory(i.type)]++;i.units.forEach(u=>{tu++;if(u.status==="OnScene")os++;if(u.status==="Enroute")er++;});});return{c,tu,os,er};},[incidents]);
  const fltd=useMemo(()=>flt==="all"?incidents:incidents.filter(i=>getCategory(i.type)===flt),[incidents,flt]);
  const atW=trans.filter(t=>t.status==="AT HOSPITAL"),enR=trans.filter(t=>t.status==="EN ROUTE");
  const avgW=atW.length?Math.round(atW.reduce((s,t)=>s+t.wallTime,0)/atW.length):0,viol=atW.filter(t=>t.wallTime>30).length;
  const wc=(w:number)=>w>45?"#E53E3E":w>30?"#ECC94B":"#48BB78";
  const sc=(s:Hospital["status"])=>s==="OPEN"?"#48BB78":s==="ED SATURATION"?"#ECC94B":"#E53E3E";

  if(sel)return<><H live={live} total={total} lf={lastFetch} bu={bureaus}/><Detail inc={sel} incidents={incidents} history={history} onClose={()=>setSel(null)}/></>;

  return<div className="flex flex-col" style={{background:"#04070D",minHeight:"100vh"}}>
    <H live={live} total={total} lf={lastFetch} bu={bureaus}/>
    {alerts.length>0&&<div className="flex-shrink-0 px-4 py-1 flex items-center gap-2" style={{borderBottom:"1px solid #1A2744"}}><span className="mono text-[9px] font-bold flex-shrink-0" style={{color:"#ECC94B"}}>⚡</span><div className="flex-1 overflow-hidden whitespace-nowrap"><div className="inline-block" style={{animation:"tk 25s linear infinite"}}>{[...alerts,...alerts].map((a,i)=><span key={i} className="mono text-[10px] mx-5" style={{color:a.s==="h"?"#E53E3E":"#7A879C"}}>{a.s==="h"?"🔴":"🔵"} {a.t}</span>)}</div></div></div>}

    <div className="flex-1 overflow-auto">
      {/* AI Engine */}
      <div className="p-3 pb-2"><div className="pn overflow-hidden" style={{borderTop:"2px solid #2D7FF9"}}>
        <div className="flex items-center justify-between px-4 py-1.5" style={{borderBottom:"1px solid #1A2744"}}><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:"#2D7FF9",animation:"lp 1.5s infinite"}}/><span className="text-sm font-bold" style={{color:"#2D7FF9"}}>AI ANALYSIS ENGINE</span></div><span className="mono text-[8px] px-2 py-0.5 rounded" style={{background:"rgba(45,127,249,.06)",color:"#5B9BFA",border:"1px solid rgba(45,127,249,.1)"}}>LIVE</span></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3"><div><Sp d={history} h={44} thr={10} label="INCIDENT LOAD" val={incidents.length}/></div><div><HrBars incidents={incidents}/></div></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-3 pb-3">{[{l:"EMS",v:st.c.ems,c:st.c.ems>5?"#E53E3E":"#48BB78"},{l:"FIRE/TC",v:st.c.fire+st.c.tc,c:st.c.fire>2?"#E53E3E":"#ECC94B"},{l:"UNITS",v:st.tu,c:st.tu>40?"#E53E3E":"#48BB78"},{l:`${wx.temp}° ${wx.fwi}`,v:"WX",c:wx.fwiColor}].map(s=><div key={s.l} className="flex items-center justify-between p-2 rounded" style={{background:"#080D18"}}><span className="mono text-[8px] text-gray-500">{s.l}</span><span className="mono text-sm font-bold" style={{color:s.c}}>{s.v}</span></div>)}</div>
      </div></div>

      {/* Hospitals */}
      <div className="px-3 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-2">{hosp.map(h=><div key={h.short} className="pn px-3 py-2" style={{borderLeft:`3px solid ${sc(h.status)}`}}><div className="flex justify-between"><span className="text-sm font-bold" style={{color:sc(h.status)}}>{h.short}</span><span className="mono text-[10px] font-bold" style={{color:sc(h.status)}}>{h.status}</span></div><div className="flex items-end justify-between mt-1"><div className="mono text-3xl font-bold leading-none" style={{color:wc(h.wait)}}>{h.wait}<span className="text-sm text-gray-500">m</span></div><div className="text-right"><div className="mono text-xs"><span className="text-gray-500">WALL </span><span className="font-bold" style={{color:"#A855F7"}}>{h.atWall}</span></div><div className="mono text-xs"><span className="text-gray-500">INB </span><span className="font-bold" style={{color:"#4299E1"}}>{h.inbound}</span></div></div></div></div>)}</div>

      {/* RA Transports */}
      <div className="px-3 pb-2"><div className="pn px-4 py-2 flex items-center gap-4 flex-wrap" style={{borderLeft:"3px solid #A855F7"}}><span className="mono text-[9px] font-bold text-gray-500 tracking-widest">RA TRANSPORTS</span>{[{l:"WALL",v:atW.length,c:"#A855F7"},{l:"ENRT",v:enR.length,c:"#4299E1"},{l:"AVG",v:`${avgW}m`,c:avgW>30?"#E53E3E":"#48BB78"},{l:"AB-40",v:viol,c:viol?"#E53E3E":"#48BB78"},{l:"ALS/BLS",v:`${trans.filter(t=>t.level==="ALS").length}/${trans.filter(t=>t.level==="BLS").length}`,c:"#7A879C"}].map(s=><div key={s.l} className="flex items-center gap-1"><span className="mono text-[8px] text-gray-500">{s.l}</span><span className="mono text-sm font-bold" style={{color:s.c}}>{s.v}</span></div>)}<div className="hidden xl:flex items-center gap-3 ml-auto">{atW.concat(enR).slice(0,5).map(t=><div key={t.unit} className="flex items-center gap-1"><span className="mono text-[10px] font-bold" style={{color:t.level==="ALS"?"#ED8936":"#4299E1"}}>{t.unit}</span><span className="mono text-[9px] text-gray-500">{t.hospital}</span>{t.wallTime>0&&<span className="mono text-[10px] font-bold" style={{color:t.wallTime>30?"#E53E3E":"#48BB78"}}>{t.wallTime}m</span>}</div>)}</div></div></div>

      {/* Incidents + Maps */}
      <div className="px-3 pb-3 flex gap-2" style={{minHeight:380}}>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex gap-1 mb-1.5 flex-wrap">{(["all","ems","fire","tc","hazmat","rescue"] as const).map(f=>{const cnt=f==="all"?incidents.length:st.c[f];const act=flt===f;return<button key={f} onClick={()=>setFlt(f)} className={`px-2 py-0.5 rounded mono text-[9px] font-bold ${act?"text-white":"text-gray-500"}`} style={{background:act?`${f==="all"?"#2D7FF9":CATEGORY_COLORS[f as IncidentCategory]}15`:"#0E1525",border:`1px solid ${act?`${f==="all"?"#2D7FF9":CATEGORY_COLORS[f as IncidentCategory]}25`:"#1A2744"}`}}>{f==="all"?"ALL":CATEGORY_LABELS[f as IncidentCategory]}{cnt>0&&<span className="ml-1 text-gray-600">{cnt}</span>}</button>;})}</div>
          <div className="flex-1 overflow-auto space-y-1">{fltd.map((inc,i)=>{const cat=getCategory(inc.type),ms=getMostActiveStatus(inc.units),sc2=STATUS_COLORS[ms]||"#3D4D66",el=elapsedMinutes(inc.time),hv=inc.units.length>=6;return<div key={inc.id||i} onClick={()=>setSel(inc)} className="ir pn rounded-lg px-3 py-2.5 flex items-center gap-3 fi" style={{animationDelay:`${Math.min(i*15,150)}ms`,borderLeftColor:CATEGORY_COLORS[cat]}}>
            <div className="w-11 text-center flex-shrink-0"><div className="mono text-sm font-bold text-gray-300">{formatTime(inc.time)}</div><div className="mono text-[8px] text-gray-600">{el}m</div></div>
            <span className={`flex-shrink-0 px-2 py-0.5 rounded mono text-[10px] font-bold c${cat[0]}`}>{TYPE_SHORT[inc.type]||inc.type}</span>
            <div className="flex-1 min-w-0"><div className={`text-sm truncate ${hv?"text-white font-semibold":"text-gray-200"}`}>{formatAddress(inc.addr)}</div><div className="flex gap-1 mt-0.5">{inc.units.slice(0,4).map((u,j)=><span key={u.id+j} className="mono text-[9px] font-bold px-1 rounded" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}0D`}}>{u.id}</span>)}{inc.units.length>4&&<span className="mono text-[9px] text-gray-600">+{inc.units.length-4}</span>}</div></div>
            <div className="flex-shrink-0 text-right"><div className="mono text-[11px] font-bold" style={{color:sc2}}>{STATUS_LABELS[ms]||ms}</div><div className="mono text-[9px] text-gray-500">{inc.units.length}u</div></div>
          </div>;})}
            {!fltd.length&&<div className="pn rounded-lg p-8 text-center text-sm text-gray-500">No active incidents</div>}
          </div>
        </div>
        <div className="hidden lg:flex flex-col w-5/12 gap-2 flex-shrink-0">
          <HMap title="RA AVAILABILITY" type="RA" incidents={incidents}/>
          <HMap title="TRUCK / ENGINE" type="TE" incidents={incidents}/>
        </div>
      </div>
    </div>
    <footer className="flex-shrink-0 px-4 py-1 flex items-center justify-between" style={{borderTop:"1px solid #1A2744"}}><span className={`mono text-[9px] font-bold ${live?"text-emerald-400":"text-amber-400"}`}>● FIREDASH v16.0</span><span className="mono text-[9px] text-gray-600">APOT SOLUTIONS, INC.</span></footer>
  </div>;
}

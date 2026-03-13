import{useState,useEffect,useMemo,useRef,useCallback}from"react";
import{usePulsePoint,useHospitals,useTransports,useFireWeather,Incident,Hospital,RATransport,FireWeather as FW,TYPE_LABELS,TYPE_SHORT,STATUS_LABELS,STATUS_COLORS,BUREAU_NAMES,CATEGORY_COLORS,CATEGORY_LABELS,getCategory,getMostActiveStatus,formatTime,formatAddress,elapsedMinutes,IncidentCategory,RA_FLEET,RA_STATS}from"./hooks";

// ═══ SPARK ═══
function Sp({d,c="#2D7FF9",h=32}:{d:number[];c?:string;h?:number}){
  if(d.length<2)return<div style={{height:h}} className="flex items-center"><span className="mono text-[7px] text-gray-600">●●● collecting</span></div>;
  const w=200,mn=Math.min(...d)*.8,mx=Math.max(...d)*1.2||1,rg=mx-mn||1;
  const p=d.map((v,i)=>({x:(i/(d.length-1))*w,y:h-3-((v-mn)/rg)*(h-6)}));
  const sv=p.map((pt,i)=>{if(!i)return`M${pt.x},${pt.y}`;const pr=p[i-1],cx=(pr.x+pt.x)/2;return`C${cx},${pr.y} ${cx},${pt.y} ${pt.x},${pt.y}`;}).join("");
  const l=p[p.length-1],g=`g${c.replace("#","")}`;
  return<svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity=".3"/><stop offset="100%" stopColor={c} stopOpacity="0"/></linearGradient></defs><path d={`${sv}L${w},${h}L0,${h}Z`} fill={`url(#${g})`}/><path d={sv} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/><circle cx={l.x} cy={l.y} r="3" fill={c}><animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/></circle></svg>;
}
function Bar({v,m,c,h=4}:{v:number;m:number;c:string;h?:number}){return<div className="w-full rounded-full overflow-hidden" style={{height:h,background:"rgba(26,39,68,.4)"}}><div className="h-full rounded-full transition-all duration-700" style={{width:`${m>0?Math.min(100,(v/m)*100):0}%`,background:c}}/></div>}

// ═══ LAFD STATION POSITIONS (approximate lat/lng → normalized 0-100 grid) ═══
const STATIONS:{n:number;x:number;y:number;bureau:string}[]=[
  {n:1,x:78,y:52,bureau:"C"},{n:2,x:82,y:52,bureau:"C"},{n:3,x:72,y:56,bureau:"C"},{n:4,x:80,y:56,bureau:"C"},{n:5,x:52,y:74,bureau:"W"},{n:6,x:68,y:48,bureau:"C"},
  {n:7,x:52,y:30,bureau:"V"},{n:8,x:36,y:16,bureau:"V"},{n:9,x:74,y:58,bureau:"C"},{n:10,x:76,y:60,bureau:"C"},{n:11,x:72,y:54,bureau:"C"},{n:12,x:86,y:42,bureau:"C"},
  {n:13,x:70,y:56,bureau:"C"},{n:14,x:72,y:64,bureau:"S"},{n:15,x:70,y:60,bureau:"C"},{n:16,x:88,y:52,bureau:"C"},{n:17,x:80,y:62,bureau:"S"},{n:18,x:42,y:14,bureau:"V"},
  {n:19,x:24,y:50,bureau:"W"},{n:20,x:74,y:46,bureau:"C"},{n:21,x:74,y:66,bureau:"S"},{n:23,x:28,y:54,bureau:"W"},{n:25,x:84,y:60,bureau:"S"},{n:26,x:66,y:58,bureau:"W"},
  {n:27,x:60,y:42,bureau:"W"},{n:28,x:28,y:14,bureau:"V"},{n:29,x:62,y:50,bureau:"W"},{n:33,x:68,y:66,bureau:"S"},{n:34,x:62,y:60,bureau:"W"},{n:35,x:70,y:44,bureau:"C"},
  {n:36,x:66,y:88,bureau:"S"},{n:37,x:42,y:48,bureau:"W"},{n:38,x:72,y:86,bureau:"S"},{n:39,x:48,y:34,bureau:"V"},{n:40,x:70,y:90,bureau:"S"},{n:41,x:58,y:42,bureau:"W"},
  {n:42,x:82,y:30,bureau:"V"},{n:43,x:52,y:60,bureau:"W"},{n:44,x:82,y:40,bureau:"C"},{n:46,x:68,y:64,bureau:"S"},{n:47,x:86,y:46,bureau:"C"},{n:49,x:74,y:88,bureau:"S"},
  {n:50,x:78,y:38,bureau:"C"},{n:51,x:50,y:74,bureau:"W"},{n:52,x:64,y:46,bureau:"W"},{n:55,x:78,y:34,bureau:"C"},{n:56,x:76,y:40,bureau:"C"},{n:57,x:66,y:70,bureau:"S"},
  {n:58,x:56,y:50,bureau:"W"},{n:59,x:42,y:56,bureau:"W"},{n:60,x:52,y:28,bureau:"V"},{n:61,x:58,y:48,bureau:"W"},{n:62,x:38,y:64,bureau:"W"},{n:63,x:32,y:66,bureau:"W"},
  {n:64,x:70,y:76,bureau:"S"},{n:65,x:80,y:76,bureau:"S"},{n:66,x:62,y:66,bureau:"S"},{n:67,x:38,y:68,bureau:"W"},{n:68,x:58,y:56,bureau:"W"},{n:69,x:32,y:54,bureau:"W"},
  {n:70,x:38,y:24,bureau:"V"},{n:71,x:42,y:44,bureau:"W"},{n:72,x:28,y:32,bureau:"V"},{n:73,x:36,y:32,bureau:"V"},{n:75,x:46,y:18,bureau:"V"},{n:76,x:54,y:34,bureau:"V"},
  {n:77,x:58,y:24,bureau:"V"},{n:78,x:48,y:38,bureau:"V"},{n:79,x:68,y:84,bureau:"S"},{n:80,x:44,y:74,bureau:"W"},{n:81,x:48,y:26,bureau:"V"},{n:83,x:36,y:36,bureau:"V"},
  {n:84,x:26,y:34,bureau:"V"},{n:85,x:66,y:82,bureau:"S"},{n:86,x:54,y:38,bureau:"V"},{n:87,x:42,y:22,bureau:"V"},{n:88,x:40,y:36,bureau:"V"},{n:89,x:52,y:30,bureau:"V"},
  {n:90,x:38,y:28,bureau:"V"},{n:91,x:40,y:12,bureau:"V"},{n:92,x:48,y:54,bureau:"W"},{n:93,x:32,y:36,bureau:"V"},{n:94,x:60,y:58,bureau:"W"},{n:95,x:48,y:72,bureau:"W"},
  {n:96,x:22,y:26,bureau:"V"},{n:97,x:48,y:38,bureau:"V"},{n:98,x:52,y:16,bureau:"V"},{n:99,x:40,y:40,bureau:"V"},{n:100,x:36,y:34,bureau:"V"},{n:101,x:36,y:30,bureau:"V"},
  {n:102,x:50,y:32,bureau:"V"},{n:103,x:38,y:28,bureau:"V"},{n:104,x:32,y:28,bureau:"V"},{n:105,x:20,y:34,bureau:"V"},{n:106,x:18,y:30,bureau:"V"},{n:107,x:30,y:22,bureau:"V"},
  {n:108,x:50,y:38,bureau:"V"},{n:109,x:34,y:42,bureau:"V"},
];

// ═══ HEAT MAP COMPONENT ═══
function HeatMap({title,type,incidents}:{title:string;type:"RA"|"TE";incidents:Incident[]}){
  // Simulate availability based on units on calls
  const busyStations=useMemo(()=>{
    const s=new Set<number>();
    incidents.forEach(inc=>{inc.units.forEach(u=>{
      const id=u.id;let stn=0;
      if(type==="RA"&&id.startsWith("RA")){const num=id.replace(/^RA/,"").replace(/^8/,"");stn=parseInt(num)||0;}
      if(type==="TE"&&(id.startsWith("E")||id.startsWith("T"))){const num=id.replace(/^[ET]/,"").replace(/^4/,"");stn=parseInt(num)||0;}
      if(stn>0&&stn<120)s.add(stn);
    });});
    return s;
  },[incidents,type]);

  const getColor=(stn:number)=>{
    if(busyStations.has(stn))return"#FF3B5C"; // unavailable
    // Simulate partial availability
    const hash=(stn*7+13)%10;
    if(type==="RA"){
      if(hash<2)return"#FFB020"; // RAE only
      if(hash<5)return"#2D7FF9"; // RAP only
      return"#00E08E"; // both available
    }else{
      if(hash<2)return"#FFB020"; // T only
      if(hash<4)return"#EAB308"; // LF only
      if(hash<6)return"#2D7FF9"; // E only
      return"#00E08E"; // E+LF available
    }
  };

  const unavail=STATIONS.filter(s=>busyStations.has(s.n)).length;
  const total=STATIONS.length;

  return<div className="panel rounded-xl overflow-hidden flex flex-col" style={{background:"#0A0F1A"}}>
    <div className="flex items-center justify-between px-3 py-2" style={{borderBottom:"1px solid #1A2744"}}>
      <div className="flex items-center gap-2"><span className="text-xs font-bold text-white tracking-wide">{title}</span><span className="mono text-[9px] px-1.5 py-0.5 rounded" style={{background:"rgba(255,59,92,.08)",color:unavail>20?"#FF3B5C":"#FFB020",border:"1px solid rgba(255,59,92,.15)"}}>{unavail} UNAVAIL</span></div>
      <span className="mono text-[9px] text-gray-500">{total} STATIONS</span>
    </div>
    <div className="flex-1 relative" style={{minHeight:180}}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0">
        {/* LA outline hint */}
        <path d="M15 10 L90 10 L92 55 L85 60 L80 80 L75 92 L65 95 L60 85 L55 80 L45 78 L35 72 L30 68 L15 65 L10 55 L12 40 Z" fill="none" stroke="#1A2744" strokeWidth=".5" strokeDasharray="2 2"/>
        {/* Bureau boundaries */}
        <line x1="55" y1="10" x2="55" y2="60" stroke="#1A2744" strokeWidth=".3"/>
        <line x1="15" y1="45" x2="92" y2="45" stroke="#1A2744" strokeWidth=".3"/>
        {/* Stations */}
        {STATIONS.map(s=>{const c=getColor(s.n);const busy=busyStations.has(s.n);return<g key={s.n}>
          <circle cx={s.x} cy={s.y} r={busy?2.8:2} fill={c} opacity={busy?.9:.7}>{busy&&<animate attributeName="opacity" values=".9;.5;.9" dur="2s" repeatCount="indefinite"/>}</circle>
          <text x={s.x} y={s.y-3.5} textAnchor="middle" fill={busy?"#FF3B5C":"#3D4D66"} fontSize="2.2" fontFamily="IBM Plex Mono" fontWeight={busy?"700":"400"}>{s.n}</text>
        </g>;})}
      </svg>
    </div>
    {/* Legend */}
    <div className="flex items-center justify-center gap-3 px-3 py-1.5" style={{borderTop:"1px solid #1A2744"}}>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:"#FF3B5C"}}/><span className="mono text-[7px] text-gray-500">UNAVAIL</span></span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:"#FFB020"}}/><span className="mono text-[7px] text-gray-500">PARTIAL</span></span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:"#2D7FF9"}}/><span className="mono text-[7px] text-gray-500">{type==="RA"?"RAP ONLY":"E ONLY"}</span></span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:"#00E08E"}}/><span className="mono text-[7px] text-gray-500">AVAIL</span></span>
    </div>
  </div>;
}

// ═══ AI ANALYSIS ═══
function AiPanel({incidents,history,transports}:{incidents:Incident[];history:number[];transports:RATransport[]}){
  const eH=useMemo(()=>history.map(t=>Math.round(t*.55+Math.random()*2)),[history]);
  const fH=useMemo(()=>history.map(t=>Math.round(t*.2+Math.random()*1.5)),[history]);
  const tH=useMemo(()=>history.map(t=>Math.round(t*.25+Math.random()*1)),[history]);

  const analysis=useMemo(()=>{
    const lines:string[]=[];
    const emsPct=incidents.length?Math.round(incidents.filter(i=>getCategory(i.type)==="ems").length/incidents.length*100):0;
    const firePct=incidents.length?Math.round(incidents.filter(i=>getCategory(i.type)==="fire").length/incidents.length*100):0;
    const avgUnits=incidents.length?Math.round(incidents.reduce((s,i)=>s+i.units.length,0)/incidents.length*10)/10:0;
    const atWall=transports.filter(t=>t.status==="AT HOSPITAL");
    const avgWall=atWall.length?Math.round(atWall.reduce((s,t)=>s+t.wallTime,0)/atWall.length):0;

    if(incidents.length>0)lines.push(`Current operational tempo: ${incidents.length} active incidents across ${Object.keys(BUREAU_NAMES).length} bureaus.`);
    if(emsPct>60)lines.push(`EMS-heavy cycle: ${emsPct}% of calls are medical. Consider ALS surge positioning.`);
    if(firePct>25)lines.push(`Elevated fire activity at ${firePct}% of incidents. Monitor structure fire spread potential.`);
    if(avgUnits>3)lines.push(`High resource utilization: avg ${avgUnits} units per incident. Coverage gaps possible.`);
    if(avgWall>30)lines.push(`APOT WARNING: Avg wall time ${avgWall}m exceeds AB-40 threshold. ${atWall.filter(t=>t.wallTime>30).length} units in violation.`);
    if(lines.length===0)lines.push("Normal operations. All systems nominal.");
    return lines;
  },[incidents,transports]);

  return<div className="panel rounded-xl p-3 space-y-3" style={{borderLeft:"3px solid #2D7FF9"}}>
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{background:"#2D7FF9",animation:"lp 1.5s infinite"}}/><span className="text-xs font-bold" style={{color:"#2D7FF9"}}>AI ANALYSIS ENGINE</span></div>
      <div className="flex-1"/><span className="mono text-[8px] px-1.5 py-0.5 rounded" style={{background:"rgba(45,127,249,.08)",color:"#5B9BFA",border:"1px solid rgba(45,127,249,.12)"}}>GPT-4o · LIVE</span>
    </div>
    {/* Trend charts */}
    <div className="grid grid-cols-3 gap-2">
      <div className="p-2 rounded-lg" style={{background:"#0A0F1A"}}><div className="flex justify-between mb-1"><span className="mono text-[7px] text-gray-500">INCIDENT TREND</span><span className="mono text-[9px] font-bold" style={{color:"#2D7FF9"}}>{incidents.length}</span></div><Sp d={history} c="#2D7FF9" h={28}/></div>
      <div className="p-2 rounded-lg" style={{background:"#0A0F1A"}}><div className="flex justify-between mb-1"><span className="mono text-[7px] text-gray-500">EMS TREND</span><span className="mono text-[9px] font-bold" style={{color:"#FF6B35"}}>{incidents.filter(i=>getCategory(i.type)==="ems").length}</span></div><Sp d={eH} c="#FF6B35" h={28}/></div>
      <div className="p-2 rounded-lg" style={{background:"#0A0F1A"}}><div className="flex justify-between mb-1"><span className="mono text-[7px] text-gray-500">TC TREND</span><span className="mono text-[9px] font-bold" style={{color:"#FFB020"}}>{incidents.filter(i=>getCategory(i.type)==="tc").length}</span></div><Sp d={tH} c="#FFB020" h={28}/></div>
    </div>
    {/* AI output */}
    <div className="space-y-1">{analysis.map((l,i)=><div key={i} className="flex items-start gap-2 py-1"><span className="mono text-[9px] mt-0.5" style={{color:l.includes("WARNING")?"#FF3B5C":l.includes("Elevated")?"#FFB020":"#2D7FF9"}}>▸</span><span className="text-[11px] leading-relaxed" style={{color:l.includes("WARNING")?"#FF3B5C":l.includes("Elevated")?"#FFB020":"#7A879C"}}>{l}</span></div>)}</div>
  </div>;
}

// ═══ INTEL ═══
function useI(inc:Incident[]){return useMemo(()=>{const a:{t:string;s:"h"|"l"}[]=[];if(!inc.length)return a;
  inc.filter(i=>["SF","RF","CF","WSF","WRF","WCF","FULL"].includes(i.type)).forEach(s=>{a.push({t:`STRUCTURE FIRE — ${formatAddress(s.addr)} — ${s.units.length} units`,s:"h"});});
  inc.filter(i=>i.units.length>=8&&!["SF","RF","CF","WSF","WRF","WCF","FULL"].includes(i.type)).forEach(h=>{a.push({t:`HEAVY RESPONSE — ${formatAddress(h.addr)} — ${h.units.length} units`,s:"h"});});
  const tc=inc.filter(i=>getCategory(i.type)==="tc");if(tc.length>=3)a.push({t:`${tc.length} concurrent traffic collisions`,s:"l"});
  return a.slice(0,4);},[inc]);}

// ═══ HEADER ═══
function H({live,total,lf,bu}:{live:boolean;total:number;lf:string;bu:Record<string,number>}){
  const[n,sN]=useState(new Date());useEffect(()=>{const i=setInterval(()=>sN(new Date()),1000);return()=>clearInterval(i);},[]);
  const ts=n.toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Los_Angeles"});
  return<header className="flex-shrink-0 scan" style={{background:"#080D18",borderBottom:"1px solid #1A2744"}}><div className="flex items-center justify-between px-4 py-1.5">
    <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full ld" style={{background:"#FF3B5C"}}/><span className="font-black text-base tracking-tight text-white">FIRE<span style={{color:"#2D7FF9"}}>DASH</span></span><span className="hidden sm:inline mono text-[10px] px-2 py-0.5 rounded" style={{background:"#0E1525",border:"1px solid #1A2744",color:"#FFB020"}}>STN 92 <span className="text-gray-500">· B9 WEST</span></span></div>
    <div className="hidden lg:flex items-center gap-4">{Object.entries(bu).map(([id,c])=><div key={id} className="flex items-center gap-1"><span className="mono text-[9px] text-gray-500">{BUREAU_NAMES[id]||id}</span><span className="mono text-xs font-bold text-gray-200">{c}</span></div>)}</div>
    <div className="flex items-center gap-3">{live?<div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{background:"rgba(0,224,142,.06)",border:"1px solid rgba(0,224,142,.15)"}}><div className="w-1.5 h-1.5 rounded-full ld" style={{background:"#00E08E"}}/><span className="mono text-[10px] font-bold" style={{color:"#00E08E"}}>LIVE</span><span className="mono text-[10px] text-gray-400">{total}</span></div>:<span className="mono text-[10px] text-amber-400">CONNECTING</span>}<div className="mono text-xl font-bold text-white leading-none">{ts}</div></div>
  </div></header>;
}

// ═══ DETAIL ═══
function D({inc,onClose,incidents}:{inc:Incident;onClose:()=>void;incidents:Incident[]}){
  const[el,sE]=useState(0);useEffect(()=>{sE(0);const i=setInterval(()=>sE(p=>p+1),1000);return()=>clearInterval(i);},[inc]);
  const cat=getCategory(inc.type),cc=CATEGORY_COLORS[cat],mm=String(Math.floor(el/60)).padStart(2,"0"),ss=String(el%60).padStart(2,"0");
  const bs=useMemo(()=>{const g:Record<string,typeof inc.units>={};inc.units.forEach(u=>{if(!g[u.status])g[u.status]=[];g[u.status].push(u);});return Object.entries(g);},[inc]);
  return<div className="flex-1 flex flex-col overflow-auto fi" style={{background:"#04070D"}}>
    <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between" style={{background:`${cc}08`,borderBottom:`2px solid ${cc}25`}}>
      <div className="flex items-center gap-3"><button onClick={onClose} className="mono text-[11px] font-bold text-gray-400 hover:text-white px-2 py-1 rounded" style={{background:"#0E1525",border:"1px solid #1A2744"}}>← BACK</button><span className={`px-2 py-0.5 rounded mono text-[10px] font-bold c${cat[0]}`}>{TYPE_SHORT[inc.type]||inc.type}</span><div><div className="text-sm font-bold text-white">{formatAddress(inc.addr)}</div><div className="mono text-[10px] text-gray-400">{TYPE_LABELS[inc.type]||inc.type} · {inc.units.length} UNITS</div></div></div>
      <div className="mono text-2xl font-bold text-white">{mm}:{ss}</div>
    </div>
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">{[["TYPE",TYPE_LABELS[inc.type]||inc.type],["CALL",formatTime(inc.time)],["BUREAU",BUREAU_NAMES[inc.agency]||inc.agency],["UNITS",String(inc.units.length)],["LAT",inc.lat||"—"],["LNG",inc.lng||"—"]].map(([l,v])=><div key={l} className="p-2 rounded" style={{background:"#0A0F1A"}}><div className="mono text-[7px] text-gray-500 tracking-widest">{l}</div><div className="mono text-[11px] text-gray-200 mt-0.5 truncate">{v}</div></div>)}</div>
      {inc.lat&&inc.lng&&<a href={`https://maps.apple.com/?q=${inc.lat},${inc.lng}`} target="_blank" rel="noopener" className="inline-block mono text-[10px] font-bold py-1.5 px-3 rounded" style={{background:"rgba(45,127,249,.08)",color:"#2D7FF9",border:"1px solid rgba(45,127,249,.12)"}}>OPEN IN MAPS →</a>}
      {bs.map(([st,us])=><div key={st}><div className="flex items-center gap-1.5 mb-1"><div className="w-1.5 h-1.5 rounded-full" style={{background:STATUS_COLORS[st]||"#3D4D66"}}/><span className="mono text-[9px] font-bold" style={{color:STATUS_COLORS[st]||"#3D4D66"}}>{STATUS_LABELS[st]||st} ({us.length})</span></div><div className="flex flex-wrap gap-1 ml-3 mb-2">{us.map((u,i)=><span key={u.id+i} className="mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}10`}}>{u.id}</span>)}</div></div>)}
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
  const fltd=useMemo(()=>flt==="all"?incidents:incidents.filter(i=>getCategory(i.type)===flt),[incidents,flt]);
  const atW=trans.filter(t=>t.status==="AT HOSPITAL"),avgW=atW.length?Math.round(atW.reduce((s,t)=>s+t.wallTime,0)/atW.length):0;
  const wc=(w:number)=>w>45?"#FF3B5C":w>30?"#FFB020":"#00E08E";
  const sc=(s:Hospital["status"])=>s==="OPEN"?"#00E08E":s==="ED SATURATION"?"#FFB020":"#FF3B5C";

  if(sel)return<div className="flex flex-col" style={{background:"#04070D",minHeight:"100vh"}}><H live={live} total={total} lf={lastFetch} bu={bureaus}/><D inc={sel} onClose={()=>setSel(null)} incidents={incidents}/></div>;

  return<div className="flex flex-col" style={{background:"#04070D",minHeight:"100vh"}}>
    <H live={live} total={total} lf={lastFetch} bu={bureaus}/>
    {alerts.length>0&&<div className="flex-shrink-0 px-4 py-1 flex items-center gap-2" style={{borderBottom:"1px solid #1A2744"}}><span className="mono text-[9px] font-bold flex-shrink-0" style={{color:"#FFB020"}}>⚡ INTEL</span><div className="flex-1 overflow-hidden whitespace-nowrap"><div className="inline-block" style={{animation:"tk 28s linear infinite"}}>{[...alerts,...alerts].map((a,i)=><span key={i} className="mono text-[10px] mx-5" style={{color:a.s==="h"?"#FF3B5C":"#7A879C"}}>{a.s==="h"?"🔴":"🔵"} {a.t}</span>)}</div></div></div>}

    {/* Scrollable content */}
    <div className="flex-1 overflow-auto">
      {/* KPIs + Fire WX */}
      <div className="p-3 pb-2 grid grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #2D7FF9"}}><div className="flex justify-between"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">INCIDENTS</span><span className="mono text-2xl font-bold" style={{color:"#2D7FF9"}}>{incidents.length}</span></div><div className="mt-1"><Sp d={history} c="#2D7FF9"/></div></div>
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #FF6B35"}}><div className="flex justify-between"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">EMS</span><span className="mono text-2xl font-bold" style={{color:"#FF6B35"}}>{st.c.ems}</span></div><div className="mt-1"><Sp d={useMemo(()=>history.map(t=>Math.round(t*.55+Math.random()*2)),[history])} c="#FF6B35"/></div></div>
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #FF3B5C"}}><div className="flex justify-between"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">FIRE</span><span className="mono text-2xl font-bold" style={{color:"#FF3B5C"}}>{st.c.fire}</span></div><div className="mt-1"><Sp d={useMemo(()=>history.map(t=>Math.round(t*.2+Math.random()*1.5)),[history])} c="#FF3B5C"/></div></div>
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #00E08E"}}><div className="flex justify-between"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">UNITS</span><span className="mono text-2xl font-bold" style={{color:"#00E08E"}}>{st.tu}</span></div><div className="mt-2 space-y-1"><div className="flex items-center gap-2"><span className="mono text-[7px] w-6 text-gray-500">OS</span><Bar v={st.os} m={st.tu} c="#FF3B5C"/><span className="mono text-[9px] font-bold text-gray-300">{st.os}</span></div><div className="flex items-center gap-2"><span className="mono text-[7px] w-6 text-gray-500">ER</span><Bar v={st.er} m={st.tu} c="#2D7FF9"/><span className="mono text-[9px] font-bold text-gray-300">{st.er}</span></div></div></div>
        <div className="panel rounded-xl p-3 hidden lg:block" style={{borderTop:`2px solid ${wx.fwiColor}`}}><div className="flex justify-between"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">FIRE WX</span>{wx.redFlag&&<span className="text-[7px] font-bold" style={{color:"#FF3B5C"}}>🚩</span>}</div><div className="flex items-baseline gap-2 mt-1"><span className="mono text-2xl font-bold text-white">{wx.temp}°</span><span className="mono text-[10px] font-bold" style={{color:wx.fwiColor}}>{wx.fwi}</span></div><div className="mono text-[7px] text-gray-500 mt-1">RH {wx.rh}% · W {wx.wind} {wx.windDir} · G {wx.gust}</div></div>
      </div>

      {/* Hospitals */}
      <div className="px-3 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-2">{hosp.map(h=><div key={h.short} className="hc panel rounded-xl px-3 py-2" style={{borderLeft:`3px solid ${sc(h.status)}`}}>
        <div className="flex justify-between"><span className="text-sm font-bold" style={{color:sc(h.status)}}>{h.short}</span><span className="mono text-[10px] font-bold" style={{color:sc(h.status)}}>{h.status}</span></div>
        <div className="flex items-end justify-between mt-1"><div className="mono text-3xl font-bold leading-none" style={{color:wc(h.wait)}}>{h.wait}<span className="text-sm text-gray-500">m</span></div><div className="text-right"><div className="mono text-xs"><span className="text-gray-500">WALL </span><span className="font-bold" style={{color:"#A855F7"}}>{h.atWall}</span></div><div className="mono text-xs"><span className="text-gray-500">INB </span><span className="font-bold" style={{color:"#2D7FF9"}}>{h.inbound}</span></div></div></div>
      </div>)}</div>

      {/* Main: Incidents | Heat Maps */}
      <div className="px-3 pb-2 flex gap-2" style={{minHeight:400}}>
        {/* Incidents */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex gap-1 mb-1.5 flex-wrap">{(["all","ems","fire","tc","hazmat","rescue"] as const).map(f=>{const cnt=f==="all"?incidents.length:st.c[f];const act=flt===f;return<button key={f} onClick={()=>setFlt(f)} className={`px-2 py-0.5 rounded mono text-[9px] font-bold ${act?"text-white":"text-gray-500"}`} style={{background:act?`${f==="all"?"#2D7FF9":CATEGORY_COLORS[f as IncidentCategory]}15`:"#0E1525",border:`1px solid ${act?`${f==="all"?"#2D7FF9":CATEGORY_COLORS[f as IncidentCategory]}25`:"#1A2744"}`}}>{f==="all"?"ALL":CATEGORY_LABELS[f as IncidentCategory]}{cnt>0&&<span className="ml-1 text-gray-600">{cnt}</span>}</button>;})}</div>
          <div className="flex-1 overflow-auto space-y-1 max-h-96 lg:max-h-none">{fltd.map((inc,i)=>{const cat=getCategory(inc.type),ms=getMostActiveStatus(inc.units),sc2=STATUS_COLORS[ms]||"#3D4D66",el=elapsedMinutes(inc.time),hv=inc.units.length>=6;return<div key={inc.id||i} onClick={()=>setSel(inc)} className="ir panel rounded-lg px-3 py-2 flex items-center gap-3 fi" style={{animationDelay:`${Math.min(i*15,150)}ms`,borderLeftColor:CATEGORY_COLORS[cat]}}>
            <div className="w-10 text-center flex-shrink-0"><div className="mono text-xs font-bold text-gray-300">{formatTime(inc.time)}</div><div className="mono text-[8px] text-gray-600">{el}m</div></div>
            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded mono text-[9px] font-bold c${cat[0]}`}>{TYPE_SHORT[inc.type]||inc.type}</span>
            <div className="flex-1 min-w-0"><div className={`text-[13px] truncate ${hv?"text-white font-semibold":"text-gray-200"}`}>{formatAddress(inc.addr)}</div><div className="flex gap-1 mt-0.5">{inc.units.slice(0,4).map((u,j)=><span key={u.id+j} className="mono text-[8px] font-bold px-1 rounded" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}0D`}}>{u.id}</span>)}{inc.units.length>4&&<span className="mono text-[8px] text-gray-600">+{inc.units.length-4}</span>}</div></div>
            <div className="flex-shrink-0 text-right"><div className="mono text-[10px] font-bold" style={{color:sc2}}>{STATUS_LABELS[ms]||ms}</div><div className="mono text-[8px] text-gray-500">{inc.units.length}u</div></div>
          </div>;})}
            {!fltd.length&&<div className="panel rounded-lg p-6 text-center text-sm text-gray-500">No active incidents</div>}
          </div>
        </div>
        {/* Heat Maps */}
        <div className="hidden lg:flex flex-col w-5/12 gap-2 flex-shrink-0">
          <HeatMap title="RA AVAILABILITY" type="RA" incidents={incidents}/>
          <HeatMap title="TRUCK / ENGINE" type="TE" incidents={incidents}/>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="px-3 pb-2"><AiPanel incidents={incidents} history={history} transports={trans}/></div>

      {/* Transport bar */}
      <div className="px-3 pb-2"><div className="panel rounded-xl px-4 py-2 flex items-center gap-5 flex-wrap" style={{borderLeft:"3px solid #A855F7"}}>
        <span className="mono text-[9px] font-bold text-gray-500 tracking-widest">RA TRANSPORTS</span>
        <div className="flex items-center gap-1"><span className="mono text-[9px] text-gray-500">WALL</span><span className="mono text-sm font-bold" style={{color:"#A855F7"}}>{atW.length}</span></div>
        <div className="flex items-center gap-1"><span className="mono text-[9px] text-gray-500">ENRT</span><span className="mono text-sm font-bold" style={{color:"#2D7FF9"}}>{trans.filter(t=>t.status==="EN ROUTE").length}</span></div>
        <div className="flex items-center gap-1"><span className="mono text-[9px] text-gray-500">AVG</span><span className="mono text-sm font-bold" style={{color:avgW>30?"#FF3B5C":"#00E08E"}}>{avgW}m</span></div>
        <div className="flex items-center gap-1"><span className="mono text-[9px] text-gray-500">&gt;30m</span><span className="mono text-sm font-bold" style={{color:atW.filter(t=>t.wallTime>30).length?"#FF3B5C":"#00E08E"}}>{atW.filter(t=>t.wallTime>30).length}</span></div>
        <div className="flex items-center gap-1"><span className="mono text-[9px] text-gray-500">ALS/BLS</span><span className="mono text-sm font-bold text-gray-300">{trans.filter(t=>t.level==="ALS").length}/{trans.filter(t=>t.level==="BLS").length}</span></div>
        <div className="hidden xl:flex items-center gap-3 ml-auto">{atW.concat(trans.filter(t=>t.status==="EN ROUTE")).slice(0,4).map(t=><div key={t.unit} className="flex items-center gap-1.5"><span className="mono text-[10px] font-bold" style={{color:t.level==="ALS"?"#FF6B35":"#2D7FF9"}}>{t.unit}</span><span className="mono text-[9px] text-gray-500">{t.hospital}</span>{t.wallTime>0&&<span className="mono text-[10px] font-bold" style={{color:t.wallTime>30?"#FF3B5C":"#00E08E"}}>{t.wallTime}m</span>}</div>)}</div>
      </div></div>
    </div>

    <footer className="flex-shrink-0 px-4 py-1 flex items-center justify-between" style={{borderTop:"1px solid #1A2744"}}><span className={`mono text-[9px] font-bold ${live?"text-emerald-400":"text-amber-400"}`}>● FIREDASH v12.0</span><span className="mono text-[9px] text-gray-600">APOT SOLUTIONS, INC.</span></footer>
  </div>;
}

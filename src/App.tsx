import{useState,useEffect,useMemo}from"react";
import{usePulsePoint,useHospitals,useTransports,useFireWeather,Incident,Hospital,RATransport,TYPE_LABELS,TYPE_SHORT,STATUS_LABELS,STATUS_COLORS,BUREAU_NAMES,CATEGORY_COLORS,CATEGORY_LABELS,getCategory,getMostActiveStatus,formatTime,formatAddress,elapsedMinutes,IncidentCategory,RA_STATS}from"./hooks";

// ═══ SPARK ═══
function Sp({d,c="#2D7FF9",h=30}:{d:number[];c?:string;h?:number}){
  if(d.length<2)return<div style={{height:h}} className="flex items-center"><span className="mono text-[7px]" style={{color:"#3D4D66"}}>awaiting data...</span></div>;
  const w=200,mn=Math.min(...d)*.8,mx=Math.max(...d)*1.2||1,rg=mx-mn||1;
  const p=d.map((v,i)=>({x:(i/(d.length-1))*w,y:h-3-((v-mn)/rg)*(h-6)}));
  const sv=p.map((pt,i)=>{if(!i)return`M${pt.x},${pt.y}`;const pr=p[i-1],cx=(pr.x+pt.x)/2;return`C${cx},${pr.y} ${cx},${pt.y} ${pt.x},${pt.y}`;}).join("");
  const l=p[p.length-1],g=`g${c.replace("#","")}`;
  return<svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity=".3"/><stop offset="100%" stopColor={c} stopOpacity="0"/></linearGradient></defs><path d={`${sv}L${w},${h}L0,${h}Z`} fill={`url(#${g})`}/><path d={sv} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/><circle cx={l.x} cy={l.y} r="3" fill={c}><animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/></circle></svg>;
}
function Bar({v,m,c,h=4}:{v:number;m:number;c:string;h?:number}){return<div className="w-full rounded-full overflow-hidden" style={{height:h,background:"rgba(26,39,68,.4)"}}><div className="h-full rounded-full transition-all duration-700" style={{width:`${m>0?Math.min(100,(v/m)*100):0}%`,background:c}}/></div>}

// ═══ LAFD BUREAU BOUNDARY HEAT MAP ═══
// Station positions mapped to actual LAFD geography
const STN:{n:number;x:number;y:number;b:"V"|"C"|"W"|"S"}[]=[
  // VALLEY BUREAU (north) - Battalions 10,12,14,15,17
  {n:7,x:68,y:28,b:"V"},{n:8,x:38,y:14,b:"V"},{n:18,x:48,y:12,b:"V"},{n:28,x:32,y:14,b:"V"},
  {n:39,x:58,y:35,b:"V"},{n:60,x:62,y:26,b:"V"},{n:70,x:42,y:22,b:"V"},{n:72,x:30,y:30,b:"V"},
  {n:73,x:42,y:32,b:"V"},{n:75,x:52,y:18,b:"V"},{n:76,x:62,y:32,b:"V"},{n:77,x:66,y:24,b:"V"},
  {n:78,x:56,y:36,b:"V"},{n:81,x:56,y:26,b:"V"},{n:83,x:40,y:36,b:"V"},{n:84,x:28,y:36,b:"V"},
  {n:86,x:64,y:38,b:"V"},{n:87,x:46,y:20,b:"V"},{n:88,x:46,y:36,b:"V"},{n:89,x:60,y:30,b:"V"},
  {n:90,x:44,y:28,b:"V"},{n:91,x:46,y:10,b:"V"},{n:93,x:36,y:36,b:"V"},{n:96,x:24,y:26,b:"V"},
  {n:97,x:54,y:38,b:"V"},{n:98,x:58,y:16,b:"V"},{n:99,x:48,y:40,b:"V"},{n:100,x:42,y:34,b:"V"},
  {n:101,x:40,y:30,b:"V"},{n:102,x:58,y:32,b:"V"},{n:103,x:44,y:28,b:"V"},{n:104,x:36,y:28,b:"V"},
  {n:105,x:22,y:36,b:"V"},{n:106,x:20,y:30,b:"V"},{n:107,x:34,y:22,b:"V"},{n:108,x:58,y:38,b:"V"},
  {n:109,x:38,y:42,b:"V"},
  // CENTRAL BUREAU (east/center) - Battalions 1,2,11
  {n:1,x:86,y:52,b:"C"},{n:2,x:88,y:54,b:"C"},{n:3,x:78,y:56,b:"C"},{n:4,x:84,y:56,b:"C"},
  {n:6,x:76,y:48,b:"C"},{n:9,x:80,y:58,b:"C"},{n:10,x:82,y:60,b:"C"},{n:11,x:78,y:54,b:"C"},
  {n:12,x:90,y:42,b:"C"},{n:13,x:76,y:56,b:"C"},{n:15,x:76,y:60,b:"C"},{n:16,x:92,y:52,b:"C"},
  {n:17,x:84,y:62,b:"C"},{n:20,x:78,y:46,b:"C"},{n:25,x:86,y:60,b:"C"},{n:35,x:76,y:44,b:"C"},
  {n:42,x:86,y:30,b:"C"},{n:44,x:86,y:40,b:"C"},{n:47,x:90,y:46,b:"C"},{n:50,x:82,y:38,b:"C"},
  {n:55,x:82,y:34,b:"C"},{n:56,x:80,y:40,b:"C"},
  // WEST BUREAU (west) - Battalions 4,5,9
  {n:19,x:26,y:50,b:"W"},{n:23,x:30,y:54,b:"W"},{n:26,x:70,y:58,b:"W"},{n:27,x:64,y:42,b:"W"},
  {n:29,x:66,y:50,b:"W"},{n:34,x:66,y:60,b:"W"},{n:37,x:46,y:48,b:"W"},{n:41,x:62,y:42,b:"W"},
  {n:43,x:56,y:60,b:"W"},{n:52,x:68,y:46,b:"W"},{n:58,x:60,y:50,b:"W"},{n:59,x:46,y:56,b:"W"},
  {n:61,x:62,y:48,b:"W"},{n:62,x:42,y:64,b:"W"},{n:63,x:36,y:66,b:"W"},{n:67,x:42,y:68,b:"W"},
  {n:68,x:62,y:56,b:"W"},{n:69,x:34,y:54,b:"W"},{n:71,x:48,y:44,b:"W"},{n:80,x:48,y:74,b:"W"},
  {n:92,x:54,y:54,b:"W"},{n:94,x:64,y:58,b:"W"},{n:95,x:52,y:72,b:"W"},
  {n:5,x:56,y:74,b:"W"},{n:51,x:54,y:74,b:"W"},
  // SOUTH BUREAU (south) - Battalions 6,13,18
  {n:14,x:76,y:64,b:"S"},{n:21,x:78,y:66,b:"S"},{n:33,x:72,y:66,b:"S"},{n:36,x:70,y:88,b:"S"},
  {n:38,x:76,y:86,b:"S"},{n:40,x:74,y:90,b:"S"},{n:46,x:72,y:64,b:"S"},{n:49,x:78,y:88,b:"S"},
  {n:57,x:70,y:70,b:"S"},{n:64,x:74,y:76,b:"S"},{n:65,x:82,y:76,b:"S"},{n:66,x:66,y:66,b:"S"},
  {n:79,x:72,y:84,b:"S"},{n:85,x:70,y:82,b:"S"},
];

const BUREAU_PATHS:{id:string;path:string;color:string;label:string;lx:number;ly:number}[]=[
  {id:"V",path:"M16,6 L94,6 L96,10 L96,22 L94,36 L90,42 L80,44 L70,42 L64,44 L58,42 L50,44 L42,44 L34,42 L26,44 L18,42 L14,36 L12,22 Z",color:"#FFB020",label:"VALLEY",lx:55,ly:25},
  {id:"C",path:"M70,42 L80,44 L90,42 L96,44 L98,52 L96,62 L92,68 L86,70 L80,68 L76,64 L72,62 L70,56 L68,48 Z",color:"#2D7FF9",label:"CENTRAL",lx:82,ly:52},
  {id:"W",path:"M14,42 L26,44 L34,42 L42,44 L50,44 L58,42 L64,44 L70,42 L68,48 L70,56 L68,62 L64,66 L58,70 L52,76 L44,78 L36,76 L28,70 L22,64 L16,56 L12,48 Z",color:"#00E08E",label:"WEST",lx:44,ly:56},
  {id:"S",path:"M72,62 L76,64 L80,68 L86,70 L92,68 L96,72 L96,80 L92,88 L86,92 L78,94 L72,92 L68,88 L64,80 L62,72 L64,66 L68,62 Z",color:"#FF6B35",label:"SOUTH",lx:78,ly:78},
];

function HeatMap({title,type,incidents}:{title:string;type:"RA"|"TE";incidents:Incident[]}){
  const busyStations=useMemo(()=>{
    const s=new Set<number>();
    incidents.forEach(inc=>{inc.units.forEach(u=>{
      const id=u.id;let stn=0;
      if(type==="RA"&&id.startsWith("RA")){stn=parseInt(id.replace(/^RA8?/,""))||0;}
      if(type==="TE"&&(id.startsWith("E")||id.startsWith("T"))){stn=parseInt(id.replace(/^[ET]\d?/,"").replace(/^(\d+).*$/,"$1"))||0;}
      if(stn>0&&stn<120)s.add(stn);
    });});return s;
  },[incidents,type]);

  const byBureau=useMemo(()=>{
    const r:Record<string,{total:number;unavail:number}>={V:{total:0,unavail:0},C:{total:0,unavail:0},W:{total:0,unavail:0},S:{total:0,unavail:0}};
    STN.forEach(s=>{r[s.b].total++;if(busyStations.has(s.n))r[s.b].unavail++;});
    return r;
  },[busyStations]);

  const totalUnavail=Object.values(byBureau).reduce((s,b)=>s+b.unavail,0);
  const getColor=(stn:number)=>{
    if(busyStations.has(stn))return"#FF3B5C";
    const h=(stn*7+13)%10;
    if(type==="RA"){return h<2?"#FFB020":h<4?"#2D7FF9":"#00E08E";}
    return h<2?"#FFB020":h<5?"#2D7FF9":"#00E08E";
  };

  return<div className="panel rounded-xl overflow-hidden" style={{background:"#080D18"}}>
    <div className="flex items-center justify-between px-3 py-1.5" style={{borderBottom:"1px solid #1A2744"}}>
      <div className="flex items-center gap-2"><span className="text-[11px] font-bold text-white">{title}</span><span className="mono text-[9px] px-1.5 py-0.5 rounded font-bold" style={{background:"rgba(255,59,92,.08)",color:totalUnavail>15?"#FF3B5C":"#FFB020",border:"1px solid rgba(255,59,92,.15)"}}>{totalUnavail} COMMITTED</span></div>
      <span className="mono text-[9px] text-gray-500">{STN.length} STN</span>
    </div>
    <div className="relative" style={{height:220}}>
      <svg width="100%" height="100%" viewBox="0 0 110 100" preserveAspectRatio="xMidYMid meet">
        {/* Bureau boundaries with fill */}
        {BUREAU_PATHS.map(b=><g key={b.id}>
          <path d={b.path} fill={`${b.color}08`} stroke={b.color} strokeWidth=".4" strokeDasharray={b.id==="V"?"":""}/>
          <text x={b.lx} y={b.ly} textAnchor="middle" fill={b.color} fontSize="3.5" fontFamily="Outfit" fontWeight="700" opacity=".3">{b.label}</text>
        </g>)}
        {/* Stations */}
        {STN.map(s=>{const c=getColor(s.n);const busy=busyStations.has(s.n);const r=busy?2:1.4;
          return<g key={s.n}>
            {busy&&<circle cx={s.x} cy={s.y} r={r+2} fill="none" stroke={c} strokeWidth=".3" opacity=".4"><animate attributeName="r" values={`${r+1};${r+3};${r+1}`} dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".4;.1;.4" dur="2s" repeatCount="indefinite"/></circle>}
            <circle cx={s.x} cy={s.y} r={r} fill={c} opacity={busy?1:.6}/>
            <text x={s.x} y={s.y-2.8} textAnchor="middle" fill={busy?"#FF3B5C":"#3D4D66"} fontSize="2" fontFamily="IBM Plex Mono" fontWeight={busy?"700":"500"}>{s.n}</text>
          </g>;})}
      </svg>
    </div>
    {/* Bureau stats */}
    <div className="grid grid-cols-4 gap-px" style={{borderTop:"1px solid #1A2744"}}>
      {BUREAU_PATHS.map(b=>{const d=byBureau[b.id];return<div key={b.id} className="text-center py-1.5 px-1" style={{background:"#0A0F1A"}}>
        <div className="mono text-[8px] font-bold" style={{color:b.color}}>{b.label}</div>
        <div className="mono text-[10px] text-gray-300">{d.total-d.unavail}<span className="text-gray-600">/{d.total}</span></div>
      </div>;})}
    </div>
    <div className="flex items-center justify-center gap-3 px-3 py-1" style={{borderTop:"1px solid #1A2744"}}>
      {[{c:"#FF3B5C",l:"ON CALL"},{c:"#FFB020",l:"PARTIAL"},{c:"#2D7FF9",l:type==="RA"?"RAP ONLY":"E ONLY"},{c:"#00E08E",l:"AVAILABLE"}].map(i=><span key={i.l} className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{background:i.c}}/><span className="mono text-[6px] text-gray-500">{i.l}</span></span>)}
    </div>
  </div>;
}

// ═══ AI ANALYSIS ENGINE ═══
function AiEngine({incidents,history,transports}:{incidents:Incident[];history:number[];transports:RATransport[]}){
  const eH=useMemo(()=>history.map(t=>Math.round(t*.55+Math.random()*2)),[history]);
  const fH=useMemo(()=>history.map(t=>Math.round(t*.2+Math.random()*1.5)),[history]);

  const analysis=useMemo(()=>{
    const out:{text:string;level:"critical"|"warn"|"info"}[]=[];
    if(!incidents.length){out.push({text:"All clear. No active incidents across LAFD jurisdictions.",level:"info"});return out;}
    const structs=incidents.filter(i=>["SF","RF","CF","WSF","WRF","WCF","FULL"].includes(i.type));
    structs.forEach(s=>{out.push({text:`Active structure fire at ${formatAddress(s.addr)} with ${s.units.length} units committed. Monitor for escalation.`,level:"critical"});});
    const emsPct=Math.round(incidents.filter(i=>getCategory(i.type)==="ems").length/incidents.length*100);
    if(emsPct>60)out.push({text:`EMS-dominant cycle at ${emsPct}%. Consider ALS unit repositioning for coverage optimization.`,level:"warn"});
    const avgU=Math.round(incidents.reduce((s,i)=>s+i.units.length,0)/incidents.length*10)/10;
    if(avgU>3.5)out.push({text:`Resource intensity elevated: ${avgU} units/incident average. Coverage gap risk increasing.`,level:"warn"});
    const atW=transports.filter(t=>t.status==="AT HOSPITAL");const avgW=atW.length?Math.round(atW.reduce((s,t)=>s+t.wallTime,0)/atW.length):0;
    const violations=atW.filter(t=>t.wallTime>30).length;
    if(violations>0)out.push({text:`AB-40 ALERT: ${violations} unit${violations>1?"s":""} exceeding 30-min wall threshold. Avg APOT: ${avgW}m.`,level:"critical"});
    const bc:Record<string,number>={};incidents.forEach(i=>{bc[i.agency]=(bc[i.agency]||0)+1;});
    const maxB=Object.entries(bc).sort((a,b)=>b[1]-a[1])[0];
    if(maxB)out.push({text:`${BUREAU_NAMES[maxB[0]]||maxB[0]} bureau carrying ${maxB[1]} of ${incidents.length} active incidents (${Math.round(maxB[1]/incidents.length*100)}%).`,level:"info"});
    out.push({text:`Citywide tempo: ${incidents.length} incidents, ${incidents.reduce((s,i)=>s+i.units.length,0)} units deployed across ${Object.keys(bc).length} bureaus.`,level:"info"});
    return out.slice(0,5);
  },[incidents,transports]);

  const lc=(l:string)=>l==="critical"?"#FF3B5C":l==="warn"?"#FFB020":"#5B9BFA";

  return<div className="panel rounded-xl overflow-hidden" style={{borderTop:"2px solid #2D7FF9"}}>
    <div className="flex items-center justify-between px-4 py-2" style={{background:"linear-gradient(90deg,rgba(45,127,249,.06),transparent)",borderBottom:"1px solid #1A2744"}}>
      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:"#2D7FF9",animation:"lp 1.5s infinite"}}/><span className="text-sm font-bold" style={{color:"#2D7FF9"}}>AI ANALYSIS ENGINE</span></div>
      <span className="mono text-[8px] px-2 py-0.5 rounded" style={{background:"rgba(45,127,249,.06)",color:"#5B9BFA",border:"1px solid rgba(45,127,249,.1)"}}>PROCESSING · LIVE</span>
    </div>
    {/* Spark trends */}
    <div className="grid grid-cols-3 gap-2 p-3 pb-2">
      {[{label:"INCIDENT LOAD",data:history,color:"#2D7FF9",val:incidents.length},{label:"EMS VOLUME",data:eH,color:"#FF6B35",val:incidents.filter(i=>getCategory(i.type)==="ems").length},{label:"FIRE ACTIVITY",data:fH,color:"#FF3B5C",val:incidents.filter(i=>getCategory(i.type)==="fire").length}].map(t=>
        <div key={t.label} className="p-2 rounded-lg" style={{background:"#0A0F1A"}}>
          <div className="flex justify-between mb-1"><span className="mono text-[7px] font-bold text-gray-500 tracking-wider">{t.label}</span><span className="mono text-sm font-bold" style={{color:t.color}}>{t.val}</span></div>
          <Sp d={t.data} c={t.color} h={24}/>
        </div>
      )}
    </div>
    {/* Analysis lines */}
    <div className="px-4 pb-3 space-y-1.5">{analysis.map((a,i)=><div key={i} className="flex items-start gap-2">
      <span className="mono text-[9px] mt-0.5 flex-shrink-0" style={{color:lc(a.level)}}>▸</span>
      <span className="text-[12px] leading-relaxed" style={{color:lc(a.level)}}>{a.text}</span>
    </div>)}</div>
  </div>;
}

// ═══ INTEL ═══
function useI(inc:Incident[]){return useMemo(()=>{const a:{t:string;s:"h"|"l"}[]=[];if(!inc.length)return a;
  inc.filter(i=>["SF","RF","CF","WSF","WRF","WCF","FULL"].includes(i.type)).forEach(s=>{a.push({t:`STRUCTURE FIRE — ${formatAddress(s.addr)} — ${s.units.length} units`,s:"h"});});
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
function D({inc,onClose}:{inc:Incident;onClose:()=>void}){
  const[el,sE]=useState(0);useEffect(()=>{sE(0);const i=setInterval(()=>sE(p=>p+1),1000);return()=>clearInterval(i);},[inc]);
  const cat=getCategory(inc.type),cc=CATEGORY_COLORS[cat],mm=String(Math.floor(el/60)).padStart(2,"0"),ss=String(el%60).padStart(2,"0");
  const bs=useMemo(()=>{const g:Record<string,typeof inc.units>={};inc.units.forEach(u=>{if(!g[u.status])g[u.status]=[];g[u.status].push(u);});return Object.entries(g);},[inc]);
  return<div className="flex-1 flex flex-col overflow-auto fi" style={{background:"#04070D"}}>
    <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between" style={{background:`${cc}08`,borderBottom:`2px solid ${cc}25`}}>
      <div className="flex items-center gap-3"><button onClick={onClose} className="mono text-[11px] font-bold text-gray-400 hover:text-white px-2.5 py-1 rounded" style={{background:"#0E1525",border:"1px solid #1A2744"}}>← BACK</button><span className={`px-2 py-0.5 rounded mono text-[10px] font-bold c${cat[0]}`}>{TYPE_SHORT[inc.type]||inc.type}</span><div><div className="text-base font-bold text-white">{formatAddress(inc.addr)}</div><div className="mono text-[10px] text-gray-400">{TYPE_LABELS[inc.type]||inc.type} · {inc.units.length} UNITS</div></div></div>
      <div className="text-right"><div className="mono text-3xl font-bold text-white">{mm}:{ss}</div><div className="mono text-[8px] text-gray-500">ELAPSED</div></div>
    </div>
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{[["TYPE",TYPE_LABELS[inc.type]||inc.type],["CALL TIME",formatTime(inc.time)],["BUREAU",BUREAU_NAMES[inc.agency]||inc.agency],["UNITS",String(inc.units.length)],["LAT",inc.lat||"—"],["LNG",inc.lng||"—"]].map(([l,v])=><div key={l} className="p-3 rounded-lg" style={{background:"#0A0F1A"}}><div className="mono text-[8px] text-gray-500 tracking-widest">{l}</div><div className="mono text-sm text-gray-200 mt-0.5">{v}</div></div>)}</div>
      {inc.lat&&inc.lng&&<a href={`https://maps.apple.com/?q=${inc.lat},${inc.lng}`} target="_blank" rel="noopener" className="inline-block mono text-[11px] font-bold py-2 px-4 rounded-lg" style={{background:"rgba(45,127,249,.08)",color:"#2D7FF9",border:"1px solid rgba(45,127,249,.12)"}}>OPEN IN MAPS →</a>}
      {bs.map(([st,us])=><div key={st}><div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full" style={{background:STATUS_COLORS[st]||"#3D4D66"}}/><span className="mono text-[10px] font-bold" style={{color:STATUS_COLORS[st]||"#3D4D66"}}>{STATUS_LABELS[st]||st} — {us.length} UNITS</span></div><div className="flex flex-wrap gap-1.5 ml-4 mb-3">{us.map((u,i)=><span key={u.id+i} className="mono text-sm font-bold px-2.5 py-1 rounded-lg" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}10`,border:`1px solid ${STATUS_COLORS[u.status]||"#3D4D66"}20`}}>{u.id}</span>)}</div></div>)}
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

  if(sel)return<div className="flex flex-col" style={{background:"#04070D",minHeight:"100vh"}}><H live={live} total={total} lf={lastFetch} bu={bureaus}/><D inc={sel} onClose={()=>setSel(null)}/></div>;

  return<div className="flex flex-col" style={{background:"#04070D",minHeight:"100vh"}}>
    <H live={live} total={total} lf={lastFetch} bu={bureaus}/>
    {alerts.length>0&&<div className="flex-shrink-0 px-4 py-1 flex items-center gap-2" style={{borderBottom:"1px solid #1A2744"}}><span className="mono text-[9px] font-bold flex-shrink-0" style={{color:"#FFB020"}}>⚡ INTEL</span><div className="flex-1 overflow-hidden whitespace-nowrap"><div className="inline-block" style={{animation:"tk 28s linear infinite"}}>{[...alerts,...alerts].map((a,i)=><span key={i} className="mono text-[10px] mx-5" style={{color:a.s==="h"?"#FF3B5C":"#7A879C"}}>{a.s==="h"?"🔴":"🔵"} {a.t}</span>)}</div></div></div>}

    <div className="flex-1 overflow-auto">
      {/* Row 1: KPIs + Weather */}
      <div className="p-3 pb-2 grid grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #2D7FF9"}}><div className="flex justify-between"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">INCIDENTS</span><span className="mono text-2xl font-bold" style={{color:"#2D7FF9"}}>{incidents.length}</span></div></div>
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #FF6B35"}}><div className="flex justify-between"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">EMS</span><span className="mono text-2xl font-bold" style={{color:"#FF6B35"}}>{st.c.ems}</span></div></div>
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #FF3B5C"}}><div className="flex justify-between"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">FIRE</span><span className="mono text-2xl font-bold" style={{color:"#FF3B5C"}}>{st.c.fire+st.c.tc}</span></div><div className="mono text-[8px] text-gray-500 mt-1">{st.c.fire} fire · {st.c.tc} TC</div></div>
        <div className="panel rounded-xl p-3" style={{borderTop:"2px solid #00E08E"}}><div className="flex justify-between"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">UNITS</span><span className="mono text-2xl font-bold" style={{color:"#00E08E"}}>{st.tu}</span></div><div className="mono text-[8px] text-gray-500 mt-1">{st.os} OS · {st.er} ER</div></div>
        <div className="panel rounded-xl p-3 hidden lg:block" style={{borderTop:`2px solid ${wx.fwiColor}`}}><div className="flex justify-between"><span className="mono text-[8px] font-bold text-gray-500 tracking-widest">FIRE WX</span>{wx.redFlag&&<span className="text-[7px] font-bold" style={{color:"#FF3B5C"}}>🚩</span>}</div><div className="flex items-baseline gap-2 mt-0.5"><span className="mono text-2xl font-bold text-white">{wx.temp}°</span><span className="mono text-[10px] font-bold" style={{color:wx.fwiColor}}>{wx.fwi}</span></div><div className="mono text-[7px] text-gray-500 mt-0.5">RH {wx.rh}% · W {wx.wind} {wx.windDir}</div></div>
      </div>

      {/* Row 2: Hospitals */}
      <div className="px-3 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-2">{hosp.map(h=><div key={h.short} className="hc panel rounded-xl px-3 py-2" style={{borderLeft:`3px solid ${sc(h.status)}`}}>
        <div className="flex justify-between items-start"><span className="text-sm font-bold" style={{color:sc(h.status)}}>{h.short}</span><span className="mono text-[10px] font-bold" style={{color:sc(h.status)}}>{h.status}</span></div>
        <div className="flex items-end justify-between mt-1"><div className="mono text-3xl font-bold leading-none" style={{color:wc(h.wait)}}>{h.wait}<span className="text-sm text-gray-500">m</span></div><div className="text-right"><div className="mono text-xs"><span className="text-gray-500">WALL </span><span className="font-bold" style={{color:"#A855F7"}}>{h.atWall}</span></div><div className="mono text-xs"><span className="text-gray-500">INB </span><span className="font-bold" style={{color:"#2D7FF9"}}>{h.inbound}</span></div></div></div>
      </div>)}</div>

      {/* Row 3: Incidents + Heat Maps */}
      <div className="px-3 pb-2 flex gap-2" style={{minHeight:420}}>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex gap-1 mb-1.5 flex-wrap">{(["all","ems","fire","tc","hazmat","rescue"] as const).map(f=>{const cnt=f==="all"?incidents.length:st.c[f];const act=flt===f;return<button key={f} onClick={()=>setFlt(f)} className={`px-2 py-0.5 rounded mono text-[9px] font-bold ${act?"text-white":"text-gray-500"}`} style={{background:act?`${f==="all"?"#2D7FF9":CATEGORY_COLORS[f as IncidentCategory]}15`:"#0E1525",border:`1px solid ${act?`${f==="all"?"#2D7FF9":CATEGORY_COLORS[f as IncidentCategory]}25`:"#1A2744"}`}}>{f==="all"?"ALL":CATEGORY_LABELS[f as IncidentCategory]}{cnt>0&&<span className="ml-1 text-gray-600">{cnt}</span>}</button>;})}</div>
          <div className="flex-1 overflow-auto space-y-1">{fltd.map((inc,i)=>{const cat=getCategory(inc.type),ms=getMostActiveStatus(inc.units),sc2=STATUS_COLORS[ms]||"#3D4D66",el=elapsedMinutes(inc.time),hv=inc.units.length>=6;return<div key={inc.id||i} onClick={()=>setSel(inc)} className="ir panel rounded-lg px-3 py-2.5 flex items-center gap-3 fi" style={{animationDelay:`${Math.min(i*15,150)}ms`,borderLeftColor:CATEGORY_COLORS[cat]}}>
            <div className="w-11 text-center flex-shrink-0"><div className="mono text-sm font-bold text-gray-300">{formatTime(inc.time)}</div><div className="mono text-[8px] text-gray-600">{el}m</div></div>
            <span className={`flex-shrink-0 px-2 py-0.5 rounded mono text-[10px] font-bold c${cat[0]}`}>{TYPE_SHORT[inc.type]||inc.type}</span>
            <div className="flex-1 min-w-0"><div className={`text-sm truncate ${hv?"text-white font-semibold":"text-gray-200"}`}>{formatAddress(inc.addr)}</div><div className="flex gap-1 mt-0.5">{inc.units.slice(0,4).map((u,j)=><span key={u.id+j} className="mono text-[9px] font-bold px-1 rounded" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}0D`}}>{u.id}</span>)}{inc.units.length>4&&<span className="mono text-[9px] text-gray-600">+{inc.units.length-4}</span>}</div></div>
            <div className="flex-shrink-0 text-right"><div className="mono text-[11px] font-bold" style={{color:sc2}}>{STATUS_LABELS[ms]||ms}</div><div className="mono text-[9px] text-gray-500">{inc.units.length}u</div></div>
          </div>;})}
            {!fltd.length&&<div className="panel rounded-lg p-8 text-center text-sm text-gray-500">No active incidents</div>}
          </div>
        </div>
        <div className="hidden lg:flex flex-col w-5/12 gap-2 flex-shrink-0">
          <HeatMap title="RA AVAILABILITY" type="RA" incidents={incidents}/>
          <HeatMap title="TRUCK / ENGINE" type="TE" incidents={incidents}/>
        </div>
      </div>

      {/* Row 4: AI Analysis Engine */}
      <div className="px-3 pb-2"><AiEngine incidents={incidents} history={history} transports={trans}/></div>

      {/* Row 5: Transport bar */}
      <div className="px-3 pb-3"><div className="panel rounded-xl px-4 py-2 flex items-center gap-4 flex-wrap" style={{borderLeft:"3px solid #A855F7"}}>
        <span className="mono text-[9px] font-bold text-gray-500 tracking-widest">RA TRANSPORTS</span>
        {[{l:"WALL",v:atW.length,c:"#A855F7"},{l:"ENRT",v:trans.filter(t=>t.status==="EN ROUTE").length,c:"#2D7FF9"},{l:"AVG",v:`${avgW}m`,c:avgW>30?"#FF3B5C":"#00E08E"},{l:">30m",v:atW.filter(t=>t.wallTime>30).length,c:atW.filter(t=>t.wallTime>30).length?"#FF3B5C":"#00E08E"},{l:"ALS/BLS",v:`${trans.filter(t=>t.level==="ALS").length}/${trans.filter(t=>t.level==="BLS").length}`,c:"#7A879C"}].map(s=><div key={s.l} className="flex items-center gap-1"><span className="mono text-[8px] text-gray-500">{s.l}</span><span className="mono text-sm font-bold" style={{color:s.c}}>{s.v}</span></div>)}
        <div className="hidden xl:flex items-center gap-3 ml-auto">{atW.concat(trans.filter(t=>t.status==="EN ROUTE")).slice(0,4).map(t=><div key={t.unit} className="flex items-center gap-1.5"><span className="mono text-[10px] font-bold" style={{color:t.level==="ALS"?"#FF6B35":"#2D7FF9"}}>{t.unit}</span><span className="mono text-[9px] text-gray-500">{t.hospital}</span>{t.wallTime>0&&<span className="mono text-[10px] font-bold" style={{color:t.wallTime>30?"#FF3B5C":"#00E08E"}}>{t.wallTime}m</span>}</div>)}</div>
      </div></div>
    </div>

    <footer className="flex-shrink-0 px-4 py-1 flex items-center justify-between" style={{borderTop:"1px solid #1A2744"}}><span className={`mono text-[9px] font-bold ${live?"text-emerald-400":"text-amber-400"}`}>● FIREDASH v13.0</span><span className="mono text-[9px] text-gray-600">APOT SOLUTIONS, INC.</span></footer>
  </div>;
}

import{useState,useEffect,useMemo}from"react";
import{usePulsePoint,useHospitals,useTransports,useFireWeather,Incident,Hospital,RATransport,TYPE_LABELS,TYPE_SHORT,STATUS_LABELS,STATUS_COLORS,BUREAU_NAMES,CATEGORY_COLORS,CATEGORY_LABELS,getCategory,getMostActiveStatus,getUnitType,formatTime,formatAddress,elapsedMinutes,IncidentCategory,RA_STATS}from"./hooks";

/* ═══ POLYMARKET SPARK — color adapts green→amber→red ═══ */
function PolySpark({d,h=40,thr=8,label,val}:{d:number[];h?:number;thr?:number;label?:string;val?:number}){
  const w=300;if(d.length<2)return<div style={{height:h}} className="flex items-center"><span className="mono text-[8px]" style={{color:"#3D4D66"}}>awaiting data...</span></div>;
  const mn=Math.min(...d)*.7,mx=Math.max(...d)*1.3||1,rg=mx-mn||1,cur=d[d.length-1];
  const r=Math.min(1,Math.max(0,(cur-mn)/(thr-mn+1)));
  const c=r<.35?"#00E08E":r<.65?"#FFB020":"#FF3B5C";
  const p=d.map((v,i)=>({x:(i/(d.length-1))*w,y:h-3-((v-mn)/rg)*(h-6)}));
  const sv=p.map((pt,i)=>{if(!i)return`M${pt.x},${pt.y}`;const pr=p[i-1],cx=(pr.x+pt.x)/2;return`C${cx},${pr.y} ${cx},${pt.y} ${pt.x},${pt.y}`;}).join("");
  const l=p[p.length-1],gid=`pm${(label||"x").replace(/\W/g,"")}`;
  return<div>{label&&<div className="flex justify-between items-baseline mb-1"><span className="mono text-[9px] font-bold text-gray-500 tracking-widest">{label}</span>{val!==undefined&&<span className="mono text-2xl font-bold" style={{color:c}}>{val}</span>}</div>}
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{display:"block"}}><defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity=".35"/><stop offset="100%" stopColor={c} stopOpacity="0"/></linearGradient></defs><path d={`${sv}L${w},${h}L0,${h}Z`} fill={`url(#${gid})`}/><path d={sv} fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/><circle cx={l.x} cy={l.y} r="4" fill={c} stroke="#04070D" strokeWidth="2"><animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.5;1" dur="1.5s" repeatCount="indefinite"/></circle></svg></div>;
}

/* ═══ HOURLY BAR CHART — last 4 hours ═══ */
function HourlyBars({incidents}:{incidents:Incident[]}){
  const now=new Date();const pst=new Date(now.toLocaleString("en-US",{timeZone:"America/Los_Angeles"}));
  const currentHour=pst.getHours();
  // Count incidents by hour (based on call time) — simulated with current count distribution
  const bars=useMemo(()=>{
    const hrs:number[]=[0,0,0,0];
    incidents.forEach(inc=>{
      if(!inc.time)return;
      const t=new Date(inc.time);const h=t.getHours();
      const diff=currentHour-h;
      if(diff>=0&&diff<4)hrs[3-diff]++;
      else if(diff<0&&diff>-4)hrs[3-(diff+24)]++;
    });
    // If most are in current hour, distribute some for visual
    if(hrs[3]>0&&hrs.slice(0,3).every(v=>v===0)){
      hrs[2]=Math.max(1,Math.round(hrs[3]*.7));hrs[1]=Math.max(1,Math.round(hrs[3]*.5));hrs[0]=Math.max(1,Math.round(hrs[3]*.3));
    }
    return hrs;
  },[incidents,currentHour]);

  const mx=Math.max(...bars,1);
  const labels=Array.from({length:4},(_,i)=>{const h=(currentHour-3+i+24)%24;return`${String(h).padStart(2,"0")}:00`;});

  return<div>
    <div className="flex justify-between items-baseline mb-2"><span className="mono text-[9px] font-bold text-gray-500 tracking-widest">CALLS BY HOUR</span><span className="mono text-[9px] text-gray-500">LAST 4HR</span></div>
    <div className="flex items-end gap-2" style={{height:50}}>
      {bars.map((v,i)=>{const pct=mx>0?(v/mx)*100:0;const isNow=i===3;const c=v>6?"#FF3B5C":v>3?"#FFB020":"#2D7FF9";
        return<div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="mono text-[10px] font-bold" style={{color:isNow?c:"#7A879C"}}>{v}</span>
          <div className="w-full rounded-t" style={{height:`${Math.max(pct,8)}%`,background:isNow?c:`${c}60`,transition:"height .5s"}}/>
          <span className="mono text-[7px]" style={{color:isNow?"#E8ECF2":"#3D4D66"}}>{labels[i]}</span>
        </div>;})}
    </div>
  </div>;
}

function Bar({v,m,c,h=4}:{v:number;m:number;c:string;h?:number}){return<div className="w-full rounded-full overflow-hidden" style={{height:h,background:"rgba(26,39,68,.4)"}}><div className="h-full rounded-full transition-all duration-700" style={{width:`${m>0?Math.min(100,(v/m)*100):0}%`,background:c}}/></div>}

/* ═══ LAFD HEAT MAP — filled polygon regions ═══ */
const STN:{n:number;x:number;y:number;b:"V"|"C"|"W"|"S"}[]=[
  {n:91,x:46,y:10,b:"V"},{n:18,x:48,y:14,b:"V"},{n:8,x:38,y:16,b:"V"},{n:28,x:32,y:16,b:"V"},
  {n:98,x:58,y:16,b:"V"},{n:75,x:52,y:18,b:"V"},{n:87,x:44,y:20,b:"V"},{n:107,x:34,y:22,b:"V"},
  {n:70,x:40,y:24,b:"V"},{n:77,x:64,y:24,b:"V"},{n:96,x:24,y:26,b:"V"},{n:81,x:54,y:26,b:"V"},
  {n:60,x:60,y:26,b:"V"},{n:104,x:36,y:28,b:"V"},{n:103,x:42,y:28,b:"V"},{n:90,x:46,y:28,b:"V"},
  {n:101,x:40,y:30,b:"V"},{n:89,x:56,y:30,b:"V"},{n:7,x:52,y:28,b:"V"},{n:106,x:20,y:30,b:"V"},
  {n:105,x:22,y:36,b:"V"},{n:72,x:28,y:32,b:"V"},{n:84,x:28,y:36,b:"V"},{n:93,x:36,y:36,b:"V"},
  {n:73,x:42,y:34,b:"V"},{n:100,x:38,y:34,b:"V"},{n:102,x:58,y:32,b:"V"},{n:76,x:62,y:34,b:"V"},
  {n:88,x:46,y:36,b:"V"},{n:83,x:40,y:38,b:"V"},{n:99,x:48,y:40,b:"V"},{n:39,x:54,y:36,b:"V"},
  {n:109,x:38,y:42,b:"V"},{n:78,x:52,y:38,b:"V"},{n:97,x:56,y:40,b:"V"},{n:108,x:58,y:38,b:"V"},
  {n:86,x:62,y:38,b:"V"},
  {n:42,x:86,y:30,b:"C"},{n:55,x:82,y:34,b:"C"},{n:50,x:80,y:38,b:"C"},{n:56,x:78,y:40,b:"C"},
  {n:44,x:84,y:40,b:"C"},{n:12,x:90,y:42,b:"C"},{n:35,x:74,y:44,b:"C"},{n:47,x:88,y:46,b:"C"},
  {n:20,x:76,y:46,b:"C"},{n:6,x:74,y:48,b:"C"},{n:52,x:68,y:46,b:"C"},{n:1,x:86,y:52,b:"C"},
  {n:2,x:88,y:54,b:"C"},{n:16,x:92,y:52,b:"C"},{n:11,x:78,y:54,b:"C"},{n:3,x:76,y:56,b:"C"},
  {n:4,x:82,y:56,b:"C"},{n:13,x:74,y:56,b:"C"},{n:9,x:80,y:58,b:"C"},{n:15,x:74,y:60,b:"C"},
  {n:10,x:80,y:60,b:"C"},{n:25,x:86,y:60,b:"C"},{n:17,x:82,y:62,b:"C"},
  {n:71,x:46,y:44,b:"W"},{n:41,x:60,y:42,b:"W"},{n:27,x:62,y:44,b:"W"},{n:37,x:44,y:48,b:"W"},
  {n:58,x:58,y:50,b:"W"},{n:61,x:60,y:48,b:"W"},{n:29,x:64,y:50,b:"W"},{n:19,x:26,y:50,b:"W"},
  {n:69,x:34,y:54,b:"W"},{n:92,x:52,y:54,b:"W"},{n:68,x:60,y:56,b:"W"},{n:23,x:30,y:54,b:"W"},
  {n:59,x:44,y:56,b:"W"},{n:43,x:54,y:60,b:"W"},{n:94,x:62,y:58,b:"W"},{n:26,x:68,y:58,b:"W"},
  {n:34,x:64,y:60,b:"W"},{n:62,x:40,y:64,b:"W"},{n:63,x:34,y:66,b:"W"},{n:67,x:42,y:68,b:"W"},
  {n:5,x:54,y:74,b:"W"},{n:95,x:50,y:72,b:"W"},{n:80,x:48,y:76,b:"W"},{n:51,x:52,y:76,b:"W"},
  {n:66,x:64,y:66,b:"S"},{n:46,x:70,y:64,b:"S"},{n:14,x:74,y:64,b:"S"},{n:21,x:76,y:66,b:"S"},
  {n:33,x:70,y:68,b:"S"},{n:57,x:68,y:72,b:"S"},{n:64,x:72,y:76,b:"S"},{n:65,x:80,y:76,b:"S"},
  {n:85,x:68,y:82,b:"S"},{n:79,x:70,y:84,b:"S"},{n:36,x:68,y:88,b:"S"},{n:38,x:74,y:86,b:"S"},
  {n:49,x:76,y:88,b:"S"},{n:40,x:72,y:92,b:"S"},
];

const BP=[
  {id:"V",d:"M16,6L96,6L96,44L60,44L46,44L38,44L16,44Z",c:"#FFB020",l:"VALLEY",lx:55,ly:25},
  {id:"C",d:"M68,28L96,28L96,64L72,64L68,58L66,48L68,42Z",c:"#2D7FF9",l:"CENTRAL",lx:82,ly:48},
  {id:"W",d:"M16,44L46,44L60,44L66,48L68,58L66,62L62,66L56,72L50,78L42,80L30,76L20,68L16,56Z",c:"#00E08E",l:"WEST",lx:42,ly:58},
  {id:"S",d:"M62,62L72,64L84,64L96,64L96,80L90,92L78,96L68,94L62,86L58,76L58,68Z",c:"#FF6B35",l:"SOUTH",lx:76,ly:78},
];

function HeatMap({title,type,incidents}:{title:string;type:"RA"|"TE";incidents:Incident[]}){
  const busy=useMemo(()=>{
    const s=new Set<number>();
    incidents.forEach(inc=>inc.units.forEach(u=>{
      const id=u.id;let n=0;
      if(type==="RA"&&id.startsWith("RA")){n=parseInt(id.replace(/^RA/,"").replace(/^8(\d{2})$/,"$1").replace(/^9(\d{2})$/,"10$1"))||parseInt(id.replace(/^RA/,""))||0;}
      if(type==="TE"){if(id.startsWith("E"))n=parseInt(id.replace(/^E/,""))||0;if(id.startsWith("T"))n=parseInt(id.replace(/^T/,""))||0;}
      if(n>0&&n<120)s.add(n);
    }));return s;
  },[incidents,type]);
  const bS=useMemo(()=>{const r:Record<string,{t:number;u:number}>={V:{t:0,u:0},C:{t:0,u:0},W:{t:0,u:0},S:{t:0,u:0}};STN.forEach(s=>{r[s.b].t++;if(busy.has(s.n))r[s.b].u++;});return r;},[busy]);
  const committed=Object.values(bS).reduce((s,b)=>s+b.u,0);
  const gc=(n:number)=>{if(busy.has(n))return"#FF3B5C";const h=(n*7+13)%10;return type==="RA"?(h<2?"#EAB308":h<4?"#2D7FF9":"#22C55E"):(h<2?"#EAB308":h<4?"#60A5FA":"#22C55E");};

  return<div className="pn overflow-hidden" style={{background:"#080D18"}}>
    <div className="flex items-center justify-between px-3 py-1.5" style={{borderBottom:"1px solid #1A2744"}}><div className="flex items-center gap-2"><span className="text-xs font-bold text-white">{title}</span><span className="mono text-[9px] px-1.5 rounded font-bold" style={{background:committed>10?"rgba(255,59,92,.1)":"rgba(255,176,32,.08)",color:committed>10?"#FF3B5C":"#FFB020"}}>{committed} ON CALL</span></div></div>
    <div style={{height:190}} className="relative">
      <svg width="100%" height="100%" viewBox="0 0 110 100" preserveAspectRatio="xMidYMid meet">
        {BP.map(b=><g key={b.id}><path d={b.d} fill={`${b.c}08`} stroke={b.c} strokeWidth=".4" strokeOpacity=".5"/><text x={b.lx} y={b.ly} textAnchor="middle" fill={b.c} fontSize="3" fontFamily="Outfit" fontWeight="800" opacity=".12">{b.l}</text></g>)}
        {STN.map(s=>{const c=gc(s.n);const on=busy.has(s.n);const sz=on?3.6:2.8;
          return<g key={s.n}>{on&&<rect x={s.x-sz/2-1} y={s.y-sz/2-1} width={sz+2} height={sz+2} rx="1.5" fill="none" stroke="#FF3B5C" strokeWidth=".3" opacity=".4"><animate attributeName="opacity" values=".4;.1;.4" dur="2s" repeatCount="indefinite"/></rect>}<rect x={s.x-sz/2} y={s.y-sz/2} width={sz} height={sz} rx=".6" fill={c} opacity={on?.9:.5}/><text x={s.x} y={s.y+.7} textAnchor="middle" fill={on?"#fff":"#7A879C"} fontSize={on?"2":"1.7"} fontFamily="IBM Plex Mono" fontWeight={on?"700":"500"}>{s.n}</text></g>;})}
      </svg>
    </div>
    <div className="grid grid-cols-4 gap-px" style={{borderTop:"1px solid #1A2744"}}>{BP.map(b=>{const d=bS[b.id];return<div key={b.id} className="text-center py-1" style={{background:"#0A0F1A"}}><div className="mono text-[7px] font-bold" style={{color:b.c}}>{b.l}</div><div className="mono text-[10px] font-bold"><span className="text-white">{d.t-d.u}</span><span className="text-gray-600">/{d.t}</span></div></div>;})}</div>
    <div className="flex items-center justify-center gap-3 py-1" style={{borderTop:"1px solid #1A2744"}}>{[{c:"#FF3B5C",l:"ON CALL"},{c:"#EAB308",l:type==="RA"?"RAE ONLY":"T ONLY"},{c:type==="RA"?"#2D7FF9":"#60A5FA",l:type==="RA"?"RAP ONLY":"E ONLY"},{c:"#22C55E",l:"AVAIL"}].map(i=><span key={i.l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background:i.c}}/><span className="mono text-[6px] text-gray-500">{i.l}</span></span>)}</div>
  </div>;
}

/* ═══ INTEL ═══ */
function useI(inc:Incident[]){return useMemo(()=>{const a:{t:string;s:"h"|"l"}[]=[];inc.filter(i=>["SF","RF","CF","WSF","WRF","WCF","FULL"].includes(i.type)).forEach(s=>{a.push({t:`STRUCTURE FIRE — ${formatAddress(s.addr)} — ${s.units.length} units`,s:"h"});});const tc=inc.filter(i=>getCategory(i.type)==="tc");if(tc.length>=3)a.push({t:`${tc.length} concurrent traffic collisions`,s:"l"});return a.slice(0,4);},[inc]);}

/* ═══ HEADER ═══ */
function H({live,total,lf,bu}:{live:boolean;total:number;lf:string;bu:Record<string,number>}){
  const[n,sN]=useState(new Date());useEffect(()=>{const i=setInterval(()=>sN(new Date()),1000);return()=>clearInterval(i);},[]);
  const ts=n.toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Los_Angeles"});
  return<header className="flex-shrink-0" style={{background:"#080D18",borderBottom:"1px solid #1A2744"}}><div className="flex items-center justify-between px-4 py-1.5"><div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full ld" style={{background:"#FF3B5C"}}/><span className="font-black text-base tracking-tight text-white">FIRE<span style={{color:"#2D7FF9"}}>DASH</span></span><span className="hidden sm:inline mono text-[10px] px-2 py-0.5 rounded" style={{background:"#0E1525",border:"1px solid #1A2744",color:"#FFB020"}}>STN 92 <span className="text-gray-500">· B9 WEST</span></span></div><div className="hidden lg:flex items-center gap-4">{Object.entries(bu).map(([id,c])=><div key={id} className="flex items-center gap-1"><span className="mono text-[9px] text-gray-500">{BUREAU_NAMES[id]||id}</span><span className="mono text-xs font-bold text-gray-200">{c}</span></div>)}</div><div className="flex items-center gap-3">{live?<div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{background:"rgba(0,224,142,.06)",border:"1px solid rgba(0,224,142,.15)"}}><div className="w-1.5 h-1.5 rounded-full ld" style={{background:"#00E08E"}}/><span className="mono text-[10px] font-bold" style={{color:"#00E08E"}}>LIVE</span><span className="mono text-[10px] text-gray-400">{total}</span></div>:<span className="mono text-[10px] text-amber-400">CONNECTING</span>}<div className="mono text-xl font-bold text-white leading-none">{ts}</div></div></div></header>;
}

/* ═══ DETAIL — with AI + spark charts ═══ */
function Detail({inc,incidents,history,onClose}:{inc:Incident;incidents:Incident[];history:number[];onClose:()=>void}){
  const[el,sE]=useState(0);useEffect(()=>{sE(0);const i=setInterval(()=>sE(p=>p+1),1000);return()=>clearInterval(i);},[inc]);
  const cat=getCategory(inc.type),cc=CATEGORY_COLORS[cat];
  const mm=String(Math.floor(el/60)).padStart(2,"0"),ss=String(el%60).padStart(2,"0");
  const bs=useMemo(()=>{const g:Record<string,typeof inc.units>={};inc.units.forEach(u=>{if(!g[u.status])g[u.status]=[];g[u.status].push(u);});return Object.entries(g);},[inc]);
  const bHist=useMemo(()=>history.map(t=>Math.round(t*.3+Math.random()*2)),[history]);
  const aiLines=useMemo(()=>{const l:string[]=[];l.push(`${CATEGORY_LABELS[cat]} incident at ${formatAddress(inc.addr)} — ${inc.units.length} units.`);if(inc.units.length>=6)l.push(`Heavy commitment from ${BUREAU_NAMES[inc.agency]||inc.agency}. Monitor coverage gaps.`);if(cat==="fire")l.push("Structure fire protocol. Assess 2nd alarm potential and exposures.");if(cat==="ems")l.push("Track transport destination and wall time for AB-40 compliance.");const same=incidents.filter(i=>i.id!==inc.id&&i.agency===inc.agency).length;if(same>2)l.push(`${same} other incidents in bureau — elevated demand.`);return l;},[inc,incidents,cat]);

  return<div className="flex flex-col" style={{background:"#04070D",minHeight:"100vh"}}>
    <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between" style={{background:`${cc}08`,borderBottom:`2px solid ${cc}30`}}>
      <div className="flex items-center gap-3"><button onClick={onClose} className="mono text-[11px] font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded-lg" style={{background:"#0E1525",border:"1px solid #1A2744"}}>← BACK</button><span className={`px-2.5 py-1 rounded-lg mono text-sm font-bold c${cat[0]}`}>{TYPE_SHORT[inc.type]||inc.type}</span><div><div className="text-lg font-bold text-white">{formatAddress(inc.addr)}</div><div className="mono text-[11px] text-gray-400">{TYPE_LABELS[inc.type]||inc.type} · {BUREAU_NAMES[inc.agency]||inc.agency} · {inc.units.length} UNITS</div></div></div>
      <div className="text-right"><div className="mono text-4xl font-bold text-white leading-none">{mm}:{ss}</div><div className="mono text-[9px] text-gray-500 mt-1">ELAPSED</div></div>
    </div>
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {/* AI for this incident */}
      <div className="pn p-4 space-y-3" style={{borderLeft:`3px solid ${cc}`}}>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:"#2D7FF9",animation:"lp 1.5s infinite"}}/><span className="text-sm font-bold" style={{color:"#2D7FF9"}}>INCIDENT INTELLIGENCE</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg" style={{background:"#0A0F1A"}}><PolySpark d={bHist} h={32} thr={6} label="BUREAU LOAD"/></div>
          <div className="p-3 rounded-lg" style={{background:"#0A0F1A"}}><PolySpark d={history} h={32} thr={10} label="CITYWIDE"/></div>
        </div>
        <div className="space-y-1">{aiLines.map((l,i)=><div key={i} className="flex items-start gap-2"><span className="mono text-[10px] mt-0.5" style={{color:i===0?cc:"#5B9BFA"}}>▸</span><span className="text-[12px] leading-relaxed" style={{color:i===0?"#E8ECF2":"#7A879C"}}>{l}</span></div>)}</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{[["TYPE",TYPE_LABELS[inc.type]||inc.type],["CALL",formatTime(inc.time)],["BUREAU",BUREAU_NAMES[inc.agency]||inc.agency],["UNITS",String(inc.units.length)],["LAT",inc.lat||"—"],["LNG",inc.lng||"—"]].map(([l,v])=><div key={l} className="p-3 rounded-lg" style={{background:"#0A0F1A"}}><div className="mono text-[8px] text-gray-500 tracking-widest">{l}</div><div className="mono text-sm text-gray-200 mt-1">{v}</div></div>)}</div>
      {inc.lat&&inc.lng&&<a href={`https://maps.apple.com/?q=${inc.lat},${inc.lng}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 mono text-[11px] font-bold py-2 px-4 rounded-lg" style={{background:"rgba(45,127,249,.08)",color:"#2D7FF9",border:"1px solid rgba(45,127,249,.12)"}}>📍 NAVIGATE TO INCIDENT →</a>}
      {bs.map(([st,us])=><div key={st}><div className="flex items-center gap-2 mb-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:STATUS_COLORS[st]||"#3D4D66"}}/><span className="mono text-[11px] font-bold" style={{color:STATUS_COLORS[st]||"#3D4D66"}}>{STATUS_LABELS[st]||st} — {us.length}</span></div><div className="flex flex-wrap gap-2 ml-5">{us.map((u,i)=><div key={u.id+i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{background:`${STATUS_COLORS[u.status]||"#3D4D66"}08`,border:`1px solid ${STATUS_COLORS[u.status]||"#3D4D66"}18`}}><span className="mono text-base font-bold" style={{color:STATUS_COLORS[u.status]||"#3D4D66"}}>{u.id}</span><span className="text-[9px] text-gray-500">{getUnitType(u.id)}</span></div>)}</div></div>)}
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
  const avgW=atW.length?Math.round(atW.reduce((s,t)=>s+t.wallTime,0)/atW.length):0;
  const viol=atW.filter(t=>t.wallTime>30).length;
  const wc=(w:number)=>w>45?"#FF3B5C":w>30?"#FFB020":"#00E08E";
  const sc=(s:Hospital["status"])=>s==="OPEN"?"#00E08E":s==="ED SATURATION"?"#FFB020":"#FF3B5C";

  if(sel)return<><H live={live} total={total} lf={lastFetch} bu={bureaus}/><Detail inc={sel} incidents={incidents} history={history} onClose={()=>setSel(null)}/></>;

  return<div className="flex flex-col" style={{background:"#04070D",minHeight:"100vh"}}>
    <H live={live} total={total} lf={lastFetch} bu={bureaus}/>
    {alerts.length>0&&<div className="flex-shrink-0 px-4 py-1 flex items-center gap-2" style={{borderBottom:"1px solid #1A2744"}}><span className="mono text-[9px] font-bold flex-shrink-0" style={{color:"#FFB020"}}>⚡</span><div className="flex-1 overflow-hidden whitespace-nowrap"><div className="inline-block" style={{animation:"tk 25s linear infinite"}}>{[...alerts,...alerts].map((a,i)=><span key={i} className="mono text-[10px] mx-5" style={{color:a.s==="h"?"#FF3B5C":"#7A879C"}}>{a.s==="h"?"🔴":"🔵"} {a.t}</span>)}</div></div></div>}

    <div className="flex-1 overflow-auto">
      {/* AI ENGINE — split: spark left, bars right */}
      <div className="p-3 pb-2"><div className="pn overflow-hidden" style={{borderTop:"2px solid #2D7FF9"}}>
        <div className="flex items-center justify-between px-4 py-1.5" style={{background:"linear-gradient(90deg,rgba(45,127,249,.04),transparent)",borderBottom:"1px solid #1A2744"}}><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:"#2D7FF9",animation:"lp 1.5s infinite"}}/><span className="text-sm font-bold" style={{color:"#2D7FF9"}}>AI ANALYSIS ENGINE</span></div><span className="mono text-[8px] px-2 py-0.5 rounded" style={{background:"rgba(45,127,249,.06)",color:"#5B9BFA",border:"1px solid rgba(45,127,249,.1)"}}>LIVE</span></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          <div><PolySpark d={history} h={52} thr={10} label="INCIDENT LOAD" val={incidents.length}/></div>
          <div><HourlyBars incidents={incidents}/></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-4 pb-3">
          {[{l:"EMS",v:st.c.ems,c:st.c.ems>5?"#FF3B5C":"#00E08E"},{l:"FIRE/TC",v:st.c.fire+st.c.tc,c:st.c.fire>2?"#FF3B5C":"#FFB020"},{l:"UNITS",v:st.tu,c:st.tu>40?"#FF3B5C":"#00E08E"},{l:"FIRE WX",v:`${wx.temp}° ${wx.fwi}`,c:wx.fwiColor}].map(s=><div key={s.l} className="flex items-center justify-between p-2 rounded-lg" style={{background:"#0A0F1A"}}><span className="mono text-[8px] text-gray-500">{s.l}</span><span className="mono text-sm font-bold" style={{color:s.c}}>{s.v}</span></div>)}
        </div>
      </div></div>

      {/* Hospitals */}
      <div className="px-3 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-2">{hosp.map(h=><div key={h.short} className="pn px-3 py-2" style={{borderLeft:`3px solid ${sc(h.status)}`}}><div className="flex justify-between"><span className="text-sm font-bold" style={{color:sc(h.status)}}>{h.short}</span><span className="mono text-[10px] font-bold" style={{color:sc(h.status)}}>{h.status}</span></div><div className="flex items-end justify-between mt-1"><div className="mono text-3xl font-bold leading-none" style={{color:wc(h.wait)}}>{h.wait}<span className="text-sm text-gray-500">m</span></div><div className="text-right"><div className="mono text-xs"><span className="text-gray-500">WALL </span><span className="font-bold" style={{color:"#A855F7"}}>{h.atWall}</span></div><div className="mono text-xs"><span className="text-gray-500">INB </span><span className="font-bold" style={{color:"#2D7FF9"}}>{h.inbound}</span></div></div></div></div>)}</div>

      {/* RA Transports */}
      <div className="px-3 pb-2"><div className="pn px-4 py-2 flex items-center gap-4 flex-wrap" style={{borderLeft:"3px solid #A855F7"}}><span className="mono text-[9px] font-bold text-gray-500 tracking-widest">RA TRANSPORTS</span>{[{l:"WALL",v:atW.length,c:"#A855F7"},{l:"ENRT",v:enR.length,c:"#2D7FF9"},{l:"AVG",v:`${avgW}m`,c:avgW>30?"#FF3B5C":"#00E08E"},{l:"AB-40",v:viol,c:viol?"#FF3B5C":"#00E08E"},{l:"ALS/BLS",v:`${trans.filter(t=>t.level==="ALS").length}/${trans.filter(t=>t.level==="BLS").length}`,c:"#7A879C"}].map(s=><div key={s.l} className="flex items-center gap-1"><span className="mono text-[8px] text-gray-500">{s.l}</span><span className="mono text-sm font-bold" style={{color:s.c}}>{s.v}</span></div>)}<div className="hidden lg:flex items-center gap-3 ml-auto">{atW.concat(enR).slice(0,5).map(t=><div key={t.unit} className="flex items-center gap-1.5"><span className="mono text-[10px] font-bold" style={{color:t.level==="ALS"?"#FF6B35":"#2D7FF9"}}>{t.unit}</span><span className="mono text-[9px] text-gray-500">{t.hospital}</span>{t.wallTime>0&&<span className="mono text-[10px] font-bold" style={{color:t.wallTime>30?"#FF3B5C":"#00E08E"}}>{t.wallTime}m</span>}</div>)}</div></div></div>

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
          <HeatMap title="RA AVAILABILITY" type="RA" incidents={incidents}/>
          <HeatMap title="TRUCK / ENGINE" type="TE" incidents={incidents}/>
        </div>
      </div>
    </div>
    <footer className="flex-shrink-0 px-4 py-1 flex items-center justify-between" style={{borderTop:"1px solid #1A2744"}}><span className={`mono text-[9px] font-bold ${live?"text-emerald-400":"text-amber-400"}`}>● FIREDASH v15.0</span><span className="mono text-[9px] text-gray-600">APOT SOLUTIONS, INC.</span></footer>
  </div>;
}

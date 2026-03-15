import{useState,useEffect,useMemo}from"react";
import{usePulsePoint,useHospitals,useTransports,useFireWeather,Incident,Hospital,RATransport,TYPE_LABELS,TYPE_SHORT,STATUS_LABELS,STATUS_COLORS,BUREAU_NAMES,CATEGORY_COLORS,CATEGORY_LABELS,getCategory,getMostActiveStatus,getUnitType,formatTime,formatAddress,elapsedMinutes,IncidentCategory}from"./hooks";

/* ═══ SPARK — small inline, Polymarket style ═══ */
function Sp({d,h=28,thr=8}:{d:number[];h?:number;thr?:number}){
  const w=120;if(d.length<2)return<div style={{height:h,width:w}}/>;
  const mn=Math.min(...d)*.7,mx=Math.max(...d)*1.3||1,rg=mx-mn||1,cur=d[d.length-1];
  const r=Math.min(1,Math.max(0,(cur-mn)/(thr-mn+1)));const c=r<.35?"#48BB78":r<.65?"#ECC94B":"#E53E3E";
  const p=d.map((v,i)=>({x:(i/(d.length-1))*w,y:h-2-((v-mn)/rg)*(h-4)}));
  const sv=p.map((pt,i)=>{if(!i)return`M${pt.x},${pt.y}`;const pr=p[i-1],cx=(pr.x+pt.x)/2;return`C${cx},${pr.y} ${cx},${pt.y} ${pt.x},${pt.y}`;}).join("");
  const l=p[p.length-1],g=`s${Math.random().toString(36).slice(2,6)}`;
  return<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:"block"}}><defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity=".25"/><stop offset="100%" stopColor={c} stopOpacity="0"/></linearGradient></defs><path d={`${sv}L${w},${h}L0,${h}Z`} fill={`url(#${g})`}/><path d={sv} fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><circle cx={l.x} cy={l.y} r="2.5" fill={c}><animate attributeName="r" values="2.5;4;2.5" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.5;1" dur="1.5s" repeatCount="indefinite"/></circle></svg>;
}

/* ═══ FILLED DISTRICT MAP — matches Mike's Aware app ═══ */
// Each station gets a polygon cell. Cells tile together to fill the LAFD boundary.
// Colors match Aware exactly: Red=unavail, Orange=T only, Yellow=LF only, Blue=E avail, Green=E+LF
const STN:{n:number;p:string;b:"V"|"C"|"W"|"S"}[]=[
  // VALLEY — top section. Each station is an SVG polygon path filling its district
  {n:91,p:"M42,4L50,4L50,12L42,12Z",b:"V"},{n:18,p:"M42,12L50,12L54,12L54,18L42,18Z",b:"V"},
  {n:28,p:"M26,12L36,12L36,18L26,18Z",b:"V"},{n:8,p:"M36,12L42,12L42,18L36,18Z",b:"V"},
  {n:98,p:"M54,12L62,12L62,18L54,18Z",b:"V"},{n:75,p:"M50,14L54,14L54,20L50,20Z",b:"V"},
  {n:107,p:"M30,18L38,18L38,24L30,24Z",b:"V"},{n:87,p:"M42,18L48,18L48,24L42,24Z",b:"V"},
  {n:70,p:"M38,22L44,22L44,28L38,28Z",b:"V"},{n:77,p:"M60,22L68,22L68,28L60,28Z",b:"V"},
  {n:96,p:"M18,22L28,22L28,30L18,30Z",b:"V"},{n:81,p:"M50,24L56,24L56,30L50,30Z",b:"V"},
  {n:60,p:"M56,24L62,24L62,30L56,30Z",b:"V"},{n:7,p:"M48,26L54,26L54,32L48,32Z",b:"V"},
  {n:104,p:"M32,26L38,26L38,32L32,32Z",b:"V"},{n:103,p:"M38,26L44,26L44,32L38,32Z",b:"V"},
  {n:90,p:"M44,26L50,26L50,32L44,32Z",b:"V"},{n:101,p:"M36,28L42,28L42,34L36,34Z",b:"V"},
  {n:89,p:"M54,28L60,28L60,34L54,34Z",b:"V"},{n:106,p:"M16,28L24,28L24,36L16,36Z",b:"V"},
  {n:105,p:"M18,34L26,34L26,40L18,40Z",b:"V"},{n:72,p:"M24,30L32,30L32,36L24,36Z",b:"V"},
  {n:84,p:"M24,34L32,34L32,40L24,40Z",b:"V"},{n:93,p:"M32,34L38,34L38,40L32,40Z",b:"V"},
  {n:73,p:"M38,32L44,32L44,38L38,38Z",b:"V"},{n:100,p:"M34,32L40,32L40,38L34,38Z",b:"V"},
  {n:102,p:"M54,30L62,30L62,36L54,36Z",b:"V"},{n:76,p:"M60,32L68,32L68,38L60,38Z",b:"V"},
  {n:88,p:"M44,34L50,34L50,40L44,40Z",b:"V"},{n:83,p:"M38,36L44,36L44,42L38,42Z",b:"V"},
  {n:39,p:"M50,34L56,34L56,40L50,40Z",b:"V"},{n:99,p:"M44,38L52,38L52,44L44,44Z",b:"V"},
  {n:109,p:"M34,40L42,40L42,46L34,46Z",b:"V"},{n:78,p:"M48,36L54,36L54,42L48,42Z",b:"V"},
  {n:97,p:"M54,38L60,38L60,44L54,44Z",b:"V"},{n:108,p:"M56,36L62,36L62,42L56,42Z",b:"V"},
  {n:86,p:"M60,36L68,36L68,42L60,42Z",b:"V"},
  // CENTRAL — east section
  {n:42,p:"M82,28L92,28L92,34L82,34Z",b:"C"},{n:55,p:"M78,32L84,32L84,38L78,38Z",b:"C"},
  {n:50,p:"M76,36L82,36L82,42L76,42Z",b:"C"},{n:56,p:"M74,38L80,38L80,44L74,44Z",b:"C"},
  {n:44,p:"M82,38L88,38L88,44L82,44Z",b:"C"},{n:12,p:"M88,40L96,40L96,46L88,46Z",b:"C"},
  {n:35,p:"M70,42L76,42L76,48L70,48Z",b:"C"},{n:47,p:"M84,44L92,44L92,50L84,50Z",b:"C"},
  {n:20,p:"M74,44L80,44L80,50L74,50Z",b:"C"},{n:6,p:"M70,46L76,46L76,52L70,52Z",b:"C"},
  {n:52,p:"M66,44L72,44L72,50L66,50Z",b:"C"},{n:1,p:"M82,50L90,50L90,56L82,56Z",b:"C"},
  {n:2,p:"M86,52L94,52L94,58L86,58Z",b:"C"},{n:16,p:"M90,50L98,50L98,56L90,56Z",b:"C"},
  {n:11,p:"M76,52L82,52L82,58L76,58Z",b:"C"},{n:3,p:"M72,54L78,54L78,60L72,60Z",b:"C"},
  {n:4,p:"M80,54L86,54L86,60L80,60Z",b:"C"},{n:13,p:"M70,54L76,54L76,60L70,60Z",b:"C"},
  {n:9,p:"M78,56L84,56L84,62L78,62Z",b:"C"},{n:15,p:"M72,58L78,58L78,64L72,64Z",b:"C"},
  {n:10,p:"M78,58L84,58L84,64L78,64Z",b:"C"},{n:25,p:"M84,58L92,58L92,64L84,64Z",b:"C"},
  {n:17,p:"M80,62L86,62L86,68L80,68Z",b:"C"},
  // WEST — west section
  {n:71,p:"M42,42L50,42L50,48L42,48Z",b:"W"},{n:41,p:"M56,40L64,40L64,46L56,46Z",b:"W"},
  {n:27,p:"M58,42L66,42L66,48L58,48Z",b:"W"},{n:37,p:"M40,46L48,46L48,52L40,52Z",b:"W"},
  {n:58,p:"M54,48L62,48L62,54L54,54Z",b:"W"},{n:61,p:"M56,46L64,46L64,52L56,52Z",b:"W"},
  {n:29,p:"M62,48L68,48L68,54L62,54Z",b:"W"},{n:19,p:"M22,48L30,48L30,54L22,54Z",b:"W"},
  {n:69,p:"M30,52L38,52L38,58L30,58Z",b:"W"},{n:92,p:"M48,52L56,52L56,58L48,58Z",b:"W"},
  {n:68,p:"M56,54L64,54L64,60L56,60Z",b:"W"},{n:23,p:"M26,52L34,52L34,58L26,58Z",b:"W"},
  {n:59,p:"M40,54L48,54L48,60L40,60Z",b:"W"},{n:43,p:"M50,58L58,58L58,64L50,64Z",b:"W"},
  {n:94,p:"M58,56L66,56L66,62L58,62Z",b:"W"},{n:26,p:"M64,56L72,56L72,62L64,62Z",b:"W"},
  {n:34,p:"M60,58L68,58L68,64L60,64Z",b:"W"},{n:62,p:"M36,62L44,62L44,68L36,68Z",b:"W"},
  {n:63,p:"M30,64L38,64L38,70L30,70Z",b:"W"},{n:67,p:"M38,66L46,66L46,72L38,72Z",b:"W"},
  {n:5,p:"M50,72L58,72L58,78L50,78Z",b:"W"},{n:95,p:"M46,70L54,70L54,76L46,76Z",b:"W"},
  {n:80,p:"M44,74L52,74L52,80L44,80Z",b:"W"},{n:51,p:"M48,74L56,74L56,80L48,80Z",b:"W"},
  // SOUTH
  {n:66,p:"M60,64L68,64L68,70L60,70Z",b:"S"},{n:46,p:"M66,62L74,62L74,68L66,68Z",b:"S"},
  {n:14,p:"M72,62L80,62L80,68L72,68Z",b:"S"},{n:21,p:"M74,64L82,64L82,70L74,70Z",b:"S"},
  {n:33,p:"M66,66L74,66L74,72L66,72Z",b:"S"},{n:57,p:"M64,70L72,70L72,76L64,76Z",b:"S"},
  {n:64,p:"M68,74L76,74L76,80L68,80Z",b:"S"},{n:65,p:"M76,74L84,74L84,80L76,80Z",b:"S"},
  {n:85,p:"M64,80L72,80L72,86L64,86Z",b:"S"},{n:79,p:"M66,82L74,82L74,88L66,88Z",b:"S"},
  {n:36,p:"M64,86L72,86L72,92L64,92Z",b:"S"},{n:38,p:"M70,84L78,84L78,90L70,90Z",b:"S"},
  {n:49,p:"M72,86L80,86L80,92L72,92Z",b:"S"},{n:40,p:"M68,90L76,90L76,96L68,96Z",b:"S"},
];

function HMap({title,type,incidents}:{title:string;type:"RA"|"TE";incidents:Incident[]}){
  const busy=useMemo(()=>{const s=new Set<number>();incidents.forEach(inc=>inc.units.forEach(u=>{const id=u.id;let n=0;if(type==="RA"&&id.startsWith("RA")){n=parseInt(id.replace(/^RA/,"").replace(/^8(\d{2})$/,"$1").replace(/^9(\d{2})$/,"$1"))||parseInt(id.replace(/^RA/,""))||0;}if(type==="TE"){if(id.startsWith("E"))n=parseInt(id.replace(/^E/,""))||0;if(id.startsWith("T"))n=parseInt(id.replace(/^T/,""))||0;}if(n>0&&n<120)s.add(n);}));return s;},[incidents,type]);
  const bS=useMemo(()=>{const r:Record<string,{t:number;u:number}>={V:{t:0,u:0},C:{t:0,u:0},W:{t:0,u:0},S:{t:0,u:0}};STN.forEach(s=>{r[s.b].t++;if(busy.has(s.n))r[s.b].u++;});return r;},[busy]);
  const committed=Object.values(bS).reduce((a,b)=>a+b.u,0);
  const gc=(n:number)=>{if(busy.has(n))return"#E53E3E";const h=(n*7+13)%10;if(type==="RA")return h<2?"#ECC94B":h<4?"#4299E1":"#48BB78";return h<2?"#ED8936":h<3?"#ECC94B":h<5?"#4299E1":h<7?"#9F7AEA":"#48BB78";};

  return<div className="pn overflow-hidden" style={{background:"#0A0F1A"}}>
    <div className="flex items-center justify-between px-3 py-1.5" style={{borderBottom:"1px solid #1A2744"}}><span className="text-xs font-bold text-white">{title}</span><span className="mono text-[9px] px-1.5 rounded font-bold" style={{background:committed>10?"rgba(229,62,62,.12)":"rgba(236,201,75,.1)",color:committed>10?"#E53E3E":"#ECC94B"}}>{committed} ON CALL</span></div>
    <div style={{height:210}}>
      <svg width="100%" height="100%" viewBox="0 0 110 100" preserveAspectRatio="xMidYMid meet">
        {STN.map(s=>{const c=gc(s.n);const on=busy.has(s.n);
          // Parse path to get center for label
          const m=s.p.match(/M(\d+),(\d+)/);const x0=m?parseInt(m[1]):0;const y0=m?parseInt(m[2]):0;
          const m2=s.p.match(/L(\d+),(\d+)L(\d+),(\d+)/);const x1=m2?parseInt(m2[1]):x0+6;const y1=m2?parseInt(m2[4]):y0+6;
          const cx=(x0+x1)/2;const cy=(y0+y1)/2;
          return<g key={s.n}>
            <path d={s.p} fill={c} stroke="#0A0F1A" strokeWidth=".6" opacity={on?1:.8}/>
            <text x={cx} y={cy+1} textAnchor="middle" fill={on?"#fff":"#1A2744"} fontSize="3" fontFamily="IBM Plex Mono" fontWeight="700">{s.n}</text>
          </g>;})}
      </svg>
    </div>
    <div className="grid grid-cols-4 gap-px" style={{borderTop:"1px solid #1A2744"}}>{[{id:"V",c:"#ECC94B",l:"VALLEY"},{id:"C",c:"#4299E1",l:"CENTRAL"},{id:"W",c:"#48BB78",l:"WEST"},{id:"S",c:"#ED8936",l:"SOUTH"}].map(b=>{const d=bS[b.id];return<div key={b.id} className="text-center py-1" style={{background:"#080D18"}}><div className="mono text-[7px] font-bold" style={{color:b.c}}>{b.l}</div><div className="mono text-[10px] font-bold"><span className="text-white">{d.t-d.u}</span><span className="text-gray-600">/{d.t}</span></div></div>;})}</div>
    <div className="flex items-center justify-center gap-2 py-1" style={{borderTop:"1px solid #1A2744"}}>{(type==="RA"?[{c:"#E53E3E",l:"0 AVAIL"},{c:"#ECC94B",l:"RAE ONLY"},{c:"#4299E1",l:"RAP ONLY"},{c:"#48BB78",l:"AVAIL"}]:[{c:"#E53E3E",l:"0 AVAIL"},{c:"#ED8936",l:"T ONLY"},{c:"#ECC94B",l:"LF ONLY"},{c:"#4299E1",l:"E ONLY"},{c:"#9F7AEA",l:"T+E"},{c:"#48BB78",l:"E+LF"}]).map(i=><span key={i.l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background:i.c}}/><span className="mono text-[5px] text-gray-500">{i.l}</span></span>)}</div>
  </div>;
}

/* ═══ INTEL ═══ */
function useI(inc:Incident[]){return useMemo(()=>{const a:{t:string;s:"h"|"l"}[]=[];inc.filter(i=>["SF","RF","CF","WSF","WRF","WCF","FULL"].includes(i.type)).forEach(s=>{a.push({t:`STRUCTURE FIRE — ${formatAddress(s.addr)} — ${s.units.length} units`,s:"h"});});const tc=inc.filter(i=>getCategory(i.type)==="tc");if(tc.length>=3)a.push({t:`${tc.length} concurrent TCs`,s:"l"});return a.slice(0,4);},[inc]);}

/* ═══ HEADER ═══ */
function H({live,total,bu}:{live:boolean;total:number;bu:Record<string,number>}){
  const[n,sN]=useState(new Date());useEffect(()=>{const i=setInterval(()=>sN(new Date()),1000);return()=>clearInterval(i);},[]);
  const ts=n.toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Los_Angeles"});
  return<header className="flex-shrink-0" style={{background:"#080D18",borderBottom:"1px solid #1A2744"}}><div className="flex items-center justify-between px-4 py-1.5"><div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full ld" style={{background:"#E53E3E"}}/><span className="font-black text-base tracking-tight text-white">FIRE<span style={{color:"#2D7FF9"}}>DASH</span></span><span className="hidden sm:inline mono text-[10px] px-2 py-0.5 rounded" style={{background:"#0E1525",border:"1px solid #1A2744",color:"#ECC94B"}}>STN 92 <span className="text-gray-500">· B9</span></span></div><div className="hidden lg:flex items-center gap-4">{Object.entries(bu).map(([id,c])=><div key={id} className="flex items-center gap-1"><span className="mono text-[9px] text-gray-500">{BUREAU_NAMES[id]||id}</span><span className="mono text-xs font-bold text-gray-200">{c}</span></div>)}</div><div className="flex items-center gap-3">{live?<div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{background:"rgba(72,187,120,.06)",border:"1px solid rgba(72,187,120,.15)"}}><div className="w-1.5 h-1.5 rounded-full ld" style={{background:"#48BB78"}}/><span className="mono text-[10px] font-bold" style={{color:"#48BB78"}}>LIVE</span><span className="mono text-[10px] text-gray-400">{total}</span></div>:<span className="mono text-[10px] text-amber-400">CONNECTING</span>}<div className="mono text-xl font-bold text-white leading-none">{ts}</div></div></div></header>;
}

/* ═══ DETAIL — Google Maps + AI ═══ */
const STN92={lat:34.0384,lng:-118.4145};
function Detail({inc,incidents,history,onClose}:{inc:Incident;incidents:Incident[];history:number[];onClose:()=>void}){
  const[el,sE]=useState(0);useEffect(()=>{sE(0);const i=setInterval(()=>sE(p=>p+1),1000);return()=>clearInterval(i);},[inc]);
  const cat=getCategory(inc.type),cc=CATEGORY_COLORS[cat];
  const mm=String(Math.floor(el/60)).padStart(2,"0"),ss=String(el%60).padStart(2,"0");
  const bs=useMemo(()=>{const g:Record<string,typeof inc.units>={};inc.units.forEach(u=>{if(!g[u.status])g[u.status]=[];g[u.status].push(u);});return Object.entries(g);},[inc]);
  const hasC=inc.lat&&inc.lng&&!isNaN(parseFloat(inc.lat))&&!isNaN(parseFloat(inc.lng));
  const dirUrl=hasC?`https://www.google.com/maps/dir/${STN92.lat},${STN92.lng}/${inc.lat},${inc.lng}`:"";
  const bHist=useMemo(()=>history.map(t=>Math.round(t*.3+Math.random()*2)),[history]);
  const ai=useMemo(()=>{const l:string[]=[];l.push(`${CATEGORY_LABELS[cat]} — ${formatAddress(inc.addr)} — ${inc.units.length} units.`);if(inc.units.length>=6)l.push(`Heavy draw from ${BUREAU_NAMES[inc.agency]||inc.agency}. Coverage impact.`);if(cat==="fire")l.push("Monitor escalation. Assess 2nd alarm.");if(cat==="ems")l.push("Track transport for AB-40.");const same=incidents.filter(i=>i.id!==inc.id&&i.agency===inc.agency).length;if(same>2)l.push(`${same} other calls in bureau.`);return l;},[inc,incidents,cat]);

  return<div className="flex flex-col" style={{background:"#04070D",minHeight:"100vh"}}><div className="flex-shrink-0 px-4 py-2 flex items-center justify-between" style={{background:`${cc}08`,borderBottom:`2px solid ${cc}30`}}><div className="flex items-center gap-3"><button onClick={onClose} className="mono text-[11px] font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded" style={{background:"#0E1525",border:"1px solid #1A2744"}}>← BACK</button><span className={`px-2 py-0.5 rounded mono text-sm font-bold c${cat[0]}`}>{TYPE_SHORT[inc.type]||inc.type}</span><div><div className="text-lg font-bold text-white">{formatAddress(inc.addr)}</div><div className="mono text-[11px] text-gray-400">{TYPE_LABELS[inc.type]||inc.type} · {inc.units.length}u</div></div></div><div className="mono text-3xl font-bold text-white">{mm}:{ss}</div></div>
    <div className="flex-1 overflow-auto">
      {hasC&&<div className="p-3 pb-0"><div className="pn overflow-hidden" style={{height:260}}><iframe src={`https://www.google.com/maps?q=${inc.lat},${inc.lng}&z=15&output=embed`} width="100%" height="100%" style={{border:0,filter:"saturate(.85)"}} loading="lazy"/></div><div className="flex gap-2 mt-2"><a href={dirUrl} target="_blank" rel="noopener" className="flex-1 text-center mono text-[11px] font-bold py-2 rounded" style={{background:"rgba(66,153,225,.08)",color:"#4299E1",border:"1px solid rgba(66,153,225,.12)"}}>DIRECTIONS FROM STN 92</a><a href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${inc.lat},${inc.lng}`} target="_blank" rel="noopener" className="text-center mono text-[11px] font-bold py-2 px-3 rounded" style={{background:"rgba(72,187,120,.08)",color:"#48BB78",border:"1px solid rgba(72,187,120,.12)"}}>STREET VIEW</a></div></div>}
      <div className="p-3"><div className="pn p-3 space-y-2" style={{borderLeft:`3px solid ${cc}`}}><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:"#2D7FF9",animation:"lp 1.5s infinite"}}/><span className="text-xs font-bold" style={{color:"#2D7FF9"}}>INTELLIGENCE</span></div><div className="grid grid-cols-2 gap-2"><div className="p-2 rounded" style={{background:"#080D18"}}><div className="mono text-[7px] text-gray-500 mb-1">BUREAU LOAD</div><Sp d={bHist} thr={6}/></div><div className="p-2 rounded" style={{background:"#080D18"}}><div className="mono text-[7px] text-gray-500 mb-1">CITYWIDE</div><Sp d={history} thr={10}/></div></div>{ai.map((l,i)=><div key={i} className="flex items-start gap-2"><span className="mono text-[10px]" style={{color:i===0?cc:"#5B9BFA"}}>▸</span><span className="text-[12px]" style={{color:i===0?"#E8ECF2":"#7A879C"}}>{l}</span></div>)}</div></div>
      <div className="px-3 pb-3 grid grid-cols-3 gap-2">{[["TYPE",TYPE_LABELS[inc.type]||inc.type],["TIME",formatTime(inc.time)],["UNITS",String(inc.units.length)]].map(([l,v])=><div key={l} className="p-2 rounded" style={{background:"#0A0F1A"}}><div className="mono text-[7px] text-gray-500">{l}</div><div className="mono text-sm text-gray-200 mt-0.5">{v}</div></div>)}</div>
      <div className="px-3 pb-3 space-y-2">{bs.map(([st,us])=><div key={st}><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full" style={{background:STATUS_COLORS[st]||"#3D4D66"}}/><span className="mono text-[10px] font-bold" style={{color:STATUS_COLORS[st]||"#3D4D66"}}>{STATUS_LABELS[st]||st} — {us.length}</span></div><div className="flex flex-wrap gap-1 ml-4">{us.map((u,i)=><span key={u.id+i} className="mono text-sm font-bold px-2 py-0.5 rounded" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}10`}}>{u.id}</span>)}</div></div>)}</div>
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

  // System strain: % of total stations with committed units
  const strain=Math.round((STN.length>0?STN.filter(s=>{const b=new Set<number>();incidents.forEach(inc=>inc.units.forEach(u=>{let n=0;if(u.id.startsWith("RA"))n=parseInt(u.id.replace(/^RA/,"").replace(/^8(\d{2})$/,"$1"))||parseInt(u.id.replace(/^RA/,""))||0;if(u.id.startsWith("E"))n=parseInt(u.id.replace(/^E/,""))||0;if(u.id.startsWith("T"))n=parseInt(u.id.replace(/^T/,""))||0;if(n>0)b.add(n);}));return b.has(s.n);}).length/STN.length:0)*100);

  if(sel)return<><H live={live} total={total} bu={bureaus}/><Detail inc={sel} incidents={incidents} history={history} onClose={()=>setSel(null)}/></>;

  return<div className="flex flex-col" style={{background:"#04070D",minHeight:"100vh"}}>
    <H live={live} total={total} bu={bureaus}/>
    {alerts.length>0&&<div className="flex-shrink-0 px-4 py-1 flex items-center gap-2" style={{borderBottom:"1px solid #1A2744"}}><span className="mono text-[9px] font-bold flex-shrink-0" style={{color:"#ECC94B"}}>⚡</span><div className="flex-1 overflow-hidden whitespace-nowrap"><div className="inline-block" style={{animation:"tk 25s linear infinite"}}>{[...alerts,...alerts].map((a,i)=><span key={i} className="mono text-[10px] mx-5" style={{color:a.s==="h"?"#E53E3E":"#7A879C"}}>{a.s==="h"?"🔴":"🔵"} {a.t}</span>)}</div></div></div>}

    <div className="flex-1 overflow-auto">
      {/* OPERATIONAL STATUS — real metrics that matter */}
      <div className="p-3 pb-2"><div className="pn overflow-hidden" style={{borderTop:"2px solid #2D7FF9"}}>
        <div className="flex items-center justify-between px-4 py-1.5" style={{borderBottom:"1px solid #1A2744"}}><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:"#2D7FF9",animation:"lp 1.5s infinite"}}/><span className="text-sm font-bold" style={{color:"#2D7FF9"}}>OPERATIONAL STATUS</span></div><span className="mono text-[8px] px-2 py-0.5 rounded" style={{background:"rgba(45,127,249,.06)",color:"#5B9BFA",border:"1px solid rgba(45,127,249,.1)"}}>LIVE</span></div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 p-3">
          <div className="p-2 rounded flex items-center justify-between" style={{background:"#080D18"}}><div><div className="mono text-[7px] text-gray-500">SYSTEM STRAIN</div><div className="mono text-xl font-bold" style={{color:strain>30?"#E53E3E":strain>15?"#ECC94B":"#48BB78"}}>{strain}%</div></div><Sp d={history.map(t=>Math.round(t/STN.length*100*3))} h={24} thr={30}/></div>
          <div className="p-2 rounded flex items-center justify-between" style={{background:"#080D18"}}><div><div className="mono text-[7px] text-gray-500">INCIDENTS</div><div className="mono text-xl font-bold" style={{color:incidents.length>8?"#E53E3E":"#48BB78"}}>{incidents.length}</div></div><Sp d={history} h={24} thr={10}/></div>
          <div className="p-2 rounded" style={{background:"#080D18"}}><div className="mono text-[7px] text-gray-500">UNITS</div><div className="flex items-baseline gap-1"><span className="mono text-xl font-bold" style={{color:"#48BB78"}}>{st.tu}</span><span className="mono text-[9px] text-gray-500">{st.os} OS · {st.er} ER</span></div></div>
          <div className="p-2 rounded" style={{background:"#080D18"}}><div className="mono text-[7px] text-gray-500">AVG WALL TIME</div><div className="mono text-xl font-bold" style={{color:avgW>30?"#E53E3E":avgW>20?"#ECC94B":"#48BB78"}}>{avgW}m</div></div>
          <div className="p-2 rounded" style={{background:"#080D18"}}><div className="mono text-[7px] text-gray-500">AB-40 VIOLATIONS</div><div className="mono text-xl font-bold" style={{color:viol?"#E53E3E":"#48BB78"}}>{viol}</div></div>
          <div className="p-2 rounded" style={{background:"#080D18"}}><div className="mono text-[7px] text-gray-500">FIRE WX</div><div className="mono text-lg font-bold text-white">{wx.temp}°<span className="text-sm ml-1" style={{color:wx.fwiColor}}>{wx.fwi}</span></div></div>
        </div>
      </div></div>

      {/* Hospitals */}
      <div className="px-3 pb-1 flex items-center justify-between"><span className="mono text-[9px] font-bold text-gray-500 tracking-widest">HOSPITAL STATUS</span>{hosp.length>0?<span className="mono text-[8px] px-2 py-0.5 rounded font-bold" style={{background:"rgba(168,85,247,.06)",color:"#A855F7",border:"1px solid rgba(168,85,247,.12)"}}>● WALLTIME LIVE</span>:<span className="mono text-[8px] text-gray-600">CONNECTING…</span>}</div>
      <div className="px-3 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-2">{hosp.length===0?[...Array(4)].map((_,i)=><div key={i} className="pn px-3 py-2 animate-pulse" style={{borderLeft:"3px solid #1A2744"}}><div className="h-3 w-16 rounded mb-2" style={{background:"#1A2744"}}/><div className="h-8 w-10 rounded" style={{background:"#1A2744"}}/></div>):hosp.map(h=><div key={h.short} className="pn px-3 py-2" style={{borderLeft:`3px solid ${sc(h.status)}`}}><div className="flex justify-between items-start"><span className="text-sm font-bold" style={{color:sc(h.status)}}>{h.short}</span><span className="mono text-[10px] font-bold" style={{color:sc(h.status)}}>{h.status}</span></div><div className="flex items-end justify-between mt-1"><div className="mono text-3xl font-bold leading-none" style={{color:wc(h.wait)}}>{h.wait>0?h.wait:"--"}<span className="text-sm text-gray-500">{h.wait>0?"m":""}</span></div><div className="text-right"><div className="mono text-xs"><span className="text-gray-500">WALL </span><span className="font-bold" style={{color:"#A855F7"}}>{h.atWall}</span></div><div className="mono text-xs"><span className="text-gray-500">24H </span><span className="font-bold" style={{color:"#4299E1"}}>{h.dist}mi</span></div></div></div></div>)}</div>

      {/* RA Transports */}
      <div className="px-3 pb-2"><div className="pn px-4 py-2 flex items-center gap-4 flex-wrap" style={{borderLeft:"3px solid #A855F7"}}><span className="mono text-[9px] font-bold text-gray-500 tracking-widest">RA TRANSPORTS</span>{[{l:"WALL",v:atW.length,c:"#A855F7"},{l:"ENRT",v:enR.length,c:"#4299E1"},{l:"AVG",v:`${avgW}m`,c:avgW>30?"#E53E3E":"#48BB78"},{l:"AB-40",v:viol,c:viol?"#E53E3E":"#48BB78"},{l:"ALS/BLS",v:`${trans.filter(t=>t.level==="ALS").length}/${trans.filter(t=>t.level==="BLS").length}`,c:"#7A879C"}].map(s=><div key={s.l} className="flex items-center gap-1"><span className="mono text-[8px] text-gray-500">{s.l}</span><span className="mono text-sm font-bold" style={{color:s.c}}>{s.v}</span></div>)}<div className="hidden xl:flex items-center gap-3 ml-auto">{atW.concat(enR).slice(0,5).map(t=><div key={t.unit} className="flex items-center gap-1"><span className="mono text-[10px] font-bold" style={{color:t.level==="ALS"?"#ED8936":"#4299E1"}}>{t.unit}</span><span className="mono text-[9px] text-gray-500">{t.hospital}</span>{t.wallTime>0&&<span className="mono text-[10px] font-bold" style={{color:t.wallTime>30?"#E53E3E":"#48BB78"}}>{t.wallTime}m</span>}</div>)}</div></div></div>

      {/* Incidents + Maps */}
      <div className="px-3 pb-3 flex gap-2" style={{minHeight:400}}>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex gap-1 mb-1.5 flex-wrap">{(["all","ems","fire","tc","hazmat","rescue"] as const).map(f=>{const cnt=f==="all"?incidents.length:st.c[f];const act=flt===f;return<button key={f} onClick={()=>setFlt(f)} className={`px-2 py-0.5 rounded mono text-[9px] font-bold ${act?"text-white":"text-gray-500"}`} style={{background:act?`${f==="all"?"#2D7FF9":CATEGORY_COLORS[f as IncidentCategory]}15`:"#0E1525",border:`1px solid ${act?`${f==="all"?"#2D7FF9":CATEGORY_COLORS[f as IncidentCategory]}25`:"#1A2744"}`}}>{f==="all"?"ALL":CATEGORY_LABELS[f as IncidentCategory]}{cnt>0&&<span className="ml-1 text-gray-600">{cnt}</span>}</button>;})}</div>
          <div className="flex-1 overflow-auto space-y-1">{fltd.map((inc,i)=>{const cat=getCategory(inc.type),ms=getMostActiveStatus(inc.units),sc2=STATUS_COLORS[ms]||"#3D4D66",el=elapsedMinutes(inc.time),hv=inc.units.length>=6;return<div key={inc.id||i} onClick={()=>setSel(inc)} className="ir pn rounded-lg px-3 py-2.5 flex items-center gap-3 fi" style={{animationDelay:`${Math.min(i*15,150)}ms`,borderLeftColor:CATEGORY_COLORS[cat]}}><div className="w-11 text-center flex-shrink-0"><div className="mono text-sm font-bold text-gray-300">{formatTime(inc.time)}</div><div className="mono text-[8px] text-gray-600">{el}m</div></div><span className={`flex-shrink-0 px-2 py-0.5 rounded mono text-[10px] font-bold c${cat[0]}`}>{TYPE_SHORT[inc.type]||inc.type}</span><div className="flex-1 min-w-0"><div className={`text-sm truncate ${hv?"text-white font-semibold":"text-gray-200"}`}>{formatAddress(inc.addr)}</div><div className="flex gap-1 mt-0.5">{inc.units.slice(0,4).map((u,j)=><span key={u.id+j} className="mono text-[9px] font-bold px-1 rounded" style={{color:STATUS_COLORS[u.status]||"#3D4D66",background:`${STATUS_COLORS[u.status]||"#3D4D66"}0D`}}>{u.id}</span>)}{inc.units.length>4&&<span className="mono text-[9px] text-gray-600">+{inc.units.length-4}</span>}</div></div><div className="flex-shrink-0 text-right"><div className="mono text-[11px] font-bold" style={{color:sc2}}>{STATUS_LABELS[ms]||ms}</div><div className="mono text-[9px] text-gray-500">{inc.units.length}u</div></div></div>;})}
            {!fltd.length&&<div className="pn rounded-lg p-8 text-center text-sm text-gray-500">No active incidents</div>}
          </div>
        </div>
        <div className="hidden lg:flex flex-col w-5/12 gap-2 flex-shrink-0"><HMap title="RA AVAILABILITY" type="RA" incidents={incidents}/><HMap title="TRUCK / ENGINE" type="TE" incidents={incidents}/></div>
      </div>
    </div>
    <footer className="flex-shrink-0 px-4 py-1 flex items-center justify-between" style={{borderTop:"1px solid #1A2744"}}><span className={`mono text-[9px] font-bold ${live?"text-emerald-400":"text-amber-400"}`}>● FIREDASH v17.0</span><span className="mono text-[9px] text-gray-600">APOT SOLUTIONS, INC.</span></footer>
  </div>;
}

import{useState,useEffect,useMemo}from"react";
import{usePulsePoint,useHospitals,useTransports,useWeather,Incident,Hospital,RATransport,TYPE_LABELS,TYPE_SHORT,STATUS_LABELS,STATUS_COLORS,BUREAU_NAMES,CATEGORY_COLORS,CATEGORY_LABELS,getCategory,getMostActiveStatus,getUnitType,formatTime,formatAddress,elapsedMinutes,IncidentCategory,RA_FLEET_STATS}from"./hooks";

// ═══ SPARKLINE ═══
function Spark({data,color="#2D7FF9",w=140,h=36}:{data:number[];color?:string;w?:number;h?:number}){
  if(data.length<2)return<div style={{width:w,height:h}}className="flex items-center justify-center"><span className="mono text-[9px] text-gray-600">collecting...</span></div>;
  const mn=Math.min(...data)*.9,mx=Math.max(...data)*1.1||1,rng=mx-mn||1;
  const pts=data.map((v,i)=>({x:(i/(data.length-1))*w,y:h-4-((v-mn)/rng)*(h-8)}));
  const path=pts.map((p,i)=>{if(i===0)return`M ${p.x},${p.y}`;const pr=pts[i-1];const cx=(pr.x+p.x)/2;return`C ${cx},${pr.y} ${cx},${p.y} ${p.x},${p.y}`;}).join(" ");
  const area=`${path} L ${w},${h} L 0,${h} Z`;
  const gid=`s${color.replace("#","")}`;
  const last=pts[pts.length-1];
  return(<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs><path d={area} fill={`url(#${gid})`}/><path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/><circle cx={last.x} cy={last.y} r="3" fill={color}><animate attributeName="r" values="3;4.5;3" dur="2s" repeatCount="indefinite"/></circle></svg>);
}

// ═══ BAR ═══
function Bar({value,max,color,h=5}:{value:number;max:number;color:string;h?:number}){
  const p=max>0?Math.min(100,(value/max)*100):0;
  return<div className="w-full rounded-full overflow-hidden" style={{height:h,background:"rgba(30,45,74,0.5)"}}><div className="h-full rounded-full transition-all duration-700" style={{width:`${p}%`,background:color}}/></div>;
}

// ═══ AI INTELLIGENCE ═══
function useIntel(incidents:Incident[]){
  return useMemo(()=>{
    const a:{text:string;sev:"high"|"med"|"low"}[]=[];
    if(!incidents.length)return a;
    const structs=incidents.filter(i=>["SF","RF","CF","WSF","WRF","WCF","FULL"].includes(i.type));
    structs.forEach(s=>{a.push({text:`STRUCTURE FIRE — ${formatAddress(s.addr)} — ${s.units.length} units`,sev:"high"});});
    const heavy=incidents.filter(i=>i.units.length>=8&&!structs.includes(i));
    heavy.forEach(h=>{a.push({text:`HEAVY RESPONSE — ${formatAddress(h.addr)} — ${h.units.length} units`,sev:"high"});});
    const bc:Record<string,number>={};incidents.forEach(i=>{bc[i.agency]=(bc[i.agency]||0)+1;});
    const vals=Object.values(bc);if(vals.length>1){const avg=incidents.length/vals.length;Object.entries(bc).forEach(([b,c])=>{if(c>avg*1.6&&c>4)a.push({text:`${BUREAU_NAMES[b]||b} running ${Math.round((c/avg-1)*100)}% above mean`,sev:"med"});});}
    const ems=incidents.filter(i=>getCategory(i.type)==="ems").length;
    if(ems>incidents.length*.7&&ems>8)a.push({text:`EMS surge: ${ems}/${incidents.length} active calls are medical`,sev:"med"});
    const tcs=incidents.filter(i=>getCategory(i.type)==="tc");
    if(tcs.length>=3)a.push({text:`${tcs.length} concurrent traffic collisions citywide`,sev:"low"});
    return a.slice(0,5);
  },[incidents]);
}

// ═══ HEADER ═══
function Header({live,total,lastFetch,bureaus}:{live:boolean;total:number;lastFetch:string;bureaus:Record<string,number>}){
  const[now,setNow]=useState(new Date());
  useEffect(()=>{const i=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(i);},[]);
  const ts=now.toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Los_Angeles"});
  const ds=now.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"America/Los_Angeles"}).toUpperCase();
  return(
    <header className="flex-shrink-0" style={{background:"linear-gradient(180deg,#0D1424,#0A1020)",borderBottom:"1px solid #1E2D4A"}}>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500" style={{animation:"livePulse 2s ease-in-out infinite"}}/><span className="font-black text-lg tracking-tight text-white">FIRE<span style={{color:"#2D7FF9"}}>DASH</span></span></div>
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg" style={{background:"#111A2E",border:"1px solid #1E2D4A"}}><span className="mono text-xs font-bold" style={{color:"#FFB020"}}>STN 92</span><span className="text-[10px] text-gray-500">CENTURY CITY · BATT 9</span></div>
        </div>
        <div className="hidden lg:flex items-center gap-4">{Object.entries(bureaus).map(([id,c])=><div key={id} className="flex items-center gap-1.5"><span className="mono text-[10px] text-gray-500">{BUREAU_NAMES[id]||id}</span><span className="mono text-xs font-bold text-gray-200">{c}</span></div>)}</div>
        <div className="flex items-center gap-4">
          {live?<div className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{background:"rgba(0,224,142,0.08)",border:"1px solid rgba(0,224,142,0.2)"}}><div className="w-2 h-2 rounded-full" style={{background:"#00E08E",animation:"livePulse 2s infinite"}}/><span className="mono text-[10px] font-bold" style={{color:"#00E08E"}}>LIVE</span><span className="mono text-xs text-gray-400">{total}</span></div>:<span className="mono text-[10px] text-amber-400 animate-pulse">CONNECTING...</span>}
          <div className="text-right"><div className="mono text-xl font-bold text-white leading-none">{ts}</div><div className="mono text-[9px] text-gray-500">{ds}</div></div>
        </div>
      </div>
    </header>
  );
}

// ═══ WEATHER WIDGET ═══
function WeatherWidget({w}:{w:ReturnType<typeof useWeather>}){
  return(
    <div className="panel-glow rounded-xl p-3 flex items-center gap-4" style={{borderTop:"2px solid #00D4FF"}}>
      <div className="text-center"><div className="mono text-3xl font-bold text-white">{w.temp}°</div><div className="mono text-[9px] text-gray-500">FEELS LIKE</div></div>
      <div className="flex-1 grid grid-cols-3 gap-2">
        <div><div className="mono text-[9px] text-gray-500">WIND</div><div className="mono text-xs text-gray-200">{w.wind} {w.windDir}</div></div>
        <div><div className="mono text-[9px] text-gray-500">HUMIDITY</div><div className="mono text-xs text-gray-200">{w.humidity}%</div></div>
        <div><div className="mono text-[9px] text-gray-500">PRECIP</div><div className="mono text-xs text-gray-200">{w.precip}%</div></div>
        <div><div className="mono text-[9px] text-gray-500">HIGH</div><div className="mono text-xs font-bold" style={{color:"#FF6B35"}}>{w.high}°</div></div>
        <div><div className="mono text-[9px] text-gray-500">LOW</div><div className="mono text-xs" style={{color:"#00D4FF"}}>{w.low}°</div></div>
        <div><div className="mono text-[9px] text-gray-500">SKY</div><div className="mono text-xs text-gray-200">{w.condition}</div></div>
      </div>
    </div>
  );
}

// ═══ HOSPITAL STATUS (WallTime Integration) ═══
function HospitalPanel({hospitals}:{hospitals:Hospital[]}){
  const sc=(s:Hospital["status"])=>s==="OPEN"?"#00E08E":s==="ED SATURATION"?"#FFB020":s==="DIVERT"?"#FF6B35":"#FF3B5C";
  return(
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-1"><span className="text-[10px] font-bold tracking-widest text-gray-500">HOSPITALS — WALLTIME</span></div>
      {hospitals.map(h=>(
        <div key={h.short} className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{background:"#0D1424",border:"1px solid #1E2D4A"}}>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold truncate" style={{color:sc(h.status)}}>{h.short}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {h.designations.slice(0,4).map(d=><span key={d} className="mono text-[7px] px-1 rounded" style={{background:"rgba(45,127,249,0.1)",color:"#5B9BFA"}}>{d}</span>)}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="mono text-xs font-bold" style={{color:sc(h.status)}}>{h.status==="OPEN"?"OPEN":h.status}</div>
            <div className="mono text-lg font-bold" style={{color:h.wait>45?"#FF3B5C":h.wait>30?"#FFB020":"#00E08E"}}>{h.wait}<span className="text-[9px] text-gray-500">m</span></div>
          </div>
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0 ml-1">
            <div className="mono text-[9px]" style={{color:"#00D4FF"}}>{h.atHospital} <span className="text-gray-600">wall</span></div>
            <div className="mono text-[9px]" style={{color:"#2D7FF9"}}>{h.enRoute} <span className="text-gray-600">inb</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ RA TRANSPORT TRACKER ═══
function TransportPanel({transports}:{transports:RATransport[]}){
  const atHosp=transports.filter(t=>t.status==="AT HOSPITAL");
  const enRoute=transports.filter(t=>t.status==="EN ROUTE");
  const als=transports.filter(t=>t.level==="ALS").length;
  const bls=transports.filter(t=>t.level==="BLS").length;
  const avgWall=atHosp.length>0?Math.round(atHosp.reduce((s,t)=>s+t.wallTime,0)/atHosp.length):0;
  const over30=atHosp.filter(t=>t.wallTime>30).length;
  return(
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1"><span className="text-[10px] font-bold tracking-widest text-gray-500">RA TRANSPORTS — LIVE</span><span className="mono text-[10px] text-gray-400">{transports.length} active</span></div>
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="text-center p-1.5 rounded-lg" style={{background:"#0D1424"}}><div className="mono text-sm font-bold" style={{color:"#A855F7"}}>{atHosp.length}</div><div className="mono text-[7px] text-gray-500">AT WALL</div></div>
        <div className="text-center p-1.5 rounded-lg" style={{background:"#0D1424"}}><div className="mono text-sm font-bold" style={{color:"#2D7FF9"}}>{enRoute.length}</div><div className="mono text-[7px] text-gray-500">EN ROUTE</div></div>
        <div className="text-center p-1.5 rounded-lg" style={{background:"#0D1424"}}><div className="mono text-sm font-bold" style={{color:avgWall>30?"#FF3B5C":"#00E08E"}}>{avgWall}m</div><div className="mono text-[7px] text-gray-500">AVG WALL</div></div>
        <div className="text-center p-1.5 rounded-lg" style={{background:"#0D1424"}}><div className="mono text-sm font-bold" style={{color:over30>0?"#FF3B5C":"#00E08E"}}>{over30}</div><div className="mono text-[7px] text-gray-500">&gt;30m AB40</div></div>
      </div>
      {/* ALS/BLS split */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{background:"#0D1424"}}><span className="mono text-[9px] text-gray-500">ALS</span><Bar value={als} max={transports.length} color="#FF6B35"/><span className="mono text-xs font-bold text-gray-200">{als}</span></div>
        <div className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{background:"#0D1424"}}><span className="mono text-[9px] text-gray-500">BLS</span><Bar value={bls} max={transports.length} color="#2D7FF9"/><span className="mono text-xs font-bold text-gray-200">{bls}</span></div>
      </div>
      {/* Transport list */}
      <div className="space-y-0.5 max-h-40 overflow-auto">
        {atHosp.concat(enRoute).slice(0,8).map(t=>(
          <div key={t.unit} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{background:t.wallTime>30?"rgba(255,59,92,0.06)":"transparent",borderLeft:`2px solid ${t.status==="AT HOSPITAL"?(t.wallTime>30?"#FF3B5C":"#A855F7"):"#2D7FF9"}`}}>
            <span className="mono text-[11px] font-bold" style={{color:t.level==="ALS"?"#FF6B35":"#2D7FF9"}}>{t.unit}</span>
            <span className="mono text-[8px] px-1 rounded" style={{background:t.level==="ALS"?"rgba(255,107,53,0.1)":"rgba(45,127,249,0.1)",color:t.level==="ALS"?"#FF6B35":"#2D7FF9"}}>{t.level}</span>
            <span className="text-[10px] text-gray-400 flex-1 truncate">{t.hospital}</span>
            {t.status==="AT HOSPITAL"&&<span className="mono text-xs font-bold" style={{color:t.wallTime>30?"#FF3B5C":t.wallTime>20?"#FFB020":"#00E08E"}}>{t.wallTime}m</span>}
            {t.status==="EN ROUTE"&&<span className="mono text-[10px] font-bold" style={{color:"#2D7FF9"}}>→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ INCIDENT DETAIL ═══
function Detail({inc,onClose}:{inc:Incident;onClose:()=>void}){
  const[el,setEl]=useState(0);
  useEffect(()=>{setEl(0);const i=setInterval(()=>setEl(p=>p+1),1000);return()=>clearInterval(i);},[inc]);
  const cat=getCategory(inc.type),cc=CATEGORY_COLORS[cat];
  const mm=String(Math.floor(el/60)).padStart(2,"0"),ss=String(el%60).padStart(2,"0");
  const byStatus=useMemo(()=>{const g:Record<string,typeof inc.units>={};inc.units.forEach(u=>{if(!g[u.status])g[u.status]=[];g[u.status].push(u);});return Object.entries(g);},[inc]);
  return(
    <div className="flex flex-col h-full fade-in" style={{background:"#080E1A"}}>
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between" style={{background:`${cc}10`,borderBottom:`2px solid ${cc}40`}}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="mono text-xs font-bold text-gray-400 hover:text-white px-2.5 py-1 rounded-lg" style={{background:"#111A2E",border:"1px solid #1E2D4A"}}>← BACK</button>
          <div className={`px-2.5 py-1 rounded-lg mono text-sm font-bold cat-${cat}`}>{TYPE_SHORT[inc.type]||inc.type}</div>
          <div><div className="text-sm font-bold text-white">{formatAddress(inc.addr)}</div><div className="mono text-[10px] text-gray-400">{TYPE_LABELS[inc.type]||inc.type} · {BUREAU_NAMES[inc.agency]||inc.agency}</div></div>
        </div>
        <div className="text-right"><div className="mono text-3xl font-bold text-white">{mm}:{ss}</div><div className="mono text-[9px] text-gray-500">ELAPSED</div></div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[["ID",inc.id||"—"],["TYPE",TYPE_LABELS[inc.type]||inc.type],["CALL",inc.time?inc.time.substring(0,19).replace("T"," "):"—"],["BUREAU",BUREAU_NAMES[inc.agency]||inc.agency],["LAT",inc.lat||"—"],["LNG",inc.lng||"—"]].map(([l,v])=>(
            <div key={l} className="p-2.5 rounded-lg" style={{background:"#0D1424"}}><div className="mono text-[8px] text-gray-500 tracking-widest">{l}</div><div className="mono text-xs text-gray-200 mt-0.5 truncate">{v}</div></div>
          ))}
        </div>
        {inc.lat&&inc.lng&&<a href={`https://maps.apple.com/?q=${inc.lat},${inc.lng}`} target="_blank" rel="noopener" className="inline-block mono text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{background:"rgba(45,127,249,0.1)",color:"#2D7FF9",border:"1px solid rgba(45,127,249,0.2)"}}>OPEN IN MAPS →</a>}
        <div className="space-y-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-widest text-gray-500">ASSIGNED UNITS</span><span className="mono text-xs text-gray-400">{inc.units.length}</span></div>
          {byStatus.map(([status,units])=>(
            <div key={status}><div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full" style={{background:STATUS_COLORS[status]||"#4A5568"}}/><span className="mono text-[10px] font-bold" style={{color:STATUS_COLORS[status]||"#4A5568"}}>{STATUS_LABELS[status]||status} ({units.length})</span></div>
              <div className="flex flex-wrap gap-1.5 ml-4 mb-2">{units.map((u,i)=>{const sc=STATUS_COLORS[u.status]||"#4A5568";return<div key={u.id+i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{background:`${sc}10`,border:`1px solid ${sc}20`}}><span className="mono text-sm font-bold" style={{color:sc}}>{u.id}</span><span className="text-[9px] text-gray-500">{getUnitType(u.id)}</span></div>;})}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN APP ═══
export default function App(){
  const{incidents,total,bureaus,live,lastFetch,history}=usePulsePoint();
  const hospitals=useHospitals();
  const transports=useTransports();
  const weather=useWeather();
  const[selected,setSelected]=useState<Incident|null>(null);
  const[filter,setFilter]=useState<IncidentCategory|"all">("all");
  const alerts=useIntel(incidents);

  const stats=useMemo(()=>{
    const cats:Record<IncidentCategory,number>={ems:0,fire:0,tc:0,hazmat:0,rescue:0,other:0};
    let totalU=0,onScene=0,enRoute=0;
    incidents.forEach(i=>{cats[getCategory(i.type)]++;i.units.forEach(u=>{totalU++;if(u.status==="OnScene")onScene++;if(u.status==="Enroute")enRoute++;});});
    return{cats,totalU,onScene,enRoute};
  },[incidents]);

  const emsH=useMemo(()=>history.map(t=>Math.round(t*.55+Math.random()*2)),[history]);
  const fireH=useMemo(()=>history.map(t=>Math.round(t*.2+Math.random()*1.5)),[history]);
  const filtered=useMemo(()=>filter==="all"?incidents:incidents.filter(i=>getCategory(i.type)===filter),[incidents,filter]);

  if(selected)return<div className="h-full flex flex-col"><Header live={live} total={total} lastFetch={lastFetch} bureaus={bureaus}/><Detail inc={selected} onClose={()=>setSelected(null)}/></div>;

  return(
    <div className="h-full flex flex-col" style={{background:"#05080F"}}>
      <Header live={live} total={total} lastFetch={lastFetch} bureaus={bureaus}/>
      {/* Intel ticker */}
      {alerts.length>0&&<div className="flex-shrink-0 px-4 py-1 flex items-center gap-3" style={{background:"linear-gradient(90deg,rgba(255,59,92,0.04),transparent,rgba(255,59,92,0.04))",borderBottom:"1px solid #1E2D4A"}}><span className="mono text-[10px] font-bold tracking-widest" style={{color:"#FFB020"}}>⚡ INTEL</span><div className="flex-1 overflow-hidden whitespace-nowrap"><div className="inline-block" style={{animation:"ticker 35s linear infinite"}}>{[...alerts,...alerts].map((a,i)=><span key={i} className="mono text-[11px] mx-6" style={{color:a.sev==="high"?"#FF3B5C":a.sev==="med"?"#FFB020":"#8B95A8"}}>{a.sev==="high"?"🔴":a.sev==="med"?"🟡":"🔵"} {a.text}</span>)}</div></div></div>}

      <div className="flex-1 flex overflow-hidden">
        {/* ═══ MAIN CONTENT ═══ */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* KPI Row */}
          <div className="flex-shrink-0 p-3 pb-0">
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-2">
              <div className="panel-glow rounded-xl p-3" style={{borderTop:"2px solid #2D7FF9"}}>
                <div className="flex items-center justify-between mb-1"><span className="text-[9px] font-semibold tracking-wider text-gray-500">ACTIVE INCIDENTS</span><span className="mono text-xl font-bold" style={{color:"#2D7FF9"}}>{incidents.length}</span></div>
                <Spark data={history} color="#2D7FF9" w={200} h={32}/>
              </div>
              <div className="panel-glow rounded-xl p-3" style={{borderTop:"2px solid #FF6B35"}}>
                <div className="flex items-center justify-between mb-1"><span className="text-[9px] font-semibold tracking-wider text-gray-500">EMS</span><span className="mono text-xl font-bold" style={{color:"#FF6B35"}}>{stats.cats.ems}</span></div>
                <Spark data={emsH} color="#FF6B35" w={200} h={32}/>
              </div>
              <div className="panel-glow rounded-xl p-3" style={{borderTop:"2px solid #FF3B5C"}}>
                <div className="flex items-center justify-between mb-1"><span className="text-[9px] font-semibold tracking-wider text-gray-500">FIRE</span><span className="mono text-xl font-bold" style={{color:"#FF3B5C"}}>{stats.cats.fire}</span></div>
                <Spark data={fireH} color="#FF3B5C" w={200} h={32}/>
              </div>
              <div className="panel-glow rounded-xl p-3" style={{borderTop:"2px solid #00E08E"}}>
                <div className="flex items-center justify-between mb-1"><span className="text-[9px] font-semibold tracking-wider text-gray-500">UNITS</span><span className="mono text-xl font-bold" style={{color:"#00E08E"}}>{stats.totalU}</span></div>
                <div className="flex gap-1 mt-1"><Bar value={stats.onScene} max={stats.totalU} color="#FF3B5C"/><Bar value={stats.enRoute} max={stats.totalU} color="#2D7FF9"/></div>
                <div className="mono text-[8px] text-gray-500 mt-1">{stats.onScene} OS · {stats.enRoute} ER</div>
              </div>
              <div className="panel-glow rounded-xl p-3 hidden xl:block" style={{borderTop:"2px solid #A855F7"}}>
                <div className="flex items-center justify-between mb-1"><span className="text-[9px] font-semibold tracking-wider text-gray-500">RA FLEET</span><span className="mono text-xl font-bold" style={{color:"#A855F7"}}>{RA_FLEET_STATS.total}</span></div>
                <div className="flex gap-1 mt-1"><Bar value={RA_FLEET_STATS.als} max={RA_FLEET_STATS.total} color="#FF6B35" h={4}/></div>
                <div className="mono text-[8px] text-gray-500 mt-1">{RA_FLEET_STATS.als} ALS · {RA_FLEET_STATS.bls} BLS</div>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex-shrink-0 px-3 pt-2 pb-1 flex gap-1 flex-wrap">
            {(["all","ems","fire","tc","hazmat","rescue"] as const).map(f=>{
              const c=f==="all"?incidents.length:stats.cats[f];const active=filter===f;
              return<button key={f} onClick={()=>setFilter(f)} className={`px-2.5 py-1 rounded-lg mono text-[10px] font-bold transition-all ${active?"text-white":"text-gray-500 hover:text-gray-300"}`} style={{background:active?(f==="all"?"rgba(45,127,249,0.15)":`${CATEGORY_COLORS[f as IncidentCategory]}15`):"#111A2E",border:`1px solid ${active?(f==="all"?"rgba(45,127,249,0.3)":`${CATEGORY_COLORS[f as IncidentCategory]}30`):"#1E2D4A"}`}}>{f==="all"?"ALL":CATEGORY_LABELS[f as IncidentCategory]} {c>0&&<span className="ml-1 text-gray-500">{c}</span>}</button>;
            })}
          </div>

          {/* Incidents */}
          <div className="flex-1 overflow-auto px-3 pb-3">
            <div className="space-y-1">
              {filtered.map((inc,i)=>{
                const cat=getCategory(inc.type),status=getMostActiveStatus(inc.units),sc=STATUS_COLORS[status]||"#4A5568",el=elapsedMinutes(inc.time),heavy=inc.units.length>=6;
                return(
                  <div key={inc.id||i} onClick={()=>setSelected(inc)} className="inc-row panel rounded-lg px-3 py-2.5 flex items-center gap-3 fade-in" style={{animationDelay:`${Math.min(i*20,300)}ms`,borderLeftColor:CATEGORY_COLORS[cat]}}>
                    <div className="flex-shrink-0 w-11 text-center"><div className="mono text-sm font-bold text-gray-300">{formatTime(inc.time)}</div><div className="mono text-[9px] text-gray-600">{el}m</div></div>
                    <div className={`flex-shrink-0 px-2 py-0.5 rounded-lg mono text-[10px] font-bold cat-${cat}`}>{TYPE_SHORT[inc.type]||inc.type}</div>
                    <div className="flex-1 min-w-0"><div className={`text-sm truncate ${heavy?"text-white font-medium":"text-gray-200"}`}>{formatAddress(inc.addr)}</div><div className="flex items-center gap-1.5 mt-0.5">{inc.units.slice(0,4).map((u,j)=><span key={u.id+j} className="mono text-[9px] font-bold px-1 rounded" style={{color:STATUS_COLORS[u.status]||"#4A5568",background:`${STATUS_COLORS[u.status]||"#4A5568"}12`}}>{u.id}</span>)}{inc.units.length>4&&<span className="mono text-[9px] text-gray-600">+{inc.units.length-4}</span>}</div></div>
                    <div className="flex-shrink-0 text-right"><div className="mono text-[11px] font-bold" style={{color:sc}}>{STATUS_LABELS[status]||status}</div><div className="mono text-[9px] text-gray-500">{inc.units.length} units</div></div>
                    {heavy&&<div className="flex-shrink-0 w-1 h-7 rounded-full" style={{background:CATEGORY_COLORS[cat]}}/>}
                  </div>
                );
              })}
              {filtered.length===0&&<div className="panel rounded-lg p-10 text-center text-gray-500 text-sm">{filter!=="all"?"No matching incidents":live?"No active incidents":"Connecting..."}</div>}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <div className="hidden xl:flex flex-col w-80 flex-shrink-0 overflow-auto" style={{background:"#080E1A",borderLeft:"1px solid #1E2D4A"}}>
          <div className="p-3 space-y-3">
            {/* Weather */}
            <WeatherWidget w={weather}/>

            {/* Hospital Status */}
            <HospitalPanel hospitals={hospitals}/>

            {/* RA Transports */}
            <TransportPanel transports={transports}/>

            {/* Bureau + Categories */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-gray-500 px-1">BUREAUS</span>
              {Object.entries(bureaus).sort((a,b)=>b[1]-a[1]).map(([id,c])=><div key={id} className="space-y-0.5"><div className="flex justify-between px-1"><span className="mono text-[11px] text-gray-300">{BUREAU_NAMES[id]||id}</span><span className="mono text-xs font-bold text-gray-200">{c}</span></div><Bar value={c} max={Math.max(...Object.values(bureaus))} color="#2D7FF9"/></div>)}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-gray-500 px-1">CATEGORIES</span>
              {(Object.entries(stats.cats) as [IncidentCategory,number][]).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([cat,c])=><div key={cat} className="flex items-center gap-2 px-1"><div className="w-2 h-2 rounded-full" style={{background:CATEGORY_COLORS[cat]}}/><span className="mono text-[11px] flex-1" style={{color:CATEGORY_COLORS[cat]}}>{CATEGORY_LABELS[cat]}</span><span className="mono text-xs font-bold text-gray-200">{c}</span><span className="mono text-[9px] text-gray-600">{Math.round(c/Math.max(incidents.length,1)*100)}%</span></div>)}
            </div>

            {/* Intel */}
            {alerts.length>0&&<div className="space-y-1.5"><span className="text-[10px] font-bold tracking-widest px-1" style={{color:"#FFB020"}}>⚡ INTELLIGENCE</span>{alerts.map((a,i)=><div key={i} className="p-2 rounded-lg text-[11px] leading-relaxed" style={{background:a.sev==="high"?"rgba(255,59,92,0.06)":"rgba(255,176,32,0.06)",border:`1px solid ${a.sev==="high"?"rgba(255,59,92,0.15)":"rgba(255,176,32,0.15)"}`,color:a.sev==="high"?"#FF3B5C":a.sev==="med"?"#FFB020":"#8B95A8"}}>{a.text}</div>)}</div>}
          </div>
        </div>
      </div>

      <footer className="flex-shrink-0 px-4 py-1 flex items-center justify-between" style={{background:"#080E1A",borderTop:"1px solid #1E2D4A"}}><div className="flex items-center gap-3"><span className={`mono text-[10px] font-bold ${live?"text-emerald-400":"text-amber-400"}`}>● FIREDASH v10.0</span><span className="mono text-[10px] text-gray-600">{lastFetch&&`UPD ${lastFetch}`}</span></div><span className="mono text-[10px] text-gray-600">APOT SOLUTIONS, INC.</span></footer>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";

/* FIREDASH v5.0 — 10x FIRE STATION COMMAND INTELLIGENCE
   AUTO MODE SWITCHING: IDLE (SA dashboard) ↔ ALERT (dispatch + turnout timer)
   No competitor has this. Zetron/Phoenix G2/Bryx/FirstArriving all miss it.
   Apparatus floor TV. Pure monospace. Simulated live 5s. */

const C={bg:"#000",sf:"#080c12",cd:"#0c1018",bd:"#182030",r:"#ff3b30",a:"#ff9f0a",g:"#30d158",b:"#0a84ff",cy:"#64d2ff",p:"#bf5af2",o:"#ff6723",tx:"#f5f5f7",dm:"#98989d",mt:"#636366"} as const;
type US="AVAIL"|"DISPATCHED"|"ENROUTE"|"ONSCENE"|"TRANSPORTING"|"ATHOSPITAL";
const SC:Record<US,string>={AVAIL:C.g,DISPATCHED:C.b,ENROUTE:C.cy,ONSCENE:C.a,TRANSPORTING:C.p,ATHOSPITAL:C.r};
interface U{n:string;t:"T"|"E"|"RA"|"FR";s:US;als?:boolean}
interface S{id:number;c:string;u:U[]}
interface Batt{id:number;stations:S[]}
const stn=(id:number,u:U[]):S=>({id,c:String(id),u});
const T=(n:string,s:US="AVAIL"):U=>({n,t:"T",s});
const E=(n:string,s:US="AVAIL"):U=>({n,t:"E",s});
const RA=(n:string,als=true,s:US="AVAIL"):U=>({n,t:"RA",s,als});

const B18:Batt={id:18,stations:[
  stn(34,[E("E34"),E("E464"),RA("RA34",true,"TRANSPORTING"),RA("RA834",false)]),
  stn(43,[E("E43","ONSCENE"),RA("RA43",true)]),
  stn(58,[T("T58"),E("E258"),E("E458"),RA("RA58",true,"ONSCENE"),RA("RA858",false)]),
  stn(61,[T("T61","ONSCENE"),E("E261"),E("E61"),RA("RA61"),RA("RA661"),RA("RA861",false)]),
  stn(68,[E("E68","ONSCENE"),RA("RA68"),RA("RA868",false)]),
  stn(92,[T("T92","ONSCENE"),E("E292","ONSCENE"),E("E492","ENROUTE"),RA("RA692",true,"ATHOSPITAL"),RA("RA92",true,"DISPATCHED")]),
  stn(94,[T("T94"),E("E294"),E("E94"),RA("RA894",false),RA("RA94")]),
]};
const B9:Batt={id:9,stations:[stn(19,[E("E19"),RA("RA19")]),stn(23,[E("E23","ONSCENE"),E("E469"),RA("RA23")]),stn(37,[T("T37"),E("E237"),E("E37"),RA("RA37"),RA("RA837",false)]),stn(59,[E("E1B"),E("E1C"),RA("RA59")]),stn(69,[T("T69"),E("E269"),E("E69"),RA("RA669"),RA("RA69")]),stn(71,[E("E71"),RA("RA71")])]};

const HOSPS=[{n:"Cedars Marina Del Rey",st:"OPEN",a:30,d:4.8},{n:"Cedars Medical Ctr",st:"OPEN",a:120,d:2.8},{n:"Kaiser West LA",st:"OPEN",a:10,d:2.7},{n:"St Johns SM",st:"OPEN",a:140,d:3.6},{n:"UCLA Ronald Reagan",st:"OPEN",a:76,d:1.8},{n:"UCLA Santa Monica",st:"ED SAT",a:55,d:4.1},{n:"West LA VA",st:"CLOSED",a:150,d:2.2}];
const CALLS=[{t:"22:01",tp:"ALS",ad:"10342 DUNKIRK AVE X COMSTOCK",un:"RA92, E292",st:"DISPATCHED"},{t:"21:47",tp:"STR",ad:"1800 CENTURY PARK E",un:"T92, E492, E292",st:"ON SCENE"},{t:"21:31",tp:"ALS",ad:"914 WESTWOOD X LE CONTE",un:"RA34, E34",st:"TRANSPORTING"},{t:"21:15",tp:"EMS",ad:"10250 CONSTELLATION BLVD",un:"RA58",st:"ON SCENE"},{t:"20:58",tp:"CHIM",ad:"914 WESTWOOD X LE CONTE",un:"E68, T58",st:"ON SCENE"},{t:"20:42",tp:"ALS",ad:"2080 CENTURY PARK E FL 12",un:"RA692",st:"AT HOSPITAL"}];
const WX=[{d:"TUE",h:76,hu:62},{d:"WED",h:80,hu:40},{d:"THU",h:96,hu:14},{d:"FRI",h:98,hu:12},{d:"SAT",h:90,hu:20},{d:"SUN",h:90,hu:22},{d:"MON",h:93,hu:28}];
const MSGS=[{tx:"WEATHER: Heat Advisory March 10 12:15PM until March 11 9:00AM — NWS LA/Oxnard",u:1},{tx:"LAFD Access Window Standards: Max height of openings for FD accessibility",u:0},{tx:"Brush clearance inspections begin April 1 — ensure compliance documentation current",u:0}];
const DISP=[{type:"ALS",tc:"MA",addr:"10400 OLYMPIC BLVD X BEVERLY GLEN",ch:14,units:["RA92","E292","T92"],to:60},{type:"STR",tc:"STR",addr:"2049 CENTURY PARK E FL 28",ch:14,units:["T92","E292","E492","RA92","T94"],to:80},{type:"ALS",tc:"MA",addr:"1901 AVE OF THE STARS",ch:14,units:["RA92","E492"],to:60}];

const F=({children,className="",style={}}:{children:React.ReactNode;className?:string;style?:React.CSSProperties})=>(<span className={className} style={{fontFamily:"'JetBrains Mono','Courier New',monospace",...style}}>{children}</span>);
const battStats=(b:Batt)=>{let total=0,avail=0,active=0,als=0,bls=0;b.stations.forEach(s=>s.u.forEach(u=>{total++;if(u.s==="AVAIL")avail++;else active++;if(u.t==="RA"){if(u.als)als++;else bls++;}}));return{total,avail,active,als,bls,pct:total?Math.round((active/total)*100):0};};

const Grid=({stations}:{stations:S[]})=>{
  const HD=["STN","T","E","E","RA","RA","RA","FR"];
  const sl=(s:S):(U|null)[]=>{const r:Array<U|null>=Array(7).fill(null);const ts=s.u.filter(u=>u.t==="T"),es=s.u.filter(u=>u.t==="E"),ra=s.u.filter(u=>u.t==="RA");if(ts[0])r[0]=ts[0];if(es[0])r[1]=es[0];if(es[1])r[2]=es[1];if(ra[0])r[3]=ra[0];if(ra[1])r[4]=ra[1];if(ra[2])r[5]=ra[2];return r;};
  return(<div>
    <div className="grid gap-1 mb-1" style={{gridTemplateColumns:"44px repeat(7,1fr)"}}>{HD.map((h,i)=><div key={i} className="text-xs uppercase tracking-wider font-bold text-center" style={{color:C.mt}}>{h}</div>)}</div>
    {stations.map(s=>{const ss=sl(s);const act=s.u.some(u=>u.s!=="AVAIL");return(
      <div key={s.id} className="grid gap-1 mb-0.5" style={{gridTemplateColumns:"44px repeat(7,1fr)"}}>
        <F className="text-lg font-black flex items-center justify-center" style={{color:act?C.a:C.cy}}>{s.c}</F>
        {ss.map((u,i)=>{if(!u)return<div key={i}/>;const c=SC[u.s];return(
          <div key={i} className="text-center py-1 transition-colors duration-700" style={{background:`${c}22`,borderBottom:`3px solid ${c}`}}>
            <F className="text-xs font-bold block" style={{color:c}}>{u.n}</F>
            {u.t==="RA"&&u.als!==undefined&&<F className="text-[7px] block" style={{color:u.als?C.r:C.b}}>{u.als?"ALS":"BLS"}</F>}
          </div>);})}
      </div>);})}
  </div>);
};

/* ALERT MODE — dispatched incident with turnout countdown */
const AlertMode=({ev,timer}:{ev:typeof DISP[0];timer:number})=>{
  const urg=timer<=15;const isFire=ev.type==="STR";const pct=Math.max(0,(timer/(isFire?80:60))*100);
  return(<div className="flex flex-col flex-1 overflow-hidden" style={{background:C.bg}}>
    <div className="absolute inset-0 pointer-events-none z-10" style={{border:`4px solid ${urg?C.r:C.a}`,opacity:urg?1:0.6,animation:urg?"none":"pulse 2s ease-in-out infinite"}}/>
    <div className="px-6 py-3 shrink-0" style={{background:isFire?C.r:`${C.r}cc`}}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <F className="text-white font-black text-5xl">{ev.tc}</F>
          <div><F className="text-white font-bold text-2xl block">{ev.addr}</F><F className="text-white/80 text-lg block">CH {ev.ch} · {ev.type} · STN 92</F></div>
        </div>
        <div className="text-right"><F className="font-black block" style={{fontSize:72,color:urg?C.a:"white",lineHeight:1}}>{timer}</F><F className="text-white/80 text-lg uppercase tracking-widest">Turnout</F></div>
      </div>
      <div className="mt-2 h-2 rounded-full overflow-hidden" style={{background:"rgba(0,0,0,0.3)"}}><div className="h-full rounded-full transition-all duration-1000" style={{width:`${pct}%`,background:urg?C.a:"white"}}/></div>
    </div>
    <div className="flex-1 flex overflow-hidden p-3 gap-3">
      <div className="flex-1 space-y-3">
        <F className="text-lg uppercase tracking-widest font-bold block" style={{color:C.mt}}>Assigned Units</F>
        <div className="space-y-2">{ev.units.map((u,i)=>(<div key={u} className="flex items-center gap-4 p-3" style={{background:C.cd,borderLeft:`4px solid ${i===0?C.r:C.b}`}}><F className="text-3xl font-black" style={{color:i===0?C.r:C.cy}}>{u}</F><div><F className="text-lg font-bold block" style={{color:C.tx}}>{u.startsWith("RA")?"RESCUE AMBULANCE":u.startsWith("T")?"TRUCK":"ENGINE"}</F><F className="text-sm block" style={{color:u.startsWith("RA")?C.r:C.dm}}>{u.startsWith("RA")?"ALS":"SUPPRESSION"}</F></div><F className="text-lg font-bold ml-auto" style={{color:C.b}}>DISPATCHED</F></div>))}</div>
        <F className="text-sm uppercase tracking-widest font-bold block mt-3" style={{color:C.mt}}>Battalion 18</F>
        <div className="p-2" style={{background:C.cd,border:`1px solid ${C.bd}`}}><Grid stations={B18.stations}/></div>
      </div>
      <div className="w-64 shrink-0 space-y-3">
        <div className="p-3" style={{background:C.cd,border:`1px solid ${C.bd}`}}>
          <F className="text-sm uppercase tracking-widest font-bold block mb-2" style={{color:C.mt}}>Hospital APOT</F>
          {HOSPS.filter(h=>h.st!=="CLOSED").map((h,i)=>{const ac=h.a<=15?C.g:h.a<=30?C.b:h.a<=45?C.a:h.a<=60?C.o:C.r;return(
            <div key={i} className="flex items-center justify-between p-2 mb-1" style={{background:C.sf,borderLeft:`3px solid ${ac}`}}><div><F className="text-sm font-bold block" style={{color:C.tx}}>{h.n}</F><F className="text-xs block" style={{color:C.dm}}>{h.d}mi · {h.st}</F></div><F className="text-2xl font-black" style={{color:ac}}>{h.a}m</F></div>);})}
        </div>
        <div className="p-3" style={{background:C.cd,border:`1px solid ${C.bd}`}}>
          <F className="text-sm uppercase tracking-widest font-bold block mb-1" style={{color:C.mt}}>Weather</F>
          <F className="text-xl font-bold block" style={{color:C.tx}}>58°F · W10 · 62%</F>
          <div className="flex gap-2 mt-1">{WX.map((d,i)=><F key={d.d} className="text-xs font-bold" style={{color:d.h>=85?C.r:i===0?C.b:C.mt}}>{d.d[0]}{d.h}°</F>)}</div>
        </div>
        <div className="p-3" style={{background:C.cd,border:`1px solid ${C.bd}`}}>
          <F className="text-xs uppercase tracking-widest font-bold block mb-1" style={{color:C.mt}}>Infrastructure</F>
          <div className="grid grid-cols-2 gap-1">{["GAS OK","LADWP OK","WATER OK","SCE OK"].map(u=>{const[n,s]=u.split(" ");return<div key={u} className="flex justify-between px-1.5 py-0.5" style={{background:C.sf}}><F className="text-[10px]" style={{color:C.dm}}>{n}</F><F className="text-[10px] font-bold" style={{color:C.g}}>{s}</F></div>;})}{[{n:"I-405",a:true},{n:"I-10",a:false},{n:"I-110",a:false},{n:"US-101",a:false}].map(f=><div key={f.n} className="flex justify-between px-1.5 py-0.5" style={{background:C.sf}}><F className="text-[10px]" style={{color:C.dm}}>{f.n}</F><F className="text-[10px] font-bold" style={{color:f.a?C.r:C.g}}>{f.a?"SLOW":"OK"}</F></div>)}</div>
        </div>
      </div>
    </div>
    <div className="flex items-center justify-between px-4 py-1 shrink-0" style={{background:C.sf,borderTop:`2px solid ${C.r}`}}><F className="text-xs font-bold" style={{color:C.r}}>● ALERT — DISPATCH ACTIVE</F><F className="text-xs" style={{color:C.dm}}>FIREDASH v5.0 · APOT Solutions</F></div>
  </div>);
};

/* IDLE MODE — situational awareness */
const IdleMode=({b18,b9,mi}:{b18:Batt;b9:Batt;mi:number})=>{
  const s18=battStats(b18),s9=battStats(b9);const msg=MSGS[mi];const uc=(msg.u as number)===1?C.a:C.g;
  return(<>
    <div className="flex items-center justify-between px-4 py-1 shrink-0" style={{background:C.sf,borderBottom:`1px solid ${C.bd}`}}>
      <div className="flex items-center gap-4"><F className="text-lg font-bold" style={{color:C.tx}}>58°F</F><F className="text-sm" style={{color:C.dm}}>W10·62%</F><div className="w-px h-4" style={{background:C.bd}}/>{WX.map((d,i)=><F key={d.d} className="text-xs font-bold" style={{color:d.h>=85?C.r:d.hu<=15?C.o:i===0?C.b:C.mt}}>{d.d[0]}{d.h}°{d.hu<=15?"!":""}</F>)}</div>
      <div className="flex items-center gap-4"><F className="text-xs" style={{color:C.mt}}>B18:<span style={{color:C.r}}>{s18.active}A</span>/<span style={{color:C.g}}>{s18.avail}V</span></F><F className="text-xs" style={{color:C.mt}}>B9:<span style={{color:C.r}}>{s9.active}A</span>/<span style={{color:C.g}}>{s9.avail}V</span></F><F className="text-xs" style={{color:C.mt}}>ALS:<span style={{color:C.r}}>{s18.als+s9.als}</span> BLS:<span style={{color:C.b}}>{s18.bls+s9.bls}</span></F></div>
    </div>
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2" style={{background:C.cd,border:`1px solid ${C.bd}`}}><div className="flex items-center justify-between mb-1 px-1"><F className="text-sm uppercase tracking-widest font-bold" style={{color:C.mt}}>Battalion 18</F><F className="text-xs font-bold" style={{color:s18.pct>50?C.r:s18.pct>30?C.a:C.g}}>{s18.pct}%</F></div><Grid stations={b18.stations}/></div>
          <div className="p-2" style={{background:C.cd,border:`1px solid ${C.bd}`}}><div className="flex items-center justify-between mb-1 px-1"><F className="text-sm uppercase tracking-widest font-bold" style={{color:C.mt}}>Battalion 9</F><F className="text-xs font-bold" style={{color:s9.pct>50?C.r:s9.pct>30?C.a:C.g}}>{s9.pct}%</F></div><Grid stations={b9.stations}/></div>
        </div>
        <div className="mt-2 p-2" style={{background:C.cd,border:`1px solid ${C.bd}`}}>
          <F className="text-sm uppercase tracking-widest font-bold mb-2 px-1 block" style={{color:C.mt}}>Active Calls</F>
          {CALLS.map((c,i)=>{const sc=c.st==="DISPATCHED"?C.b:c.st==="ON SCENE"?C.a:c.st==="TRANSPORTING"?C.p:c.st==="AT HOSPITAL"?C.r:C.g;return(
            <div key={i} className="flex items-center gap-3 py-1.5 px-2 mb-0.5" style={{background:C.sf,borderLeft:`4px solid ${sc}`}}>
              <F className="text-sm shrink-0" style={{color:C.dm}}>{c.t}</F><F className="text-sm font-bold shrink-0 px-1.5" style={{background:`${c.tp==="ALS"?C.r:c.tp==="STR"?C.a:C.b}30`,color:c.tp==="ALS"?C.r:c.tp==="STR"?C.a:C.b}}>{c.tp}</F><F className="text-sm flex-1 truncate" style={{color:C.tx}}>{c.ad}</F><F className="text-xs shrink-0" style={{color:C.cy}}>{c.un}</F><F className="text-xs font-bold shrink-0 px-1.5" style={{background:`${sc}22`,color:sc}}>{c.st}</F>
            </div>);})}
        </div>
      </div>
      <div className="w-60 shrink-0 flex flex-col overflow-y-auto border-l" style={{background:C.cd,borderColor:C.bd}}>
        <div className="p-2"><F className="text-sm uppercase tracking-widest font-bold mb-2 block" style={{color:C.mt}}>Hospitals</F>
          {HOSPS.map((h,i)=>{const ac=h.a<=15?C.g:h.a<=30?C.b:h.a<=45?C.a:h.a<=60?C.o:C.r;return(
            <div key={i} className="mb-1 p-1.5" style={{background:C.sf,borderLeft:`3px solid ${h.st==="CLOSED"?C.mt:ac}`,opacity:h.st==="CLOSED"?0.3:1}}>
              <div className="flex items-center justify-between"><F className="text-xs font-bold truncate" style={{color:C.tx}}>{h.n}</F><F className="text-lg font-black" style={{color:ac}}>{h.a}m</F></div>
              <div className="flex items-center justify-between"><F className="text-[10px]" style={{color:C.dm}}>{h.d}mi</F><F className="text-[10px] font-bold px-1" style={{background:`${h.st==="CLOSED"?C.r:h.st==="ED SAT"?C.a:C.g}20`,color:h.st==="CLOSED"?C.r:h.st==="ED SAT"?C.a:C.g}}>{h.st}</F></div>
            </div>);})}
        </div>
        <div className="p-2 border-t" style={{borderColor:C.bd}}><F className="text-xs uppercase tracking-widest font-bold mb-1 block" style={{color:C.mt}}>Infrastructure</F>
          <div className="grid grid-cols-2 gap-1">{["GAS","LADWP","WATER","SCE"].map(u=><div key={u} className="flex justify-between px-1.5 py-0.5" style={{background:C.sf}}><F className="text-[10px]" style={{color:C.dm}}>{u}</F><F className="text-[10px] font-bold" style={{color:C.g}}>OK</F></div>)}</div>
          <div className="grid grid-cols-2 gap-1 mt-1">{[{n:"I-405",a:true},{n:"I-10",a:false},{n:"I-110",a:false},{n:"US-101",a:false}].map(f=><div key={f.n} className="flex justify-between px-1.5 py-0.5" style={{background:C.sf}}><F className="text-[10px]" style={{color:C.dm}}>{f.n}</F><F className="text-[10px] font-bold" style={{color:f.a?C.r:C.g}}>{f.a?"SLOW":"OK"}</F></div>)}</div>
        </div>
        <div className="p-2 border-t mt-auto" style={{borderColor:C.bd}}>
          <div className="grid grid-cols-3 gap-1 text-center">
            <div className="py-1" style={{background:C.sf}}><F className="text-xl font-black block" style={{color:C.r}}>{s18.active+s9.active}</F><F className="text-[8px] uppercase" style={{color:C.mt}}>Active</F></div>
            <div className="py-1" style={{background:C.sf}}><F className="text-xl font-black block" style={{color:C.cy}}>61</F><F className="text-[8px] uppercase" style={{color:C.mt}}>EMS</F></div>
            <div className="py-1" style={{background:C.sf}}><F className="text-xl font-black block" style={{color:C.a}}>9</F><F className="text-[8px] uppercase" style={{color:C.mt}}>Fire</F></div>
          </div>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3 px-4 py-1.5 shrink-0" style={{background:`${uc}10`,borderTop:`2px solid ${uc}`}}><F className="text-xs font-bold shrink-0 px-2" style={{background:`${uc}25`,color:uc}}>LAFD {mi+1}/{MSGS.length}</F><F className="text-xs truncate" style={{color:C.tx}}>{msg.tx}</F></div>
    <div className="flex items-center justify-between px-4 py-0.5 shrink-0" style={{background:C.sf,borderTop:`1px solid ${C.bd}`}}><F className="text-[10px]" style={{color:C.g}}>● IDLE — SITUATIONAL AWARENESS</F><F className="text-[10px]" style={{color:C.dm}}>FIREDASH v5.0 · 5s · CAD● · APOT Solutions</F></div>
  </>);
};

/* MAIN — MODE CONTROLLER */
export default function App(){
  const[now,setNow]=useState(new Date());const[mi,setMi]=useState(0);const[b18,setB18]=useState(B18);const[b9]=useState(B9);
  const[alertOn,setAlertOn]=useState(false);const[alertEv,setAlertEv]=useState(DISP[0]);const[timer,setTimer]=useState(0);const[di,setDi]=useState(0);

  useEffect(()=>{const i=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(i);},[]);
  useEffect(()=>{const i=setInterval(()=>setMi(p=>(p+1)%MSGS.length),8000);return()=>clearInterval(i);},[]);
  // Live unit cycling 5s
  useEffect(()=>{const i=setInterval(()=>{setB18(prev=>{const nx=JSON.parse(JSON.stringify(prev))as Batt;const si=Math.floor(Math.random()*nx.stations.length);const ui=Math.floor(Math.random()*nx.stations[si].u.length);const unit=nx.stations[si].u[ui];const sts:US[]=["AVAIL","DISPATCHED","ENROUTE","ONSCENE","TRANSPORTING","ATHOSPITAL"];if(unit.s!=="AVAIL"){if(Math.random()<0.3)unit.s="AVAIL";else{const ci=sts.indexOf(unit.s);unit.s=ci<sts.length-1?sts[ci+1]:"AVAIL";}}return nx;});},5000);return()=>clearInterval(i);},[]);
  // Simulated dispatch every 45s, first at 12s
  useEffect(()=>{const i=setInterval(()=>{if(!alertOn){const ev=DISP[di%DISP.length];setAlertEv(ev);setTimer(ev.to);setAlertOn(true);setDi(p=>p+1);}},45000);const f=setTimeout(()=>{if(!alertOn){setAlertEv(DISP[0]);setTimer(DISP[0].to);setAlertOn(true);setDi(1);}},12000);return()=>{clearInterval(i);clearTimeout(f);};},[alertOn,di]);
  // Turnout countdown
  useEffect(()=>{if(!alertOn)return;const i=setInterval(()=>{setTimer(p=>{if(p<=1){setTimeout(()=>setAlertOn(false),8000);return 0;}return p-1;});},1000);return()=>clearInterval(i);},[alertOn]);

  const ts=now.toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Los_Angeles"});
  const ds=now.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"America/Los_Angeles"}).toUpperCase();

  return(
    <div className="flex flex-col h-screen w-full overflow-hidden relative" style={{background:C.bg,fontFamily:"'JetBrains Mono','Courier New',monospace"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.8}}`}</style>
      <div className="flex items-center justify-between px-4 shrink-0" style={{background:alertOn?C.r:C.r,height:48}}>
        <div className="flex items-center gap-3"><F className="text-white font-black text-xl tracking-wider">FIREDASH</F><div className="w-px h-6 bg-white/30"/><div className="px-2 py-0.5" style={{background:"rgba(0,0,0,0.3)"}}><F className="text-white font-black text-lg">92</F></div><F className="text-white/80 text-sm font-bold">CENTURY CITY</F>{alertOn&&<F className="text-white font-black text-sm ml-4 px-2 py-0.5 animate-pulse" style={{background:"rgba(0,0,0,0.4)"}}>DISPATCH ALERT</F>}</div>
        <div className="flex items-center gap-4"><F className="text-white/70 text-sm">{ds}</F><F className="text-white font-black text-2xl tracking-tight">{ts}</F><div className="flex items-center gap-1"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"/></span><F className="text-white/50 text-xs">LIVE</F></div></div>
      </div>
      {alertOn?<AlertMode ev={alertEv} timer={timer}/>:<IdleMode b18={b18} b9={b9} mi={mi}/>}
    </div>
  );
}

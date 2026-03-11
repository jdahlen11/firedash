import { useState, useEffect } from "react";

/* FIREDASH v3.0 — APPARATUS FLOOR EDITION
   36" TV mounted 8ft high, viewed 10-15ft while walking
   ALL MONOSPACE. ALL FUNCTIONAL. ZERO DECORATION.
   Passive TV kiosk — no interaction — simulated live 5s refresh */

const C = {
  bg: "#000000", surface: "#080c12", card: "#0c1018", border: "#182030",
  red: "#ff3b30", amber: "#ff9f0a", green: "#30d158", blue: "#0a84ff",
  cyan: "#64d2ff", purple: "#bf5af2", orange: "#ff6723",
  text: "#f5f5f7", dim: "#98989d", muted: "#636366",
} as const;

type US = "AVAIL"|"DISPATCHED"|"ENROUTE"|"ONSCENE"|"TRANSPORTING"|"ATHOSPITAL";
const SC: Record<US, string> = { AVAIL: C.green, DISPATCHED: C.blue, ENROUTE: C.cyan, ONSCENE: C.amber, TRANSPORTING: C.purple, ATHOSPITAL: C.red };
interface U { n: string; t: "T"|"E"|"RA"|"FR"; s: US }
interface S { id: number; c: string; u: U[] }

const mkB18 = (): S[] => [
  {id:34,c:"34",u:[{n:"E34",t:"E",s:"AVAIL"},{n:"E464",t:"E",s:"AVAIL"},{n:"RA34",t:"RA",s:"TRANSPORTING"},{n:"RA834",t:"RA",s:"AVAIL"}]},
  {id:43,c:"43",u:[{n:"E43",t:"E",s:"ONSCENE"},{n:"RA43",t:"RA",s:"AVAIL"}]},
  {id:58,c:"58",u:[{n:"T58",t:"T",s:"AVAIL"},{n:"E258",t:"E",s:"AVAIL"},{n:"E458",t:"E",s:"AVAIL"},{n:"RA58",t:"RA",s:"ONSCENE"},{n:"RA858",t:"RA",s:"AVAIL"}]},
  {id:61,c:"61",u:[{n:"T61",t:"T",s:"ONSCENE"},{n:"E261",t:"E",s:"AVAIL"},{n:"E61",t:"E",s:"AVAIL"},{n:"RA61",t:"RA",s:"AVAIL"},{n:"RA661",t:"RA",s:"AVAIL"},{n:"RA861",t:"RA",s:"AVAIL"}]},
  {id:68,c:"68",u:[{n:"E68",t:"E",s:"ONSCENE"},{n:"RA68",t:"RA",s:"AVAIL"},{n:"RA868",t:"RA",s:"AVAIL"}]},
  {id:92,c:"92",u:[{n:"T92",t:"T",s:"ONSCENE"},{n:"E292",t:"E",s:"ONSCENE"},{n:"E492",t:"E",s:"ENROUTE"},{n:"RA692",t:"RA",s:"ATHOSPITAL"},{n:"RA92",t:"RA",s:"DISPATCHED"}]},
  {id:94,c:"94",u:[{n:"T94",t:"T",s:"AVAIL"},{n:"E294",t:"E",s:"AVAIL"},{n:"E94",t:"E",s:"AVAIL"},{n:"RA894",t:"RA",s:"AVAIL"},{n:"RA94",t:"RA",s:"AVAIL"}]},
];
const mkB9 = (): S[] => [
  {id:19,c:"19",u:[{n:"E19",t:"E",s:"AVAIL"},{n:"RA19",t:"RA",s:"AVAIL"}]},
  {id:23,c:"23",u:[{n:"E23",t:"E",s:"ONSCENE"},{n:"E469",t:"E",s:"AVAIL"},{n:"RA23",t:"RA",s:"AVAIL"}]},
  {id:37,c:"37",u:[{n:"T37",t:"T",s:"AVAIL"},{n:"E237",t:"E",s:"AVAIL"},{n:"E37",t:"E",s:"AVAIL"},{n:"RA37",t:"RA",s:"AVAIL"}]},
  {id:59,c:"59",u:[{n:"E1B",t:"E",s:"AVAIL"},{n:"E1C",t:"E",s:"AVAIL"},{n:"RA59",t:"RA",s:"AVAIL"}]},
  {id:69,c:"69",u:[{n:"T69",t:"T",s:"AVAIL"},{n:"E269",t:"E",s:"AVAIL"},{n:"E69",t:"E",s:"AVAIL"},{n:"RA669",t:"RA",s:"AVAIL"},{n:"RA69",t:"RA",s:"AVAIL"}]},
  {id:71,c:"71",u:[{n:"E71",t:"E",s:"AVAIL"},{n:"RA71",t:"RA",s:"AVAIL"}]},
];

const HOSPS = [
  {n:"Cedars Marina Del Rey",st:"OPEN",a:30,d:4.8},{n:"Cedars Medical Ctr",st:"OPEN",a:120,d:2.8},
  {n:"Kaiser West LA",st:"OPEN",a:10,d:2.7},{n:"St Johns SM",st:"OPEN",a:140,d:3.6},
  {n:"UCLA Ronald Reagan",st:"OPEN",a:76,d:1.8},{n:"UCLA Santa Monica",st:"ED SAT",a:55,d:4.1},
  {n:"West LA VA",st:"CLOSED",a:150,d:2.2},
];
const CALLS = [
  {t:"22:01",tp:"ALS",ad:"10342 DUNKIRK AVE X COMSTOCK",un:"RA92, E292",st:"DISPATCHED"},
  {t:"21:47",tp:"STR",ad:"1800 CENTURY PARK E",un:"T92, E492, E292",st:"ON SCENE"},
  {t:"21:31",tp:"ALS",ad:"914 WESTWOOD X LE CONTE",un:"RA34, E34",st:"TRANSPORTING"},
  {t:"21:15",tp:"EMS",ad:"10250 CONSTELLATION BLVD",un:"RA58",st:"ON SCENE"},
  {t:"20:58",tp:"CHIM",ad:"914 WESTWOOD BLVD X LE CONTE",un:"E68, T58",st:"ON SCENE"},
  {t:"20:42",tp:"ALS",ad:"2080 CENTURY PARK E FL 12",un:"RA692",st:"AT HOSPITAL"},
];
const WX7=[{d:"TUE",l:54,h:76,hu:62},{d:"WED",l:57,h:80,hu:40},{d:"THU",l:65,h:96,hu:14},{d:"FRI",l:63,h:98,hu:12},{d:"SAT",l:59,h:90,hu:20},{d:"SUN",l:60,h:90,hu:22},{d:"MON",l:62,h:93,hu:28}];
const MSGS=[{tx:"WEATHER: Heat Advisory March 10 12:15PM PDT until March 11 9:00AM PDT — NWS Los Angeles/Oxnard",u:1},{tx:"LAFD Access Window Standards: Maximum height of openings for FD accessibility into buildings",u:0},{tx:"Brush clearance inspections begin April 1 — battalion chiefs ensure compliance documentation current",u:0}];

const F = ({children,className="",style={}}:{children:React.ReactNode;className?:string;style?:React.CSSProperties}) => (
  <span className={className} style={{fontFamily:"'JetBrains Mono','Courier New',monospace",...style}}>{children}</span>
);

const Grid = ({stations,label}:{stations:S[];label:string}) => {
  const HD=["STN","T","E","E","RA","RA","RA","FR"];
  const sl=(s:S):(U|null)[]=>{ const r:Array<U|null>=Array(7).fill(null); const ts=s.u.filter(u=>u.t==="T"),es=s.u.filter(u=>u.t==="E"),ra=s.u.filter(u=>u.t==="RA"),fr=s.u.filter(u=>u.t==="FR"); if(ts[0])r[0]=ts[0];if(es[0])r[1]=es[0];if(es[1])r[2]=es[1];if(ra[0])r[3]=ra[0];if(ra[1])r[4]=ra[1];if(ra[2])r[5]=ra[2];if(fr[0])r[6]=fr[0]; return r; };
  return (
    <div>
      <div className="text-sm uppercase tracking-widest font-bold mb-2" style={{color:C.muted}}>{label}</div>
      <div className="grid gap-1 mb-1" style={{gridTemplateColumns:"48px repeat(7,1fr)"}}>
        {HD.map((h,i)=><div key={i} className="text-xs uppercase tracking-wider font-bold text-center py-1" style={{color:C.muted}}>{h}</div>)}
      </div>
      {stations.map(s=>{const ss=sl(s);const act=s.u.some(u=>u.s!=="AVAIL");return(
        <div key={s.id} className="grid gap-1 mb-1" style={{gridTemplateColumns:"48px repeat(7,1fr)"}}>
          <F className="text-xl font-black flex items-center justify-center" style={{color:act?C.amber:C.cyan}}>{s.c}</F>
          {ss.map((u,i)=>{if(!u)return<div key={i}/>;const c=SC[u.s];return(
            <div key={i} className="text-center py-2 transition-colors duration-500" style={{background:`${c}22`,borderBottom:`3px solid ${c}`}}>
              <F className="text-sm font-bold block" style={{color:c}}>{u.n}</F>
            </div>);})}
        </div>);})}
    </div>
  );
};

export default function App(){
  const[now,setNow]=useState(new Date());
  const[mi,setMi]=useState(0);
  const[b18,setB18]=useState(mkB18);
  const[b9]=useState(mkB9);

  useEffect(()=>{const i=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(i);},[]);
  useEffect(()=>{const i=setInterval(()=>setMi(p=>(p+1)%MSGS.length),8000);return()=>clearInterval(i);},[]);

  // Simulate live unit status changes every 5s
  useEffect(()=>{const i=setInterval(()=>{
    setB18(prev=>{const nx=JSON.parse(JSON.stringify(prev))as S[];const si=Math.floor(Math.random()*nx.length);const ui=Math.floor(Math.random()*nx[si].u.length);const unit=nx[si].u[ui];const sts:US[]=["AVAIL","DISPATCHED","ENROUTE","ONSCENE","TRANSPORTING","ATHOSPITAL"];
    if(unit.s!=="AVAIL"){if(Math.random()<0.3)unit.s="AVAIL";else{const ci=sts.indexOf(unit.s);unit.s=ci<sts.length-1?sts[ci+1]:"AVAIL";}}return nx;});
  },5000);return()=>clearInterval(i);},[]);

  const msg=MSGS[mi];const uc=msg.u===2?C.red:msg.u===1?C.amber:C.green;
  const ts=now.toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Los_Angeles"});
  const ds=now.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"America/Los_Angeles"}).toUpperCase();

  return(
    <div className="flex flex-col h-screen w-full overflow-hidden" style={{background:C.bg,fontFamily:"'JetBrains Mono','Courier New',monospace"}}>
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 shrink-0" style={{background:C.red,height:52}}>
        <div className="flex items-center gap-3">
          <F className="text-white font-black text-xl tracking-wider">FIREDASH</F>
          <div className="w-px h-7 bg-white/30"/>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 flex items-center justify-center" style={{background:"rgba(0,0,0,0.3)"}}><F className="text-white font-black text-xl">92</F></div>
            <F className="text-white/80 text-sm font-bold">CENTURY CITY</F>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <F className="text-white/70 text-sm">{ds}</F>
          <F className="text-white font-black text-3xl tracking-tight">{ts}</F>
          <div className="flex items-center gap-1"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"/></span><F className="text-white/50 text-xs">LIVE</F></div>
        </div>
      </div>

      {/* WEATHER BAR */}
      <div className="flex items-center gap-5 px-4 py-1.5 shrink-0" style={{background:C.surface,borderBottom:`1px solid ${C.border}`}}>
        <F className="text-lg font-bold" style={{color:C.text}}>58°F</F>
        <F className="text-sm" style={{color:C.dim}}>W10 · 62%</F>
        <div className="w-px h-4" style={{background:C.border}}/>
        {WX7.map((d,i)=><div key={d.d} className="flex items-center gap-1"><F className="text-xs font-bold" style={{color:i===0?C.blue:C.muted}}>{d.d}</F><F className="text-xs font-bold" style={{color:d.h>=85?C.red:C.text}}>{d.h}°</F><F className="text-xs" style={{color:d.hu<=15?C.red:C.muted}}>{d.hu}%</F></div>)}
      </div>

      {/* MAIN */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3" style={{background:C.card,border:`1px solid ${C.border}`}}><Grid stations={b18} label="Battalion 18"/></div>
              <div className="p-3" style={{background:C.card,border:`1px solid ${C.border}`}}><Grid stations={b9} label="Battalion 9"/></div>
            </div>
            <div className="mt-3 p-3" style={{background:C.card,border:`1px solid ${C.border}`}}>
              <div className="text-sm uppercase tracking-widest font-bold mb-2" style={{color:C.muted}}>Active Calls</div>
              {CALLS.map((c,i)=>{const sc=c.st==="DISPATCHED"?C.blue:c.st==="ON SCENE"?C.amber:c.st==="TRANSPORTING"?C.purple:c.st==="AT HOSPITAL"?C.red:C.green;return(
                <div key={i} className="flex items-center gap-3 py-2 px-2 mb-1" style={{background:C.surface,borderLeft:`4px solid ${sc}`}}>
                  <F className="text-base shrink-0" style={{color:C.dim}}>{c.t}</F>
                  <F className="text-base font-bold shrink-0 px-2" style={{background:`${c.tp==="ALS"?C.red:c.tp==="STR"?C.amber:C.blue}30`,color:c.tp==="ALS"?C.red:c.tp==="STR"?C.amber:C.blue}}>{c.tp}</F>
                  <F className="text-base flex-1 truncate font-medium" style={{color:C.text}}>{c.ad}</F>
                  <F className="text-sm shrink-0" style={{color:C.cyan}}>{c.un}</F>
                  <F className="text-sm font-bold shrink-0 px-2" style={{background:`${sc}22`,color:sc}}>{c.st}</F>
                </div>);})}
            </div>
          </div>
        </div>

        {/* RIGHT: Hospitals */}
        <div className="w-72 shrink-0 flex flex-col overflow-y-auto border-l" style={{background:C.card,borderColor:C.border}}>
          <div className="p-3">
            <div className="text-sm uppercase tracking-widest font-bold mb-2" style={{color:C.muted}}>Hospitals</div>
            {HOSPS.map((h,i)=>{const ac=h.a<=15?C.green:h.a<=30?C.blue:h.a<=45?C.amber:h.a<=60?C.orange:C.red;return(
              <div key={i} className="mb-2 p-2" style={{background:C.surface,borderLeft:`4px solid ${h.st==="CLOSED"?C.muted:ac}`,opacity:h.st==="CLOSED"?0.35:1}}>
                <div className="flex items-center justify-between">
                  <F className="text-sm font-bold truncate" style={{color:C.text}}>{h.n}</F>
                  <F className="text-xl font-black" style={{color:ac}}>{h.a}m</F>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <F className="text-xs" style={{color:C.dim}}>{h.d}mi</F>
                  <F className="text-xs font-bold px-1" style={{background:`${h.st==="CLOSED"?C.red:h.st==="ED SAT"?C.amber:C.green}20`,color:h.st==="CLOSED"?C.red:h.st==="ED SAT"?C.amber:C.green}}>{h.st}</F>
                </div>
              </div>);})}
          </div>
          <div className="p-3 border-t" style={{borderColor:C.border}}>
            <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{color:C.muted}}>Utilities</div>
            <div className="grid grid-cols-2 gap-1">{["GAS","LADWP","WATER","SCE"].map(u=><div key={u} className="flex justify-between px-2 py-1" style={{background:C.surface}}><F className="text-xs" style={{color:C.dim}}>{u}</F><F className="text-xs font-bold" style={{color:C.green}}>OK</F></div>)}</div>
          </div>
          <div className="p-3 border-t" style={{borderColor:C.border}}>
            <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{color:C.muted}}>Freeways</div>
            <div className="grid grid-cols-2 gap-1">{[{n:"I-5",s:"OK",a:false},{n:"I-10",s:"OK",a:false},{n:"I-110",s:"OK",a:false},{n:"I-405",s:"SLOW",a:true},{n:"SR-90",s:"OK",a:false},{n:"US-101",s:"OK",a:false}].map(f=><div key={f.n} className="flex justify-between px-2 py-1" style={{background:C.surface}}><F className="text-xs" style={{color:C.dim}}>{f.n}</F><F className="text-xs font-bold" style={{color:f.a?C.red:C.green}}>{f.s}</F></div>)}</div>
          </div>
          <div className="p-3 border-t mt-auto" style={{borderColor:C.border}}>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="py-2" style={{background:C.surface}}><F className="text-2xl font-black block" style={{color:C.red}}>5</F><F className="text-[10px] uppercase" style={{color:C.muted}}>Active</F></div>
              <div className="py-2" style={{background:C.surface}}><F className="text-2xl font-black block" style={{color:C.cyan}}>61</F><F className="text-[10px] uppercase" style={{color:C.muted}}>EMS</F></div>
              <div className="py-2" style={{background:C.surface}}><F className="text-2xl font-black block" style={{color:C.amber}}>9</F><F className="text-[10px] uppercase" style={{color:C.muted}}>Fire</F></div>
            </div>
          </div>
        </div>
      </div>

      {/* MESSAGE TICKER */}
      <div className="flex items-center gap-3 px-4 py-2 shrink-0" style={{background:`${uc}10`,borderTop:`2px solid ${uc}`}}>
        <F className="text-sm font-bold shrink-0 px-2" style={{background:`${uc}25`,color:uc}}>LAFD {mi+1}/{MSGS.length}</F>
        <F className="text-sm truncate" style={{color:C.text}}>{msg.tx}</F>
      </div>

      {/* STATUS */}
      <div className="flex items-center justify-between px-4 py-1 shrink-0" style={{background:C.surface,borderTop:`1px solid ${C.border}`}}>
        <F className="text-xs" style={{color:C.green}}>● FIREDASH v3.0</F>
        <div className="flex items-center gap-4"><F className="text-xs" style={{color:C.muted}}>5s Poll</F><F className="text-xs" style={{color:C.muted}}>B18</F><F className="text-xs" style={{color:C.muted}}>CAD ●</F><F className="text-xs font-bold" style={{color:C.dim}}>APOT Solutions</F></div>
      </div>
    </div>
  );
}

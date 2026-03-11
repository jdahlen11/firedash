import { useState, useEffect, useCallback } from "react";
import { usePP, callCategory, type PPInc } from "./pp";

/* FIREDASH v6.0 — LAFD COMMAND INTELLIGENCE PLATFORM
   Multi-view: Dashboard / Bureau / APOT Report / Incident Sub-Dashboards
   PulsePoint live feed + simulated fallback
   Click any call → Incident sub-dashboard with elapsed timer + unit status */

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

const B18:Batt={id:18,stations:[stn(34,[E("E34"),E("E464"),RA("RA34",true,"TRANSPORTING"),RA("RA834",false)]),stn(43,[E("E43","ONSCENE"),RA("RA43")]),stn(58,[T("T58"),E("E258"),E("E458"),RA("RA58",true,"ONSCENE"),RA("RA858",false)]),stn(61,[T("T61","ONSCENE"),E("E261"),E("E61"),RA("RA61"),RA("RA661"),RA("RA861",false)]),stn(68,[E("E68","ONSCENE"),RA("RA68"),RA("RA868",false)]),stn(92,[T("T92"),E("E292"),E("E492"),RA("RA692",true,"ATHOSPITAL"),RA("RA92")]),stn(94,[T("T94"),E("E294"),E("E94"),RA("RA894",false),RA("RA94")])]};
const B9:Batt={id:9,stations:[stn(19,[E("E19"),RA("RA19")]),stn(23,[E("E23","ONSCENE"),E("E469"),RA("RA23")]),stn(37,[T("T37"),E("E237"),E("E37"),RA("RA37"),RA("RA837",false)]),stn(59,[E("E1B"),E("E1C"),RA("RA59")]),stn(69,[T("T69"),E("E269"),E("E69"),RA("RA669"),RA("RA69")]),stn(71,[E("E71"),RA("RA71")])]};
const B5:Batt={id:5,stations:[stn(5,[E("E5"),RA("RA5")]),stn(27,[T("T27"),E("E227"),E("E27"),RA("RA27"),RA("RA827",false)]),stn(41,[E("E41"),RA("RA41")]),stn(51,[E("E51"),RA("RA51")]),stn(52,[E("E52"),RA("RA52")]),stn(56,[E("E56"),RA("RA56")]),stn(62,[E("E62"),RA("RA62"),RA("RA862",false)])]};
const B1:Batt={id:1,stations:[stn(2,[T("T2"),E("E1L"),E("E1T"),RA("RA2")]),stn(3,[T("T3"),E("E203"),E("E3"),RA("RA3"),RA("RA803",false)]),stn(4,[E("E115"),E("E116"),RA("RA4"),RA("RA804",false)]),stn(9,[T("T9"),E("E209"),E("E407"),RA("RA209"),RA("RA809",false),RA("RA9")]),stn(10,[T("T10"),E("E10"),E("E210"),RA("RA10"),RA("RA810",false)]),stn(14,[T("T14"),E("E14"),E("E214"),RA("RA14"),RA("RA814",false)]),stn(17,[T("T17"),E("E17"),E("E217"),RA("RA17")]),stn(25,[E("E25"),RA("RA25")])]};
const B2:Batt={id:2,stations:[stn(1,[T("T1"),E("E1"),E("E201"),RA("RA1")]),stn(12,[T("T12"),E("E12"),E("E212"),RA("RA12")]),stn(16,[E("E16"),RA("RA816",false)]),stn(42,[E("E42"),RA("RA642"),RA("RA842",false)]),stn(44,[E("E44"),RA("RA644"),RA("RA844",false)]),stn(47,[T("T47"),E("E247"),E("E447"),RA("RA47")]),stn(50,[T("T150"),E("E150"),RA("RA650"),RA("RA850",false)]),stn(55,[E("E55"),RA("RA55")])]};
const B11:Batt={id:11,stations:[stn(6,[E("E6"),RA("RA6"),RA("RA606"),RA("RA620",false)]),stn(11,[T("T11"),E("E11"),E("E211"),RA("RA11"),RA("RA811",false)]),stn(13,[E("E13"),E("E411"),RA("RA13"),RA("RA213",false)]),stn(20,[T("T20"),E("E20"),E("E220"),RA("RA20")]),stn(26,[T("T26"),E("E226"),E("E26"),RA("RA26"),RA("RA826",false)]),stn(29,[T("T29"),E("E229"),E("E29"),RA("RA29"),RA("RA829",false)])]};
const BUREAUS=[{name:"CENTRAL",code:"OCB",color:C.g,batts:[B1,B2,B11]},{name:"WEST",code:"OWB",color:C.b,batts:[B5,B9,B18]},{name:"SOUTH",code:"OSB",color:C.o,batts:[{id:6,stations:[stn(36,[E("E36"),RA("RA36")]),stn(38,[E("E38"),RA("RA38")]),stn(79,[E("E79"),RA("RA79")]),stn(85,[E("E85"),RA("RA85")]),stn(101,[E("E101"),RA("RA101")]),stn(112,[E("E112"),RA("RA112")])]},{id:13,stations:[stn(15,[E("E15"),RA("RA15"),RA("RA815",false)]),stn(21,[E("E21"),RA("RA21")]),stn(33,[E("E33"),RA("RA33"),RA("RA833",false)]),stn(46,[E("E46"),RA("RA46"),RA("RA246"),RA("RA846",false)]),stn(57,[E("E57"),RA("RA57"),RA("RA257"),RA("RA857",false)]),stn(64,[E("E64"),RA("RA64"),RA("RA264"),RA("RA864",false)]),stn(65,[E("E65"),RA("RA65"),RA("RA865",false)]),stn(66,[E("E66"),RA("RA66"),RA("RA266"),RA("RA866",false)])]}]},{name:"VALLEY",code:"OVB",color:C.p,batts:[{id:10,stations:[stn(7,[E("E7"),RA("RA7"),RA("RA807",false)]),stn(18,[E("E18"),RA("RA18")]),stn(60,[E("E60"),RA("RA60"),RA("RA860")]),stn(73,[E("E73"),RA("RA73")]),stn(76,[E("E76"),RA("RA76")]),stn(77,[E("E77"),RA("RA77")]),stn(78,[E("E78"),RA("RA78"),RA("RA878",false)])]},{id:12,stations:[stn(39,[E("E39"),RA("RA39"),RA("RA839",false)]),stn(70,[E("E70"),RA("RA70")]),stn(72,[E("E72"),RA("RA72"),RA("RA872")]),stn(81,[E("E81"),RA("RA81"),RA("RA881",false)]),stn(86,[E("E86"),RA("RA86")]),stn(88,[E("E88"),RA("RA88")]),stn(89,[E("E89"),RA("RA89"),RA("RA889",false)])]},{id:14,stations:[stn(74,[E("E74"),RA("RA74"),RA("RA874",false)]),stn(82,[E("E82"),RA("RA82")]),stn(83,[E("E83"),RA("RA83")]),stn(84,[E("E84"),RA("RA84")]),stn(90,[E("E90"),RA("RA90")]),stn(91,[E("E91"),RA("RA91")]),stn(98,[E("E98"),RA("RA98"),RA("RA898",false)])]},{id:15,stations:[stn(35,[E("E35"),RA("RA35"),RA("RA835",false)]),stn(75,[E("E75"),RA("RA75")]),stn(87,[E("E87"),RA("RA87")]),stn(93,[E("E93"),RA("RA93")]),stn(95,[E("E95"),RA("RA95")]),stn(96,[E("E96"),RA("RA96"),RA("RA896",false)]),stn(97,[E("E97"),RA("RA97")])]},{id:17,stations:[stn(99,[E("E99"),RA("RA99")]),stn(100,[E("E100"),RA("RA100")]),stn(102,[E("E102"),RA("RA102")]),stn(104,[E("E104"),RA("RA104")]),stn(105,[E("E105"),RA("RA105")]),stn(106,[E("E106"),RA("RA106")])]}]}];

const HOSPS=[{n:"Cedars Marina Del Rey",st:"OPEN",a:30,d:4.8},{n:"Cedars Medical Ctr",st:"OPEN",a:120,d:2.8},{n:"Kaiser West LA",st:"OPEN",a:10,d:2.7},{n:"St Johns SM",st:"OPEN",a:140,d:3.6},{n:"UCLA Ronald Reagan",st:"OPEN",a:76,d:1.8},{n:"UCLA Santa Monica",st:"ED SAT",a:55,d:4.1},{n:"West LA VA",st:"CLOSED",a:150,d:2.2}];
const WX=[{d:"TUE",h:76,hu:62},{d:"WED",h:80,hu:40},{d:"THU",h:96,hu:14},{d:"FRI",h:98,hu:12},{d:"SAT",h:90,hu:20},{d:"SUN",h:90,hu:22},{d:"MON",h:93,hu:28}];
const MSGS=[{tx:"WEATHER: Heat Advisory March 10 12:15PM until March 11 9:00AM — NWS LA/Oxnard",u:1},{tx:"Brush clearance inspections begin April 1 — ensure compliance documentation current",u:0}];

const F=({children,className="",style={}}:{children:React.ReactNode;className?:string;style?:React.CSSProperties})=>(<span className={className} style={{fontFamily:"'JetBrains Mono','Courier New',monospace",...style}}>{children}</span>);
const battStats=(b:Batt)=>{let t=0,av=0,ac=0,als=0,bls=0;b.stations.forEach(s=>s.u.forEach(u=>{t++;if(u.s==="AVAIL")av++;else ac++;if(u.t==="RA"){if(u.als)als++;else bls++;}}));return{t,av,ac,als,bls,pct:t?Math.round((ac/t)*100):0};};
const stColor=(st:string)=>st.includes("DISPATCH")?C.b:st.includes("ROUTE")?C.cy:st.includes("SCENE")?C.a:st.includes("TRANSPORT")?C.p:st.includes("HOSPITAL")?C.r:C.g;
const tpColor=(tp:string)=>['ALS','EMS','MCI'].includes(tp)?C.r:['STR','FIRE','FULL','CHIM'].includes(tp)?C.a:['TC'].includes(tp)?C.o:C.b;

const Grid=({stations,compact=false}:{stations:S[];compact?:boolean})=>{
  const HD=["STN","T","E","E","RA","RA","RA","FR"];
  const sl=(s:S):(U|null)[]=>{const r:Array<U|null>=Array(7).fill(null);const ts=s.u.filter(u=>u.t==="T"),es=s.u.filter(u=>u.t==="E"),ra=s.u.filter(u=>u.t==="RA");if(ts[0])r[0]=ts[0];if(es[0])r[1]=es[0];if(es[1])r[2]=es[1];if(ra[0])r[3]=ra[0];if(ra[1])r[4]=ra[1];if(ra[2])r[5]=ra[2];return r;};
  return(<div>
    <div className="grid gap-0.5 mb-0.5" style={{gridTemplateColumns:`${compact?36:44}px repeat(7,1fr)`}}>{HD.map((h,i)=><div key={i} className={`${compact?"text-[9px]":"text-xs"} uppercase tracking-wider font-bold text-center`} style={{color:C.mt}}>{h}</div>)}</div>
    {stations.map(s=>{const ss=sl(s);const act=s.u.some(u=>u.s!=="AVAIL");return(
      <div key={s.id} className="grid gap-0.5 mb-px" style={{gridTemplateColumns:`${compact?36:44}px repeat(7,1fr)`}}>
        <F className={`${compact?"text-sm":"text-lg"} font-black flex items-center justify-center`} style={{color:act?C.a:C.cy}}>{s.c}</F>
        {ss.map((u,i)=>{if(!u)return<div key={i}/>;const c=SC[u.s];return(
          <div key={i} className={`text-center ${compact?"py-px":"py-1"} transition-colors duration-700`} style={{background:`${c}22`,borderBottom:`2px solid ${c}`}}>
            <F className={`${compact?"text-[9px]":"text-xs"} font-bold block`} style={{color:c}}>{u.n}</F>
            {!compact&&u.t==="RA"&&u.als!==undefined&&<F className="text-[7px] block" style={{color:u.als?C.r:C.b}}>{u.als?"ALS":"BLS"}</F>}
          </div>);})}
      </div>);})}
  </div>);
};

const CallsList=({calls,live,label,onSelect}:{calls:PPInc[];live:boolean;label:string;onSelect?:(c:PPInc)=>void})=>(
  <div className="p-2" style={{background:C.cd,border:`1px solid ${C.bd}`}}>
    <div className="flex items-center justify-between mb-2 px-1">
      <F className="text-sm uppercase tracking-widest font-bold" style={{color:C.mt}}>{label}</F>
      <div className="flex items-center gap-2">
        {live&&<F className="text-[10px] px-1.5 py-0.5 font-bold" style={{background:`${C.g}20`,color:C.g}}>LIVE PULSEPOINT</F>}
        <F className="text-xs" style={{color:C.dm}}>{calls.length} calls</F>
      </div>
    </div>
    {calls.map((c,i)=>{const sc=stColor(c.st);return(
      <div key={c.id||i} className="flex items-center gap-2 py-1.5 px-2 mb-0.5 cursor-pointer hover:opacity-80 transition-opacity" style={{background:C.sf,borderLeft:`4px solid ${sc}`}} onClick={()=>onSelect?.(c)}>
        <F className="text-sm shrink-0" style={{color:C.dm}}>{c.t}</F>
        <F className="text-sm font-bold shrink-0 px-1.5" style={{background:`${tpColor(c.tp)}30`,color:tpColor(c.tp)}}>{c.tp}</F>
        <F className="text-sm flex-1 truncate" style={{color:C.tx}}>{c.ad}</F>
        <F className="text-xs shrink-0" style={{color:C.cy}}>{c.un}</F>
        <F className="text-xs font-bold shrink-0 px-1.5" style={{background:`${sc}22`,color:sc}}>{c.st}</F>
      </div>);})}
    {calls.length===0&&<F className="text-sm block text-center py-4" style={{color:C.mt}}>No active calls</F>}
  </div>
);

const HospPanel=({compact=false}:{compact?:boolean})=>(<div className="p-2"><F className="text-sm uppercase tracking-widest font-bold mb-2 block" style={{color:C.mt}}>Hospitals — APOT</F>{HOSPS.map((h,i)=>{const ac=h.a<=15?C.g:h.a<=30?C.b:h.a<=45?C.a:h.a<=60?C.o:C.r;return(<div key={i} className="mb-1 p-1.5" style={{background:C.sf,borderLeft:`3px solid ${h.st==="CLOSED"?C.mt:ac}`,opacity:h.st==="CLOSED"?0.3:1}}><div className="flex items-center justify-between"><F className={`${compact?"text-[10px]":"text-xs"} font-bold truncate`} style={{color:C.tx}}>{h.n}</F><F className={`${compact?"text-base":"text-lg"} font-black`} style={{color:ac}}>{h.a}m</F></div><div className="flex items-center justify-between"><F className="text-[10px]" style={{color:C.dm}}>{h.d}mi</F><F className="text-[10px] font-bold px-1" style={{background:`${h.st==="CLOSED"?C.r:h.st==="ED SAT"?C.a:C.g}20`,color:h.st==="CLOSED"?C.r:h.st==="ED SAT"?C.a:C.g}}>{h.st}</F></div></div>);})}</div>);

const IncidentView=({call,onBack}:{call:PPInc;onBack:()=>void})=>{
  const cat=callCategory(call.raw);const hBg=cat==='fire'?C.r:cat==='ems'?`${C.r}cc`:cat==='tc'?C.o:C.a;
  const[el,setEl]=useState(0);useEffect(()=>{const i=setInterval(()=>setEl(p=>p+1),1000);return()=>clearInterval(i);},[]);
  return(<div className="flex flex-col flex-1 overflow-hidden">
    <div className="px-4 py-3 shrink-0" style={{background:hBg}}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4"><button onClick={onBack} className="text-white/80 text-sm px-2 py-1 cursor-pointer" style={{border:"1px solid rgba(255,255,255,0.3)"}}>BACK</button><F className="text-white font-black text-4xl">{call.tp}</F><div><F className="text-white font-bold text-xl block">{call.ad}</F><F className="text-white/80 text-sm block">{cat.toUpperCase()} · {call.units.length} UNITS · {call.raw}</F></div></div>
        <div className="text-right"><F className="text-white font-black text-3xl block">{String(Math.floor(el/60)).padStart(2,'0')}:{String(el%60).padStart(2,'0')}</F><F className="text-white/70 text-sm uppercase tracking-widest">Elapsed</F></div>
      </div></div>
    <div className="flex-1 flex overflow-hidden p-3 gap-3">
      <div className="flex-1 space-y-3">
        <F className="text-sm uppercase tracking-widest font-bold block" style={{color:C.mt}}>Assigned Units</F>
        <div className="space-y-1">{call.units.map((u,i)=>{const sc=stColor(u.status==="OnScene"?"ON SCENE":u.status==="Enroute"?"EN ROUTE":u.status==="Dispatched"?"DISPATCHED":u.status);return(<div key={u.id} className="flex items-center gap-4 p-2" style={{background:C.cd,borderLeft:`4px solid ${sc}`}}><F className="text-2xl font-black" style={{color:sc}}>{u.id}</F><div className="flex-1"><F className="text-sm font-bold block" style={{color:C.tx}}>{u.id.startsWith("RA")?"RESCUE AMBULANCE":u.id.startsWith("T")?"TRUCK":u.id.startsWith("BC")?"BATTALION CHIEF":u.id.startsWith("E")?"ENGINE":u.id}</F></div><F className="text-sm font-bold" style={{color:sc}}>{u.status==="OnScene"?"ON SCENE":u.status==="Enroute"?"EN ROUTE":u.status||"DISPATCHED"}</F></div>);})}</div>
        <F className="text-sm uppercase tracking-widest font-bold block mt-2" style={{color:C.mt}}>Battalion 18</F>
        <div className="p-2" style={{background:C.cd,border:`1px solid ${C.bd}`}}><Grid stations={B18.stations} compact/></div>
      </div>
      <div className="w-60 shrink-0 space-y-3"><div style={{background:C.cd,border:`1px solid ${C.bd}`}}><HospPanel compact/></div><div className="p-2" style={{background:C.cd,border:`1px solid ${C.bd}`}}><F className="text-xs uppercase tracking-widest font-bold block mb-1" style={{color:C.mt}}>Weather</F><F className="text-lg font-bold block" style={{color:C.tx}}>58F W10 62%</F></div></div>
    </div></div>);
};

const BureauView=()=>{const[bi,setBi]=useState(1);const bur=BUREAUS[bi];let bT=0,bA=0,bAc=0;bur.batts.forEach(b=>{const s=battStats(b);bT+=s.t;bA+=s.av;bAc+=s.ac;});
  return(<div className="flex-1 flex flex-col overflow-hidden">
    <div className="flex items-center justify-between px-4 py-1 shrink-0" style={{background:C.sf,borderBottom:`1px solid ${C.bd}`}}>
      <div className="flex items-center gap-2">{BUREAUS.map((bu,i)=><button key={bu.name} onClick={()=>setBi(i)} className="px-3 py-1 text-sm font-bold uppercase tracking-wider cursor-pointer" style={{background:bi===i?`${bu.color}25`:"transparent",color:bi===i?bu.color:C.mt,borderBottom:bi===i?`2px solid ${bu.color}`:"2px solid transparent"}}>{bu.name}</button>)}</div>
      <div className="flex items-center gap-4"><F className="text-xs" style={{color:C.mt}}>Units:<span style={{color:C.tx}}>{bT}</span></F><F className="text-xs" style={{color:C.mt}}>Active:<span style={{color:C.r}}>{bAc}</span></F><F className="text-xs" style={{color:C.mt}}>Avail:<span style={{color:C.g}}>{bA}</span></F><F className="text-sm font-bold" style={{color:bT>0&&Math.round((bAc/bT)*100)>50?C.r:C.a}}>{bT>0?Math.round((bAc/bT)*100):0}%</F></div>
    </div>
    <div className="flex-1 overflow-y-auto p-2"><div className={`grid gap-2 ${bur.batts.length<=3?"grid-cols-3":bur.batts.length<=4?"grid-cols-2":"grid-cols-3"}`}>{bur.batts.map(bt=>{const st=battStats(bt);return(<div key={bt.id} className="p-2" style={{background:C.cd,border:`1px solid ${C.bd}`}}><div className="flex items-center justify-between mb-1 px-1"><F className="text-sm uppercase tracking-widest font-bold" style={{color:C.mt}}>B{bt.id}</F><div className="flex items-center gap-2"><F className="text-xs" style={{color:C.r}}>{st.ac}A</F><F className="text-xs" style={{color:C.g}}>{st.av}V</F><F className="text-xs font-bold" style={{color:st.pct>50?C.r:st.pct>30?C.a:C.g}}>{st.pct}%</F></div></div><Grid stations={bt.stations} compact/></div>);})}</div></div>
  </div>);
};

const APOTReport=()=>(<div className="flex-1 overflow-auto p-4">
  <F className="text-xl uppercase tracking-widest font-bold block mb-4" style={{color:C.tx}}>APOT Compliance Report — AB-40</F>
  <div className="p-4 mb-4" style={{background:`${C.r}08`,border:`1px solid ${C.r}20`}}><div className="flex items-center gap-8"><div><F className="text-4xl font-black block" style={{color:C.r}}>33m</F><F className="text-xs block" style={{color:C.mt}}>7-Day Avg</F></div><div><F className="text-4xl font-black block" style={{color:C.a}}>48m</F><F className="text-xs block" style={{color:C.mt}}>90th Pctl</F></div><div><F className="text-4xl font-black block" style={{color:C.tx}}>46</F><F className="text-xs block" style={{color:C.mt}}>Daily Enc</F></div><div><F className="text-4xl font-black block" style={{color:C.r}}>78%</F><F className="text-xs block" style={{color:C.mt}}>Compliance</F></div><div className="ml-auto text-right"><F className="text-sm block" style={{color:C.mt}}>AB-40: 30min @ 90th pctl</F><F className="text-sm font-bold block" style={{color:C.r}}>NON-COMPLIANT</F></div></div></div>
  {HOSPS.map((h,i)=>{const ac=h.a<=15?C.g:h.a<=30?C.b:h.a<=45?C.a:h.a<=60?C.o:C.r;const ok=h.a<=30;return(<div key={i} className="flex items-center gap-4 p-3 mb-2" style={{background:C.cd,borderLeft:`4px solid ${h.st==="CLOSED"?C.mt:ac}`,opacity:h.st==="CLOSED"?0.3:1}}><div className="w-16 h-16 flex items-center justify-center" style={{background:`${ac}15`}}><F className="text-2xl font-black" style={{color:ac}}>{h.a}m</F></div><div className="flex-1"><F className="text-lg font-bold block" style={{color:C.tx}}>{h.n}</F><F className="text-sm block" style={{color:C.dm}}>{h.d}mi {h.st}</F></div><F className="text-sm font-bold px-2 py-1" style={{background:`${ok?C.g:C.r}20`,color:ok?C.g:C.r}}>{ok?"AB-40 PASS":"AB-40 FAIL"}</F></div>);})}
</div>);

const Dashboard=({calls,live,onSelect}:{calls:PPInc[];live:boolean;onSelect:(c:PPInc)=>void})=>{
  const s18=battStats(B18),s9=battStats(B9);
  return(<><div className="flex items-center justify-between px-4 py-1 shrink-0" style={{background:C.sf,borderBottom:`1px solid ${C.bd}`}}><div className="flex items-center gap-4"><F className="text-lg font-bold" style={{color:C.tx}}>58F</F><F className="text-sm" style={{color:C.dm}}>W10 62%</F><div className="w-px h-4" style={{background:C.bd}}/>{WX.map((d,i)=><F key={d.d} className="text-xs font-bold" style={{color:d.h>=85?C.r:d.hu<=15?C.o:i===0?C.b:C.mt}}>{d.d[0]}{d.h}{d.hu<=15?"!":""}</F>)}</div><div className="flex items-center gap-4"><F className="text-xs" style={{color:C.mt}}>B18:<span style={{color:C.r}}>{s18.ac}A</span>/<span style={{color:C.g}}>{s18.av}V</span></F><F className="text-xs" style={{color:C.mt}}>B9:<span style={{color:C.r}}>{s9.ac}A</span>/<span style={{color:C.g}}>{s9.av}V</span></F><F className="text-xs" style={{color:C.mt}}>ALS:<span style={{color:C.r}}>{s18.als+s9.als}</span> BLS:<span style={{color:C.b}}>{s18.bls+s9.bls}</span></F></div></div>
    <div className="flex-1 flex overflow-hidden"><div className="flex-1 overflow-y-auto p-2"><div className="grid grid-cols-2 gap-2"><div className="p-2" style={{background:C.cd,border:`1px solid ${C.bd}`}}><div className="flex items-center justify-between mb-1 px-1"><F className="text-sm uppercase tracking-widest font-bold" style={{color:C.mt}}>Battalion 18</F><F className="text-xs font-bold" style={{color:s18.pct>50?C.r:s18.pct>30?C.a:C.g}}>{s18.pct}%</F></div><Grid stations={B18.stations}/></div><div className="p-2" style={{background:C.cd,border:`1px solid ${C.bd}`}}><div className="flex items-center justify-between mb-1 px-1"><F className="text-sm uppercase tracking-widest font-bold" style={{color:C.mt}}>Battalion 9</F><F className="text-xs font-bold" style={{color:s9.pct>50?C.r:s9.pct>30?C.a:C.g}}>{s9.pct}%</F></div><Grid stations={B9.stations}/></div></div><div className="mt-2"><CallsList calls={calls} live={live} label="Active Calls — LAFD" onSelect={onSelect}/></div></div>
      <div className="w-60 shrink-0 flex flex-col overflow-y-auto border-l" style={{background:C.cd,borderColor:C.bd}}><HospPanel/><div className="p-2 border-t" style={{borderColor:C.bd}}><F className="text-xs uppercase tracking-widest font-bold mb-1 block" style={{color:C.mt}}>Infrastructure</F><div className="grid grid-cols-2 gap-1">{["GAS","LADWP","WATER","SCE"].map(u=><div key={u} className="flex justify-between px-1.5 py-0.5" style={{background:C.sf}}><F className="text-[10px]" style={{color:C.dm}}>{u}</F><F className="text-[10px] font-bold" style={{color:C.g}}>OK</F></div>)}</div><div className="grid grid-cols-2 gap-1 mt-1">{[{n:"I-405",a:true},{n:"I-10",a:false},{n:"I-110",a:false},{n:"US-101",a:false}].map(f=><div key={f.n} className="flex justify-between px-1.5 py-0.5" style={{background:C.sf}}><F className="text-[10px]" style={{color:C.dm}}>{f.n}</F><F className="text-[10px] font-bold" style={{color:f.a?C.r:C.g}}>{f.a?"SLOW":"OK"}</F></div>)}</div></div><div className="p-2 border-t mt-auto" style={{borderColor:C.bd}}><div className="grid grid-cols-3 gap-1 text-center"><div className="py-1" style={{background:C.sf}}><F className="text-xl font-black block" style={{color:C.r}}>{calls.length||s18.ac+s9.ac}</F><F className="text-[8px] uppercase" style={{color:C.mt}}>Active</F></div><div className="py-1" style={{background:C.sf}}><F className="text-xl font-black block" style={{color:C.cy}}>106</F><F className="text-[8px] uppercase" style={{color:C.mt}}>Stns</F></div><div className="py-1" style={{background:C.sf}}><F className="text-xl font-black block" style={{color:C.a}}>134</F><F className="text-[8px] uppercase" style={{color:C.mt}}>RAs</F></div></div></div></div></div></>);
};

type View="dashboard"|"bureau"|"report"|"incident";
export default function App(){
  const[now,setNow]=useState(new Date());const[mi,setMi]=useState(0);const[view,setView]=useState<View>("dashboard");const[selCall,setSelCall]=useState<PPInc|null>(null);
  const{calls,live,count}=usePP();
  const fallback:PPInc[]=[{id:"1",t:"22:01",tp:"ALS",raw:"MA",ad:"10342 DUNKIRK AVE X COMSTOCK",un:"RA92, E292",st:"DISPATCHED",units:[{id:"RA92",status:"Dispatched"},{id:"E292",status:"Dispatched"}],lat:34.05,lng:-118.44},{id:"2",t:"21:47",tp:"STR",raw:"SF",ad:"1800 CENTURY PARK E",un:"T92, E492, E292",st:"ON SCENE",units:[{id:"T92",status:"OnScene"},{id:"E492",status:"OnScene"},{id:"E292",status:"OnScene"}],lat:34.06,lng:-118.41},{id:"3",t:"21:31",tp:"ALS",raw:"MA",ad:"914 WESTWOOD X LE CONTE",un:"RA34, E34",st:"TRANSPORTING",units:[{id:"RA34",status:"Transport"},{id:"E34",status:"OnScene"}],lat:34.06,lng:-118.44},{id:"4",t:"21:15",tp:"EMS",raw:"ME",ad:"10250 CONSTELLATION BLVD",un:"RA58",st:"ON SCENE",units:[{id:"RA58",status:"OnScene"}],lat:34.05,lng:-118.41},{id:"5",t:"20:58",tp:"CHIM",raw:"CHIM",ad:"914 WESTWOOD BLVD X LE CONTE",un:"E68, T58",st:"ON SCENE",units:[{id:"E68",status:"OnScene"},{id:"T58",status:"OnScene"}],lat:34.06,lng:-118.45},{id:"6",t:"20:42",tp:"ALS",raw:"MA",ad:"2080 CENTURY PARK E FL 12",un:"RA692",st:"AT HOSPITAL",units:[{id:"RA692",status:"AtHospital"}],lat:34.06,lng:-118.41}];
  const activeCalls=live&&calls.length>0?calls:fallback;
  useEffect(()=>{const i=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(i);},[]);
  useEffect(()=>{const i=setInterval(()=>setMi(p=>(p+1)%MSGS.length),8000);return()=>clearInterval(i);},[]);
  const ts=now.toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Los_Angeles"});
  const ds=now.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"America/Los_Angeles"}).toUpperCase();
  const msg=MSGS[mi];const uc=(msg.u as number)===1?C.a:C.g;
  const handleSelect=(c:PPInc)=>{setSelCall(c);setView("incident");};
  return(
    <div className="flex flex-col h-screen w-full overflow-hidden" style={{background:C.bg,fontFamily:"'JetBrains Mono','Courier New',monospace"}}>
      <div className="flex items-center justify-between px-4 shrink-0" style={{background:C.r,height:44}}>
        <div className="flex items-center gap-3"><span className="text-white font-black text-lg tracking-wider cursor-pointer" style={{fontFamily:"'JetBrains Mono',monospace"}} onClick={()=>{setView("dashboard");setSelCall(null);}}>FIREDASH</span><div className="w-px h-5 bg-white/30"/><div className="px-1.5 py-0.5" style={{background:"rgba(0,0,0,0.3)"}}><F className="text-white font-black text-sm">92</F></div><F className="text-white/80 text-xs font-bold">CENTURY CITY</F></div>
        <div className="flex items-center gap-1">{([["dashboard","STATION"],["bureau","BUREAU"],["report","APOT"]] as const).map(([v,l])=>(<button key={v} onClick={()=>{setView(v);setSelCall(null);}} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer" style={{background:view===v?"rgba(0,0,0,0.4)":"transparent",color:view===v?"white":"rgba(255,255,255,0.6)"}}>{l}</button>))}</div>
        <div className="flex items-center gap-3">{live&&<F className="text-[10px] px-1.5 py-0.5 font-bold" style={{background:"rgba(0,0,0,0.4)",color:C.g}}>PULSEPOINT {count}</F>}<F className="text-white/60 text-xs">{ds}</F><F className="text-white font-black text-xl tracking-tight">{ts}</F><div className="flex items-center gap-1"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"/></span></div></div>
      </div>
      {view==="incident"&&selCall?<IncidentView call={selCall} onBack={()=>{setView("dashboard");setSelCall(null);}}/>:view==="bureau"?<BureauView/>:view==="report"?<APOTReport/>:<Dashboard calls={activeCalls} live={live} onSelect={handleSelect}/>}
      {view!=="incident"&&<><div className="flex items-center gap-3 px-4 py-1 shrink-0" style={{background:`${uc}10`,borderTop:`2px solid ${uc}`}}><F className="text-xs font-bold shrink-0 px-2" style={{background:`${uc}25`,color:uc}}>LAFD {mi+1}/{MSGS.length}</F><F className="text-xs truncate" style={{color:C.tx}}>{msg.tx}</F></div><div className="flex items-center justify-between px-4 py-0.5 shrink-0" style={{background:C.sf,borderTop:`1px solid ${C.bd}`}}><F className="text-[10px]" style={{color:C.g}}>FIREDASH v6.0{live?" — PULSEPOINT":"  "}</F><F className="text-[10px]" style={{color:C.dm}}>APOT Solutions, Inc.</F></div></>}
    </div>);
}

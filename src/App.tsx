import{useState,useEffect}from"react";

/*FIREDASH v7 — LAFD LIVE OPERATIONS TERMINAL
  PulsePoint: LAFDC/LAFDS/LAFDV/LAFDW
  NOT a web app. A data terminal.*/

const STC:Record<string,string>={Dispatched:"#ff9500",Enroute:"#34c759",OnScene:"#ff3b30",Transport:"#ffcc00",TransportArrived:"#007aff",Available:"#8e8e93",Cleared:"#636366",AtHospital:"#007aff"};
const STV:Record<string,string>={Dispatched:"DSPCH",Enroute:"ENRT",OnScene:"ONSCN",Transport:"TRNSP",TransportArrived:"ATHSP",Available:"AVAIL",Cleared:"CLR",AtHospital:"ATHSP"};
const TL:Record<string,string>={ME:"MED EMRG",MA:"FIRE ALRM",MCI:"MCI",SF:"STRUCT FIRE",RF:"RES FIRE",CF:"COMM FIRE",WSF:"WRKNG STR",WRF:"WRKNG RES",WCF:"WRKNG COM",FULL:"FULL ASGN",VF:"VEH FIRE",VEG:"VEG FIRE",WVEG:"WRKNG VEG",TC:"TRAFFIC COL",TCE:"EXP TC",FA:"FIRE ALARM",GAS:"GAS LEAK",EE:"ELEC EMRG",HMR:"HAZMAT",EX:"EXPLOSION",CHIM:"CHIMNEY",OF:"OUTSIDE FIRE",FIRE:"FIRE",AF:"APPL FIRE",PF:"POLE FIRE",ELF:"ELEC FIRE",WR:"WATER RESC",RES:"RESCUE",TR:"TECH RESC",ELR:"ELEV RESC",LA:"LIFT ASST",SI:"SMOKE INV",OI:"ODOR INV",INV:"INVESTIG",WD:"WIRES DOWN",WA:"WIRES ARC",TD:"TREE DOWN",HC:"HAZ COND",PS:"PUB SERV",PA:"POLICE AST",AED:"AED ALARM",SD:"SMOKE DET",TRBL:"TRBL ALARM",WFA:"WATERFLOW",FL:"FLOODING",LR:"LADDER REQ",SH:"SHRD HYDRT",PE:"PIPELINE",TE:"TRANSF EXP",CB:"CNTRL BURN",EF:"EXTNG FIRE",IF:"ILLEGAL FIRE",MF:"MARINE FIRE",GF:"REFUSE FIRE",BT:"BOMB THRT",EM:"EMERGENCY",ER:"EMRG RESP",WE:"WATER EMRG",AI:"ARSON INV",HMI:"HAZ INV",LO:"LOCKOUT",CL:"COMM LOCK",RL:"RES LOCK",VL:"VEH LOCK",IFT:"IFT",EQ:"EARTHQUAKE",CA:"COMM ACTV",FW:"FIRE WATCH",NO:"NOTIF",STBY:"STANDBY",TEST:"TEST",TRNG:"TRAINING",UNK:"UNKNOWN",AR:"ANIMAL RES",CR:"CLIFF RESC",CSR:"CONF SPACE",TNR:"TRENCH RES",USAR:"USAR",VS:"VESSEL SNK",RR:"ROPE RESC",TCS:"TC/STRUCT",TCT:"TC/TRAIN",RTE:"TRAIN EMRG"};
const isEMS=(t:string)=>['ME','MA','AED','MCI','IFT'].includes(t);
const isFire=(t:string)=>['SF','RF','CF','WSF','WRF','WCF','FULL','AF','CHIM','ELF','PF','FIRE','OF','VF','GF','IF','EF','MF','CB','VEG','WVEG'].includes(t);
const isTC=(t:string)=>['TC','TCE','TCS','TCT'].includes(t);

interface Inc{id:string;type:string;time:string;addr:string;lat:string;lng:string;agency:string;units:{id:string;status:string}[]}
const M=({children,c="#e5e5e5",b=false,s=""}:{children:React.ReactNode;c?:string;b?:boolean;s?:string})=>(<span style={{fontFamily:"'JetBrains Mono',Consolas,'Courier New',monospace",color:c,fontWeight:b?900:400,fontSize:s||undefined}}>{children}</span>);

export default function App(){
  const[now,setNow]=useState(new Date());
  const[incidents,setIncidents]=useState<Inc[]>([]);
  const[total,setTotal]=useState(0);
  const[bureaus,setBureaus]=useState<Record<string,number>>({});
  const[live,setLive]=useState(false);
  const[lastFetch,setLastFetch]=useState("");
  const[selected,setSelected]=useState<Inc|null>(null);
  const[elapsed,setElapsed]=useState(0);

  useEffect(()=>{const i=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(i);},[]);
  useEffect(()=>{if(!selected)return;setElapsed(0);const i=setInterval(()=>setElapsed(p=>p+1),1000);return()=>clearInterval(i);},[selected]);

  // PulsePoint live feed
  useEffect(()=>{
    let m=true;
    async function poll(){
      try{
        const r=await fetch('/api/pulsepoint');
        if(!r.ok)throw new Error(`${r.status}`);
        const d=await r.json();
        if(!m)return;
        if(d.ok&&d.incidents){setIncidents(d.incidents);setTotal(d.total);setBureaus(d.bureaus||{});setLive(true);setLastFetch(new Date().toLocaleTimeString("en-US",{hour12:false,timeZone:"America/Los_Angeles"}));}
      }catch{if(m)setLive(false);}
    }
    poll();const i=setInterval(poll,25000);
    return()=>{m=false;clearInterval(i);};
  },[]);

  const ts=now.toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Los_Angeles"});
  const ds=now.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"America/Los_Angeles"}).toUpperCase();

  if(selected){
    const inc=selected;
    const cat=isEMS(inc.type)?'EMS':isFire(inc.type)?'FIRE':isTC(inc.type)?'TC':'OTHER';
    const hc=cat==='FIRE'?'#ff3b30':cat==='EMS'?'#ff6b35':cat==='TC'?'#ff9500':'#ffcc00';
    const mm=String(Math.floor(elapsed/60)).padStart(2,'0'),ss=String(elapsed%60).padStart(2,'0');
    const addr=(inc.addr||'').split(',')[0].toUpperCase();
    return(
      <div style={{background:"#000",color:"#e5e5e5",fontFamily:"'JetBrains Mono',Consolas,monospace",height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:hc,padding:"8px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <span style={{cursor:"pointer",fontWeight:900,fontSize:14,color:"#000",padding:"2px 8px",border:"1px solid rgba(0,0,0,0.3)",fontFamily:"monospace"}} onClick={()=>setSelected(null)}>← BACK</span>
            <M c="#000" b s="28px">{inc.type}</M>
            <div><M c="#000" b s="18px">{addr}</M><br/><M c="rgba(0,0,0,0.7)" s="12px">{cat} · {inc.units.length} UNITS · {inc.agency}</M></div>
          </div>
          <div style={{textAlign:"right"}}><M c="#000" b s="36px">{mm}:{ss}</M><br/><M c="rgba(0,0,0,0.6)" s="11px">ELAPSED</M></div>
        </div>
        <div style={{flex:1,overflow:"auto",padding:12}}>
          <M c="#636366" b s="11px">ASSIGNED UNITS — {inc.units.length}</M>
          <div style={{marginTop:8}}>
            {inc.units.map((u,i)=>{const sc=STC[u.status]||"#636366";const sv=STV[u.status]||u.status;
              return(<div key={u.id+i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",marginBottom:2,background:"#0c1018",borderLeft:`4px solid ${sc}`}}>
                <M c={sc} b s="22px">{u.id}</M>
                <div style={{flex:1}}><M s="13px" c="#e5e5e5">{u.id.startsWith("RA")?"RESCUE AMBULANCE":u.id.startsWith("T")&&!u.id.startsWith("TK")?"TRUCK":u.id.startsWith("E")?"ENGINE":u.id.startsWith("BC")?"BATTALION CHIEF":u.id.startsWith("CM")?"COMMAND":u.id.startsWith("H")?"HELICOPTER":u.id.startsWith("EM")?"EMS CAPTAIN":u.id.startsWith("HR")?"HEAVY RESCUE":u.id.startsWith("UR")?"USAR":u.id}</M></div>
                <M c={sc} b s="13px">{sv}</M>
              </div>);
            })}
          </div>
          <div style={{marginTop:16}}><M c="#636366" b s="11px">INCIDENT DATA</M></div>
          <div style={{marginTop:8,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
            {[["TYPE",TL[inc.type]||inc.type,"#e5e5e5"],["CALL TIME",(inc.time||"").replace("T"," ").replace("Z",""),"#e5e5e5"],["BUREAU",inc.agency.replace("LAFD",""),"#64d2ff"],["ADDRESS",addr,"#e5e5e5"],["LAT",inc.lat,"#636366"],["LNG",inc.lng,"#636366"]].map(([l,v,c])=>(
              <div key={l as string} style={{background:"#0c1018",padding:8}}><M c="#636366" s="9px">{l}</M><br/><M c={c as string} b s="13px">{v}</M></div>
            ))}
          </div>
        </div>
        <div style={{background:"#080c12",borderTop:"1px solid #182030",padding:"4px 16px",display:"flex",justifyContent:"space-between"}}><M c="#34c759" s="10px">● INCIDENT DETAIL</M><M c="#636366" s="10px">FIREDASH · APOT Solutions</M></div>
      </div>
    );
  }

  return(
    <div style={{background:"#000",color:"#e5e5e5",fontFamily:"'JetBrains Mono',Consolas,'Courier New',monospace",height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:"#1a1a1a",padding:"6px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"2px solid #333"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <M c="#ff3b30" b s="18px">FIREDASH</M>
          <span style={{color:"#333"}}>│</span>
          <M c="#ffcc00" b s="16px">92</M>
          <M c="#8e8e93" s="12px">CENTURY CITY FIRE</M>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          {live?(<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:4,background:"#34c759",display:"inline-block",animation:"pulse 2s infinite"}}/><M c="#34c759" b s="11px">PULSEPOINT LIVE</M><M c="#636366" s="10px">· {total} ACTIVE</M></div>):(<M c="#ff9500" s="11px">CONNECTING...</M>)}
          <M c="#8e8e93" s="12px">{ds}</M>
          <M c="#e5e5e5" b s="22px">{ts}</M>
        </div>
      </div>
      {live&&Object.keys(bureaus).length>0&&(<div style={{background:"#111",padding:"4px 16px",display:"flex",gap:16,borderBottom:"1px solid #222"}}>{Object.entries(bureaus).map(([id,count])=>(<M key={id} c="#8e8e93" s="11px">{id.replace("LAFD","")}: <span style={{color:"#e5e5e5",fontWeight:900}}>{count}</span></M>))}<div style={{flex:1}}/><M c="#636366" s="10px">LAST: {lastFetch}</M></div>)}
      <div style={{flex:1,overflow:"auto"}}>
        <div style={{position:"sticky",top:0,background:"#111",padding:"6px 16px",display:"grid",gridTemplateColumns:"60px 90px 1fr 200px 100px",gap:8,borderBottom:"1px solid #333",zIndex:1}}>
          <M c="#636366" b s="10px">TIME</M><M c="#636366" b s="10px">TYPE</M><M c="#636366" b s="10px">ADDRESS</M><M c="#636366" b s="10px">UNITS</M><M c="#636366" b s="10px">STATUS</M>
        </div>
        {incidents.map((inc,i)=>{
          const tc=isEMS(inc.type)?'#ff6b35':isFire(inc.type)?'#ff3b30':isTC(inc.type)?'#ff9500':'#8e8e93';
          const time=(inc.time||'').substring(11,16);
          const addr=(inc.addr||'').split(',')[0].toUpperCase();
          const sts=inc.units.map(u=>u.status);
          const ps=sts.includes('OnScene')?'OnScene':sts.includes('Enroute')?'Enroute':sts.includes('Dispatched')?'Dispatched':sts.includes('Transport')?'Transport':sts[0]||'';
          const sc=STC[ps]||'#636366';const sv=STV[ps]||ps;
          return(
            <div key={inc.id||i} onClick={()=>setSelected(inc)} style={{padding:"6px 16px",display:"grid",gridTemplateColumns:"60px 90px 1fr 200px 100px",gap:8,borderBottom:"1px solid #1a1a1a",cursor:"pointer",borderLeft:`3px solid ${sc}`,background:i%2===0?"#080808":"#000"}}>
              <M c="#636366" s="13px">{time}</M>
              <M c={tc} b s="12px">{TL[inc.type]||inc.type}</M>
              <M c="#e5e5e5" s="13px">{addr}</M>
              <div style={{overflow:"hidden",whiteSpace:"nowrap"}}>{inc.units.slice(0,6).map((u,j)=>(<span key={u.id+j} style={{display:"inline-block",padding:"1px 4px",marginRight:3,fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:STC[u.status]||"#636366",background:`${STC[u.status]||"#636366"}15`}}>{u.id}</span>))}{inc.units.length>6&&<M c="#636366" s="10px">+{inc.units.length-6}</M>}</div>
              <M c={sc} b s="12px">{sv}</M>
            </div>
          );
        })}
        {!live&&(<div style={{padding:"40px 16px",textAlign:"center"}}><M c="#636366" s="14px">Connecting to PulsePoint...</M><br/><M c="#636366" s="11px">LAFDC · LAFDS · LAFDV · LAFDW</M></div>)}
        {live&&incidents.length===0&&(<div style={{padding:"40px 16px",textAlign:"center"}}><M c="#34c759" s="14px">Connected — no active incidents</M></div>)}
      </div>
      <div style={{background:"#111",borderTop:"1px solid #333",padding:"4px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:12}}><M c={live?"#34c759":"#ff9500"} s="10px">● FIREDASH v7.0</M><M c="#636366" s="10px">STN 92 · WEST BUREAU</M></div>
        <M c="#636366" s="10px">APOT SOLUTIONS, INC.</M>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

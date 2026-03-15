import{useState,useEffect,useCallback,useRef,useMemo}from"react";
import{fetchWallTimeHospitalMetrics,distMilesFromStn92}from"./lib/walltime";

export interface Unit{id:string;status:string}
export interface Incident{id:string;type:string;time:string;addr:string;lat:string;lng:string;agency:string;units:Unit[]}
export type IncidentCategory="ems"|"fire"|"tc"|"hazmat"|"rescue"|"other";
export interface BureauCounts{[k:string]:number}
export interface PulsePointData{incidents:Incident[];total:number;bureaus:BureauCounts;live:boolean;lastFetch:string;history:number[]}

// ─── RA Fleet ───────────────────────────────────────────────────────
export interface RAUnit{id:string;level:"ALS"|"BLS";station:number}
export const RA_FLEET:RAUnit[]=[
{id:"RA19",level:"ALS",station:19},{id:"RA826",level:"BLS",station:26},{id:"RA898",level:"BLS",station:98},{id:"RA858",level:"BLS",station:58},{id:"RA850",level:"BLS",station:50},{id:"RA83",level:"ALS",station:83},{id:"RA2",level:"ALS",station:2},{id:"RA94",level:"ALS",station:94},{id:"RA246",level:"ALS",station:46},{id:"RA25",level:"ALS",station:25},{id:"RA809",level:"BLS",station:9},{id:"RA70",level:"ALS",station:70},{id:"RA3",level:"ALS",station:3},{id:"RA89",level:"ALS",station:89},{id:"RA804",level:"BLS",station:4},{id:"RA6",level:"ALS",station:6},{id:"RA96",level:"ALS",station:96},{id:"RA211",level:"ALS",station:11},{id:"RA881",level:"BLS",station:81},{id:"RA68",level:"ALS",station:68},{id:"RA9",level:"ALS",station:9},{id:"RA84",level:"ALS",station:84},{id:"RA87",level:"ALS",station:87},{id:"RA76",level:"ALS",station:76},{id:"RA833",level:"BLS",station:33},{id:"RA903",level:"BLS",station:103},{id:"RA257",level:"ALS",station:57},{id:"RA41",level:"ALS",station:41},{id:"RA864",level:"BLS",station:64},{id:"RA39",level:"ALS",station:39},{id:"RA72",level:"ALS",station:72},{id:"RA91",level:"ALS",station:91},{id:"RA37",level:"ALS",station:37},{id:"RA11",level:"ALS",station:11},{id:"RA88",level:"ALS",station:88},{id:"RA13",level:"ALS",station:13},{id:"RA106",level:"ALS",station:106},{id:"RA98",level:"ALS",station:98},{id:"RA12",level:"ALS",station:12},{id:"RA815",level:"BLS",station:15},{id:"RA105",level:"ALS",station:105},{id:"RA101",level:"ALS",station:101},{id:"RA102",level:"ALS",station:102},{id:"RA892",level:"BLS",station:92},{id:"RA63",level:"BLS",station:63},{id:"RA1",level:"ALS",station:1},{id:"RA894",level:"BLS",station:94},{id:"RA10",level:"ALS",station:10},{id:"RA69",level:"ALS",station:69},{id:"RA26",level:"ALS",station:26},{id:"RA60",level:"ALS",station:60},{id:"RA862",level:"BLS",station:62},{id:"RA71",level:"ALS",station:71},{id:"RA867",level:"BLS",station:67},{id:"RA78",level:"ALS",station:78},{id:"RA97",level:"ALS",station:97},{id:"RA56",level:"ALS",station:56},{id:"RA35",level:"ALS",station:35},{id:"RA58",level:"ALS",station:58},{id:"RA93",level:"ALS",station:93},{id:"RA73",level:"ALS",station:73},{id:"RA59",level:"ALS",station:59},{id:"RA810",level:"BLS",station:10},{id:"RA92",level:"ALS",station:92},{id:"RA5",level:"ALS",station:5},{id:"RA835",level:"BLS",station:35},{id:"RA52",level:"ALS",station:52},{id:"RA77",level:"ALS",station:77},{id:"RA47",level:"ALS",station:47},{id:"RA878",level:"BLS",station:78},{id:"RA104",level:"ALS",station:104},{id:"RA814",level:"BLS",station:14},{id:"RA66",level:"ALS",station:66},{id:"RA90",level:"ALS",station:90},{id:"RA896",level:"BLS",station:96},{id:"RA861",level:"BLS",station:61},{id:"RA807",level:"BLS",station:7},{id:"RA61",level:"ALS",station:61},{id:"RA848",level:"BLS",station:48},{id:"RA829",level:"BLS",station:29},{id:"RA865",level:"BLS",station:65},{id:"RA14",level:"ALS",station:14},{id:"RA33",level:"ALS",station:33},{id:"RA889",level:"BLS",station:89},{id:"RA38",level:"ALS",station:38},{id:"RA15",level:"ALS",station:15},{id:"RA866",level:"BLS",station:66},{id:"RA813",level:"BLS",station:13},{id:"RA79",level:"ALS",station:79},{id:"RA18",level:"ALS",station:18},{id:"RA55",level:"ALS",station:55},{id:"RA85",level:"ALS",station:85},{id:"RA46",level:"ALS",station:46},{id:"RA803",level:"BLS",station:3},{id:"RA801",level:"BLS",station:1},{id:"RA837",level:"BLS",station:37},{id:"RA872",level:"ALS",station:72},{id:"RA95",level:"ALS",station:95},{id:"RA874",level:"BLS",station:74},{id:"RA834",level:"BLS",station:34},
];
export const RA_STATS={total:RA_FLEET.length,als:RA_FLEET.filter(r=>r.level==="ALS").length,bls:RA_FLEET.filter(r=>r.level==="BLS").length};

// ─── Hospitals (live from WallTime Supabase) ─────────────────────────
export interface Hospital{name:string;short:string;status:"OPEN"|"ED SATURATION"|"DIVERT"|"CLOSED";wait:number;atWall:number;inbound:number;designations:string[];dist:number}

function deriveStatus(avgWait:number,sampleCount:number,atWall:number):"OPEN"|"ED SATURATION"|"DIVERT"|"CLOSED"{
  if(sampleCount===0&&atWall===0)return"OPEN";
  if(avgWait>=60)return"DIVERT";
  if(avgWait>=35)return"ED SATURATION";
  return"OPEN";
}

export function useHospitals(){
  const[h,setH]=useState<Hospital[]>([]);
  const load=useCallback(async()=>{
    try{
      const metrics=await fetchWallTimeHospitalMetrics();
      setH(metrics.map(m=>({
        name:m.name,
        short:m.abbrev,
        status:deriveStatus(m.avgWaitMinutes,m.sampleCount,m.atWall),
        wait:m.avgWaitMinutes,
        atWall:m.atWall,
        inbound:0,
        designations:m.designations,
        dist:distMilesFromStn92(m.lat,m.lng),
      })));
    }catch{}
  },[]);
  useEffect(()=>{load();const i=setInterval(load,30000);return()=>clearInterval(i);},[load]);
  return h;
}

// ─── RA Transports (simulated WallTime) ─────────────────────────────
export interface RATransport{unit:string;level:"ALS"|"BLS";hospital:string;wallTime:number;status:"EN ROUTE"|"AT HOSPITAL"|"AVAILABLE";chief:string}
const CC=["CHEST PAIN","DYSPNEA","FALL","SYNCOPE","ABD PAIN","ALTERED MS","SEIZURE","ALLERGIC RXN","BACK PAIN","HEADACHE","DIABETIC","OD","LACERATION"];
const HOSPS=["UCLA RR","CEDARS","KAISER WLA","ST JOHNS"];

function genTransports():RATransport[]{
  const n=Math.floor(Math.random()*6+5);
  return[...RA_FLEET].sort(()=>Math.random()-.5).slice(0,n).map(ra=>{
    const st=Math.random()>.4?"AT HOSPITAL":Math.random()>.3?"EN ROUTE":"AVAILABLE";
    return{unit:ra.id,level:ra.level,hospital:HOSPS[Math.floor(Math.random()*HOSPS.length)],wallTime:st==="AT HOSPITAL"?Math.floor(Math.random()*85+5):0,status:st,chief:CC[Math.floor(Math.random()*CC.length)]};
  });
}

export function useTransports(){
  const[t,setT]=useState<RATransport[]>(genTransports);
  useEffect(()=>{
    const i=setInterval(()=>{setT(p=>p.map(t=>({...t,wallTime:t.status==="AT HOSPITAL"?t.wallTime+Math.floor(Math.random()*3):0,status:Math.random()>.96?(t.status==="EN ROUTE"?"AT HOSPITAL":t.status==="AT HOSPITAL"?"AVAILABLE":"EN ROUTE"):t.status})));},8000);
    const j=setInterval(()=>setT(genTransports()),90000);
    return()=>{clearInterval(i);clearInterval(j);};
  },[]);
  return t;
}

// ─── Fire Weather ───────────────────────────────────────────────────
export interface FireWeather{temp:number;rh:number;wind:number;windDir:string;gust:number;fwi:string;fwiColor:string;redFlag:boolean;high:number;low:number}

export function useFireWeather(){
  const[w,setW]=useState<FireWeather>({temp:74,rh:26,wind:10,windDir:"W",gust:18,fwi:"MODERATE",fwiColor:"#FFB020",redFlag:false,high:93,low:65});
  useEffect(()=>{
    async function f(){
      try{
        const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude=34.0522&longitude=-118.2437&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Los_Angeles&forecast_days=1");
        const d=await r.json();
        if(d.current){
          const dirs=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
          const di=Math.round(d.current.wind_direction_10m/22.5)%16;
          const rh=d.current.relative_humidity_2m;
          const ws=Math.round(d.current.wind_speed_10m);
          const gs=Math.round(d.current.wind_gusts_10m||ws*1.5);
          // Fire Weather Index estimation
          const redFlag=rh<15&&ws>25;
          const fwi=rh<10?"EXTREME":rh<15&&ws>15?"VERY HIGH":rh<20?"HIGH":rh<30?"MODERATE":"LOW";
          const fwiColor=fwi==="EXTREME"?"#FF3B5C":fwi==="VERY HIGH"?"#FF6B35":fwi==="HIGH"?"#FFB020":fwi==="MODERATE"?"#FFB020":"#00E08E";
          setW({temp:Math.round(d.current.temperature_2m),rh,wind:ws,windDir:dirs[di],gust:gs,fwi,fwiColor,redFlag,high:Math.round(d.daily?.temperature_2m_max?.[0]||90),low:Math.round(d.daily?.temperature_2m_min?.[0]||65)});
        }
      }catch{}
    }
    f();const i=setInterval(f,600000);return()=>clearInterval(i);
  },[]);
  return w;
}

// ─── Constants ──────────────────────────────────────────────────────
export const TYPE_LABELS:Record<string,string>={ME:"MEDICAL EMERGENCY",MA:"FIRE ALARM",MCI:"MASS CASUALTY",SF:"STRUCTURE FIRE",RF:"RESIDENTIAL FIRE",CF:"COMMERCIAL FIRE",WSF:"WORKING STRUCTURE",WRF:"WORKING RESIDENTIAL",WCF:"WORKING COMMERCIAL",FULL:"FULL ASSIGNMENT",VF:"VEHICLE FIRE",VEG:"VEGETATION FIRE",WVEG:"WORKING VEGETATION",TC:"TRAFFIC COLLISION",TCE:"EXTRICATION TC",FA:"FIRE ALARM",GAS:"GAS LEAK",EE:"ELECTRICAL EMERGENCY",HMR:"HAZMAT RESPONSE",EX:"EXPLOSION",CHIM:"CHIMNEY FIRE",OF:"OUTSIDE FIRE",FIRE:"FIRE",AF:"APPLIANCE FIRE",PF:"POLE FIRE",ELF:"ELECTRICAL FIRE",WR:"WATER RESCUE",RES:"RESCUE",TR:"TECHNICAL RESCUE",ELR:"ELEVATOR RESCUE",LA:"LIFT ASSIST",SI:"SMOKE INVESTIGATION",OI:"ODOR INVESTIGATION",INV:"INVESTIGATION",WD:"WIRES DOWN",WA:"WIRES ARCING",TD:"TREE DOWN",HC:"HAZARDOUS CONDITION",PS:"PUBLIC SERVICE",PA:"POLICE ASSIST",AED:"AED ALARM",FL:"FLOODING",IFT:"INTERFACILITY TRANSFER"};
export const TYPE_SHORT:Record<string,string>={ME:"EMS",MA:"FA",MCI:"MCI",SF:"STR",RF:"STR",CF:"STR",WSF:"WSTR",WRF:"WSTR",WCF:"WSTR",FULL:"FULL",VF:"VEH",VEG:"VEG",WVEG:"WVEG",TC:"TC",TCE:"TCX",FA:"FA",GAS:"GAS",EE:"ELEC",HMR:"HAZ",EX:"EXPL",OF:"FIRE",FIRE:"FIRE",AF:"FIRE",WR:"H2O",RES:"RES",TR:"TECH",ELR:"ELEV",LA:"LIFT",SI:"INV",OI:"INV",INV:"INV",WD:"WIRE",TD:"TREE",HC:"HAZ",PS:"PS",PA:"PA",IFT:"IFT",FL:"FLOOD"};
export const STATUS_LABELS:Record<string,string>={Dispatched:"DISPATCHED",Enroute:"EN ROUTE",OnScene:"ON SCENE",Transport:"TRANSPORT",TransportArrived:"AT HOSPITAL",Available:"AVAILABLE",Cleared:"CLEARED",AtHospital:"AT HOSPITAL"};
export const STATUS_COLORS:Record<string,string>={Dispatched:"#FFB020",Enroute:"#2D7FF9",OnScene:"#FF3B5C",Transport:"#A855F7",TransportArrived:"#00D4FF",Available:"#00E08E",Cleared:"#3D4D66",AtHospital:"#00D4FF"};
export const BUREAU_NAMES:Record<string,string>={LAFDC:"CENTRAL",LAFDS:"SOUTH",LAFDV:"VALLEY",LAFDW:"WEST"};
export const CATEGORY_COLORS:Record<IncidentCategory,string>={ems:"#FF6B35",fire:"#FF3B5C",tc:"#FFB020",hazmat:"#A855F7",rescue:"#00D4FF",other:"#3D4D66"};
export const CATEGORY_LABELS:Record<IncidentCategory,string>={ems:"EMS",fire:"FIRE",tc:"TC",hazmat:"HAZMAT",rescue:"RESCUE",other:"OTHER"};

const EMS=new Set(["ME","MA","AED","MCI","IFT"]),FIRE=new Set(["SF","RF","CF","WSF","WRF","WCF","FULL","AF","CHIM","ELF","PF","FIRE","OF","VF","GF","IF","EF","MF","CB","VEG","WVEG"]),TCS=new Set(["TC","TCE","TCS","TCT"]),HAZ=new Set(["HMR","GAS","EX","HMI","PE","HC"]),RESC=new Set(["WR","RES","TR","ELR","AR","CR","CSR","TNR","USAR","VS","RR","RTE","LO","CL","RL","VL"]);
export function getCategory(t:string):IncidentCategory{if(EMS.has(t))return"ems";if(FIRE.has(t))return"fire";if(TCS.has(t))return"tc";if(HAZ.has(t))return"hazmat";if(RESC.has(t))return"rescue";return"other";}
export function getMostActiveStatus(u:Unit[]):string{const s=u.map(x=>x.status);if(s.includes("OnScene"))return"OnScene";if(s.includes("Enroute"))return"Enroute";if(s.includes("Transport"))return"Transport";if(s.includes("Dispatched"))return"Dispatched";if(s.includes("TransportArrived"))return"TransportArrived";return s[0]||"Unknown";}
export function getUnitType(id:string):string{if(id.startsWith("RA"))return"RESCUE AMBULANCE";if(id.startsWith("EM"))return"EMS CAPTAIN";if(id.startsWith("BC"))return"BATTALION CHIEF";if(id.startsWith("HR"))return"HEAVY RESCUE";if(id.startsWith("UR"))return"USAR";if(id.startsWith("H")&&id.length<=3)return"HELICOPTER";if(id.startsWith("T")&&!id.startsWith("TK"))return"TRUCK";if(id.startsWith("E"))return"ENGINE";return"UNIT";}
export function formatTime(t:string):string{return t?t.substring(11,16):"--:--";}
export function formatAddress(a:string):string{return(a||"").split(",")[0].toUpperCase();}
export function elapsedMinutes(t:string):number{if(!t)return 0;return Math.max(0,Math.floor((Date.now()-new Date(t).getTime())/60000));}

// ─── PulsePoint Hook ────────────────────────────────────────────────
export function usePulsePoint():PulsePointData{
  const[incidents,setIncidents]=useState<Incident[]>([]);const[total,setTotal]=useState(0);const[bureaus,setBureaus]=useState<BureauCounts>({});const[live,setLive]=useState(false);const[lastFetch,setLastFetch]=useState("");const[history,setHistory]=useState<number[]>([]);const hr=useRef<number[]>([]);
  const poll=useCallback(async()=>{try{const r=await fetch("/api/pulsepoint");if(!r.ok)throw new Error("err");const d=await r.json();if(d.ok&&d.incidents){setIncidents(d.incidents);setTotal(d.total);setBureaus(d.bureaus||{});setLive(true);setLastFetch(new Date().toLocaleTimeString("en-US",{hour12:false,timeZone:"America/Los_Angeles"}));const n=[...hr.current,d.total].slice(-40);hr.current=n;setHistory(n);}}catch{setLive(false);}},[]); 
  useEffect(()=>{poll();const i=setInterval(poll,25000);return()=>clearInterval(i);},[poll]);
  return{incidents,total,bureaus,live,lastFetch,history};
}

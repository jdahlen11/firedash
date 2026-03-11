// PulsePoint Live Data for LAFD — polls /api/pulsepoint every 30s
import { useState, useEffect } from 'react';

const TYPES: Record<string,string> = {
  ME:'EMS',MA:'ALS',MCI:'MCI',SF:'STR',RF:'STR',CF:'STR',WSF:'STR',WRF:'STR',WCF:'STR',
  FULL:'FULL',VF:'VEH',VEG:'BRUSH',WVEG:'BRUSH',TC:'TC',TCE:'TC',FA:'FA',GAS:'GAS',
  EE:'ELEC',HMR:'HAZ',EX:'EXPL',CHIM:'CHIM',OF:'FIRE',FIRE:'FIRE',AF:'FIRE',PF:'POLE',
  ELF:'ELEC',WR:'WATER',RES:'RES',TR:'TECH',ELR:'ELEV',LA:'LIFT',PA:'PA',PS:'PS',
  SI:'INV',OI:'INV',INV:'INV',WD:'WIRES',WA:'WIRES',TD:'TREE',HC:'HAZ',
};

export interface PPInc {
  id:string; t:string; tp:string; raw:string; ad:string; un:string; st:string;
  units:{id:string;status:string}[]; lat:number; lng:number;
}

export function callCategory(raw:string):'ems'|'fire'|'tc'|'area'|'other'{
  if(['ME','MA','MCI'].includes(raw))return'ems';
  if(['SF','RF','CF','WSF','WRF','WCF','FULL','AF','CHIM','ELF','PF','FIRE','OF','VF'].includes(raw))return'fire';
  if(['TC','TCE','TCS','TCT'].includes(raw))return'tc';
  if(['VEG','WVEG','HMR','GAS','EX','FL'].includes(raw))return'area';
  return'other';
}

export function usePP():{calls:PPInc[];live:boolean;count:number}{
  const[calls,setCalls]=useState<PPInc[]>([]);
  const[live,setLive]=useState(false);

  useEffect(()=>{
    let aid='';
    async function discover(){
      try{
        const r=await fetch('/api/pulsepoint?agency_id=discover');
        const d=await r.json();
        if(d.agencies?.length>0)aid=d.agencies[0].id;
      }catch{}
      if(!aid){
        for(const c of['EMS11','LAFD','17201']){
          try{const r=await fetch(`/api/pulsepoint?agency_id=${c}`);const d=await r.json();if(d.count>0){aid=c;break;}}catch{}
        }
      }
      if(aid)poll();
    }
    async function poll(){
      try{
        const r=await fetch(`/api/pulsepoint?agency_id=${aid}`);
        const d=await r.json();
        if(d.incidents?.length>0){
          setCalls(d.incidents.map((i:any)=>{
            const units=(i.units||[]).map((u:any)=>({id:u.id,status:u.status||''}));
            const sts=units.map((u:any)=>u.status);
            const st=sts.includes('OnScene')?'ON SCENE':sts.includes('Enroute')?'EN ROUTE':sts.includes('Dispatched')?'DISPATCHED':sts.includes('Transport')?'TRANSPORTING':'ACTIVE';
            return{id:i.id,t:(i.time||'').substring(11,16),tp:TYPES[i.type]||i.type,raw:i.type,ad:(i.addr||'').split(',')[0].toUpperCase(),un:units.map((u:any)=>u.id).join(', '),st,units,lat:i.lat,lng:i.lng};
          }).slice(0,25));
          setLive(true);
        }
      }catch{setLive(false);}
    }
    discover();
    const i=setInterval(()=>{if(aid)poll();},30000);
    return()=>clearInterval(i);
  },[]);

  return{calls,live,count:calls.length};
}

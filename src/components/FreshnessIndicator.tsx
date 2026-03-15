import{useState,useEffect}from"react";

interface FreshnessIndicatorProps{lastUpdated:Date|null}

export default function FreshnessIndicator({lastUpdated}:FreshnessIndicatorProps){
  const[now,setNow]=useState(()=>new Date());
  useEffect(()=>{const i=setInterval(()=>setNow(new Date()),5000);return()=>clearInterval(i);},[]);

  if(!lastUpdated)return<span className="w-1.5 h-1.5 rounded-full inline-block" style={{width:6,height:6,background:"#3D4D66"}} aria-label="Data freshness: unknown"/>;

  const ageSec=Math.floor((now.getTime()-lastUpdated.getTime())/1000);
  const ageMin=Math.floor(ageSec/60);

  let color="#00E08E";
  let label="Data is current";
  let tooltip:string|undefined;

  if(ageSec>=120){
    color="#EF4444";
    label=`Data may be stale – last updated ${ageMin} minute${ageMin!==1?"s":""} ago`;
    tooltip=label;
  }else if(ageSec>=30){
    color="#F59E0B";
    label=`Data updated ${ageMin>0?`${ageMin}m `:""}${ageSec%60}s ago`;
  }

  return(
    <span
      className="inline-flex items-center"
      title={tooltip}
      aria-label={label}
      style={{lineHeight:1}}
    >
      <span
        className="rounded-full inline-block flex-shrink-0"
        style={{width:6,height:6,background:color,transition:"background 0.5s"}}
      />
    </span>
  );
}

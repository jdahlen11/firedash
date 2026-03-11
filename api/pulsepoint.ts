import type{VercelRequest,VercelResponse}from'@vercel/node';
import*as crypto from'crypto';
import*as https from'https';

const LAFD=['LAFDC','LAFDS','LAFDV','LAFDW'];
const PK=(()=>{const e='CommonIncidents';return e[13]+e[1]+e[2]+'brady5r'+e.toLowerCase()[6]+e[5]+'gs';})();

function get(u:string):Promise<string>{return new Promise((r,j)=>{https.get(u,{headers:{'User-Agent':'PulsePoint/3.0'}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r(d));s.on('error',j);}).on('error',j);});}

function dec(raw:string):any{
  const j=JSON.parse(raw);if(!j.ct)return null;
  const ct=Buffer.from(j.ct,'base64'),iv=Buffer.from(j.iv,'hex'),salt=Buffer.from(j.s,'hex');
  let key=Buffer.alloc(0),block=Buffer.alloc(0);
  while(key.length<32){const h=crypto.createHash('md5');if(block.length>0)h.update(block);h.update(Buffer.from(PK));h.update(salt);block=h.digest();key=Buffer.concat([key,block]);}
  const d=crypto.createDecipheriv('aes-256-cbc',key.subarray(0,32),iv);d.setAutoPadding(false);
  let out=Buffer.concat([d.update(ct),d.final()]).toString('utf8');
  const f=out.indexOf('"'),l=out.lastIndexOf('"');if(f>=0&&l>f)out=out.substring(f+1,l);
  return JSON.parse(out.replace(/\\"/g,'"'));
}

export default async function handler(req:VercelRequest,res:VercelResponse){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','s-maxage=20,stale-while-revalidate=10');
  try{
    const results=await Promise.allSettled(LAFD.map(async id=>{
      const raw=await get(`https://web.pulsepoint.org/DB/giba.php?agency_id=${id}`);
      return{id,incidents:(dec(raw))?.incidents?.active||[]};
    }));
    let all:any[]=[];const bureaus:Record<string,number>={};
    for(const r of results){
      if(r.status==='fulfilled'&&r.value.incidents.length){
        bureaus[r.value.id]=r.value.incidents.length;
        for(const i of r.value.incidents){
          all.push({id:i.ID,type:i.PulsePointIncidentCallType,time:i.CallReceivedDateTime,
            addr:i.FullDisplayAddress,lat:i.Latitude,lng:i.Longitude,agency:r.value.id,
            units:(i.Unit||[]).map((u:any)=>({id:u.UnitID,status:u.PulsePointDispatchStatus}))});
        }
      }
    }
    all.sort((a,b)=>(b.time||'').localeCompare(a.time||''));
    return res.json({ok:true,ts:new Date().toISOString(),total:all.length,bureaus,incidents:all});
  }catch(e:any){return res.status(500).json({ok:false,error:e.message});}
}

import type{VercelRequest,VercelResponse}from'@vercel/node';
import*as crypto from'crypto';
import*as https from'https';

const LAFD=['LAFDC','LAFDS','LAFDV','LAFDW'];

const e='CommonIncidents';
const PK=e[13]+e[1]+e[2]+'brady'+'5'+'r'+e.toLowerCase()[6]+e[5]+'gs';

function get(u:string):Promise<string>{
  return new Promise((resolve,reject)=>{
    const url = new URL(u);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      port: 443,
      method: 'GET',
      headers:{
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/json',
        'Origin': 'https://web.pulsepoint.org',
        'Referer': 'https://web.pulsepoint.org/',
        'Sec-Ch-Ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
      }
    };
    const req=https.get(options,res=>{
      // Follow redirects
      if(res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location){
        get(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>resolve(d));
      res.on('error',reject);
    });
    req.on('error',reject);
    req.setTimeout(15000,()=>{req.destroy();reject(new Error('timeout'));});
  });
}

function dec(raw:string):{data:any;error?:string}{
  try{
    const j=JSON.parse(raw);

    // Unencrypted response
    if(j.incidents && !j.ct) return {data: j};
    if(j.active) return {data: {incidents: j}};

    // Encrypted (ct/iv/s)
    if(!j.ct)return{data:null,error:'no ct field'};

    const ct=Buffer.from(j.ct,'base64');
    const iv=Buffer.from(j.iv,'hex');
    const salt=Buffer.from(j.s,'hex');

    let key=Buffer.alloc(0);
    let block=Buffer.alloc(0);
    const pass=Buffer.from(PK);

    while(key.length<48){
      const h=crypto.createHash('md5');
      if(block.length>0)h.update(block);
      h.update(pass);
      h.update(salt);
      block=h.digest();
      key=Buffer.concat([key,block]);
    }

    const aesKey=key.subarray(0,32);
    const decipher=crypto.createDecipheriv('aes-256-cbc',aesKey,iv);
    decipher.setAutoPadding(false);
    let out=Buffer.concat([decipher.update(ct),decipher.final()]);

    const padLen=out[out.length-1];
    if(padLen>0&&padLen<=16) out=out.subarray(0,out.length-padLen);

    let str=out.toString('utf8');
    const firstQ=str.indexOf('"');
    const lastQ=str.lastIndexOf('"');
    if(firstQ>=0&&lastQ>firstQ) str=str.substring(firstQ+1,lastQ);
    str=str.replace(/\\"/g,'"');

    return{data:JSON.parse(str)};
  }catch(err:any){
    return{data:null,error:err.message};
  }
}

export default async function handler(req:VercelRequest,res:VercelResponse){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','s-maxage=20,stale-while-revalidate=10');

  const debug=req.query.debug==='1';

  try{
    const results=await Promise.allSettled(LAFD.map(async id=>{
      const endpoint=`https://api.pulsepoint.org/v1/webapp?resource=incidents&agencyid=${id}`;
      let raw='';
      try{
        raw=await get(endpoint);
      }catch(e:any){
        return{id,incidents:[],error:e.message,rawLen:0,rawStart:''};
      }

      if(raw.trimStart().startsWith('<')){
        return{id,incidents:[],error:'got HTML instead of JSON',rawLen:raw.length,rawStart:raw.substring(0,200)};
      }

      const{data,error}=dec(raw);
      if(error)return{id,incidents:[],error,rawLen:raw.length,rawStart:raw.substring(0,200)};
      const active=data?.incidents?.active||data?.active||[];
      return{id,incidents:active,error:null,rawLen:raw.length};
    }));

    let all:any[]=[];
    const bureaus:Record<string,number>={};
    const errors:any[]=[];

    for(const r of results){
      if(r.status==='fulfilled'){
        const v=r.value;
        if(v.error) errors.push({id:v.id,error:v.error,rawLen:v.rawLen,rawStart:(v as any).rawStart});
        if(v.incidents.length){
          bureaus[v.id]=v.incidents.length;
          for(const i of v.incidents){
            all.push({
              id:i.ID,
              type:i.PulsePointIncidentCallType,
              time:i.CallReceivedDateTime,
              addr:i.FullDisplayAddress,
              lat:i.Latitude,
              lng:i.Longitude,
              agency:v.id,
              units:(i.Unit||[]).map((u:any)=>({id:u.UnitID,status:u.PulsePointDispatchStatus}))
            });
          }
        }
      }else{
        errors.push({status:'rejected',reason:r.reason?.message||String(r.reason)});
      }
    }

    all.sort((a:any,b:any)=>(b.time||'').localeCompare(a.time||''));

    const resp:any={ok:true,ts:new Date().toISOString(),total:all.length,bureaus,incidents:all};
    if(debug||all.length===0)resp.errors=errors;

    return res.json(resp);
  }catch(err:any){
    return res.status(500).json({ok:false,error:err.message});
  }
}

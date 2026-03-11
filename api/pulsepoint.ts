import type{VercelRequest,VercelResponse}from'@vercel/node';
import*as crypto from'crypto';
import*as https from'https';

const LAFD=['LAFDC','LAFDS','LAFDV','LAFDW'];

// Password from PulsePoint JS: "CommonIncidents" → "tombrady5rings"
const e='CommonIncidents';
const PK=e[13]+e[1]+e[2]+'brady'+'5'+'r'+e.toLowerCase()[6]+e[5]+'gs';

function get(u:string):Promise<string>{
  return new Promise((resolve,reject)=>{
    const req=https.get(u,{
      headers:{
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':'application/json,text/plain,*/*',
        'Referer':'https://web.pulsepoint.org/',
        'Origin':'https://web.pulsepoint.org'
      }
    },res=>{
      let d='';
      res.on('data',c=>d+=c);
      res.on('end',()=>resolve(d));
      res.on('error',reject);
    });
    req.on('error',reject);
    req.setTimeout(10000,()=>{req.destroy();reject(new Error('timeout'));});
  });
}

function dec(raw:string):{data:any;error?:string}{
  try{
    const j=JSON.parse(raw);
    if(!j.ct)return{data:null,error:'no ct field in response'};

    const ct=Buffer.from(j.ct,'base64');
    const iv=Buffer.from(j.iv,'hex');
    const salt=Buffer.from(j.s,'hex');

    // Key derivation: MD5-based (CryptoJS EvpKDF compatible)
    let key=Buffer.alloc(0);
    let block=Buffer.alloc(0);
    const pass=Buffer.from(PK);

    while(key.length<48){  // Need 32 bytes key + 16 bytes IV but we already have IV
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

    // Remove PKCS7 padding
    const padLen=out[out.length-1];
    if(padLen>0&&padLen<=16){
      out=out.subarray(0,out.length-padLen);
    }

    let str=out.toString('utf8');

    // The decrypted data is a JSON string wrapped in quotes
    const firstQ=str.indexOf('"');
    const lastQ=str.lastIndexOf('"');
    if(firstQ>=0&&lastQ>firstQ){
      str=str.substring(firstQ+1,lastQ);
    }
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
      const raw=await get(`https://web.pulsepoint.org/DB/giba.php?agency_id=${id}`);
      const{data,error}=dec(raw);
      if(error)return{id,incidents:[],error,rawLen:raw.length,rawStart:raw.substring(0,100)};
      const active=data?.incidents?.active||[];
      return{id,incidents:active,error:null,rawLen:raw.length};
    }));

    let all:any[]=[];
    const bureaus:Record<string,number>={};
    const errors:any[]=[];

    for(const r of results){
      if(r.status==='fulfilled'){
        const v=r.value;
        if(v.error){
          errors.push({id:v.id,error:v.error,rawLen:v.rawLen,rawStart:(v as any).rawStart});
        }
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

    const resp:any={ok:true,ts:new Date().toISOString(),total:all.length,bureaus,incidents:all,password:PK};
    if(debug||all.length===0)resp.errors=errors;

    return res.json(resp);
  }catch(err:any){
    return res.status(500).json({ok:false,error:err.message,password:PK});
  }
}

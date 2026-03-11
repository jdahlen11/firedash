import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as crypto from 'crypto';
import * as https from 'https';

// PulsePoint decryption key derived from "CommonIncidents"
// e[13]+e[1]+e[2]+"brady"+"5"+"r"+e.lower()[6]+e[5]+"gs"
const PP_PASS = "tombrady5rings";

function fetchURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (c: Buffer) => data += c);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function decrypt(enc: { ct: string; iv: string; s: string }): any {
  const ct = Buffer.from(enc.ct, 'base64');
  const iv = Buffer.from(enc.iv, 'hex');
  const salt = Buffer.from(enc.s, 'hex');
  let key = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  const pass = Buffer.from(PP_PASS);
  while (key.length < 32) {
    const h = crypto.createHash('md5');
    if (block.length > 0) h.update(block);
    h.update(pass); h.update(salt);
    block = h.digest(); key = Buffer.concat([key, block]);
  }
  key = key.subarray(0, 32);
  const d = crypto.createDecipheriv('aes-256-cbc', key, iv);
  d.setAutoPadding(false);
  let out = Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  const f = out.indexOf('"'), l = out.lastIndexOf('"');
  if (f >= 0 && l > f) out = out.substring(f + 1, l);
  out = out.replace(/\\"/g, '"');
  return JSON.parse(out);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=25, stale-while-revalidate=10');
  try {
    const aid = (req.query.agency_id as string) || '';
    if (aid === 'discover') {
      const raw = await fetchURL('https://web.pulsepoint.org/DB/GeolocationAgency.php');
      const d = JSON.parse(raw);
      const lafd = (d.agencies || []).filter((a: any) =>
        ((a.agencyname||'')+(a.short_agencyname||'')).toLowerCase().includes('los angeles') &&
        !((a.agencyname||'').toLowerCase().includes('county'))
      );
      return res.json({ agencies: lafd.map((a: any) => ({ id: a.agencyid, name: a.agencyname, short: a.short_agencyname, initials: a.agency_initials })) });
    }
    if (!aid) return res.status(400).json({ error: 'agency_id required' });
    const raw = await fetchURL(`https://web.pulsepoint.org/DB/giba.php?agency_id=${aid}`);
    const enc = JSON.parse(raw);
    if (!enc.ct) return res.status(404).json({ error: 'No data', aid });
    const data = decrypt(enc);
    const active = data?.incidents?.active || [];
    const incidents = active.map((i: any) => ({
      id: i.ID, type: i.PulsePointIncidentCallType,
      time: i.CallReceivedDateTime, addr: i.FullDisplayAddress,
      lat: parseFloat(i.Latitude), lng: parseFloat(i.Longitude),
      units: (i.Unit || []).map((u: any) => ({ id: u.UnitID, status: u.PulsePointDispatchStatus })),
    }));
    return res.json({ aid, ts: new Date().toISOString(), count: incidents.length, incidents });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
}

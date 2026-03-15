import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import * as crypto from 'crypto'
import * as https from 'https'

// ─── PulsePoint dev proxy ────────────────────────────────────────────
// Mirrors the logic in api/pulsepoint.ts so /api/pulsepoint works
// during `vite dev` without needing `vercel dev` or a separate server.

const LAFD = ['LAFDC', 'LAFDS', 'LAFDV', 'LAFDW']
const _e = 'CommonIncidents'
const PK = _e[13]+_e[1]+_e[2]+'brady'+'5'+'r'+_e.toLowerCase()[6]+_e[5]+'gs'

function ppGet(agencyId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname: 'api.pulsepoint.org',
      path: `/v1/webapp?resource=incidents&agencyid=${agencyId}`,
      port: 443,
      headers: {
        'Accept': '*/*',
        'Origin': 'https://web.pulsepoint.org',
        'Referer': 'https://web.pulsepoint.org/',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      }
    }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve(d))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function ppDec(raw: string): any[] {
  try {
    const j = JSON.parse(raw)
    if (!j.ct) return j?.incidents?.active || j?.active || []
    const ct = Buffer.from(j.ct, 'base64')
    const iv = Buffer.from(j.iv, 'hex')
    const salt = Buffer.from(j.s, 'hex')
    let key = Buffer.alloc(0), block = Buffer.alloc(0)
    const pass = Buffer.from(PK)
    while (key.length < 48) {
      const h = crypto.createHash('md5')
      if (block.length > 0) h.update(block)
      h.update(pass); h.update(salt)
      block = h.digest()
      key = Buffer.concat([key, block])
    }
    const dc = crypto.createDecipheriv('aes-256-cbc', key.subarray(0, 32), iv)
    dc.setAutoPadding(false)
    let out = Buffer.concat([dc.update(ct), dc.final()])
    const p = out[out.length - 1]
    if (p > 0 && p <= 16) out = out.subarray(0, out.length - p)
    let str = out.toString('utf8')
    const fq = str.indexOf('"'), lq = str.lastIndexOf('"')
    if (fq >= 0 && lq > fq) str = str.substring(fq + 1, lq)
    str = str.replace(/\\"/g, '"')
    const parsed = JSON.parse(str)
    return parsed?.incidents?.active || parsed?.active || []
  } catch { return [] }
}

function pulsePointDevPlugin(): Plugin {
  return {
    name: 'pulsepoint-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/pulsepoint', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        try {
          const results = await Promise.allSettled(LAFD.map(id => ppGet(id)))
          const all: any[] = []
          const bureaus: Record<string, number> = {}
          for (let i = 0; i < LAFD.length; i++) {
            const r = results[i]
            if (r.status === 'fulfilled') {
              const inc = ppDec(r.value)
              if (inc.length) {
                bureaus[LAFD[i]] = inc.length
                for (const item of inc) {
                  all.push({
                    id: item.ID,
                    type: item.PulsePointIncidentCallType,
                    time: item.CallReceivedDateTime,
                    addr: item.FullDisplayAddress,
                    lat: item.Latitude,
                    lng: item.Longitude,
                    agency: LAFD[i],
                    units: (item.Unit || []).map((u: any) => ({ id: u.UnitID, status: u.PulsePointDispatchStatus }))
                  })
                }
              }
            }
          }
          all.sort((a, b) => (b.time || '').localeCompare(a.time || ''))
          res.end(JSON.stringify({ ok: true, ts: new Date().toISOString(), total: all.length, bureaus, incidents: all }))
        } catch (e: any) {
          res.end(JSON.stringify({ ok: false, error: e.message }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), pulsePointDevPlugin()],
})

/* PulsePoint Live Data Hook for LAFD
   Polls /api/pulsepoint every 30s for real incidents
   Falls back to empty array if unavailable */

import { useState, useEffect } from 'react';

// PulsePoint incident type codes → display labels
const TYPE_MAP: Record<string, string> = {
  ME: 'EMS', MA: 'ALS', MCI: 'MCI', SF: 'STR', RF: 'STR', CF: 'STR',
  WSF: 'STR', WRF: 'STR', WCF: 'STR', FULL: 'FULL', VF: 'VEH',
  VEG: 'BRUSH', WVEG: 'BRUSH', TC: 'TC', TCE: 'TC', FA: 'FA',
  GAS: 'GAS', EE: 'ELEC', HMR: 'HAZ', EX: 'EXPL', CHIM: 'CHIM',
  OF: 'FIRE', FIRE: 'FIRE', AF: 'FIRE', PF: 'POLE', ELF: 'ELEC',
  WR: 'WATER', RES: 'RES', TR: 'TECH', ELR: 'ELEV', LA: 'LIFT',
  PA: 'PA', PS: 'PS', SI: 'INV', OI: 'INV', INV: 'INV',
  WD: 'WIRES', WA: 'WIRES', TD: 'TREE', HC: 'HAZ',
};

// PulsePoint dispatch status → our status labels
const STATUS_MAP: Record<string, string> = {
  Dispatched: 'DISPATCHED', Enroute: 'EN ROUTE',
  OnScene: 'ON SCENE', Transport: 'TRANSPORTING',
  TransportArrived: 'AT HOSPITAL', Available: 'AVAILABLE',
  AtHospital: 'AT HOSPITAL',
};

export interface PPCall {
  id: string;
  t: string; // time HH:MM
  tp: string; // type label
  tpRaw: string; // raw PP type code
  ad: string; // address
  un: string; // units string
  st: string; // status of most active unit
  unitCount: number;
  lat: number;
  lng: number;
}

// Known LAFD agency IDs to try (will be discovered dynamically)
const LAFD_CANDIDATES = ['EMS11', 'LAFD', '17201', '09601'];

export function usePulsePoint(): { calls: PPCall[]; live: boolean; error: string | null; agencyId: string | null } {
  const [calls, setCalls] = useState<PPCall[]>([]);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  // Step 1: Discover LAFD agency IDs
  useEffect(() => {
    async function discover() {
      try {
        const res = await fetch('/api/pulsepoint?agency_id=discover');
        if (!res.ok) throw new Error('discover failed');
        const data = await res.json();
        if (data.agencies && data.agencies.length > 0) {
          // Use first LAFD agency found
          setAgencyId(data.agencies[0].id);
        } else {
          // Try known candidates
          for (const cand of LAFD_CANDIDATES) {
            try {
              const r = await fetch(`/api/pulsepoint?agency_id=${cand}`);
              if (r.ok) { const d = await r.json(); if (d.count > 0) { setAgencyId(cand); return; } }
            } catch { /* try next */ }
          }
          setError('LAFD agency not found');
        }
      } catch (e: any) {
        setError(e.message);
      }
    }
    discover();
  }, []);

  // Step 2: Poll for incidents every 30s
  useEffect(() => {
    if (!agencyId) return;

    async function fetchIncidents() {
      try {
        const res = await fetch(`/api/pulsepoint?agency_id=${agencyId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.incidents && data.incidents.length > 0) {
          const mapped: PPCall[] = data.incidents.map((inc: any) => {
            const time = inc.time ? inc.time.substring(11, 16) : '--:--';
            const units = (inc.units || []).map((u: any) => u.id).join(', ');
            // Get most "active" unit status
            const statuses = (inc.units || []).map((u: any) => u.status);
            const mostActive = statuses.includes('OnScene') ? 'ON SCENE'
              : statuses.includes('Enroute') ? 'EN ROUTE'
              : statuses.includes('Transport') ? 'TRANSPORTING'
              : statuses.includes('Dispatched') ? 'DISPATCHED'
              : statuses.includes('TransportArrived') ? 'AT HOSPITAL'
              : 'ACTIVE';

            // Parse address — PulsePoint gives "ADDRESS, City, State"
            const addr = (inc.addr || '').split(',')[0].toUpperCase();

            return {
              id: inc.id,
              t: time,
              tp: TYPE_MAP[inc.type] || inc.type,
              tpRaw: inc.type,
              ad: addr,
              un: units,
              st: mostActive,
              unitCount: (inc.units || []).length,
              lat: inc.lat,
              lng: inc.lng,
            };
          });

          setCalls(mapped.slice(0, 20)); // Show up to 20
          setLive(true);
          setError(null);
        }
      } catch (e: any) {
        setError(e.message);
        setLive(false);
      }
    }

    fetchIncidents(); // Immediate first fetch
    const interval = setInterval(fetchIncidents, 30000); // Every 30s
    return () => clearInterval(interval);
  }, [agencyId]);

  return { calls, live, error, agencyId };
}

import type { SimHospital } from './simulationTypes';
import type { Hospital } from '../hooks';

export type HospitalTier = 'BACKED_UP' | 'MODERATE' | 'CLEAR';

export interface HospitalDisplay {
  id: string;
  name: string;
  abbreviation: string;
  lat: number;
  lng: number;
  status: 'DIVERT' | 'ED_SATURATION' | 'OPEN';
  tier: HospitalTier;
  avgWait: number;
  unitsAtWall: number;
  saturationPct: number;
  ab40Violations: number;
  designations: string[];
  sparkline: number[];
  completedToday: number;
  avg24h: number;
  fastest: number;
  slowest: number;
  countyAvg: number;
}

export function tierFromStatus(status: 'DIVERT' | 'ED_SATURATION' | 'OPEN'): HospitalTier {
  if (status === 'DIVERT') return 'BACKED_UP';
  if (status === 'ED_SATURATION') return 'MODERATE';
  return 'CLEAR';
}

export const TIER_COLOR: Record<HospitalTier, string> = {
  BACKED_UP: '#EF4444',
  MODERATE:  '#F59E0B',
  CLEAR:     '#10B981',
};

export const TIER_LABEL: Record<HospitalTier, string> = {
  BACKED_UP: 'BACKED UP',
  MODERATE:  'MODERATE',
  CLEAR:     'CLEAR',
};

export function sortHospitals(hospitals: HospitalDisplay[]): HospitalDisplay[] {
  const tierOrder: Record<HospitalTier, number> = { BACKED_UP: 0, MODERATE: 1, CLEAR: 2 };
  return [...hospitals].sort((a, b) => {
    const t = tierOrder[a.tier] - tierOrder[b.tier];
    return t !== 0 ? t : b.avgWait - a.avgWait;
  });
}

export function mergeHospitalData(
  simHospitals: SimHospital[],
  realMetrics: Hospital[],
  sparklineHistory: Record<string, number[]>,
): HospitalDisplay[] {
  const countyAvg = 28;
  return simHospitals.map((sim) => {
    const real = realMetrics.find(
      (r) => r.short === sim.abbreviation || r.name === sim.name,
    );
    const avgWait = real && real.wait > 0
      ? real.wait
      : sim.avgWallTimeMin;
    const unitsAtWall = real
      ? Math.max(real.atWall, sim.unitsAtWall)
      : sim.unitsAtWall;
    const designations = real ? real.designations : [];
    const status = sim.status as 'DIVERT' | 'ED_SATURATION' | 'OPEN';
    const tier = tierFromStatus(status);
    const sparkline = sparklineHistory[sim.id] ?? [];
    const completedToday = Math.max(1, Math.round(avgWait / 2.5));
    return {
      id: sim.id,
      name: sim.name,
      abbreviation: sim.abbreviation,
      lat: sim.lat,
      lng: sim.lng,
      status,
      tier,
      avgWait,
      unitsAtWall,
      saturationPct: sim.saturationPct,
      ab40Violations: sim.ab40Violations ?? 0,
      designations,
      sparkline,
      completedToday,
      avg24h: avgWait,
      fastest: Math.max(8, Math.round(avgWait * 0.55)),
      slowest: Math.min(120, Math.round(avgWait * 1.75)),
      countyAvg,
    };
  });
}

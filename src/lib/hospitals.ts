/**
 * Static LA-area hospitals for simulation and diversion logic.
 * Coordinates from RESEARCH_AGENTS_REPORT.md Agent 3 (Real-World Samples).
 */

import type { SimHospital } from './simulationTypes';

/** Base hospital list: id, name, abbreviation, lat, lng. Simulation adds saturation, wall time, status. */
export interface HospitalBase {
  id: string;
  name: string;
  abbreviation: string;
  lat: number;
  lng: number;
}

export const LA_HOSPITALS: HospitalBase[] = [
  {
    id: 'ucla-rr',
    name: 'Ronald Reagan UCLA Medical Center',
    abbreviation: 'UCLA',
    lat: 34.066242,
    lng: -118.445328,
  },
  {
    id: 'cedars',
    name: 'Cedars-Sinai Medical Center',
    abbreviation: 'CED',
    lat: 34.075198,
    lng: -118.380676,
  },
  {
    id: 'harbor-ucla',
    name: 'Harbor-UCLA Medical Center',
    abbreviation: 'HAR',
    lat: 33.8298,
    lng: -118.2947,
  },
  {
    id: 'avh',
    name: 'Antelope Valley Hospital',
    abbreviation: 'AVH',
    lat: 34.6868,
    lng: -118.1542,
  },
  {
    id: 'hmn',
    name: 'Huntington Memorial Hospital',
    abbreviation: 'HMN',
    lat: 34.1256,
    lng: -118.1192,
  },
  {
    id: 'spp',
    name: 'Sherman Oaks Providence',
    abbreviation: 'SPP',
    lat: 34.1506,
    lng: -118.4489,
  },
  {
    id: 'plb',
    name: 'Providence Little Company of Mary',
    abbreviation: 'PLB',
    lat: 33.8584,
    lng: -118.3769,
  },
];

/** Build initial SimHospital list with default metrics (simulation will update). */
export function createInitialSimHospitals(): SimHospital[] {
  return LA_HOSPITALS.map((h) => ({
    ...h,
    saturationPct: 20 + Math.floor(Math.random() * 40),
    avgWallTimeMin: 15 + Math.floor(Math.random() * 20),
    unitsAtWall: 0,
    status: 'OPEN' as const,
    ab40Violations: 0,
  }));
}

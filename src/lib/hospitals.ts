/**
 * Static LA-area hospitals for simulation and diversion logic.
 * Expanded for better geographic coverage across all LAFD bureaus.
 */

import type { SimHospital } from './simulationTypes';
import type { LAFDBureau } from './stationLocations';

export interface HospitalBase {
  id: string;
  name: string;
  abbreviation: string;
  lat: number;
  lng: number;
  /** Primary bureaus that commonly transport to this hospital */
  bureaus: LAFDBureau[];
}

export const LA_HOSPITALS: HospitalBase[] = [
  // WEST Bureau hospitals
  {
    id: 'ucla-rr',
    name: 'Ronald Reagan UCLA Medical Center',
    abbreviation: 'UCLA',
    lat: 34.066242,
    lng: -118.445328,
    bureaus: ['WEST'],
  },
  {
    id: 'cedars',
    name: 'Cedars-Sinai Medical Center',
    abbreviation: 'CED',
    lat: 34.075198,
    lng: -118.380676,
    bureaus: ['WEST', 'CENTRAL'],
  },
  {
    id: 'stmonica',
    name: 'Providence Saint John\'s Health Center',
    abbreviation: 'SJH',
    lat: 34.024845,
    lng: -118.491693,
    bureaus: ['WEST'],
  },

  // CENTRAL Bureau hospitals
  {
    id: 'calhospital',
    name: 'California Hospital Medical Center',
    abbreviation: 'CAL',
    lat: 34.040100,
    lng: -118.263500,
    bureaus: ['CENTRAL'],
  },
  {
    id: 'whitemem',
    name: 'White Memorial Medical Center',
    abbreviation: 'WMM',
    lat: 34.053700,
    lng: -118.210800,
    bureaus: ['CENTRAL'],
  },
  {
    id: 'hollywoodpres',
    name: 'Hollywood Presbyterian Medical Center',
    abbreviation: 'HPM',
    lat: 34.091500,
    lng: -118.301400,
    bureaus: ['CENTRAL'],
  },

  // VALLEY Bureau hospitals
  {
    id: 'spp',
    name: 'Providence Cedars-Sinai Tarzana Medical Center',
    abbreviation: 'TRZ',
    lat: 34.167200,
    lng: -118.563200,
    bureaus: ['VALLEY'],
  },
  {
    id: 'valleypres',
    name: 'Valley Presbyterian Hospital',
    abbreviation: 'VPH',
    lat: 34.201400,
    lng: -118.397200,
    bureaus: ['VALLEY'],
  },
  {
    id: 'hmn',
    name: 'Huntington Memorial Hospital',
    abbreviation: 'HMN',
    lat: 34.125600,
    lng: -118.119200,
    bureaus: ['VALLEY', 'CENTRAL'],
  },
  {
    id: 'avh',
    name: 'Antelope Valley Hospital',
    abbreviation: 'AVH',
    lat: 34.686800,
    lng: -118.154200,
    bureaus: ['VALLEY'],
  },

  // SOUTH Bureau hospitals
  {
    id: 'harbor-ucla',
    name: 'Harbor-UCLA Medical Center',
    abbreviation: 'HAR',
    lat: 33.829800,
    lng: -118.294700,
    bureaus: ['SOUTH'],
  },
  {
    id: 'plb',
    name: 'Providence Little Company of Mary',
    abbreviation: 'PLB',
    lat: 33.858400,
    lng: -118.376900,
    bureaus: ['SOUTH'],
  },
  {
    id: 'torrmem',
    name: 'Torrance Memorial Medical Center',
    abbreviation: 'TMC',
    lat: 33.836900,
    lng: -118.349600,
    bureaus: ['SOUTH'],
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

/**
 * Find the nearest hospital to given coordinates, optionally filtered by bureau.
 * Falls back to nearest of any bureau if none found within max distance.
 */
export function findNearestHospital(
  lat: number,
  lng: number,
  hospitals: HospitalBase[],
  preferredBureau?: LAFDBureau,
  maxDistanceKm = 25,
): HospitalBase | null {
  if (!hospitals.length) return null;

  function dist(h: HospitalBase) {
    return Math.sqrt((h.lat - lat) ** 2 + (h.lng - lng) ** 2);
  }

  // Filter to preferred bureau within max distance
  if (preferredBureau) {
    const bureauHospitals = hospitals.filter((h) => h.bureaus.includes(preferredBureau));
    if (bureauHospitals.length) {
      const nearest = bureauHospitals.reduce((best, h) =>
        dist(h) < dist(best) ? h : best,
      );
      // Accept if within ~25km (rough degree conversion: 1 deg ≈ 111km)
      if (dist(nearest) < maxDistanceKm / 111) return nearest;
    }
  }

  // Fallback: nearest overall
  return hospitals.reduce((best, h) => (dist(h) < dist(best) ? h : best));
}

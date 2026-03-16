/**
 * useWallTimeSampler — PulsePoint-driven transport observation engine.
 *
 * Watches live PulsePoint unit status transitions in real time.
 * When an RA unit moves to Transport or AtHospital, it records:
 *   - Which unit, its home station, its bureau
 *   - The incident GPS coordinates
 *   - The nearest hospital to those coordinates (bureau-aware)
 *   - Distance from incident to hospital
 *
 * This builds a growing sample dataset that reflects actual LAFD
 * transport routing patterns — the ground truth for WallTime.
 *
 * Future: POST samples to WallTime Supabase for persistent storage.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Incident } from '../hooks';
import { haversineKm } from '../lib/walltime';
import { LA_HOSPITALS } from '../lib/hospitals';
import { bureauForRAUnit, stationFromRAId, type LAFDBureau } from '../lib/stationLocations';

export interface WallTimeSample {
  id: string;
  unitId: string;
  unitStation: number;
  unitBureau: LAFDBureau;
  incidentId: string;
  incidentType: string;
  incidentLat: number;
  incidentLng: number;
  derivedHospitalId: string;
  derivedHospitalAbbrev: string;
  derivedHospitalLat: number;
  derivedHospitalLng: number;
  distanceKm: number;
  unitStatus: 'Transport' | 'AtHospital';
  capturedAt: number; // unix ms
}

/** Bureau-aware nearest hospital lookup using the static LA_HOSPITALS list */
function deriveHospital(
  incLat: number,
  incLng: number,
  bureau: LAFDBureau,
): typeof LA_HOSPITALS[number] | null {
  if (!LA_HOSPITALS.length) return null;

  // Prefer hospitals that serve this bureau
  const bureauHospitals = LA_HOSPITALS.filter((h) => h.bureaus.includes(bureau));
  const pool = bureauHospitals.length ? bureauHospitals : LA_HOSPITALS;

  return pool.reduce((best, h) => {
    const dBest = haversineKm(incLat, incLng, best.lat, best.lng);
    const dH    = haversineKm(incLat, incLng, h.lat, h.lng);
    return dH < dBest ? h : best;
  });
}

const MAX_SAMPLES = 200;

export interface WallTimeSamplerResult {
  samples: WallTimeSample[];
  /** Totals by hospital abbreviation */
  hospitalCounts: Record<string, number>;
  /** Totals by bureau */
  bureauCounts: Record<LAFDBureau, number>;
  /** Total observations captured this session */
  totalCaptured: number;
  /** Plausibility flag: samples where the derived hospital matches the unit's bureau */
  plausibleCount: number;
  /** Geographic mismatches — the key quality metric */
  mismatchCount: number;
}

export function useWallTimeSampler(incidents: Incident[]): WallTimeSamplerResult {
  const [samples, setSamples] = useState<WallTimeSample[]>([]);
  // Track previous unit→status to detect transitions
  const prevStatusRef = useRef<Record<string, string>>({});

  const processTick = useCallback(() => {
    const newSamples: WallTimeSample[] = [];
    const prev = prevStatusRef.current;
    const next: Record<string, string> = {};

    for (const inc of incidents) {
      const incLat = parseFloat(inc.lat);
      const incLng = parseFloat(inc.lng);
      if (isNaN(incLat) || isNaN(incLng)) continue;

      for (const unit of inc.units ?? []) {
        if (!unit.id.startsWith('RA')) continue;

        const key = unit.id;
        const prevStatus = prev[key];
        const currStatus = unit.status;
        next[key] = currStatus;

        // Only capture on transition TO Transport or AtHospital
        const isTransportStatus =
          currStatus === 'Transport' || currStatus === 'TransportArrived' || currStatus === 'AtHospital';
        const wasAlreadyTransport =
          prevStatus === 'Transport' || prevStatus === 'TransportArrived' || prevStatus === 'AtHospital';

        if (!isTransportStatus) continue;
        if (wasAlreadyTransport) continue; // already captured this transport event

        const station = stationFromRAId(unit.id);
        const bureau = bureauForRAUnit(unit.id);
        const hospital = deriveHospital(incLat, incLng, bureau);
        if (!hospital) continue;

        const distKm = haversineKm(incLat, incLng, hospital.lat, hospital.lng);

        newSamples.push({
          id: `${unit.id}-${inc.id}-${Date.now()}`,
          unitId: unit.id,
          unitStation: station,
          unitBureau: bureau,
          incidentId: inc.id,
          incidentType: inc.type,
          incidentLat: incLat,
          incidentLng: incLng,
          derivedHospitalId: hospital.id,
          derivedHospitalAbbrev: hospital.abbreviation,
          derivedHospitalLat: hospital.lat,
          derivedHospitalLng: hospital.lng,
          distanceKm: Math.round(distKm * 10) / 10,
          unitStatus: (currStatus === 'Transport' ? 'Transport' : 'AtHospital') as 'Transport' | 'AtHospital',
          capturedAt: Date.now(),
        });
      }
    }

    // Merge new status snapshot (only track RA units)
    for (const inc of incidents) {
      for (const unit of inc.units ?? []) {
        if (unit.id.startsWith('RA')) next[unit.id] = unit.status;
      }
    }
    prevStatusRef.current = next;

    if (newSamples.length > 0) {
      setSamples((prev) => [...prev, ...newSamples].slice(-MAX_SAMPLES));
    }
  }, [incidents]);

  // Re-run whenever incidents change (driven by the PulsePoint 25s poll)
  useEffect(() => {
    processTick();
  }, [processTick]);

  // Derived analytics
  const hospitalCounts: Record<string, number> = {};
  const bureauCounts: Record<LAFDBureau, number> = {
    VALLEY: 0, WEST: 0, CENTRAL: 0, SOUTH: 0,
  };
  let plausibleCount = 0;
  let mismatchCount = 0;

  for (const s of samples) {
    hospitalCounts[s.derivedHospitalAbbrev] = (hospitalCounts[s.derivedHospitalAbbrev] ?? 0) + 1;
    bureauCounts[s.unitBureau] = (bureauCounts[s.unitBureau] ?? 0) + 1;

    // Plausibility: derived hospital should serve the unit's bureau
    const hosp = LA_HOSPITALS.find((h) => h.id === s.derivedHospitalId);
    if (hosp?.bureaus.includes(s.unitBureau)) {
      plausibleCount++;
    } else {
      mismatchCount++;
    }
  }

  return {
    samples,
    hospitalCounts,
    bureauCounts,
    totalCaptured: samples.length,
    plausibleCount,
    mismatchCount,
  };
}

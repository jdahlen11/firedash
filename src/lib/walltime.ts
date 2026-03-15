import { createClient } from '@supabase/supabase-js';

// Read-only client using the public anon key from WallTime-Dispatcher.
// RLS on Supabase restricts writes; this client is intentionally unauthenticated.
const SUPABASE_URL = "https://hwpddduxstbbuearifih.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3cGRkZHV4c3RiYnVlYXJpZmloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NzgwMTMsImV4cCI6MjA4MDU1NDAxM30.Drd9nIQlmRaTgIl7IbUtIeLWXcrw7jNhWUUpqD6qc0A";

export const wtClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface WTHospitalMetrics {
  id: string;
  name: string;
  abbrev: string;
  lat: number;
  lng: number;
  designations: string[];
  atWall: number;
  avgWaitMinutes: number;
  sampleCount: number;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const STN92 = { lat: 34.0384, lng: -118.4145 };

export function distMilesFromStn92(lat: number, lng: number): number {
  return Math.round(haversineKm(STN92.lat, STN92.lng, lat, lng) * 0.621371 * 10) / 10;
}

/**
 * Fetches live hospital metrics from WallTime's Supabase:
 * - Hospital directory (name, abbreviation, designations, coordinates)
 * - Active walls: units currently at the hospital wall (atWall count)
 * - Completed walls: 24-hour rolling average wait time per hospital
 *
 * Returns an empty array on network or RLS errors so the caller can
 * degrade gracefully without crashing.
 */
export async function fetchWallTimeHospitalMetrics(): Promise<WTHospitalMetrics[]> {
  // 1. Hospital directory
  const { data: hospitals, error: hospErr } = await wtClient
    .from('hospitals')
    .select('id, name, abbrev, lat, lng, designations')
    .order('name');

  if (hospErr || !hospitals?.length) return [];

  // 2. Current active walls — count per hospital_id
  const { data: activeWalls } = await wtClient
    .from('active_walls')
    .select('hospital_id');

  // 3. Completed walls in the last 24 hours — for rolling average
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: completedWalls } = await wtClient
    .from('completed_walls')
    .select('hospital_id, duration_seconds')
    .gte('completed_at', since);

  const wallCounts: Record<string, number> = {};
  for (const w of activeWalls ?? []) {
    wallCounts[w.hospital_id] = (wallCounts[w.hospital_id] ?? 0) + 1;
  }

  const waitSamples: Record<string, number[]> = {};
  for (const w of completedWalls ?? []) {
    if (!waitSamples[w.hospital_id]) waitSamples[w.hospital_id] = [];
    waitSamples[w.hospital_id].push(w.duration_seconds);
  }

  return hospitals.map((h) => {
    const samples = waitSamples[h.id] ?? [];
    const avgSecs = samples.length
      ? samples.reduce((a: number, b: number) => a + b, 0) / samples.length
      : 0;
    return {
      id: h.id,
      name: h.name,
      abbrev: h.abbrev,
      lat: h.lat ?? 0,
      lng: h.lng ?? 0,
      designations: h.designations ?? [],
      atWall: wallCounts[h.id] ?? 0,
      avgWaitMinutes: Math.round(avgSecs / 60),
      sampleCount: samples.length,
    };
  });
}

/**
 * LAFD station GPS coordinates and bureau assignments.
 * Used to validate and improve unit→hospital transport routing.
 * Coordinates are approximate centroid locations for each station.
 */

export type LAFDBureau = 'VALLEY' | 'WEST' | 'CENTRAL' | 'SOUTH';

export interface StationLocation {
  station: number;
  lat: number;
  lng: number;
  bureau: LAFDBureau;
  neighborhood: string;
}

export const STATION_LOCATIONS: StationLocation[] = [
  // CENTRAL Bureau
  { station: 1,   lat: 34.0506, lng: -118.2468, bureau: 'CENTRAL', neighborhood: 'Downtown' },
  { station: 3,   lat: 33.9409, lng: -118.2487, bureau: 'CENTRAL', neighborhood: 'Watts' },
  { station: 4,   lat: 34.0514, lng: -118.2765, bureau: 'CENTRAL', neighborhood: 'Pico-Union' },
  { station: 5,   lat: 34.0578, lng: -118.2147, bureau: 'CENTRAL', neighborhood: 'Boyle Heights' },
  { station: 6,   lat: 34.0918, lng: -118.3377, bureau: 'CENTRAL', neighborhood: 'Hollywood' },
  { station: 9,   lat: 34.0071, lng: -118.2773, bureau: 'CENTRAL', neighborhood: 'South Park' },
  { station: 10,  lat: 34.0337, lng: -118.2799, bureau: 'CENTRAL', neighborhood: 'University Park' },
  { station: 11,  lat: 34.0790, lng: -118.2714, bureau: 'CENTRAL', neighborhood: 'Echo Park' },
  { station: 12,  lat: 34.0636, lng: -118.3248, bureau: 'CENTRAL', neighborhood: 'Wilshire' },
  { station: 13,  lat: 34.0694, lng: -118.3116, bureau: 'CENTRAL', neighborhood: 'Koreatown' },
  { station: 14,  lat: 34.0537, lng: -118.3873, bureau: 'CENTRAL', neighborhood: 'Pico-Robertson' },
  { station: 15,  lat: 34.0325, lng: -118.3445, bureau: 'CENTRAL', neighborhood: 'West Adams' },
  { station: 33,  lat: 34.1126, lng: -118.3524, bureau: 'CENTRAL', neighborhood: 'Hollywood Hills' },
  { station: 34,  lat: 34.0988, lng: -118.3289, bureau: 'CENTRAL', neighborhood: 'Los Feliz' },
  { station: 35,  lat: 34.0813, lng: -118.3734, bureau: 'CENTRAL', neighborhood: 'West Hollywood' },
  { station: 38,  lat: 33.9961, lng: -118.2916, bureau: 'CENTRAL', neighborhood: 'Vermont/Slauson' },
  { station: 41,  lat: 34.0861, lng: -118.2927, bureau: 'CENTRAL', neighborhood: 'East Hollywood' },

  // WEST Bureau
  { station: 2,   lat: 34.0461, lng: -118.4875, bureau: 'WEST', neighborhood: 'Brentwood' },
  { station: 37,  lat: 34.0283, lng: -118.3928, bureau: 'WEST', neighborhood: 'Culver City adj' },
  { station: 48,  lat: 33.9699, lng: -118.3983, bureau: 'WEST', neighborhood: 'Westchester' },
  { station: 50,  lat: 34.0374, lng: -118.4435, bureau: 'WEST', neighborhood: 'West LA' },
  { station: 59,  lat: 34.0059, lng: -118.4243, bureau: 'WEST', neighborhood: 'Mar Vista' },
  { station: 61,  lat: 33.9854, lng: -118.4645, bureau: 'WEST', neighborhood: 'Venice' },
  { station: 62,  lat: 33.9625, lng: -118.4355, bureau: 'WEST', neighborhood: 'Playa del Rey' },
  { station: 64,  lat: 34.0420, lng: -118.6930, bureau: 'WEST', neighborhood: 'Malibu' },
  { station: 65,  lat: 34.0565, lng: -118.5236, bureau: 'WEST', neighborhood: 'Pacific Palisades' },
  { station: 66,  lat: 34.0758, lng: -118.4589, bureau: 'WEST', neighborhood: 'Bel Air' },
  { station: 68,  lat: 34.0608, lng: -118.4714, bureau: 'WEST', neighborhood: 'Brentwood' },
  { station: 69,  lat: 34.0613, lng: -118.4437, bureau: 'WEST', neighborhood: 'Westwood' },
  { station: 71,  lat: 33.9884, lng: -118.4416, bureau: 'WEST', neighborhood: 'Marina del Rey' },
  { station: 77,  lat: 34.0105, lng: -118.4317, bureau: 'WEST', neighborhood: 'Mar Vista' },
  { station: 85,  lat: 34.0222, lng: -118.3985, bureau: 'WEST', neighborhood: 'Culver City adj' },
  { station: 90,  lat: 34.0374, lng: -118.4435, bureau: 'WEST', neighborhood: 'Sawtelle' },
  { station: 92,  lat: 34.0384, lng: -118.4145, bureau: 'WEST', neighborhood: 'West LA (Stn 92)' },
  { station: 94,  lat: 34.1462, lng: -118.3979, bureau: 'WEST', neighborhood: 'Studio City' },

  // VALLEY Bureau
  { station: 7,   lat: 34.1996, lng: -118.5347, bureau: 'VALLEY', neighborhood: 'Reseda' },
  { station: 18,  lat: 34.1523, lng: -118.5095, bureau: 'VALLEY', neighborhood: 'Encino' },
  { station: 19,  lat: 34.2377, lng: -118.5295, bureau: 'VALLEY', neighborhood: 'Northridge' },
  { station: 25,  lat: 34.2517, lng: -118.5984, bureau: 'VALLEY', neighborhood: 'Chatsworth' },
  { station: 26,  lat: 34.2007, lng: -118.5879, bureau: 'VALLEY', neighborhood: 'Canoga Park' },
  { station: 29,  lat: 34.1898, lng: -118.4496, bureau: 'VALLEY', neighborhood: 'Van Nuys' },
  { station: 39,  lat: 34.1759, lng: -118.3244, bureau: 'VALLEY', neighborhood: 'Burbank adj' },
  { station: 46,  lat: 34.1810, lng: -118.6172, bureau: 'VALLEY', neighborhood: 'Woodland Hills' },
  { station: 47,  lat: 34.2013, lng: -118.5354, bureau: 'VALLEY', neighborhood: 'Reseda' },
  { station: 52,  lat: 34.2930, lng: -118.4534, bureau: 'VALLEY', neighborhood: 'Sylmar' },
  { station: 56,  lat: 34.2804, lng: -118.4918, bureau: 'VALLEY', neighborhood: 'Granada Hills' },
  { station: 58,  lat: 34.1672, lng: -118.5558, bureau: 'VALLEY', neighborhood: 'Tarzana' },
  { station: 63,  lat: 34.1808, lng: -118.6048, bureau: 'VALLEY', neighborhood: 'Woodland Hills' },
  { station: 67,  lat: 34.2517, lng: -118.5984, bureau: 'VALLEY', neighborhood: 'Chatsworth' },
  { station: 70,  lat: 34.2060, lng: -118.6012, bureau: 'VALLEY', neighborhood: 'Canoga Park' },
  { station: 74,  lat: 34.3124, lng: -118.4213, bureau: 'VALLEY', neighborhood: 'Sylmar' },
  { station: 76,  lat: 34.2189, lng: -118.4546, bureau: 'VALLEY', neighborhood: 'Panorama City' },
  { station: 78,  lat: 34.1831, lng: -118.5531, bureau: 'VALLEY', neighborhood: 'Tarzana' },
  { station: 81,  lat: 34.2614, lng: -118.4538, bureau: 'VALLEY', neighborhood: 'Mission Hills' },
  { station: 83,  lat: 34.1830, lng: -118.4464, bureau: 'VALLEY', neighborhood: 'Van Nuys' },
  { station: 84,  lat: 34.2275, lng: -118.4197, bureau: 'VALLEY', neighborhood: 'Arleta' },
  { station: 87,  lat: 34.2581, lng: -118.4052, bureau: 'VALLEY', neighborhood: 'Pacoima' },
  { station: 88,  lat: 34.2580, lng: -118.6006, bureau: 'VALLEY', neighborhood: 'Chatsworth' },
  { station: 89,  lat: 34.2319, lng: -118.5000, bureau: 'VALLEY', neighborhood: 'Northridge' },
  { station: 91,  lat: 34.2731, lng: -118.3842, bureau: 'VALLEY', neighborhood: 'Kagel Canyon' },
  { station: 93,  lat: 34.2147, lng: -118.3810, bureau: 'VALLEY', neighborhood: 'Sun Valley' },
  { station: 95,  lat: 34.2808, lng: -118.4984, bureau: 'VALLEY', neighborhood: 'Granada Hills' },
  { station: 96,  lat: 34.2296, lng: -118.5388, bureau: 'VALLEY', neighborhood: 'Northridge' },
  { station: 97,  lat: 34.2958, lng: -118.4525, bureau: 'VALLEY', neighborhood: 'Sylmar' },
  { station: 98,  lat: 34.2110, lng: -118.3701, bureau: 'VALLEY', neighborhood: 'Sun Valley' },
  { station: 101, lat: 34.2510, lng: -118.3034, bureau: 'VALLEY', neighborhood: 'Tujunga' },
  { station: 102, lat: 34.2415, lng: -118.2332, bureau: 'VALLEY', neighborhood: 'La Crescenta' },
  { station: 103, lat: 34.2598, lng: -118.3040, bureau: 'VALLEY', neighborhood: 'Sunland' },
  { station: 104, lat: 34.3025, lng: -118.2896, bureau: 'VALLEY', neighborhood: 'Big Tujunga' },
  { station: 105, lat: 34.2750, lng: -118.5983, bureau: 'VALLEY', neighborhood: 'Chatsworth' },
  { station: 106, lat: 34.2762, lng: -118.3698, bureau: 'VALLEY', neighborhood: 'Lakeview Terrace' },

  // SOUTH Bureau
  { station: 55,  lat: 33.7966, lng: -118.3157, bureau: 'SOUTH', neighborhood: 'Harbor City' },
  { station: 60,  lat: 33.9427, lng: -118.2478, bureau: 'SOUTH', neighborhood: 'South LA' },
  { station: 72,  lat: 33.7380, lng: -118.2916, bureau: 'SOUTH', neighborhood: 'San Pedro' },
  { station: 73,  lat: 33.9444, lng: -118.2416, bureau: 'SOUTH', neighborhood: 'Watts' },
  { station: 79,  lat: 33.9176, lng: -118.3440, bureau: 'SOUTH', neighborhood: 'Inglewood adj' },
];

/** Lookup station by number */
const STATION_MAP = new Map<number, StationLocation>(
  STATION_LOCATIONS.map((s) => [s.station, s]),
);

export function getStation(stationNumber: number): StationLocation | undefined {
  return STATION_MAP.get(stationNumber);
}

/** Derive bureau for an RA unit ID based on station number */
export function bureauForStation(stationNumber: number): LAFDBureau {
  return STATION_MAP.get(stationNumber)?.bureau ?? 'CENTRAL';
}

/** Extract station number from RA unit ID (e.g. "RA18" → 18, "RA815" → 15) */
export function stationFromRAId(raId: string): number {
  const raw = parseInt(raId.replace(/^RA/, ''), 10);
  if (isNaN(raw)) return 0;
  // BLS units in 800-series: RA815 → station 15
  if (raw >= 800 && raw <= 899) return raw - 800;
  if (raw >= 900 && raw <= 999) return raw - 900;
  return raw;
}

/** Bureau for a real RA unit ID */
export function bureauForRAUnit(raId: string): LAFDBureau {
  return bureauForStation(stationFromRAId(raId));
}

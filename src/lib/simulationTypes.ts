/**
 * Shared types for WallTime simulation engine.
 * Research: Agent 3 (Data Structures), Agent 4 (Alert).
 * @see RESEARCH_AGENTS_REPORT.md, ENTERPRISE_ARCHITECTURE.md
 */

/** Unit state machine; aligns with PulsePoint/NEMSIS (Agent 3). */
export type UnitState =
  | 'Available'
  | 'Dispatched'
  | 'EnRoute'
  | 'OnScene'
  | 'Transport'
  | 'AtWall'
  | 'Cleared';

/** Hospital operational status (Agent 3). */
export type HospitalStatus = 'OPEN' | 'ED_SATURATION' | 'DIVERT' | 'CLOSED';

/** Incident type for map and spawn (Agent 3). */
export type SimIncidentType = 'FIRE' | 'EMS' | 'TC' | 'HAZMAT' | 'RESCUE' | 'OTHER';

/** Single hospital record from simulation. */
export interface SimHospital {
  id: string;
  name: string;
  abbreviation: string;
  lat: number;
  lng: number;
  saturationPct: number;
  avgWallTimeMin: number;
  unitsAtWall: number;
  status: HospitalStatus;
  ab40Violations?: number;
}

/** Simulated unit (ambulance/engine) with state. */
export interface SimUnit {
  id: string;
  state: UnitState;
  incidentId: string | null;
  hospitalId: string | null;
  bureau: 'VALLEY' | 'CENTRAL' | 'WEST' | 'SOUTH';
  unitType: 'RA' | 'Engine' | 'Truck';
  stateEnteredAt: number;
}

/** Simulated incident (spawned, may have assigned unit/destination). */
export interface SimIncident {
  id: string;
  lat: number;
  lng: number;
  type: SimIncidentType;
  priority: number;
  status: 'Active' | 'EnRoute' | 'OnScene' | 'Transport' | 'Cleared';
  assignedUnitId: string | null;
  destinationHospitalId: string | null;
  createdAt: number;
  address?: string;
}

/** AI alert for ticker (Agent 4). */
export interface SimAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  hospitalId?: string;
}

/** Snapshot for charts: unit counts by state. */
export interface FleetDistributionSnapshot {
  Available: number;
  Dispatched: number;
  EnRoute: number;
  OnScene: number;
  Transport: number;
  AtWall: number;
  Cleared: number;
}

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Radio,
  Activity,
  Truck,
  Building2,
  Clock,
  CircleDot,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MinusCircle,
} from 'lucide-react';
import HeroIncidentMap, { type ActiveIncident, type IncidentType } from './components/HeroIncidentMap';
import HospitalSaturationChart from './components/HospitalSaturationChart';
import FleetDistributionChart from './components/FleetDistributionChart';
import AlertTicker from './components/AlertTicker';
import LivePulsepointFeed from './components/LivePulsepointFeed';
import { usePulsePoint, getCategory, getMostActiveStatus } from './hooks';
import { useWallTimeSimulation } from './hooks/useWallTimeSimulation';
import type { SimIncident, SimHospital } from './lib/simulationTypes';

// ─── Map PulsePoint API incidents → ActiveIncident for map ─────────────────────
function mapIncidentsToActive(incidents: { id: string; type: string; addr: string; lat: string; lng: string; units: { id: string; status: string }[] }[]): ActiveIncident[] {
  const categoryToType: Record<string, IncidentType> = {
    ems: 'EMS',
    fire: 'FIRE',
    tc: 'TC',
    hazmat: 'HAZMAT',
    rescue: 'RESCUE',
    other: 'OTHER',
  };
  const out: ActiveIncident[] = [];
  for (const inc of incidents) {
    const lat = parseFloat(inc.lat);
    const lng = parseFloat(inc.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const category = getCategory(inc.type);
    const status = inc.units?.length ? getMostActiveStatus(inc.units) : 'Active';
    out.push({
      id: String(inc.id),
      lat,
      lng,
      type: categoryToType[category] ?? 'OTHER',
      status,
      address: inc.addr || undefined,
      units: inc.units?.map((u) => u.id) ?? [],
    });
  }
  return out;
}

// ─── Fallback mock incidents when API has no data (e.g. dev) ─────────────────
const MOCK_ACTIVE_INCIDENTS: ActiveIncident[] = [
  { id: 'INC-4401', lat: 34.0622, lng: -118.358, type: 'FIRE', status: 'OnScene', address: '1815 S HOLMBY AVE', units: ['E292', 'T92', 'RA92', 'BC9'] },
  { id: 'INC-4402', lat: 34.0312, lng: -118.267, type: 'TC', status: 'Arrived', address: '1387 W 36TH PL', units: ['E15', 'RA15', 'RA915'] },
  { id: 'INC-4403', lat: 34.0488, lng: -118.363, type: 'TC', status: 'EnRoute', address: '5421 W OLYMPIC BLVD', units: ['RA861'] },
  { id: 'INC-4404', lat: 34.0789, lng: -118.244, type: 'FIRE', status: 'OnScene', address: '500 N PARK ROW DR', units: ['E1'] },
  { id: 'INC-4405', lat: 34.0412, lng: -118.256, type: 'EMS', status: 'OnScene', address: '3200 W OLYMPIC BLVD', units: ['RA33', 'RA815'] },
  { id: 'INC-4406', lat: 34.0281, lng: -118.241, type: 'EMS', status: 'EnRoute', address: '1200 S GRAND AVE', units: ['RA61'] },
  { id: 'INC-4407', lat: 34.0654, lng: -118.221, type: 'HAZMAT', status: 'OnScene', address: '2100 E 15TH ST', units: ['E4', 'HAZ44'] },
];

// ─── Mock: Hospital triage (top 5 saturated / divert) ────────────────────────
type HospitalStatus = 'OPEN' | 'ED_SATURATION' | 'DIVERT' | 'CLOSED';
interface HospitalRow {
  id: string;
  abbreviation: string;
  name: string;
  status: HospitalStatus;
  avgWallTimeMin: number;
  unitsAtWall: number;
  ab40Violations: number;
}

const MOCK_HOSPITALS: HospitalRow[] = [
  { id: 'avh', abbreviation: 'AVH', name: 'Antelope Valley Hospital', status: 'ED_SATURATION', avgWallTimeMin: 47, unitsAtWall: 3, ab40Violations: 2 },
  { id: 'hmn', abbreviation: 'HMN', name: 'Huntington Memorial', status: 'DIVERT', avgWallTimeMin: 27, unitsAtWall: 2, ab40Violations: 0 },
  { id: 'cpm', abbreviation: 'CPM', name: 'California Pacific Med', status: 'ED_SATURATION', avgWallTimeMin: 23, unitsAtWall: 1, ab40Violations: 0 },
  { id: 'spp', abbreviation: 'SPP', name: 'Sherman Park Providence', status: 'DIVERT', avgWallTimeMin: 21, unitsAtWall: 2, ab40Violations: 1 },
  { id: 'plb', abbreviation: 'PLB', name: 'Providence Little Company', status: 'ED_SATURATION', avgWallTimeMin: 20, unitsAtWall: 1, ab40Violations: 0 },
];

const STATUS_CONFIG: Record<HospitalStatus, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  OPEN:           { icon: CheckCircle2,  color: 'text-[#0099BF]', bg: 'bg-[#0099BF]/10', label: 'OPEN' },
  ED_SATURATION:  { icon: AlertCircle,   color: 'text-[#F5A623]', bg: 'bg-[#F5A623]/10', label: 'ED SAT' },
  DIVERT:         { icon: XCircle,       color: 'text-[#E8553C]', bg: 'bg-[#E8553C]/10', label: 'DIVERT' },
  CLOSED:         { icon: MinusCircle,   color: 'text-[#E8553C]', bg: 'bg-[#E8553C]/15', label: 'CLOSED' },
};

// ─── Mock: Fleet by bureau ───────────────────────────────────────────────────
interface BureauFleet {
  bureau: 'VALLEY' | 'CENTRAL' | 'WEST' | 'SOUTH';
  totalRA: number;
  availableRA: number;
  totalEngine: number;
  availableEngine: number;
  totalTruck: number;
  availableTruck: number;
}

const MOCK_FLEET: BureauFleet[] = [
  { bureau: 'VALLEY',  totalRA: 37, availableRA: 34, totalEngine: 37, availableEngine: 35, totalTruck: 12, availableTruck: 11 },
  { bureau: 'CENTRAL', totalRA: 23, availableRA: 20, totalEngine: 23, availableEngine: 20, totalTruck: 8, availableTruck: 7 },
  { bureau: 'WEST',    totalRA: 24, availableRA: 22, totalEngine: 24, availableEngine: 22, totalTruck: 7, availableTruck: 6 },
  { bureau: 'SOUTH',   totalRA: 14, availableRA: 12, totalEngine: 14, availableEngine: 13, totalTruck: 5, availableTruck: 5 },
];

// ─── Mock: System vitals ─────────────────────────────────────────────────────
const MOCK_VITALS = {
  strainPct: 12,
  totalIncidents: 7,
  unitsDeployed: 18,
  unitsOnScene: 10,
  unitsEnRoute: 8,
  avgWallTimeMin: 24,
  ab40Violations: 3,
};

const DIVISIONS = [
  { code: 'ALL', label: 'ALL BUREAUS' },
  { code: 'LAFDC', label: 'CENTRAL' },
  { code: 'LAFDS', label: 'SOUTH' },
  { code: 'LAFDV', label: 'VALLEY' },
  { code: 'LAFDW', label: 'WEST' },
] as const;

type DataMode = 'live' | 'simulated' | 'both';

// ─── Live clock ──────────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Map sim incidents to ActiveIncident for map ─────────────────────────────
function mapSimIncidentsToActive(incidents: SimIncident[]): ActiveIncident[] {
  return incidents
    .filter((i) => i.status !== 'Cleared')
    .map((i) => ({
      id: i.id,
      lat: i.lat,
      lng: i.lng,
      type: i.type,
      status: i.status,
      address: i.address,
      units: i.assignedUnitId ? [i.assignedUnitId] : [],
    }));
}

// ─── Sim hospitals → HospitalRow for HospitalTriage ───────────────────────────
function simHospitalsToRows(hospitals: SimHospital[]): HospitalRow[] {
  return hospitals
    .slice()
    .sort((a, b) => b.saturationPct - a.saturationPct)
    .slice(0, 8)
    .map((h) => ({
      id: h.id,
      abbreviation: h.abbreviation,
      name: h.name,
      status: h.status,
      avgWallTimeMin: h.avgWallTimeMin,
      unitsAtWall: h.unitsAtWall,
      ab40Violations: h.ab40Violations ?? 0,
    }));
}

// ─── Top Bar ─────────────────────────────────────────────────────────────────
function TopBar({
  division,
  onDivisionChange,
  incidentCount,
  clock,
  live = false,
  dataMode,
  onDataModeChange,
}: {
  division: string;
  onDivisionChange: (d: string) => void;
  incidentCount: number;
  clock: Date;
  live?: boolean;
  dataMode: DataMode;
  onDataModeChange: (m: DataMode) => void;
}) {
  return (
    <header className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-[#1A2744] bg-[#0A0F1A]/90 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-[#E8553C]" />
          <span className="font-mono text-sm font-bold tracking-widest text-[#F1F5F9]">
            FIRE<span className="text-[#0099BF]">DASH</span>
          </span>
        </div>
        <div className="h-4 w-px bg-[#1A2744]" />
        <select
          value={division}
          onChange={(e) => onDivisionChange(e.target.value)}
          className="bg-transparent font-mono text-xs text-[#94A3B8] border border-[#1A2744] rounded px-2 py-1 focus:outline-none focus:border-[#0099BF] cursor-pointer"
        >
          {DIVISIONS.map((d) => (
            <option key={d.code} value={d.code} className="bg-[#0A0F1A]">
              {d.label}
            </option>
          ))}
        </select>
        <div className="h-4 w-px bg-[#1A2744]" />
        <div className="flex rounded border border-[#1A2744] overflow-hidden">
          {(['live', 'simulated', 'both'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onDataModeChange(m)}
              className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                dataMode === m ? 'bg-[#0099BF] text-[#04070D]' : 'bg-[#04070D] text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="relative w-72">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#475569]" />
        <input
          type="text"
          placeholder="Unit, address, or incident ID…"
          className="w-full bg-[#04070D] border border-[#1A2744] rounded pl-8 pr-3 py-1.5 font-mono text-xs text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#0099BF]"
        />
      </div>
      <div className="flex items-center gap-4">
        <span className={`inline-flex items-center gap-2 font-mono text-xs ${live ? 'text-[#0099BF]' : 'text-[#F5A623]'}`}>
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${live ? 'animate-ping bg-[#0099BF]' : 'bg-[#F5A623]'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${live ? 'bg-[#0099BF]' : 'bg-[#F5A623]'}`} />
          </span>
          {live ? `LIVE ${incidentCount}` : `CONNECTING… ${incidentCount}`}
        </span>
        <span className="font-mono text-2xl font-bold tracking-wider text-[#F1F5F9] tabular-nums">
          {clock.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>
    </header>
  );
}

// ─── System Vitals ────────────────────────────────────────────────────────────
function SystemVitals({ metrics }: { metrics: typeof MOCK_VITALS }) {
  const strainColor =
    metrics.strainPct >= 60 ? 'text-[#E8553C]' : metrics.strainPct >= 30 ? 'text-[#F5A623]' : 'text-[#0099BF]';
  return (
    <section className="col-span-4 flex flex-col rounded-lg overflow-hidden bg-[#0A0F1A] border border-[#1A2744] min-h-0">
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-[#1A2744]">
        <Activity size={14} className="text-[#0099BF]" />
        <span className="font-mono text-xs font-semibold tracking-wider text-[#94A3B8] uppercase">System Vital Signs</span>
      </div>
      <div className="flex-1 flex flex-col justify-center px-5 py-4 gap-5 min-h-0">
        <div className="text-center">
          <p className="font-mono text-[10px] text-[#475569] uppercase tracking-widest mb-1">System Strain</p>
          <p className={`font-mono text-6xl font-bold leading-none ${strainColor}`}>{metrics.strainPct}%</p>
            </div>
        <div className="h-px bg-[#1A2744]" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className={metrics.ab40Violations > 0 ? 'text-[#E8553C]' : 'text-[#475569]'} />
            <span className="font-mono text-xs text-[#94A3B8]">AB-40 VIOLATIONS</span>
          </div>
          <span className={`font-mono text-2xl font-bold ${metrics.ab40Violations > 0 ? 'text-[#E8553C]' : 'text-[#0099BF]'}`}>
            {metrics.ab40Violations}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={14} className="text-[#6366F1]" />
            <span className="font-mono text-xs text-[#94A3B8]">UNITS DEPLOYED</span>
                </div>
          <div className="text-right">
            <span className="font-mono text-2xl font-bold text-[#F1F5F9]">{metrics.unitsDeployed}</span>
            <p className="font-mono text-[10px] text-[#475569]">{metrics.unitsOnScene} OS · {metrics.unitsEnRoute} ER</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#F5A623]" />
            <span className="font-mono text-xs text-[#94A3B8]">AVG WALL TIME</span>
          </div>
          <span className={`font-mono text-2xl font-bold ${metrics.avgWallTimeMin >= 30 ? 'text-[#E8553C]' : 'text-[#0099BF]'}`}>
            {metrics.avgWallTimeMin}m
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#475569]">TOTAL INCIDENTS</span>
          <span className="font-mono text-xl font-bold text-[#F1F5F9]">{metrics.totalIncidents}</span>
        </div>
      </div>
    </section>
  );
}

// ─── Hospital Triage ──────────────────────────────────────────────────────────
function HospitalTriage({ hospitals }: { hospitals: HospitalRow[] }) {
  return (
    <section className="col-span-5 flex flex-col rounded-lg overflow-hidden bg-[#0A0F1A] border border-[#1A2744] min-h-0">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[#1A2744]">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-[#F5A623]" />
          <span className="font-mono text-xs font-semibold tracking-wider text-[#94A3B8] uppercase">Critical Hospital Saturation</span>
        </div>
        <span className="font-mono text-[10px] text-[#475569]">TOP 5</span>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        {hospitals.map((h) => {
          const cfg = STATUS_CONFIG[h.status];
          const Icon = cfg.icon;
          return (
            <div
              key={h.id}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-[#111827] last:border-b-0 hover:bg-[#111827] transition-colors"
            >
              <span className="font-mono text-sm font-bold text-[#F1F5F9] w-10">{h.abbreviation}</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
                <Icon size={12} strokeWidth={2.5} />
                {cfg.label}
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <Clock size={11} className="text-[#475569]" />
                <span className={`font-mono text-sm font-bold ${h.avgWallTimeMin >= 30 ? 'text-[#E8553C]' : 'text-[#F1F5F9]'}`}>
                  {h.avgWallTimeMin}m
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#475569] w-16 text-right">{h.unitsAtWall} at wall</span>
              {h.ab40Violations > 0 && (
                <span className="font-mono text-[10px] font-bold text-[#E8553C]">AB40 ×{h.ab40Violations}</span>
              )}
              <ChevronRight size={14} className="text-[#475569]" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Fleet Availability ───────────────────────────────────────────────────────
function FleetAvailability({ fleet }: { fleet: BureauFleet[] }) {
  const BUREAU_COLORS: Record<string, string> = {
    VALLEY: '#0099BF',
    CENTRAL: '#6366F1',
    WEST: '#F5A623',
    SOUTH: '#0099BF',
  };
  return (
    <section className="col-span-7 flex flex-col rounded-lg overflow-hidden bg-[#0A0F1A] border border-[#1A2744] min-h-0">
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-[#1A2744]">
        <Truck size={14} className="text-[#0099BF]" />
        <span className="font-mono text-xs font-semibold tracking-wider text-[#94A3B8] uppercase">Fleet Availability by Bureau</span>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-3 p-4 min-h-0">
        {fleet.map((b) => {
          const color = BUREAU_COLORS[b.bureau] ?? '#0099BF';
          const totalUnits = b.totalRA + b.totalEngine + b.totalTruck;
          const availUnits = b.availableRA + b.availableEngine + b.availableTruck;
          const pct = totalUnits > 0 ? Math.round((availUnits / totalUnits) * 100) : 0;
          return (
            <div key={b.bureau} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs font-bold text-[#F1F5F9] tracking-wider">{b.bureau}</span>
                <span className="font-mono text-lg font-bold" style={{ color }}>{pct}%</span>
              </div>
              <div className="h-2 w-full bg-[#04070D] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
              <div className="flex gap-3 font-mono text-[10px] text-[#475569]">
                <span>RA {b.availableRA}/{b.totalRA}</span>
                <span>ENG {b.availableEngine}/{b.totalEngine}</span>
                <span>TRK {b.availableTruck}/{b.totalTruck}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── App: Bento Command Grid ──────────────────────────────────────────────────
export default function App() {
  const clock = useClock();
  const [division, setDivision] = useState('ALL');
  const [dataMode, setDataMode] = useState<DataMode>('both');
  const { incidents: pulseIncidents, total, live } = usePulsePoint();
  const sim = useWallTimeSimulation(dataMode !== 'live');

  const activeIncidents = useMemo(() => {
    const liveMapped = mapIncidentsToActive(pulseIncidents);
    const liveList = liveMapped.length > 0 ? liveMapped : (dataMode === 'live' ? MOCK_ACTIVE_INCIDENTS : []);
    const simList = mapSimIncidentsToActive(sim.incidents);
    if (dataMode === 'live') return liveList;
    if (dataMode === 'simulated') return simList;
    return [...liveList, ...simList];
  }, [dataMode, pulseIncidents, sim.incidents]);

  const incidentCount = activeIncidents.length;
  const hospitals = useMemo(() => {
    if (dataMode === 'live') return MOCK_HOSPITALS;
    return simHospitalsToRows(sim.hospitals);
  }, [dataMode, sim.hospitals]);

  const fleet = useMemo(() => {
    if (dataMode === 'live') return MOCK_FLEET;
    const bureaus: Array<'VALLEY' | 'CENTRAL' | 'WEST' | 'SOUTH'> = ['VALLEY', 'CENTRAL', 'WEST', 'SOUTH'];
    return bureaus.map((bureau) => {
      const units = sim.units.filter((u) => u.bureau === bureau);
      const ra = units.filter((u) => u.unitType === 'RA');
      const eng = units.filter((u) => u.unitType === 'Engine');
      const available = (u: typeof units[0]) => u.state === 'Available' || u.state === 'Cleared';
      return {
        bureau,
        totalRA: ra.length,
        availableRA: ra.filter(available).length,
        totalEngine: eng.length,
        availableEngine: eng.filter(available).length,
        totalTruck: 0,
        availableTruck: 0,
      };
    });
  }, [dataMode, sim.units]);

  const metrics = useMemo(() => {
    if (dataMode === 'live') {
      return {
        ...MOCK_VITALS,
        totalIncidents: live ? total : activeIncidents.length,
        unitsDeployed: live ? pulseIncidents.reduce((s, i) => s + (i.units?.length ?? 0), 0) : MOCK_VITALS.unitsDeployed,
      };
    }
    const deployed = sim.units.filter((u) => u.state !== 'Available' && u.state !== 'Cleared').length;
    const totalUnits = sim.units.length;
    const strainPct = totalUnits > 0 ? Math.round((deployed / totalUnits) * 100) : 0;
    const avgWall = sim.hospitals.length > 0
      ? Math.round(sim.hospitals.reduce((s, h) => s + h.avgWallTimeMin, 0) / sim.hospitals.length)
      : MOCK_VITALS.avgWallTimeMin;
    return {
      ...MOCK_VITALS,
      strainPct,
      totalIncidents: activeIncidents.length,
      unitsDeployed: deployed,
      unitsOnScene: sim.units.filter((u) => u.state === 'OnScene').length,
      unitsEnRoute: sim.units.filter((u) => u.state === 'EnRoute' || u.state === 'Dispatched').length,
      avgWallTimeMin: avgWall,
      ab40Violations: sim.hospitals.reduce((s, h) => s + (h.ab40Violations ?? 0), 0),
    };
  }, [dataMode, live, total, activeIncidents.length, pulseIncidents, sim.units, sim.hospitals]);

  const showSimCharts = dataMode === 'simulated' || dataMode === 'both';
  const showLiveFeed = (dataMode === 'live' || dataMode === 'both') && pulseIncidents.length > 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#04070D] overflow-hidden">
      <TopBar
        division={division}
        onDivisionChange={setDivision}
        incidentCount={incidentCount}
        clock={clock}
        live={dataMode === 'live' ? live : dataMode === 'both' && live}
        dataMode={dataMode}
        onDataModeChange={setDataMode}
      />

      {showSimCharts && <AlertTicker alerts={sim.alerts} />}

      <main
        className="flex-1 grid grid-cols-12 gap-3 p-3 min-h-0 overflow-hidden"
        style={{
          gridTemplateRows: showSimCharts ? 'minmax(0,1fr) minmax(0,1fr) auto' : 'minmax(0,1fr) minmax(0,1fr)',
        }}
      >
        <HeroIncidentMap activeIncidents={activeIncidents} className="col-span-8 row-span-1" />
        <div className="col-span-4 row-span-1 flex flex-col gap-3 min-h-0">
          <SystemVitals metrics={metrics} />
          {showLiveFeed && (
            <LivePulsepointFeed
              incidents={pulseIncidents.map((i) => ({
                id: String(i.id),
                type: i.type ?? '—',
                addr: i.addr ?? '',
                time: i.time,
                agency: i.agency,
              }))}
              className="flex-1 min-h-0"
            />
          )}
        </div>

        <HospitalTriage hospitals={hospitals} />
        <FleetAvailability fleet={fleet} />

        {showSimCharts && (
          <>
            <HospitalSaturationChart hospitals={sim.hospitals} className="col-span-6 min-h-[160px]" />
            <FleetDistributionChart distribution={sim.fleetDistribution} className="col-span-6 min-h-[160px]" />
          </>
        )}
      </main>

      <footer className="flex-shrink-0 flex items-center justify-between px-5 py-1.5 border-t border-[#1A2744] bg-[#0A0F1A]/50">
        <span className="font-mono text-[10px] text-[#0099BF]">
          <CircleDot size={8} className="inline mr-1" />
          FIREDASH v18.0
        </span>
        <span className="font-mono text-[10px] text-[#475569]">APOT SOLUTIONS, INC.</span>
      </footer>
    </div>
  );
}

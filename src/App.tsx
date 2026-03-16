import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePulsePoint, useHospitals, getCategory, getMostActiveStatus } from './hooks';
import { useWallTimeSimulation } from './hooks/useWallTimeSimulation';
import type { SimIncident } from './lib/simulationTypes';
import { mergeHospitalData, sortHospitals } from './lib/types';
import type { HospitalDisplay } from './lib/types';
import TopBar, { type AppTab } from './components/TopBar';
import AlertTicker from './components/AlertTicker';
import CommandView from './components/CommandView';
import MapView from './components/MapView';
import HospitalList from './components/HospitalList';
import HospitalDetail from './components/HospitalDetail';
import FleetView from './components/FleetView';
import type { ActiveIncident, IncidentType } from './components/HeroIncidentMap';
import { colors, fonts } from './lib/designTokens';

// ─── Clock ───────────────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Map PulsePoint incidents → ActiveIncident ────────────────────────────────
const CAT_TO_TYPE: Record<string, IncidentType> = {
  ems: 'EMS', fire: 'FIRE', tc: 'TC', hazmat: 'HAZMAT', rescue: 'RESCUE', other: 'OTHER',
};

function mapToActiveIncidents(
  incidents: ReturnType<typeof usePulsePoint>['incidents'],
): ActiveIncident[] {
  const out: ActiveIncident[] = [];
  for (const inc of incidents) {
    const lat = parseFloat(inc.lat);
    const lng = parseFloat(inc.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const cat = getCategory(inc.type);
    out.push({
      id: String(inc.id),
      lat,
      lng,
      type: CAT_TO_TYPE[cat] ?? 'OTHER',
      status: inc.units?.length ? getMostActiveStatus(inc.units) : 'Active',
      address: inc.addr || undefined,
      units: inc.units?.map((u) => u.id) ?? [],
    });
  }
  return out;
}

function mapSimIncidents(incidents: SimIncident[]): ActiveIncident[] {
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

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const clock = useClock();
  const [tab, setTab] = useState<AppTab>('command');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  // Data hooks
  const { incidents: pulseIncidents, total, live } = usePulsePoint();
  const { hospitals: realHospitals } = useHospitals();
  const sim = useWallTimeSimulation(true);

  // ─── Hospital sparkline history ───────────────────────────────────────────
  const historyRef = useRef<Record<string, number[]>>({});
  useEffect(() => {
    for (const h of sim.hospitals) {
      const prev = historyRef.current[h.id] ?? [];
      historyRef.current[h.id] = [...prev, h.avgWallTimeMin].slice(-60);
    }
  }, [sim.simMinute]);

  // ─── Merged hospital data ─────────────────────────────────────────────────
  const hospitals: HospitalDisplay[] = useMemo(
    () => sortHospitals(mergeHospitalData(sim.hospitals, realHospitals, historyRef.current)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sim.hospitals, realHospitals, sim.simMinute],
  );

  const selectedHospital = useMemo(
    () => hospitals.find((h) => h.id === selectedHospitalId) ?? null,
    [hospitals, selectedHospitalId],
  );

  // ─── Active incidents for map ─────────────────────────────────────────────
  const activeIncidents = useMemo(() => {
    const live_ = mapToActiveIncidents(pulseIncidents);
    const sim_ = mapSimIncidents(sim.incidents);
    if (live_.length > 0) return [...live_, ...sim_];
    return sim_;
  }, [pulseIncidents, sim.incidents]);

  // ─── Derived metrics ──────────────────────────────────────────────────────
  const deployed = sim.units.filter((u) => u.state !== 'Available' && u.state !== 'Cleared').length;
  const strainPct = sim.units.length > 0
    ? Math.round((deployed / sim.units.length) * 100)
    : 0;
  const avgWallTimeMin = sim.hospitals.length > 0
    ? Math.round(sim.hospitals.reduce((s, h) => s + h.avgWallTimeMin, 0) / sim.hospitals.length)
    : 28;
  const ab40Violations = sim.hospitals.reduce((s, h) => s + (h.ab40Violations ?? 0), 0);
  const hospitalsDiverting = hospitals.filter((h) => h.status === 'DIVERT').length;

  function handleSelectHospital(id: string) {
    setSelectedHospitalId(id);
    setTab('hospitals');
  }

  // ─── Tab content ─────────────────────────────────────────────────────────
  function renderContent() {
    if (tab === 'hospitals' && selectedHospitalId && selectedHospital) {
      return (
        <HospitalDetail
          hospital={selectedHospital}
          simUnits={sim.units}
          simMinute={sim.simMinute}
          onBack={() => setSelectedHospitalId(null)}
        />
      );
    }

    if (tab === 'command') {
      return (
        <CommandView
          incidents={pulseIncidents}
          hospitals={hospitals}
          alerts={sim.alerts}
          strainPct={strainPct}
          ab40Violations={ab40Violations}
          unitsDeployed={deployed}
          avgWallTimeMin={avgWallTimeMin}
          countyAvgMin={28}
          hospitalsDiverting={hospitalsDiverting}
          avgResponseTimeSec={348}
          onSelectHospital={handleSelectHospital}
        />
      );
    }

    if (tab === 'map') {
      return (
        <div style={{ flex: 1, padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <MapView
              activeIncidents={activeIncidents}
              hospitals={hospitals}
              onViewHospitalDetail={handleSelectHospital}
            />
          </div>
        </div>
      );
    }

    if (tab === 'hospitals') {
      return (
        <div style={{ flex: 1, padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <HospitalList
            hospitals={hospitals}
            onSelectHospital={handleSelectHospital}
          />
        </div>
      );
    }

    if (tab === 'fleet') {
      return <FleetView units={sim.units} />;
    }

    return null;
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bg,
        overflow: 'hidden',
        fontFamily: fonts.sans,
      }}
    >
      <TopBar
        activeTab={tab}
        onTabChange={(t) => {
          setTab(t);
          if (t !== 'hospitals') setSelectedHospitalId(null);
        }}
        live={live}
        incidentCount={activeIncidents.length}
        facilityCount={hospitals.length}
        clock={clock}
      />

      <AlertTicker alerts={sim.alerts} />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderContent()}
      </main>

      <footer
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 28,
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: `${colors.void}88`,
        }}
      >
        <span style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.cyan, letterSpacing: '0.1em' }}>
          FIREDASH v22.0
        </span>
        <span style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.textDim }}>
          APOT SOLUTIONS, INC.
        </span>
      </footer>
    </div>
  );
}

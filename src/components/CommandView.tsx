import React from 'react';
import type { Incident } from '../hooks';
import type { HospitalDisplay } from '../lib/types';
import type { SimAlert } from '../lib/simulationTypes';
import { colors } from '../lib/designTokens';
import { useIsMobile } from '../hooks/useIsMobile';
import RAFeed from './RAFeed';
import FireFeed from './FireFeed';
import HospitalList from './HospitalList';
import SystemVitals from './SystemVitals';
import AIPanel from './AIPanel';

interface CommandViewProps {
  incidents: Incident[];
  hospitals: HospitalDisplay[];
  alerts: SimAlert[];
  strainPct: number;
  ab40Violations: number;
  unitsDeployed: number;
  avgWallTimeMin: number;
  countyAvgMin: number;
  hospitalsDiverting: number;
  avgResponseTimeSec: number;
  onSelectHospital?: (id: string) => void;
}

export default function CommandView({
  incidents,
  hospitals,
  alerts,
  strainPct,
  ab40Violations,
  unitsDeployed,
  avgWallTimeMin,
  countyAvgMin,
  hospitalsDiverting,
  avgResponseTimeSec,
  onSelectHospital,
}: CommandViewProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 12,
          overflowY: 'auto',
          height: '100%',
        }}
      >
        <SystemVitals
          strainPct={strainPct}
          ab40Violations={ab40Violations}
          unitsDeployed={unitsDeployed}
          avgWallTimeMin={avgWallTimeMin}
          countyAvgMin={countyAvgMin}
          hospitalsDiverting={hospitalsDiverting}
          avgResponseTimeSec={avgResponseTimeSec}
        />
        <div style={{ height: 400 }}>
          <HospitalList hospitals={hospitals} onSelectHospital={onSelectHospital} />
        </div>
        <div style={{ height: 360 }}>
          <RAFeed incidents={incidents} />
        </div>
        <div style={{ height: 320 }}>
          <FireFeed incidents={incidents} />
        </div>
        <AIPanel alerts={alerts} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr 280px',
        gap: 10,
        padding: 12,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Left: RA Feed */}
      <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <RAFeed incidents={incidents} />
      </div>

      {/* Center: Hospital list + vitals */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <HospitalList
            hospitals={hospitals}
            onSelectHospital={onSelectHospital}
            className=""
          />
        </div>
        <SystemVitals
          strainPct={strainPct}
          ab40Violations={ab40Violations}
          unitsDeployed={unitsDeployed}
          avgWallTimeMin={avgWallTimeMin}
          countyAvgMin={countyAvgMin}
          hospitalsDiverting={hospitalsDiverting}
          avgResponseTimeSec={avgResponseTimeSec}
        />
      </div>

      {/* Right: Fire Feed + AI Panel */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <FireFeed incidents={incidents} />
        </div>
        <div style={{ flexShrink: 0, maxHeight: 220, overflow: 'hidden' }}>
          <AIPanel alerts={alerts} />
        </div>
      </div>
    </div>
  );
}

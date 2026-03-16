import React from 'react';
import { Activity, AlertTriangle, Truck, Clock, Building2, Timer } from 'lucide-react';
import { colors, fonts } from '../lib/designTokens';
import Dot from './ui/Dot';
import Bar from './ui/Bar';

interface SystemVitalsProps {
  strainPct: number;
  ab40Violations: number;
  unitsDeployed: number;
  avgWallTimeMin: number;
  countyAvgMin: number;
  hospitalsDiverting: number;
  avgResponseTimeSec: number;
}

function strainColor(pct: number): string {
  if (pct >= 60) return colors.red;
  if (pct >= 35) return colors.amber;
  return colors.green;
}

export default function SystemVitals({
  strainPct,
  ab40Violations,
  unitsDeployed,
  avgWallTimeMin,
  countyAvgMin,
  hospitalsDiverting,
  avgResponseTimeSec,
}: SystemVitalsProps) {
  const sc = strainColor(strainPct);
  const wallColor = avgWallTimeMin >= 30 ? colors.red : avgWallTimeMin >= 20 ? colors.amber : colors.green;

  return (
    <div
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Activity size={13} color={colors.cyan} />
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: colors.textSec,
            textTransform: 'uppercase',
          }}
        >
          System Vitals
        </span>
        <div style={{ flex: 1 }} />
        <Dot color={sc} size={7} pulse={strainPct >= 60} />
      </div>

      {/* Strain */}
      <div style={{ padding: '12px 14px 8px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontFamily: fonts.sans, fontSize: 10, color: colors.textDim, letterSpacing: '0.08em' }}>
            SYSTEM STRAIN
          </span>
          <span style={{ fontFamily: fonts.mono, fontSize: 22, fontWeight: 700, color: sc }}>
            {strainPct}%
          </span>
        </div>
        <Bar pct={strainPct} color={sc} height={5} />
      </div>

      {/* Stats grid */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Row
          icon={<AlertTriangle size={12} color={ab40Violations > 0 ? colors.red : colors.textDim} />}
          label="AB-40 VIOLATIONS"
          value={String(ab40Violations)}
          valueColor={ab40Violations > 0 ? colors.red : colors.text}
        />
        <Row
          icon={<Truck size={12} color={colors.indigo} />}
          label="UNITS DEPLOYED"
          value={String(unitsDeployed)}
          valueColor={colors.text}
        />
        <Row
          icon={<Clock size={12} color={colors.amber} />}
          label="AVG WALL TIME"
          value={`${avgWallTimeMin}m`}
          valueColor={wallColor}
        />
        <Row
          icon={<Building2 size={12} color={colors.textDim} />}
          label="HOSPITALS DIVERTING"
          value={String(hospitalsDiverting)}
          valueColor={hospitalsDiverting > 0 ? colors.amber : colors.text}
        />
        <Row
          icon={<Timer size={12} color={colors.textDim} />}
          label="AVG RESPONSE TIME"
          value={`${Math.round(avgResponseTimeSec / 60)}m ${avgResponseTimeSec % 60}s`}
          valueColor={colors.text}
        />
        <div
          style={{
            paddingTop: 8,
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.textDim, letterSpacing: '0.08em' }}>
            COUNTY AVG WALL
          </span>
          <span style={{ fontFamily: fonts.mono, fontSize: 13, fontWeight: 600, color: colors.textSec }}>
            {countyAvgMin}m
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {icon}
      <span style={{ fontFamily: fonts.sans, fontSize: 10, color: colors.textSec, flex: 1 }}>{label}</span>
      <span style={{ fontFamily: fonts.mono, fontSize: 15, fontWeight: 700, color: valueColor }}>
        {value}
      </span>
    </div>
  );
}

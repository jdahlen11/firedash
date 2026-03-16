import React from 'react';
import { Truck } from 'lucide-react';
import type { SimUnit } from '../lib/simulationTypes';
import { colors, fonts } from '../lib/designTokens';
import Bar from './ui/Bar';
import Tag from './ui/Tag';

interface FleetViewProps {
  units: SimUnit[];
}

const BUREAUS = ['VALLEY', 'CENTRAL', 'WEST', 'SOUTH'] as const;
type Bureau = typeof BUREAUS[number];

const BUREAU_COLOR: Record<Bureau, string> = {
  VALLEY:  colors.cyan,
  CENTRAL: colors.indigo,
  WEST:    colors.amber,
  SOUTH:   colors.green,
};

const STATE_COLOR: Record<string, string> = {
  Available:  colors.green,
  Dispatched: colors.amber,
  EnRoute:    '#5B9CF6',
  OnScene:    colors.red,
  Transport:  colors.indigo,
  AtWall:     colors.amber,
  Cleared:    colors.textDim,
};

function unitTypeLabel(id: string): string {
  if (id.startsWith('RA')) return 'RA';
  if (id.startsWith('E-SIM')) return 'Engine';
  return 'Unit';
}

export default function FleetView({ units }: FleetViewProps) {
  const deployed = units.filter((u) => u.state !== 'Available' && u.state !== 'Cleared');
  const available = units.filter((u) => u.state === 'Available');

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 20,
      }}
    >
      {/* Bureau cards */}
      <div>
        <h2
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: colors.textSec,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Fleet by Bureau
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {BUREAUS.map((bureau) => {
            const bureauUnits = units.filter((u) => u.bureau === bureau);
            const avail = bureauUnits.filter((u) => u.state === 'Available' || u.state === 'Cleared').length;
            const pct = bureauUnits.length > 0 ? Math.round((avail / bureauUnits.length) * 100) : 0;
            const bColor = BUREAU_COLOR[bureau];
            const ra = bureauUnits.filter((u) => u.unitType === 'RA');
            const eng = bureauUnits.filter((u) => u.unitType === 'Engine');
            const raAvail = ra.filter((u) => u.state === 'Available' || u.state === 'Cleared').length;
            const engAvail = eng.filter((u) => u.state === 'Available' || u.state === 'Cleared').length;

            return (
              <div
                key={bureau}
                style={{
                  backgroundColor: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontFamily: fonts.sans, fontSize: 11, fontWeight: 700, color: colors.text, letterSpacing: '0.06em' }}>
                    {bureau}
                  </span>
                  <span style={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: 700, color: bColor }}>
                    {pct}%
                  </span>
                </div>
                <Bar pct={pct} color={bColor} height={5} />
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textDim }}>
                    RA {raAvail}/{ra.length}
                  </span>
                  <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textDim }}>
                    ENG {engAvail}/{eng.length}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {[
          { label: 'TOTAL UNITS', value: units.length, color: colors.text },
          { label: 'AVAILABLE',   value: available.length, color: colors.green },
          { label: 'DEPLOYED',    value: deployed.length, color: colors.amber },
          { label: 'AT WALL',     value: units.filter((u) => u.state === 'AtWall').length, color: colors.red },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            <p style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.textDim, letterSpacing: '0.08em', marginBottom: 4 }}>
              {s.label}
            </p>
            <span style={{ fontFamily: fonts.mono, fontSize: 22, fontWeight: 700, color: s.color }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Deployed unit table */}
      <div
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <Truck size={13} color={colors.cyan} />
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
            Deployed Units
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textDim }}>
            {deployed.length} UNITS
          </span>
        </div>

        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '100px 90px 80px 90px 1fr',
            padding: '6px 16px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          {['UNIT', 'TYPE', 'BUREAU', 'STATE', 'INCIDENT'].map((h) => (
            <span
              key={h}
              style={{
                fontFamily: fonts.sans,
                fontSize: 9,
                fontWeight: 600,
                color: colors.textDim,
                letterSpacing: '0.08em',
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Table rows */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {deployed.map((unit) => {
            const sc = STATE_COLOR[unit.state] ?? colors.textSec;
            return (
              <div
                key={unit.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 90px 80px 90px 1fr',
                  padding: '7px 16px',
                  borderBottom: `1px solid ${colors.border}44`,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, color: colors.text }}>
                  {unit.id.replace('-SIM', '')}
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textSec }}>
                  {unitTypeLabel(unit.id)}
                </span>
                <span style={{ fontFamily: fonts.mono, fontSize: 10, color: BUREAU_COLOR[unit.bureau] }}>
                  {unit.bureau.slice(0, 4)}
                </span>
                <Tag label={unit.state.toUpperCase()} color={sc} small />
                <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {unit.incidentId ?? unit.hospitalId ?? '—'}
                </span>
              </div>
            );
          })}
          {deployed.length === 0 && (
            <div
              style={{
                padding: '24px',
                fontFamily: fonts.sans,
                fontSize: 11,
                color: colors.textDim,
                textAlign: 'center',
              }}
            >
              All units available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

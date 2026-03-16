import React from 'react';
import { Flame } from 'lucide-react';
import type { Incident } from '../hooks';
import {
  TYPE_LABELS,
  TYPE_SHORT,
  getCategory,
  formatAddress,
  elapsedMinutes,
} from '../hooks';
import { colors, fonts } from '../lib/designTokens';
import Dot from './ui/Dot';
import Tag from './ui/Tag';

interface FireFeedProps {
  incidents: Incident[];
  className?: string;
}

const FIRE_TYPES = new Set([
  'SF','RF','CF','WSF','WRF','WCF','FULL','AF','CHIM','ELF','PF','FIRE','OF','VF','GF','IF','EF','MF','CB','VEG','WVEG',
]);
const TC_TYPES = new Set(['TC','TCE','TCS','TCT']);
const HAZ_TYPES = new Set(['HMR','GAS','EX','HMI','PE','HC']);
const ALARM2_UNIT_COUNT = 5; // heuristic: ≥5 units = 2nd alarm

function alarmLevel(units: { id: string }[]): number {
  return units.length >= ALARM2_UNIT_COUNT ? 2 : 1;
}

function unitColor(unitId: string): string {
  if (unitId.startsWith('RA') || unitId.startsWith('EM')) return colors.cyan;
  if (unitId.startsWith('E') || unitId.startsWith('BC')) return colors.red;
  if (unitId.startsWith('T')) return colors.amber;
  if (unitId.startsWith('HR') || unitId.startsWith('UR')) return colors.indigo;
  return colors.textSec;
}

function isFireIncident(type: string): boolean {
  const cat = getCategory(type);
  return cat === 'fire' || cat === 'hazmat' || cat === 'rescue';
}

export default function FireFeed({ incidents, className = '' }: FireFeedProps) {
  const fireIncidents = incidents
    .filter((i) => isFireIncident(i.type))
    .sort((a, b) => (b.units?.length ?? 0) - (a.units?.length ?? 0))
    .slice(0, 16);

  const structureCount = incidents.filter((i) => FIRE_TYPES.has(i.type)).length;
  const tcCount = incidents.filter((i) => TC_TYPES.has(i.type)).length;
  const hazCount = incidents.filter((i) => HAZ_TYPES.has(i.type)).length;
  const alarm2Count = incidents.filter((i) => (i.units?.length ?? 0) >= ALARM2_UNIT_COUNT).length;

  return (
    <div
      className={className}
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
          flexShrink: 0,
        }}
      >
        <Flame size={13} color={colors.red} />
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
          Fire Resources
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textDim }}>
          {fireIncidents.length} INCIDENTS
        </span>
      </div>

      {/* Incidents */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {fireIncidents.length === 0 ? (
          <div
            style={{
              padding: '24px 14px',
              fontFamily: fonts.sans,
              fontSize: 11,
              color: colors.textDim,
              textAlign: 'center',
            }}
          >
            No active fire incidents
          </div>
        ) : (
          fireIncidents.map((inc) => {
            const alarm = alarmLevel(inc.units ?? []);
            const elapsed = elapsedMinutes(inc.time);
            const typeLabel = TYPE_SHORT[inc.type] ?? inc.type;
            const cat = getCategory(inc.type);
            const catColor =
              cat === 'fire' ? colors.red :
              cat === 'hazmat' ? colors.indigo :
              cat === 'rescue' ? colors.cyan :
              colors.textSec;
            const units = (inc.units ?? []).slice(0, 10);

            return (
              <div
                key={inc.id}
                style={{
                  padding: '8px 14px',
                  borderBottom: `1px solid ${colors.border}55`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                {/* Row 1: alarm badge, type, address, elapsed */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: alarm >= 2 ? colors.red : colors.textDim,
                      border: `1px solid ${alarm >= 2 ? colors.red : colors.border}`,
                      borderRadius: 3,
                      padding: '1px 5px',
                      flexShrink: 0,
                    }}
                  >
                    {alarm >= 2 ? '2nd' : '1st'}
                  </span>
                  <Tag label={typeLabel} color={catColor} filled />
                  <span
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 10,
                      color: colors.textDim,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatAddress(inc.addr)}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 10,
                      color: elapsed >= 30 ? colors.amber : colors.textDim,
                      flexShrink: 0,
                    }}
                  >
                    {elapsed}m
                  </span>
                </div>

                {/* Row 2: unit roster */}
                {units.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, paddingLeft: 0 }}>
                    {units.map((u) => (
                      <span
                        key={u.id}
                        style={{
                          fontFamily: fonts.mono,
                          fontSize: 9,
                          fontWeight: 600,
                          color: unitColor(u.id),
                          backgroundColor: `${unitColor(u.id)}18`,
                          border: `1px solid ${unitColor(u.id)}33`,
                          borderRadius: 3,
                          padding: '1px 4px',
                        }}
                      >
                        {u.id}
                      </span>
                    ))}
                    {(inc.units?.length ?? 0) > 10 && (
                      <span
                        style={{
                          fontFamily: fonts.mono,
                          fontSize: 9,
                          color: colors.textDim,
                          padding: '1px 4px',
                        }}
                      >
                        +{(inc.units?.length ?? 0) - 10}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${colors.border}`,
          padding: '8px 14px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: 4,
        }}
      >
        {[
          { label: 'STRUCTURE', value: structureCount, color: colors.red },
          { label: 'TC',        value: tcCount,        color: colors.amber },
          { label: 'HAZMAT',    value: hazCount,       color: colors.indigo },
          { label: '2nd ALARM', value: alarm2Count,    color: colors.red },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontFamily: fonts.sans, fontSize: 8, color: colors.textDim, letterSpacing: '0.08em' }}>
              {s.label}
            </span>
            <span style={{ fontFamily: fonts.mono, fontSize: 16, fontWeight: 700, color: s.color }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

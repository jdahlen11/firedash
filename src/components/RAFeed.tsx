import React from 'react';
import { Ambulance } from 'lucide-react';
import type { Incident } from '../hooks';
import {
  TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  getCategory,
  CATEGORY_COLORS,
  formatAddress,
  elapsedMinutes,
} from '../hooks';
import { colors, fonts } from '../lib/designTokens';
import Dot from './ui/Dot';
import Tag from './ui/Tag';

interface RAFeedProps {
  incidents: Incident[];
  className?: string;
}

interface RARow {
  incidentId: string;
  unitId: string;
  unitStatus: string;
  callType: string;
  category: string;
  address: string;
  elapsed: number;
}

function buildRARows(incidents: Incident[]): RARow[] {
  const rows: RARow[] = [];
  const seen = new Set<string>();
  for (const inc of incidents) {
    for (const unit of inc.units ?? []) {
      if (!unit.id.startsWith('RA')) continue;
      if (seen.has(unit.id)) continue;
      seen.add(unit.id);
      rows.push({
        incidentId: inc.id,
        unitId: unit.id,
        unitStatus: unit.status,
        callType: TYPE_LABELS[inc.type] ?? inc.type,
        category: getCategory(inc.type),
        address: formatAddress(inc.addr),
        elapsed: elapsedMinutes(inc.time),
      });
    }
  }
  return rows.sort((a, b) => a.elapsed - b.elapsed).slice(0, 20);
}

function countStatus(incidents: Incident[], statuses: string[]): number {
  let count = 0;
  const seen = new Set<string>();
  for (const inc of incidents) {
    for (const unit of inc.units ?? []) {
      if (!unit.id.startsWith('RA')) continue;
      if (seen.has(unit.id)) continue;
      if (statuses.includes(unit.status)) {
        seen.add(unit.id);
        count++;
      }
    }
  }
  return count;
}

export default function RAFeed({ incidents, className = '' }: RAFeedProps) {
  const rows = buildRARows(incidents);
  const transportCount = countStatus(incidents, ['Transport']);
  const onSceneCount = countStatus(incidents, ['OnScene']);
  const atWallCount = countStatus(incidents, ['TransportArrived', 'AtHospital']);
  const totalRA = 98; // RA fleet size

  const deployedUnits = new Set<string>();
  for (const inc of incidents) {
    for (const unit of inc.units ?? []) {
      if (unit.id.startsWith('RA')) deployedUnits.add(unit.id);
    }
  }
  const availableCount = totalRA - deployedUnits.size;

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
        <Ambulance size={13} color={colors.cyan} />
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
          RA Units / EMS
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textDim }}>
          {rows.length} ACTIVE
        </span>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: '24px 14px',
              fontFamily: fonts.sans,
              fontSize: 11,
              color: colors.textDim,
              textAlign: 'center',
            }}
          >
            No active RA units
          </div>
        ) : (
          rows.map((row) => {
            const statusColor = STATUS_COLORS[row.unitStatus] ?? colors.textDim;
            const catColor = CATEGORY_COLORS[row.category as keyof typeof CATEGORY_COLORS] ?? colors.textDim;
            return (
              <div
                key={`${row.incidentId}-${row.unitId}`}
                style={{
                  padding: '8px 14px',
                  borderBottom: `1px solid ${colors.border}88`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {/* Row 1: unit, status, type */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Dot color={statusColor} size={7} />
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 12,
                      fontWeight: 700,
                      color: colors.text,
                      minWidth: 52,
                    }}
                  >
                    {row.unitId}
                  </span>
                  <Tag label={STATUS_LABELS[row.unitStatus] ?? row.unitStatus} color={statusColor} />
                  <Tag label={row.callType.length > 12 ? row.callType.slice(0, 12) + '…' : row.callType} color={catColor} />
                  <div style={{ flex: 1 }} />
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 10,
                      color: row.elapsed >= 30 ? colors.amber : colors.textDim,
                    }}
                  >
                    {row.elapsed}m
                  </span>
                </div>
                {/* Row 2: address */}
                <div
                  style={{
                    paddingLeft: 13,
                    fontFamily: fonts.sans,
                    fontSize: 10,
                    color: colors.textDim,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {row.address || '—'}
                </div>
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
          { label: 'TRANSPORT', value: transportCount, color: colors.indigo },
          { label: 'ON SCENE',  value: onSceneCount,   color: colors.red },
          { label: 'AT WALL',   value: atWallCount,    color: colors.amber },
          { label: 'AVAIL',     value: availableCount, color: colors.green },
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

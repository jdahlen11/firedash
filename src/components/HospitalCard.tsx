import React from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import type { HospitalDisplay } from '../lib/types';
import { TIER_COLOR, TIER_LABEL } from '../lib/types';
import { colors, fonts } from '../lib/designTokens';
import Dot from './ui/Dot';
import Tag from './ui/Tag';
import AreaChart from './ui/AreaChart';

interface HospitalCardProps {
  hospital: HospitalDisplay;
  onClick?: (id: string) => void;
}

function waitColor(wait: number): string {
  if (wait >= 30) return colors.red;
  if (wait >= 20) return colors.amber;
  return colors.green;
}

export default function HospitalCard({ hospital, onClick }: HospitalCardProps) {
  const tierColor = TIER_COLOR[hospital.tier];
  const wc = waitColor(hospital.avgWait);

  return (
    <div
      onClick={() => onClick?.(hospital.id)}
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${tierColor}`,
        borderRadius: '0 8px 8px 0',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.cardHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.card;
      }}
    >
      {/* Top row: abbrev, status, code, wait */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px 6px',
        }}
      >
        <Dot color={tierColor} size={8} pulse={hospital.tier === 'BACKED_UP'} />
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {hospital.abbreviation}
        </span>
        <Tag label={TIER_LABEL[hospital.tier]} color={tierColor} />
        {hospital.ab40Violations > 0 && (
          <Tag label={`AB40 ×${hospital.ab40Violations}`} color={colors.red} filled />
        )}
        {hospital.designations.slice(0, 2).map((d) => (
          <Tag key={d} label={d} color={colors.indigo} small />
        ))}
        <div style={{ flex: 1 }} />
        {/* Large wait time */}
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 26,
            fontWeight: 700,
            color: wc,
            lineHeight: 1,
          }}
        >
          {hospital.avgWait}
        </span>
        <span style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.textDim, marginTop: 8 }}>
          min
        </span>
        {onClick && (
          <ChevronRight size={14} color={colors.textDim} />
        )}
      </div>

      {/* Sparkline */}
      {hospital.sparkline.length >= 2 && (
        <div style={{ width: '100%', height: 36, overflow: 'hidden' }}>
          <AreaChart
            data={hospital.sparkline}
            color={tierColor}
            height={36}
          />
        </div>
      )}

      {/* Bottom row: stats + divert */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '6px 12px 10px',
        }}
      >
        <span style={{ fontFamily: fonts.sans, fontSize: 10, color: colors.textDim }}>
          <span style={{ fontFamily: fonts.mono, color: colors.textSec, fontWeight: 600 }}>
            {hospital.unitsAtWall}
          </span>{' '}at wall
        </span>
        <span style={{ fontFamily: fonts.sans, fontSize: 10, color: colors.textDim }}>
          <span style={{ fontFamily: fonts.mono, color: colors.textSec, fontWeight: 600 }}>
            {hospital.completedToday}
          </span>{' '}today
        </span>
        <div style={{ flex: 1 }} />
        {hospital.tier === 'BACKED_UP' && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: fonts.sans,
              fontSize: 10,
              color: colors.amber,
            }}
          >
            <AlertTriangle size={11} color={colors.amber} />
            Divert recommended
          </span>
        )}
      </div>
    </div>
  );
}

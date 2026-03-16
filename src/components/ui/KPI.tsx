import React from 'react';
import { colors, fonts } from '../../lib/designTokens';

interface KPIProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}

export default function KPI({ label, value, unit, color = colors.text }: KPIProps) {
  return (
    <div
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span
        style={{
          fontFamily: fonts.sans,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: colors.textDim,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: 24,
          fontWeight: 700,
          color,
          lineHeight: 1.1,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 13, fontWeight: 400, color: colors.textSec, marginLeft: 2 }}>
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

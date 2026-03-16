import React from 'react';
import { colors, fonts } from '../../lib/designTokens';

interface StatProps {
  label: string;
  value: string | number;
  color?: string;
}

export default function Stat({ label, value, color = colors.text }: StatProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontFamily: fonts.sans,
          fontSize: 9,
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
          fontSize: 16,
          fontWeight: 700,
          color,
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

import React from 'react';
import { colors } from '../../lib/designTokens';

interface BarProps {
  pct: number;
  color?: string;
  height?: number;
  className?: string;
}

export default function Bar({ pct, color = colors.cyan, height = 6, className = '' }: BarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height,
        backgroundColor: `${colors.border}`,
        borderRadius: height,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: height,
          transition: 'width 0.5s ease',
        }}
      />
    </div>
  );
}

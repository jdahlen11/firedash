import React from 'react';

interface TagProps {
  label: string;
  color?: string;
  filled?: boolean;
  small?: boolean;
}

export default function Tag({ label, color = '#9EAEC7', filled = false, small = false }: TagProps) {
  const pad = small ? '2px 6px' : '3px 8px';
  const fontSize = small ? '9px' : '10px';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: pad,
        borderRadius: 4,
        fontFamily: '"Inter", system-ui, sans-serif',
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: filled ? '#0B1120' : color,
        backgroundColor: filled ? color : `${color}22`,
        border: `1px solid ${color}44`,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

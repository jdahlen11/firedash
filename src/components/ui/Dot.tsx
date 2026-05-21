import React from 'react';

interface DotProps {
  color: string;
  size?: number;
  pulse?: boolean;
}

export default function Dot({ color, size = 8 }: DotProps) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, backgroundColor: color }}
      />
    </span>
  );
}

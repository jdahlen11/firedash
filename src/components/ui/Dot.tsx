import React from 'react';

interface DotProps {
  color: string;
  size?: number;
  pulse?: boolean;
}

export default function Dot({ color, size = 8, pulse = false }: DotProps) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      {pulse && (
        <span
          className="absolute inline-flex rounded-full animate-ping opacity-75"
          style={{ width: size, height: size, backgroundColor: color }}
        />
      )}
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, backgroundColor: color }}
      />
    </span>
  );
}

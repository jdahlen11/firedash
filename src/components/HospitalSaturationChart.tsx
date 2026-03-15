import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import type { SimHospital } from '../lib/simulationTypes';

const BAR_COLORS: Record<string, string> = {
  OPEN: '#0099BF',
  ED_SATURATION: '#F5A623',
  DIVERT: '#E8553C',
  CLOSED: '#64748B',
};

interface HospitalSaturationChartProps {
  hospitals: SimHospital[];
  className?: string;
}

export default function HospitalSaturationChart({ hospitals, className = '' }: HospitalSaturationChartProps) {
  const data = hospitals
    .slice()
    .sort((a, b) => b.saturationPct - a.saturationPct)
    .map((h) => ({
      name: h.abbreviation,
      saturation: h.saturationPct,
      wallMin: h.avgWallTimeMin,
      atWall: h.unitsAtWall,
      status: h.status,
    }));

  return (
    <section className={`flex flex-col rounded-lg overflow-hidden bg-[#0A0F1A] border border-[#1A2744] min-h-0 ${className}`}>
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-[#1A2744]">
        <span className="font-mono text-xs font-semibold tracking-wider text-[#94A3B8] uppercase">
          Hospital saturation %
        </span>
      </div>
      <div className="flex-1 min-h-[140px] w-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'ui-monospace' }}
              axisLine={{ stroke: '#1A2744' }}
              tickLine={{ stroke: '#1A2744' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'ui-monospace' }}
              axisLine={{ stroke: '#1A2744' }}
              tickLine={{ stroke: '#1A2744' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0A0F1A',
                border: '1px solid #1A2744',
                borderRadius: '6px',
                fontFamily: 'ui-monospace',
                fontSize: '11px',
              }}
              labelStyle={{ color: '#F1F5F9' }}
              formatter={(value: number) => [`${value}%`, 'Saturation']}
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload
                  ? `${label} · ${payload[0].payload.wallMin}m avg wall · ${payload[0].payload.atWall} at wall`
                  : label
              }
            />
            <Bar dataKey="saturation" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={BAR_COLORS[entry.status] ?? '#64748B'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

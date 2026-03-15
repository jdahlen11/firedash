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
import type { FleetDistributionSnapshot } from '../lib/simulationTypes';

const STATE_COLORS: Record<keyof FleetDistributionSnapshot, string> = {
  Available: '#10B981',
  Dispatched: '#6366F1',
  EnRoute: '#F5A623',
  OnScene: '#0099BF',
  Transport: '#8B5CF6',
  AtWall: '#E8553C',
  Cleared: '#64748B',
};

const STATE_ORDER: (keyof FleetDistributionSnapshot)[] = [
  'Available',
  'Dispatched',
  'EnRoute',
  'OnScene',
  'Transport',
  'AtWall',
  'Cleared',
];

interface FleetDistributionChartProps {
  distribution: FleetDistributionSnapshot;
  className?: string;
}

export default function FleetDistributionChart({ distribution, className = '' }: FleetDistributionChartProps) {
  const data = STATE_ORDER.map((state) => ({
    name: state.replace(/([A-Z])/g, ' $1').trim(),
    count: distribution[state],
    state,
  })).filter((d) => d.count > 0);

  return (
    <section className={`flex flex-col rounded-lg overflow-hidden bg-[#0A0F1A] border border-[#1A2744] min-h-0 ${className}`}>
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-[#1A2744]">
        <span className="font-mono text-xs font-semibold tracking-wider text-[#94A3B8] uppercase">
          Units by state
        </span>
      </div>
      <div className="flex-1 min-h-[140px] w-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <XAxis
              type="number"
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'ui-monospace' }}
              axisLine={{ stroke: '#1A2744' }}
              tickLine={{ stroke: '#1A2744' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={72}
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
              formatter={(value: number) => [value, 'Units']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STATE_COLORS[entry.state as keyof FleetDistributionSnapshot] ?? '#64748B'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

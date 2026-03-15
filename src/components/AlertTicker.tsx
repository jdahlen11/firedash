import React, { useRef, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { SimAlert } from '../lib/simulationTypes';

const MAX_ITEMS = 12;
const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};
const SEVERITY_STYLE = {
  info: 'text-[#0099BF]',
  warning: 'text-[#F5A623]',
  critical: 'text-[#E8553C]',
};

interface AlertTickerProps {
  alerts: SimAlert[];
  className?: string;
}

export default function AlertTicker({ alerts, className = '' }: AlertTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const display = alerts.slice(-MAX_ITEMS);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [alerts.length]);

  if (display.length === 0) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 border-b border-[#1A2744] bg-[#0A0F1A]/80 font-mono text-xs text-[#475569] ${className}`}>
        <Info size={12} className="text-[#475569]" />
        No active alerts
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={`flex items-center gap-4 overflow-x-auto border-b border-[#1A2744] bg-[#0A0F1A]/80 py-2 px-4 scrollbar-hide ${className}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {display.map((a) => {
        const Icon = SEVERITY_ICON[a.severity];
        const style = SEVERITY_STYLE[a.severity];
        return (
          <div
            key={a.id}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded border border-[#1A2744] bg-[#04070D] font-mono text-xs ${style}`}
            title={new Date(a.timestamp).toLocaleTimeString()}
          >
            <Icon size={12} />
            <span className="text-[#F1F5F9]">{a.message}</span>
            <span className="text-[#475569]">{new Date(a.timestamp).toLocaleTimeString('en-US', { hour12: false })}</span>
          </div>
        );
      })}
    </div>
  );
}

import React from 'react';
import { Radio } from 'lucide-react';

const MAX_VISIBLE = 8;

export interface LiveIncidentItem {
  id: string;
  type: string;
  addr: string;
  time?: string;
  agency?: string;
}

interface LivePulsepointFeedProps {
  incidents: LiveIncidentItem[];
  className?: string;
}

export default function LivePulsepointFeed({ incidents, className = '' }: LivePulsepointFeedProps) {
  const visible = incidents.slice(0, MAX_VISIBLE);

  return (
    <section className={`flex flex-col rounded-lg overflow-hidden bg-[#0A0F1A] border border-[#1A2744] min-h-0 ${className}`}>
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-[#1A2744]">
        <Radio size={14} className="text-[#0099BF]" />
        <span className="font-mono text-xs font-semibold tracking-wider text-[#94A3B8] uppercase">
          Live PulsePoint
        </span>
        <span className="ml-auto font-mono text-[10px] text-[#475569]">{incidents.length} incidents</span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {visible.length === 0 ? (
          <div className="px-4 py-3 font-mono text-xs text-[#475569]">No live incidents</div>
        ) : (
          <ul className="divide-y divide-[#111827]">
            {visible.map((inc) => (
              <li
                key={inc.id}
                className="px-4 py-2 hover:bg-[#111827] transition-colors"
                title={`${inc.type} · ${inc.addr}`}
              >
                <div className="font-mono text-xs text-[#F1F5F9] truncate">{inc.addr || inc.id}</div>
                <div className="font-mono text-[10px] text-[#475569] flex gap-2 mt-0.5">
                  <span>{inc.type}</span>
                  {inc.agency && <span>{inc.agency}</span>}
                  {inc.time && <span>{inc.time}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { HospitalDisplay } from '../lib/types';
import { sortHospitals } from '../lib/types';
import { colors, fonts } from '../lib/designTokens';
import HospitalCard from './HospitalCard';

interface HospitalListProps {
  hospitals: HospitalDisplay[];
  onSelectHospital?: (id: string) => void;
  className?: string;
}

const FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'trauma',    label: 'Trauma' },
  { id: 'edap',      label: 'EDAP' },
  { id: 'pediatric', label: 'Pediatric' },
] as const;

type FilterId = typeof FILTERS[number]['id'];

export default function HospitalList({ hospitals, onSelectHospital, className = '' }: HospitalListProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');

  const filtered = useMemo(() => {
    let list = sortHospitals(hospitals);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.abbreviation.toLowerCase().includes(q),
      );
    }
    if (filter !== 'all') {
      list = list.filter((h) =>
        h.designations.some((d) => d.toLowerCase().includes(filter)),
      );
    }
    return list;
  }, [hospitals, query, filter]);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Search + filters */}
      <div
        style={{
          flexShrink: 0,
          padding: '8px 0 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            color={colors.textDim}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search hospitals…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: '13px 10px 13px 36px',
              fontFamily: fonts.sans,
              fontSize: 14,
              color: colors.text,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                style={{
                  padding: '11px 16px',
                  minHeight: 44,
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 22,
                  border: `1px solid ${active ? colors.cyan : colors.border}`,
                  backgroundColor: active ? `${colors.cyan}22` : 'transparent',
                  color: active ? colors.cyan : colors.textSec,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          paddingRight: 2,
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              fontFamily: fonts.sans,
              fontSize: 12,
              color: colors.textDim,
              textAlign: 'center',
            }}
          >
            No hospitals match this filter
          </div>
        ) : (
          filtered.map((h) => (
            <HospitalCard
              key={h.id}
              hospital={h}
              onClick={onSelectHospital}
            />
          ))
        )}
      </div>
    </div>
  );
}

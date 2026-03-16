import React from 'react'; // needed for JSX transform
import { Radio } from 'lucide-react';
import { colors, fonts } from '../lib/designTokens';
import Dot from './ui/Dot';

export type AppTab = 'command' | 'map' | 'hospitals' | 'fleet';

interface TopBarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  live: boolean;
  incidentCount: number;
  facilityCount: number;
  clock: Date;
}

const TABS: { id: AppTab; label: string }[] = [
  { id: 'command', label: 'COMMAND' },
  { id: 'map',     label: 'MAP' },
  { id: 'hospitals', label: 'HOSPITALS' },
  { id: 'fleet',   label: 'FLEET' },
];

export default function TopBar({
  activeTab,
  onTabChange,
  live,
  incidentCount,
  facilityCount,
  clock,
}: TopBarProps) {
  const timeStr = clock.toLocaleTimeString('en-US', { hour12: false });

  return (
    <header
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: 48,
        backgroundColor: `${colors.void}F0`,
        borderBottom: `1px solid ${colors.border}`,
        backdropFilter: 'blur(8px)',
        gap: 16,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Radio size={15} color={colors.red} />
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: colors.text,
          }}
        >
          FIRE<span style={{ color: colors.cyan }}>DASH</span>
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, backgroundColor: colors.border, flexShrink: 0 }} />

      {/* Tab Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '0 16px',
                height: 48,
                fontFamily: fonts.sans,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: isActive ? colors.cyan : colors.textSec,
                background: 'none',
                border: 'none',
                borderBottom: isActive ? `2px solid ${colors.cyan}` : '2px solid transparent',
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          fontFamily: fonts.sans,
          fontSize: 11,
          color: colors.textSec,
        }}
      >
        <span>
          <span style={{ fontFamily: fonts.mono, color: colors.text, fontWeight: 700 }}>{incidentCount}</span>
          {' '}INCIDENTS
        </span>
        <span>
          <span style={{ fontFamily: fonts.mono, color: colors.text, fontWeight: 700 }}>{facilityCount}</span>
          {' '}FACILITIES
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, backgroundColor: colors.border, flexShrink: 0 }} />

      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Dot color={live ? colors.cyan : colors.amber} size={8} pulse={live} />
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: live ? colors.cyan : colors.amber,
          }}
        >
          {live ? 'LIVE' : 'CONNECTING'}
        </span>
      </div>

      {/* Clock */}
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: colors.text,
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}
      >
        {timeStr}
      </span>
    </header>
  );
}

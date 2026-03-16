import React, { useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Flame, Heart, Car, Biohazard, LifeBuoy, CircleAlert, X } from 'lucide-react';
import type { ActiveIncident, IncidentType } from './HeroIncidentMap';
import type { HospitalDisplay } from '../lib/types';
import { TIER_COLOR, TIER_LABEL } from '../lib/types';
import { colors, fonts } from '../lib/designTokens';
import AreaChart from './ui/AreaChart';
import Bar from './ui/Bar';
import Tag from './ui/Tag';

interface MapViewProps {
  activeIncidents: ActiveIncident[];
  hospitals: HospitalDisplay[];
  onViewHospitalDetail?: (id: string) => void;
  className?: string;
}

const INCIDENT_CONFIG: Record<IncidentType, { Icon: typeof Flame; bg: string }> = {
  FIRE:   { Icon: Flame,       bg: '#EF4444' },
  EMS:    { Icon: Heart,       bg: '#00C2E0' },
  TC:     { Icon: Car,         bg: '#F59E0B' },
  HAZMAT: { Icon: Biohazard,   bg: '#818CF8' },
  RESCUE: { Icon: LifeBuoy,    bg: '#10B981' },
  OTHER:  { Icon: CircleAlert, bg: '#5A6D8A' },
};

function waitColor(w: number): string {
  if (w >= 30) return colors.red;
  if (w >= 20) return colors.amber;
  return colors.green;
}

export default function MapView({
  activeIncidents,
  hospitals,
  onViewHospitalDetail,
  className = '',
}: MapViewProps) {
  const [viewState, setViewState] = useState({
    longitude: -118.2437,
    latitude: 34.0522,
    zoom: 10,
  });
  const [selectedHospital, setSelectedHospital] = useState<HospitalDisplay | null>(null);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!mapboxToken) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          color: colors.amber,
          fontFamily: fonts.mono,
          fontSize: 11,
        }}
      >
        MAP UNAVAILABLE — Set VITE_MAPBOX_TOKEN in .env.local
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
        height: '100%',
      }}
    >
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Incident markers */}
        {activeIncidents.map((inc) => {
          const cfg = INCIDENT_CONFIG[inc.type] ?? INCIDENT_CONFIG.OTHER;
          const Icon = cfg.Icon;
          return (
            <Marker key={`inc-${inc.id}`} longitude={inc.lng} latitude={inc.lat} anchor="center">
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: cfg.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(0,0,0,0.5)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                }}
                title={`${inc.type} — ${inc.address ?? inc.id}`}
              >
                <Icon size={13} color="#fff" strokeWidth={2.5} />
              </div>
            </Marker>
          );
        })}

        {/* Hospital bubble markers */}
        {hospitals.map((h) => {
          const tierColor = TIER_COLOR[h.tier];
          return (
            <Marker key={`hosp-${h.id}`} longitude={h.lng} latitude={h.lat} anchor="center">
              <div
                onClick={() => setSelectedHospital(h)}
                style={{
                  minWidth: 36,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: `${tierColor}CC`,
                  border: `2px solid ${tierColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 7px',
                  cursor: 'pointer',
                  boxShadow: `0 0 8px ${tierColor}66`,
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.04em',
                  }}
                >
                  {h.abbreviation}
                </span>
              </div>
            </Marker>
          );
        })}

        {/* Hospital popup */}
        {selectedHospital && (
          <Popup
            longitude={selectedHospital.lng}
            latitude={selectedHospital.lat}
            anchor="bottom"
            closeButton={false}
            onClose={() => setSelectedHospital(null)}
            style={{ padding: 0 }}
            maxWidth="280px"
          >
            <HospitalPopup
              hospital={selectedHospital}
              onClose={() => setSelectedHospital(null)}
              onViewDetail={() => {
                setSelectedHospital(null);
                onViewHospitalDetail?.(selectedHospital.id);
              }}
            />
          </Popup>
        )}
      </Map>

      {/* Live indicator */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          backgroundColor: `${colors.card}E8`,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backdropFilter: 'blur(6px)',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: colors.green,
            display: 'inline-block',
          }}
          className="animate-pulse"
        />
        <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.green }}>
          LIVE PULSEPOINT FEED
        </span>
      </div>
    </div>
  );
}

function HospitalPopup({
  hospital,
  onClose,
  onViewDetail,
}: {
  hospital: HospitalDisplay;
  onClose: () => void;
  onViewDetail: () => void;
}) {
  const tierColor = TIER_COLOR[hospital.tier];
  const wc = waitColor(hospital.avgWait);
  const aboveDiff = hospital.avgWait - hospital.countyAvg;

  return (
    <div
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderTop: `3px solid ${tierColor}`,
        borderRadius: 8,
        width: 260,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 8px' }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 13, fontWeight: 700, color: colors.text, flex: 1 }}>
          {hospital.abbreviation}
        </span>
        <Tag label={TIER_LABEL[hospital.tier]} color={tierColor} small />
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
        >
          <X size={13} color={colors.textDim} />
        </button>
      </div>

      {/* Wait + stats */}
      <div style={{ padding: '0 12px 8px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <p style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.textDim, letterSpacing: '0.08em' }}>PROJECTED WAIT</p>
          <span style={{ fontFamily: fonts.mono, fontSize: 26, fontWeight: 700, color: wc }}>
            {hospital.avgWait}<span style={{ fontSize: 12, color: colors.textSec }}>m</span>
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.textDim }}>AT WALL</span>
            <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.text }}>{hospital.unitsAtWall}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.textDim }}>COUNTY AVG</span>
            <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textSec }}>{hospital.countyAvg}m</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.textDim }}>vs COUNTY</span>
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                color: aboveDiff > 0 ? colors.red : colors.green,
              }}
            >
              {aboveDiff > 0 ? `+${aboveDiff}m` : `${aboveDiff}m`}
            </span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {hospital.sparkline.length >= 2 && (
        <AreaChart data={hospital.sparkline} color={tierColor} height={40} />
      )}

      {/* Saturation bar */}
      <div style={{ padding: '6px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.textDim }}>ED SATURATION</span>
          <span style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.textSec }}>{hospital.saturationPct}%</span>
        </div>
        <Bar pct={hospital.saturationPct} color={tierColor} height={4} />
      </div>

      {/* Divert alert */}
      {hospital.tier === 'BACKED_UP' && (
        <div
          style={{
            margin: '4px 12px',
            padding: '5px 8px',
            backgroundColor: `${colors.amber}15`,
            border: `1px solid ${colors.amber}33`,
            borderRadius: 4,
            fontFamily: fonts.sans,
            fontSize: 10,
            color: colors.amber,
          }}
        >
          ⚠ Divert recommended
        </div>
      )}

      {/* View Details button */}
      <div style={{ padding: '8px 12px' }}>
        <button
          type="button"
          onClick={onViewDetail}
          style={{
            width: '100%',
            padding: '7px',
            backgroundColor: `${colors.cyan}22`,
            border: `1px solid ${colors.cyan}55`,
            borderRadius: 6,
            fontFamily: fonts.sans,
            fontSize: 11,
            fontWeight: 600,
            color: colors.cyan,
            cursor: 'pointer',
            letterSpacing: '0.06em',
          }}
        >
          View Details →
        </button>
      </div>
    </div>
  );
}

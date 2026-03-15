import { useEffect, useRef, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import type { MarkerEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { wtClient, ActiveWallLive, fetchActiveWallsLive } from '../lib/walltime';

// APOT color system — matches dashboard palette
const STATUS_COLORS: Record<ActiveWallLive['current_status'], string> = {
  DISPATCHED:  '#ECC94B', // APOT Warning Amber
  EN_ROUTE:    '#5B9CF6', // APOT Info Blue
  ON_SCENE:    '#F6A623', // APOT Orange
  TRANSPORTING:'#A855F7', // APOT Accent Violet
  AT_HOSPITAL: '#00D4FF', // APOT Cyan
};

const STATUS_LABELS: Record<ActiveWallLive['current_status'], string> = {
  DISPATCHED:  'DISP',
  EN_ROUTE:    'ENRT',
  ON_SCENE:    'SCEN',
  TRANSPORTING:'TRNP',
  AT_HOSPITAL: 'HOSP',
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export default function HeroIncidentMap() {
  const [units, setUnits] = useState<ActiveWallLive[]>([]);
  const [selected, setSelected] = useState<ActiveWallLive | null>(null);
  const channelRef = useRef<ReturnType<typeof wtClient.channel> | null>(null);

  // Initial load
  useEffect(() => {
    fetchActiveWallsLive().then(setUnits);
  }, []);

  // Supabase Realtime subscription on active_walls (raw table — view changes reflect here)
  useEffect(() => {
    const channel = wtClient
      .channel('active_walls_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_walls' },
        () => {
          // Re-fetch the view on any change so we get the PostGIS-resolved lat/lng
          fetchActiveWallsLive().then(setUnits);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
    };
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="pn flex items-center justify-center" style={{ height: 320, background: '#0A0F1A' }}>
        <div className="text-center">
          <div className="mono text-[10px] text-amber-400 mb-1">MAP UNAVAILABLE</div>
          <div className="mono text-[9px] text-gray-600">Set VITE_MAPBOX_TOKEN in .env.local</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pn overflow-hidden" style={{ height: 320, position: 'relative' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid #1A2744', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, background: 'rgba(8,13,24,0.85)', backdropFilter: 'blur(4px)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#48BB78', animation: 'lp 1.5s infinite' }} />
          <span className="mono text-[9px] font-bold text-gray-400 tracking-widest">LIVE UNIT POSITIONS</span>
        </div>
        <div className="flex items-center gap-3">
          {Object.entries(STATUS_COLORS).map(([status, color]) => {
            const count = units.filter(u => u.current_status === status).length;
            if (!count) return null;
            return (
              <span key={status} className="mono text-[8px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                <span style={{ color }}>{STATUS_LABELS[status as ActiveWallLive['current_status']]}</span>
                <span className="text-gray-500">{count}</span>
              </span>
            );
          })}
          <span className="mono text-[9px] font-bold" style={{ color: '#48BB78' }}>{units.length} UNITS</span>
        </div>
      </div>

      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: -118.2437,
          latitude: 34.0522,
          zoom: 10,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        reuseMaps
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {units.map(unit => {
          if (!unit.lat || !unit.lng) return null;
          const color = STATUS_COLORS[unit.current_status];
          const isSelected = selected?.unit_id === unit.unit_id;
          return (
            <Marker
              key={unit.unit_id}
              longitude={unit.lng}
              latitude={unit.lat}
              anchor="center"
              onClick={(e: MarkerEvent<MouseEvent>) => { e.originalEvent.stopPropagation(); setSelected(isSelected ? null : unit); }}
            >
              <div
                title={`${unit.unit_id} — ${unit.current_status}${unit.destination ? ` → ${unit.destination}` : ''}`}
                style={{
                  width: isSelected ? 28 : 20,
                  height: isSelected ? 28 : 20,
                  borderRadius: '50%',
                  background: `${color}22`,
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 0 12px ${color}88` : `0 0 6px ${color}44`,
                }}
              >
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: isSelected ? '6px' : '5px',
                  fontWeight: 700,
                  color,
                  lineHeight: 1,
                  textAlign: 'center',
                }}>
                  {unit.unit_id.replace('RA', '')}
                </span>
              </div>
            </Marker>
          );
        })}

        {/* Selected unit tooltip */}
        {selected && (
          <Marker longitude={selected.lng} latitude={selected.lat} anchor="bottom" offset={[0, -16]}>
            <div className="pn" style={{
              background: '#0A0F1A',
              border: `1px solid ${STATUS_COLORS[selected.current_status]}40`,
              borderLeft: `3px solid ${STATUS_COLORS[selected.current_status]}`,
              padding: '6px 10px',
              borderRadius: 4,
              pointerEvents: 'none',
              minWidth: 140,
            }}>
              <div className="mono text-[11px] font-bold text-white">{selected.unit_id}</div>
              <div className="mono text-[9px]" style={{ color: STATUS_COLORS[selected.current_status] }}>{selected.current_status.replace('_', ' ')}</div>
              {selected.destination && <div className="mono text-[9px] text-gray-400">→ {selected.destination}</div>}
              {selected.friction_multiplier > 1 && (
                <div className="mono text-[8px]" style={{ color: '#ECC94B' }}>⚡ {selected.friction_multiplier.toFixed(1)}× friction</div>
              )}
              <div className="mono text-[8px] text-gray-600">{selected.is_simulated ? 'SIMULATED' : 'LIVE'}</div>
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}

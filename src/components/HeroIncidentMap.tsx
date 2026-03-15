import React, { useState } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Flame, Heart, Car, Biohazard, LifeBuoy, CircleAlert } from 'lucide-react';

export type IncidentType = 'FIRE' | 'EMS' | 'TC' | 'HAZMAT' | 'RESCUE' | 'OTHER';

export interface ActiveIncident {
  id: string;
  lat: number;
  lng: number;
  type: IncidentType;
  status: string;
  address?: string;
  units: string[];
}

const TYPE_CONFIG: Record<IncidentType, { Icon: typeof Flame; color: string; bg: string }> = {
  FIRE: { Icon: Flame, color: 'text-white', bg: 'bg-[#E8553C]' },
  EMS: { Icon: Heart, color: 'text-white', bg: 'bg-[#0099BF]' },
  TC: { Icon: Car, color: 'text-[#04070D]', bg: 'bg-[#F5A623]' },
  HAZMAT: { Icon: Biohazard, color: 'text-white', bg: 'bg-[#6366F1]' },
  RESCUE: { Icon: LifeBuoy, color: 'text-white', bg: 'bg-[#10B981]' },
  OTHER: { Icon: CircleAlert, color: 'text-white', bg: 'bg-[#64748B]' },
};

const DEFAULT_INCIDENTS: ActiveIncident[] = [
  { id: '1', lat: 34.0522, lng: -118.2437, type: 'EMS', status: 'OnScene', address: 'Downtown LA', units: ['RA92'] },
  { id: '2', lat: 34.0622, lng: -118.358, type: 'FIRE', status: 'EnRoute', units: ['E292'] },
];

interface HeroIncidentMapProps {
  activeIncidents?: ActiveIncident[];
  className?: string;
}

export default function HeroIncidentMap({ activeIncidents = DEFAULT_INCIDENTS, className = '' }: HeroIncidentMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -118.2437,
    latitude: 34.0522,
    zoom: 10,
  });

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!mapboxToken) {
    return (
      <div className={`flex items-center justify-center bg-[#0A0F1A] border border-[#1A2744] text-yellow-500 font-mono ${className}`}>
        MAP UNAVAILABLE - Set VITE_MAPBOX_TOKEN in .env.local
      </div>
    );
  }

  const incidents = activeIncidents.length > 0 ? activeIncidents : DEFAULT_INCIDENTS;

  return (
    <div className={`relative rounded-lg overflow-hidden border border-[#1A2744] w-full h-full ${className}`}>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
      >
        {incidents.map((inc) => {
          const cfg = TYPE_CONFIG[inc.type] ?? TYPE_CONFIG.OTHER;
          const Icon = cfg.Icon;
          return (
            <Marker key={inc.id} longitude={inc.lng} latitude={inc.lat} anchor="center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#04070D] shadow-lg ${cfg.bg} ${cfg.color} ring-1 ring-black/50 hover:scale-110 transition-transform cursor-pointer`}
                title={`${inc.type} ${inc.status} ${inc.address ?? inc.id}`}
              >
                <Icon size={14} strokeWidth={2.5} />
              </div>
            </Marker>
          );
        })}
      </Map>
      <div className="absolute top-4 left-4 bg-[#0A0F1A]/90 text-emerald-400 text-xs px-3 py-1.5 rounded border border-[#1A2744] font-mono flex items-center gap-2 shadow-lg backdrop-blur-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        LIVE PULSEPOINT FEED LINKED
      </div>
    </div>
  );
}

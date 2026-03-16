import React, { useMemo } from 'react';
import { ArrowLeft, Building2, AlertTriangle, Cpu } from 'lucide-react';
import type { HospitalDisplay } from '../lib/types';
import { TIER_COLOR, TIER_LABEL } from '../lib/types';
import type { SimUnit } from '../lib/simulationTypes';
import { colors, fonts } from '../lib/designTokens';
import Dot from './ui/Dot';
import Tag from './ui/Tag';
import Bar from './ui/Bar';
import KPI from './ui/KPI';
import AreaChart from './ui/AreaChart';

interface HospitalDetailProps {
  hospital: HospitalDisplay;
  simUnits: SimUnit[];
  simMinute: number;
  onBack: () => void;
}

function waitColor(w: number): string {
  if (w >= 30) return colors.red;
  if (w >= 20) return colors.amber;
  return colors.green;
}

/** Synthetic 24h hourly distribution (peaks mid-morning and evening) */
function hourlyData(seed: number): number[] {
  const base = [2,1,1,1,2,3,5,7,9,10,10,9,8,8,9,10,9,8,7,6,5,4,3,2];
  return base.map((v, i) => Math.max(0, v + ((seed + i) % 3) - 1));
}

const RA_UNITS = [
  'RA1','RA2','RA3','RA5','RA6','RA9','RA10','RA11','RA12','RA13',
  'RA14','RA15','RA18','RA19','RA25','RA26','RA33','RA35','RA37','RA38',
];

export default function HospitalDetail({
  hospital,
  simUnits,
  simMinute,
  onBack,
}: HospitalDetailProps) {
  const tierColor = TIER_COLOR[hospital.tier];
  const wc = waitColor(hospital.avgWait);

  /** Units currently at wall for this hospital (from simulation) */
  const unitsAtWall = useMemo(
    () => simUnits.filter((u) => u.state === 'AtWall' && u.hospitalId === hospital.id),
    [simUnits, hospital.id],
  );

  const seed = hospital.id.charCodeAt(0);
  const hourly = hourlyData(seed);
  const maxHourly = Math.max(...hourly);

  // Predicted next unit (pseudo AI)
  const nextUnit = RA_UNITS[seed % RA_UNITS.length];
  const predictedETA = 4 + (seed % 8);

  const abovCountyDiff = hospital.avgWait - hospital.countyAvg;

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        backgroundColor: colors.bg,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            padding: '6px 10px',
            color: colors.textSec,
            fontFamily: fonts.sans,
            fontSize: 11,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Dot color={tierColor} size={9} pulse={hospital.tier === 'BACKED_UP'} />
            <span style={{ fontFamily: fonts.sans, fontSize: 18, fontWeight: 700, color: colors.text }}>
              {hospital.name}
            </span>
            <Tag label={TIER_LABEL[hospital.tier]} color={tierColor} />
            {hospital.designations.map((d) => (
              <Tag key={d} label={d} color={colors.indigo} />
            ))}
          </div>
          <p style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textDim, marginTop: 4 }}>
            {hospital.abbreviation} · LAFD-{hospital.abbreviation}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <KPI label="Active" value={hospital.unitsAtWall} unit="units" />
        <KPI label="Today" value={hospital.completedToday} unit="transports" />
        <KPI label="24H Avg" value={`${hospital.avg24h}m`} color={wc} />
        <KPI label="Fastest" value={`${hospital.fastest}m`} color={colors.green} />
        <KPI label="Slowest" value={`${hospital.slowest}m`} color={colors.red} />
        <KPI label="Completed" value={hospital.completedToday} />
      </div>

      {/* Projected wait card */}
      <div
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <div>
              <p style={{ fontFamily: fonts.sans, fontSize: 10, color: colors.textDim, letterSpacing: '0.08em', marginBottom: 2 }}>
                PROJECTED WAIT
              </p>
              <span style={{ fontFamily: fonts.mono, fontSize: 36, fontWeight: 700, color: wc }}>
                {hospital.avgWait}
                <span style={{ fontSize: 16, fontWeight: 400, color: colors.textSec, marginLeft: 4 }}>min</span>
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.textDim }}>COUNTY AVG</p>
              <span style={{ fontFamily: fonts.mono, fontSize: 18, fontWeight: 600, color: colors.textSec }}>
                {hospital.countyAvg}m
              </span>
              <p
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 10,
                  color: abovCountyDiff > 0 ? colors.red : colors.green,
                  marginTop: 2,
                }}
              >
                {abovCountyDiff > 0 ? `▲ ${abovCountyDiff}m above` : `▼ ${Math.abs(abovCountyDiff)}m below`}
              </p>
            </div>
          </div>
        </div>
        {hospital.sparkline.length >= 2 && (
          <AreaChart data={hospital.sparkline} color={tierColor} height={72} />
        )}
        <div style={{ padding: '8px 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: fonts.sans, fontSize: 10, color: colors.textDim }}>
              ED SATURATION
            </span>
            <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textSec }}>
              {hospital.saturationPct}%
            </span>
          </div>
          <Bar pct={hospital.saturationPct} color={tierColor} height={6} />
        </div>
      </div>

      {/* Divert recommendation */}
      {hospital.tier === 'BACKED_UP' && (
        <div
          style={{
            backgroundColor: `${colors.amber}12`,
            border: `1px solid ${colors.amber}44`,
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            gap: 10,
          }}
        >
          <AlertTriangle size={16} color={colors.amber} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: fonts.sans, fontSize: 11, fontWeight: 700, color: colors.amber, marginBottom: 4 }}>
              DIVERT RECOMMENDATION
            </p>
            <p style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.textSec, lineHeight: 1.5 }}>
              Current wall times exceed threshold. Consider redirecting incoming units to alternate facilities
              with lower saturation.
            </p>
          </div>
        </div>
      )}

      {/* AI Predictive routing */}
      <div
        style={{
          backgroundColor: `${colors.indigo}10`,
          border: `1px solid ${colors.indigo}33`,
          borderRadius: 8,
          padding: '10px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Cpu size={13} color={colors.indigo} />
          <span style={{ fontFamily: fonts.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: colors.indigo }}>
            AI PREDICTIVE ROUTING
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.textDim, marginBottom: 2 }}>PREDICTED NEXT UNIT</p>
            <span style={{ fontFamily: fonts.mono, fontSize: 18, fontWeight: 700, color: colors.text }}>{nextUnit}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.textDim, marginBottom: 2 }}>ETA</p>
            <span style={{ fontFamily: fonts.mono, fontSize: 18, fontWeight: 700, color: colors.cyan }}>{predictedETA}m</span>
          </div>
        </div>
      </div>

      {/* 24H activity distribution */}
      <div
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: '12px 16px',
        }}
      >
        <p style={{ fontFamily: fonts.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: colors.textSec, marginBottom: 12 }}>
          24H ACTIVITY DISTRIBUTION
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
          {hourly.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div
                style={{
                  width: '100%',
                  height: maxHourly > 0 ? `${(v / maxHourly) * 100}%` : '0%',
                  backgroundColor: i === new Date().getHours() ? colors.cyan : `${colors.cyan}44`,
                  borderRadius: '2px 2px 0 0',
                  minHeight: v > 0 ? 2 : 0,
                  transition: 'height 0.3s',
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontFamily: fonts.mono, fontSize: 8, color: colors.textDim }}>00:00</span>
          <span style={{ fontFamily: fonts.mono, fontSize: 8, color: colors.textDim }}>12:00</span>
          <span style={{ fontFamily: fonts.mono, fontSize: 8, color: colors.textDim }}>23:00</span>
        </div>
      </div>

      {/* Units at wall table */}
      <div
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ fontFamily: fonts.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: colors.textSec }}>
            UNITS AT WALL
          </span>
        </div>
        {unitsAtWall.length === 0 ? (
          <div style={{ padding: '16px', fontFamily: fonts.sans, fontSize: 11, color: colors.textDim, textAlign: 'center' }}>
            No units currently at wall
          </div>
        ) : (
          unitsAtWall.map((unit) => {
            const duration = simMinute - unit.stateEnteredAt;
            const dc = duration >= 30 ? colors.red : duration >= 20 ? colors.amber : colors.green;
            return (
              <div
                key={unit.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 16px',
                  borderBottom: `1px solid ${colors.border}55`,
                }}
              >
                <span style={{ fontFamily: fonts.mono, fontSize: 12, fontWeight: 700, color: colors.text, minWidth: 80 }}>
                  {unit.id}
                </span>
                <Tag label="AT WALL" color={colors.amber} />
                <div style={{ flex: 1 }}>
                  <Bar pct={Math.min(100, (duration / 60) * 100)} color={dc} height={4} />
                </div>
                <span style={{ fontFamily: fonts.mono, fontSize: 13, fontWeight: 700, color: dc, minWidth: 36, textAlign: 'right' }}>
                  {duration}m
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Facility info */}
      <div
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Building2 size={13} color={colors.textDim} />
          <span style={{ fontFamily: fonts.sans, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: colors.textSec }}>
            FACILITY
          </span>
        </div>
        <p style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.text, marginBottom: 8 }}>
          {hospital.name}
        </p>
        <p style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textDim, marginBottom: 10 }}>
          {hospital.lat.toFixed(4)}, {hospital.lng.toFixed(4)}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {hospital.designations.map((d) => (
            <Tag key={d} label={d} color={colors.indigo} />
          ))}
          {hospital.designations.length === 0 && (
            <span style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.textDim }}>No designations on record</span>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useEffect, useCallback } from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { SimAlert } from '../lib/simulationTypes';
import { colors, fonts } from '../lib/designTokens';

interface AlertTickerProps {
  alerts: SimAlert[];
  className?: string;
}

const SEVERITY_ICON = {
  info:     Info,
  warning:  AlertTriangle,
  critical: AlertCircle,
};
const SEVERITY_COLOR = {
  info:     colors.cyan,
  warning:  colors.amber,
  critical: colors.red,
};

const SPEED_PX_PER_FRAME = 0.6; // ~36px/s at 60fps

export default function AlertTicker({ alerts, className = '' }: AlertTickerProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const display = alerts.slice(-16);

  const animate = useCallback(() => {
    const el = innerRef.current;
    if (!el) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }
    const halfWidth = el.scrollWidth / 2;
    if (halfWidth > 0) {
      offsetRef.current += SPEED_PX_PER_FRAME;
      if (offsetRef.current >= halfWidth) {
        offsetRef.current = 0;
      }
      el.style.transform = `translateX(-${offsetRef.current.toFixed(1)}px)`;
    }
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  if (display.length === 0) {
    return (
      <div
        className={className}
        style={{
          height: 34,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8,
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: `${colors.void}CC`,
          fontFamily: fonts.sans,
          fontSize: 11,
          color: colors.textDim,
        }}
      >
        <Info size={11} color={colors.textDim} />
        No active alerts
      </div>
    );
  }

  const items = [...display, ...display];

  return (
    <div
      className={className}
      style={{
        height: 34,
        overflow: 'hidden',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: `${colors.void}CC`,
        position: 'relative',
      }}
    >
      {/* Left fade */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 40,
          height: '100%',
          background: `linear-gradient(to right, ${colors.void}, transparent)`,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      {/* Right fade */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 40,
          height: '100%',
          background: `linear-gradient(to left, ${colors.void}, transparent)`,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <div
        ref={innerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          height: '100%',
          padding: '0 16px',
          willChange: 'transform',
          whiteSpace: 'nowrap',
        }}
      >
        {items.map((a, i) => {
          const Icon = SEVERITY_ICON[a.severity];
          const col = SEVERITY_COLOR[a.severity];
          return (
            <span
              key={`${a.id}-${i}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              <Icon size={11} color={col} />
              <span style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.textSec }}>
                {a.message}
              </span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 9,
                  color: colors.textDim,
                  letterSpacing: '0.04em',
                }}
              >
                {new Date(a.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span style={{ color: colors.border, fontFamily: fonts.mono }}>·</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

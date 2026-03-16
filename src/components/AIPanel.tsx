import React from 'react';
import { Brain, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { SimAlert } from '../lib/simulationTypes';
import { colors, fonts } from '../lib/designTokens';

interface AIPanelProps {
  alerts: SimAlert[];
}

const SEVERITY_ICON = {
  info:     Info,
  warning:  AlertTriangle,
  critical: AlertCircle,
};

const SEVERITY_BORDER: Record<string, string> = {
  info:     colors.cyan,
  warning:  colors.amber,
  critical: colors.red,
};

const SEVERITY_LABEL: Record<string, string> = {
  info:     'INFO',
  warning:  'ADVISORY',
  critical: 'CRITICAL',
};

export default function AIPanel({ alerts }: AIPanelProps) {
  const display = [...alerts].reverse().slice(0, 8);

  return (
    <div
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        <Brain size={13} color={colors.indigo} />
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: colors.textSec,
            textTransform: 'uppercase',
          }}
        >
          AI Predictive Intelligence
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            color: colors.indigo,
            letterSpacing: '0.06em',
          }}
        >
          {display.length} ALERTS
        </span>
      </div>

      {/* Alerts */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {display.length === 0 ? (
          <div
            style={{
              padding: '20px 14px',
              fontFamily: fonts.sans,
              fontSize: 11,
              color: colors.textDim,
              textAlign: 'center',
            }}
          >
            No active predictions
          </div>
        ) : (
          display.map((a) => {
            const Icon = SEVERITY_ICON[a.severity];
            const borderColor = SEVERITY_BORDER[a.severity];
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '8px 14px',
                  borderLeft: `3px solid ${borderColor}`,
                  marginLeft: 0,
                  marginBottom: 1,
                  backgroundColor: `${borderColor}08`,
                }}
              >
                <Icon size={12} color={borderColor} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: borderColor,
                      }}
                    >
                      {SEVERITY_LABEL[a.severity]}
                    </span>
                    <span
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: 9,
                        color: colors.textDim,
                      }}
                    >
                      {new Date(a.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 11,
                      color: colors.textSec,
                      lineHeight: 1.45,
                      margin: 0,
                    }}
                  >
                    {a.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

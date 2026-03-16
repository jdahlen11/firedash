import React, { useMemo, useId } from 'react';

interface SparkProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showDot?: boolean;
  className?: string;
}

/** Catmull-Rom spline → cubic Bézier with tension=0.35 */
function smoothPath(points: [number, number][], tension = 0.35): string {
  if (points.length < 2) return '';
  const n = points.length;
  const t = tension / 3;
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) * t;
    const cp1y = p1[1] + (p2[1] - p0[1]) * t;
    const cp2x = p2[0] - (p3[0] - p1[0]) * t;
    const cp2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

export default function Spark({
  data,
  color = '#00C2E0',
  width = 120,
  height = 32,
  showDot = true,
  className = '',
}: SparkProps) {
  const gradId = useId();

  const { linePath, areaPath, pts } = useMemo(() => {
    if (data.length < 2) return { linePath: '', areaPath: '', pts: [] };
    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts: [number, number][] = data.map((v, i) => [
      pad + (i / (data.length - 1)) * w,
      pad + h - ((v - min) / range) * h,
    ]);
    const line = smoothPath(pts);
    const last = pts[pts.length - 1];
    const first = pts[0];
    const area = `${line} L ${last[0]},${pad + h} L ${first[0]},${pad + h} Z`;
    return { linePath: line, areaPath: area, pts };
  }, [data, width, height]);

  if (data.length < 2) {
    return <svg width={width} height={height} className={className} />;
  }

  const lastPt = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {showDot && lastPt && (
        <circle cx={lastPt[0]} cy={lastPt[1]} r={2.5} fill={color} />
      )}
    </svg>
  );
}

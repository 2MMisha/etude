import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, VIDEO} from '../brand/tokens';

const {width: W, height: H} = VIDEO;
const HORIZON = 1180; // where the mirror wall meets the parquet
const VANISH = {x: W / 2, y: 380};

// Warm bokeh: [x, y, radius, opacity, drift phase]
const BOKEH: [number, number, number, number, number][] = [
  [140, 420, 70, 0.16, 0.0],
  [930, 360, 54, 0.13, 1.3],
  [860, 760, 90, 0.1, 2.1],
  [200, 900, 44, 0.14, 0.7],
  [610, 240, 36, 0.1, 2.8],
  [990, 1060, 60, 0.09, 1.9],
  [70, 1180, 80, 0.08, 3.4],
  [400, 700, 28, 0.12, 4.2],
  [760, 520, 22, 0.14, 5.0],
];

/**
 * Dance-hall backdrop shared by every story of the series:
 * navy gradient, barely-visible mirror panels and barre, parquet in perspective,
 * soft blue glow and warm drifting bokeh. Pure decoration, no text.
 */
export const StudioBackground: React.FC<{fadeInFrames?: number}> = ({fadeInFrames = 24}) => {
  const frame = useCurrentFrame();
  const opacity = fadeInFrames > 0 ? interpolate(frame, [0, fadeInFrames], [0, 1], {extrapolateRight: 'clamp'}) : 1;

  // Parquet: plank seams converge to the vanishing point, cross seams get denser towards the horizon.
  const seams = [];
  for (let i = -14; i <= 14; i++) {
    const xBottom = W / 2 + i * 120;
    seams.push(
      <line key={`s${i}`} x1={xBottom} y1={H} x2={VANISH.x + (xBottom - VANISH.x) * 0.0} y2={VANISH.y} />,
    );
  }
  const rows = [];
  for (let k = 1; k <= 12; k++) {
    const t = Math.pow(k / 12, 1.8);
    rows.push(<line key={`r${k}`} x1={0} x2={W} y1={HORIZON + (H - HORIZON) * t} y2={HORIZON + (H - HORIZON) * t} />);
  }

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.deepNavy}}>
      <AbsoluteFill style={{opacity}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id="bg-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#111A3D" />
              <stop offset="0.45" stopColor={COLORS.midnightNavy} />
              <stop offset="1" stopColor={COLORS.navy800} />
            </linearGradient>
            <linearGradient id="bg-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1B2756" />
              <stop offset="1" stopColor="#101838" />
            </linearGradient>
            <linearGradient id="bg-mirror" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.045" />
              <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.015" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.035" />
            </linearGradient>
            <radialGradient id="bg-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={COLORS.softBlue} stopOpacity="0.45" />
              <stop offset="1" stopColor={COLORS.softBlue} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bg-vignette" cx="0.5" cy="0.45" r="0.75">
              <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
            </radialGradient>
            <clipPath id="bg-floor-clip">
              <rect x={0} y={HORIZON} width={W} height={H - HORIZON} />
            </clipPath>
            <filter id="bg-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
          </defs>

          {/* Wall */}
          <rect width={W} height={HORIZON} fill="url(#bg-wall)" />
          {/* Mirror panels with thin frames and diagonal glints */}
          {[0, 1, 2, 3].map((i) => {
            const pw = 236;
            const x = 22 + i * (pw + 26);
            return (
              <g key={i}>
                <rect x={x} y={120} width={pw} height={HORIZON - 150} fill="url(#bg-mirror)" stroke="#FFFFFF" strokeOpacity={0.05} strokeWidth={2} />
                <polygon
                  points={`${x + 40},${120} ${x + 90},${120} ${x + pw - 20},${HORIZON - 420} ${x + pw - 20},${HORIZON - 330}`}
                  fill="#FFFFFF"
                  opacity={0.022}
                />
              </g>
            );
          })}
          {/* Ballet barre */}
          <g opacity={0.16}>
            <rect x={0} y={952} width={W} height={10} rx={5} fill={COLORS.mist} />
            {[150, 540, 930].map((x) => (
              <rect key={x} x={x - 5} y={958} width={10} height={44} rx={3} fill={COLORS.mist} />
            ))}
          </g>
          {/* Skirting */}
          <rect x={0} y={HORIZON - 14} width={W} height={14} fill="#0E1636" opacity={0.8} />

          {/* Parquet */}
          <rect x={0} y={HORIZON} width={W} height={H - HORIZON} fill="url(#bg-floor)" />
          <g clipPath="url(#bg-floor-clip)" stroke="#FFFFFF" strokeOpacity={0.05} strokeWidth={2}>
            {seams}
            {rows}
          </g>
          {/* Floor reflection of the light */}
          <ellipse cx={W / 2} cy={HORIZON + 260} rx={460} ry={120} fill={COLORS.softBlue} opacity={0.08} filter="url(#bg-blur)" />

          {/* Soft blue glow behind the centre stage */}
          <ellipse cx={W / 2} cy={1180} rx={620} ry={560} fill="url(#bg-glow)" opacity={0.55} />

          {/* Warm bokeh, slowly breathing and drifting */}
          <g filter="url(#bg-blur)">
            {BOKEH.map(([x, y, r, o, p], i) => {
              const drift = Math.sin(frame / 45 + p) * 10;
              const breathe = 0.75 + 0.25 * Math.sin(frame / 30 + p * 2);
              return <circle key={i} cx={x + drift} cy={y - drift * 0.6} r={r} fill={COLORS.warmBokeh} opacity={o * breathe} />;
            })}
          </g>

          <rect width={W} height={H} fill="url(#bg-vignette)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

import React from 'react';
import {Easing, interpolate} from 'remotion';
import {COLORS} from '../brand/tokens';

type Kind = 'star' | 'note' | 'dot';
type Particle = {kind: Kind; angle: number; dist: number; size: number; spin: number; delay: number; color: string};

// Upward fan out of the slot. Angles in degrees, -90 = straight up.
const PARTICLES: Particle[] = [
  {kind: 'note', angle: -118, dist: 250, size: 46, spin: -25, delay: 0, color: COLORS.mist},
  {kind: 'star', angle: -62, dist: 230, size: 34, spin: 90, delay: 1, color: COLORS.warmBokeh},
  {kind: 'dot', angle: -96, dist: 300, size: 12, spin: 0, delay: 2, color: COLORS.mist},
  {kind: 'star', angle: -140, dist: 190, size: 26, spin: -80, delay: 3, color: COLORS.mist},
  {kind: 'note', angle: -42, dist: 210, size: 40, spin: 20, delay: 2, color: COLORS.warmBokeh},
  {kind: 'star', angle: -80, dist: 180, size: 22, spin: 120, delay: 4, color: COLORS.mist},
  {kind: 'dot', angle: -28, dist: 150, size: 10, spin: 0, delay: 5, color: COLORS.warmBokeh},
];

const Star: React.FC<{s: number; color: string}> = ({s, color}) => (
  <path
    d={`M 0 ${-s} C ${s * 0.12} ${-s * 0.12} ${s * 0.12} ${-s * 0.12} ${s} 0 C ${s * 0.12} ${s * 0.12} ${s * 0.12} ${s * 0.12} 0 ${s} C ${-s * 0.12} ${s * 0.12} ${-s * 0.12} ${s * 0.12} ${-s} 0 C ${-s * 0.12} ${-s * 0.12} ${-s * 0.12} ${-s * 0.12} 0 ${-s} Z`}
    fill={color}
  />
);

// Eighth note drawn as a vector (no font glyph), centred roughly on the origin.
const Note: React.FC<{s: number; color: string}> = ({s, color}) => {
  const k = s / 40;
  return (
    <g transform={`scale(${k}) translate(-8 -6)`} fill={color}>
      <ellipse cx={0} cy={22} rx={11} ry={8} transform="rotate(-22 0 22)" />
      <rect x={8} y={-26} width={4.5} height={48} rx={2} />
      <path d="M 12 -26 C 22 -18 30 -12 26 4 C 25 -6 20 -10 12 -12 Z" />
    </g>
  );
};

/** Burst of small sparkles and notes from a point. `frame` is relative to the burst start. */
export const Sparkles: React.FC<{frame: number; x: number; y: number; duration?: number}> = ({frame, x, y, duration = 32}) => {
  if (frame < 0 || frame > duration + 8) return null;
  return (
    <g>
      {PARTICLES.map((p, i) => {
        const t = interpolate(frame - p.delay, [0, duration], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        if (t <= 0) return null;
        const travel = Easing.out(Easing.cubic)(t);
        const rad = (p.angle * Math.PI) / 180;
        const px = x + Math.cos(rad) * p.dist * travel;
        const py = y + Math.sin(rad) * p.dist * travel + 40 * t * t; // a touch of gravity at the end
        const pop = interpolate(t, [0, 0.18, 1], [0.2, 1.15, 0.7]);
        const opacity = interpolate(t, [0, 0.1, 0.65, 1], [0, 1, 0.9, 0]);
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${p.spin * t}) scale(${pop})`} opacity={opacity}>
            {p.kind === 'star' && <Star s={p.size / 2} color={p.color} />}
            {p.kind === 'note' && <Note s={p.size} color={p.color} />}
            {p.kind === 'dot' && <circle r={p.size / 2} fill={p.color} />}
          </g>
        );
      })}
    </g>
  );
};

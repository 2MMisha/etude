import React from 'react';
import {COLORS} from '../brand/tokens';

/*
 * Ballroom / Latin dance shoes in side view (ETUDE teaches ballroom & Latin, not ballet).
 * Origin of each shoe = centre of its ground contact, toe pointing LEFT. Mirror with `facing="right"`.
 */

type ShoeProps = {facing?: 'left' | 'right'};

const flip = (facing: 'left' | 'right') => (facing === 'right' ? 'scale(-1 1)' : '');

/** Lady's Latin sandal: satin silver, flared heel, T-bar and ankle strap. ~240×175 px. */
export const LadyShoe: React.FC<ShoeProps> = ({facing = 'left'}) => (
  <g transform={flip(facing)}>
    <defs>
      <linearGradient id="lady-satin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F4F6FB" />
        <stop offset="1" stopColor="#B9C2D8" />
      </linearGradient>
      <linearGradient id="lady-heel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#E3E8F3" />
        <stop offset="1" stopColor="#A9B3CC" />
      </linearGradient>
    </defs>
    <g transform="translate(-120 -170)">
      {/* Flared Latin heel */}
      <path d="M 192 106 L 226 96 C 220 122 216 146 222 168 L 206 168 C 206 146 201 124 192 106 Z" fill="url(#lady-heel)" />
      <rect x={204} y={165} width={20} height={6} rx={2} fill="#2A3150" />
      {/* Sole + foot bed */}
      <path d="M 6 156 C 8 148 26 146 56 152 C 96 160 150 128 190 100 L 228 92 C 232 96 230 100 226 102 L 194 112 C 150 140 104 172 58 170 C 30 169 6 166 6 156 Z" fill="#2A3150" />
      <path d="M 12 152 C 30 146 58 150 76 154 C 112 150 152 124 192 98 L 226 90 L 228 95 L 194 106 C 152 132 112 158 76 160 C 50 158 28 156 12 156 Z" fill="#E9CFA9" />
      {/* Toe strap (wide satin band) */}
      <path d="M 10 152 C 10 126 44 112 82 118 C 98 121 106 134 102 152 C 84 160 56 158 40 156 C 26 155 14 156 10 152 Z" fill="url(#lady-satin)" />
      <path d="M 26 128 C 46 120 70 120 90 128" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      {/* T-bar rising to the ankle strap */}
      <path d="M 92 124 C 118 96 146 70 174 50" fill="none" stroke="url(#lady-satin)" strokeWidth={11} strokeLinecap="round" />
      {/* Heel counter */}
      <path d="M 168 112 C 168 86 186 70 214 68 L 230 72 C 234 82 232 92 226 96 L 192 108 Z" fill="url(#lady-satin)" />
      {/* Ankle strap with a tiny buckle */}
      <ellipse cx={196} cy={50} rx={30} ry={10} fill="none" stroke="url(#lady-satin)" strokeWidth={8} />
      <rect x={160} y={44} width={10} height={12} rx={2} fill="#E9CFA9" />
    </g>
  </g>
);

/** Gentleman's standard (ballroom) shoe: black patent leather with a soft blue rim light. ~255×90 px. */
export const GentShoe: React.FC<ShoeProps> = ({facing = 'left'}) => (
  <g transform={flip(facing)}>
    <defs>
      <linearGradient id="gent-patent" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#343B5E" />
        <stop offset="0.45" stopColor="#141831" />
        <stop offset="1" stopColor="#070915" />
      </linearGradient>
    </defs>
    <g transform="translate(-128 -120)">
      {/* Sole and heel block */}
      <path d="M 4 104 L 252 104 L 252 120 L 206 120 L 204 112 L 70 112 C 40 112 10 112 4 104 Z" fill="#05060D" />
      {/* Upper */}
      <path
        d="M 6 104 C 2 84 22 66 64 60 C 104 55 134 44 164 36 L 226 32 C 244 32 254 46 254 66 L 254 104 Z"
        fill="url(#gent-patent)"
        stroke={COLORS.softBlue}
        strokeOpacity={0.55}
        strokeWidth={2.5}
      />
      {/* Collar opening */}
      <path d="M 160 38 C 186 46 214 44 236 34" fill="none" stroke="#05060D" strokeWidth={6} strokeLinecap="round" />
      {/* Laces */}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M ${128 + i * 12} ${50 - i * 4} l 10 8`} stroke="#4A5580" strokeWidth={3} strokeLinecap="round" />
      ))}
      {/* Patent highlights */}
      <path d="M 22 82 C 36 70 62 64 92 62" fill="none" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" opacity={0.55} />
      <path d="M 196 44 C 214 42 232 42 244 52" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.3} />
    </g>
  </g>
);

/** Soft glowing footprint on the parquet, squashed for perspective. */
export const Footprint: React.FC<{x: number; y: number; scale?: number; opacity: number; lady?: boolean; facing?: 'left' | 'right'}> = ({
  x,
  y,
  scale = 1,
  opacity,
  lady = false,
  facing = 'left',
}) => {
  if (opacity <= 0.01) return null;
  const dir = facing === 'left' ? 1 : -1;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * dir} ${scale * 0.32})`} opacity={opacity}>
      <ellipse cx={-34} cy={0} rx={lady ? 30 : 42} ry={lady ? 22 : 26} fill={COLORS.softBlue} />
      {lady ? <circle cx={46} cy={0} r={10} fill={COLORS.softBlue} /> : <rect x={30} y={-20} width={34} height={40} rx={10} fill={COLORS.softBlue} />}
    </g>
  );
};

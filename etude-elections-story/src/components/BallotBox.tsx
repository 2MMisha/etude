import React from 'react';
import {staticFile} from 'remotion';
import {COLORS} from '../brand/tokens';

const LOGO_RATIO = 600.75 / 1432.5;

export const BALLOT_BOX = {
  cx: 540,
  lidTop: 1060,
  frontTop: 1130,
  bottom: 1540,
  frontWidth: 480,
  lidTopWidth: 400,
  slotY: 1095,
  slotWidth: 290,
} as const;

export type BallotBoxProps = {
  /** 0..1 entrance opacity */
  opacity?: number;
  /** uniform scale around the bottom centre */
  scale?: number;
  /** squash & stretch: >1 flattens, <1 stretches (applied around the bottom centre) */
  squash?: number;
  /** vertical hop in px (negative = up) */
  hop?: number;
};

/**
 * Flat-vector ballot box in ETUDE Blue with the white ETUDE logo on the front.
 * Drawn in scene coordinates (1080×1920), meant to live inside a full-frame <svg>.
 */
export const BallotBox: React.FC<BallotBoxProps> = ({opacity = 1, scale = 1, squash = 1, hop = 0}) => {
  const {cx, lidTop, frontTop, bottom, frontWidth, lidTopWidth, slotY, slotWidth} = BALLOT_BOX;
  const fl = cx - frontWidth / 2;
  const fr = cx + frontWidth / 2;
  // squash > 1 flattens and widens, < 1 stretches and narrows (volume roughly constant)
  const sx = scale * Math.sqrt(squash);
  const sy = scale / squash;
  const logoW = 300;
  const logoH = logoW * LOGO_RATIO;
  // The shadow reacts to the hop: smaller and lighter while the box is in the air.
  const shadowK = 1 + hop / 120;

  return (
    <g opacity={opacity}>
      <defs>
        <linearGradient id="bb-front" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3654A8" />
          <stop offset="0.55" stopColor={COLORS.etudeBlue} />
          <stop offset="1" stopColor="#2A4390" />
        </linearGradient>
        <linearGradient id="bb-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4A67B9" />
          <stop offset="1" stopColor="#3B58AA" />
        </linearGradient>
        <filter id="bb-shadow" x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id="bb-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#050A1E" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Contact shadow on the parquet */}
      <ellipse cx={cx} cy={bottom + 8} rx={300 * shadowK} ry={30 * shadowK} fill="#040817" opacity={0.55 * shadowK} filter="url(#bb-shadow)" />

      <g transform={`translate(${cx} ${bottom + hop}) scale(${sx} ${sy}) translate(${-cx} ${-bottom})`} filter="url(#bb-soft)">
        {/* Lid (top face in soft perspective) */}
        <path
          d={`M ${cx - lidTopWidth / 2 + 14} ${lidTop} L ${cx + lidTopWidth / 2 - 14} ${lidTop} Q ${cx + lidTopWidth / 2} ${lidTop} ${cx + lidTopWidth / 2 + 6} ${lidTop + 8}
              L ${fr} ${frontTop} L ${fl} ${frontTop} L ${cx - lidTopWidth / 2 - 6} ${lidTop + 8} Q ${cx - lidTopWidth / 2} ${lidTop} ${cx - lidTopWidth / 2 + 14} ${lidTop} Z`}
          fill="url(#bb-lid)"
        />
        {/* Slot */}
        <rect x={cx - slotWidth / 2} y={slotY - 9} width={slotWidth} height={18} rx={9} fill={COLORS.deepNavy} />
        <rect x={cx - slotWidth / 2 + 6} y={slotY + 3} width={slotWidth - 12} height={5} rx={2.5} fill="#FFFFFF" opacity={0.12} />

        {/* Front face */}
        <rect x={fl} y={frontTop} width={frontWidth} height={bottom - frontTop} rx={18} fill="url(#bb-front)" />
        {/* Top edge highlight and a soft side sheen */}
        <rect x={fl + 10} y={frontTop} width={frontWidth - 20} height={6} rx={3} fill="#FFFFFF" opacity={0.18} />
        <rect x={fl + 22} y={frontTop + 26} width={14} height={bottom - frontTop - 52} rx={7} fill="#FFFFFF" opacity={0.07} />
        {/* Thin inset panel */}
        <rect x={fl + 36} y={frontTop + 36} width={frontWidth - 72} height={bottom - frontTop - 72} rx={10} fill="none" stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={2} />

        {/* ETUDE logo, white, untouched */}
        <image href={staticFile('brand/logo-white.svg')} x={cx - logoW / 2} y={(frontTop + bottom) / 2 - logoH / 2} width={logoW} height={logoH} />
      </g>
    </g>
  );
};

import React from 'react';
import {COLORS} from '../brand/tokens';

export const ENVELOPE = {width: 240, height: 152} as const;

/** Plain light-blue envelope, deliberately empty: no marks, letters or text. Origin = top-left corner. */
export const Envelope: React.FC = () => {
  const {width: w, height: h} = ENVELOPE;
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} rx={10} fill={COLORS.envelope} />
      {/* Bottom & side folds */}
      <path d={`M 4 ${h - 4} L ${w / 2} ${h * 0.5} L ${w - 4} ${h - 4}`} fill="none" stroke={COLORS.envelopeShade} strokeWidth={3} strokeLinejoin="round" />
      {/* Top flap */}
      <path d={`M 2 4 L ${w / 2} ${h * 0.58} L ${w - 2} 4 Z`} fill="#B9CCF1" stroke={COLORS.envelopeShade} strokeWidth={3} strokeLinejoin="round" />
      <rect x={0} y={0} width={w} height={h} rx={10} fill="none" stroke={COLORS.envelopeShade} strokeWidth={2} opacity={0.6} />
    </g>
  );
};

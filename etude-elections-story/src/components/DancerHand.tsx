import React from 'react';
import {COLORS} from '../brand/tokens';

export type DancerHandProps = {
  /** wrist position in scene coordinates */
  x: number;
  y: number;
  /** whole arm angle, degrees (0 = sleeve straight up, + = sleeve leans to the right) */
  armAngle?: number;
  /** wrist bend relative to the arm, degrees */
  wristBend?: number;
  /** 0 = pinching, 1 = fingers released/open */
  release?: number;
  /** extra finger "breathing" in degrees, for a soft balletic hand */
  flutter?: number;
  /** content held between the fingers (drawn under the fingers), in wrist-local coordinates */
  children?: React.ReactNode;
};

type Finger = {bx: number; len: number; w: number; angle: number; spread: number};

// Ballet hand pointing down: elongated fingers, middle finger the longest, pinky gently fanned out.
const FINGERS: Finger[] = [
  {bx: -17, len: 60, w: 13, angle: 9, spread: 12}, // index (pinches with the thumb)
  {bx: -5, len: 70, w: 13.5, angle: 3, spread: 4},
  {bx: 7, len: 64, w: 12.5, angle: -5, spread: -5},
  {bx: 18, len: 50, w: 11, angle: -16, spread: -11}, // pinky
];

/** Tapered finger with a rounded tip, base centred on the origin, pointing down. */
const fingerPath = (len: number, wb: number) => {
  const wt = wb * 0.78;
  return `M ${-wb / 2} 0 L ${-wt / 2} ${len - wt / 2} A ${wt / 2} ${wt / 2} 0 0 0 ${wt / 2} ${len - wt / 2} L ${wb / 2} 0 Z`;
};

export const HAND_SCALE = 1.3;

/**
 * Simplified flat-vector arm in a dark dress sleeve. Origin = wrist.
 * Everything inside `children` moves rigidly with the hand (it is not scaled with the drawing).
 */
export const DancerHand: React.FC<DancerHandProps> = ({x, y, armAngle = 0, wristBend = 0, release = 0, flutter = 0, children}) => {
  const knuckleY = 72;
  return (
    <g transform={`translate(${x} ${y}) rotate(${armAngle})`}>
      <defs>
        <linearGradient id="hand-sleeve" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#060A1C" />
          <stop offset="0.32" stopColor="#1C2853" />
          <stop offset="0.55" stopColor={COLORS.dress} />
          <stop offset="1" stopColor="#04070F" />
        </linearGradient>
        <linearGradient id="hand-skin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F0C4A4" />
          <stop offset="1" stopColor={COLORS.skinShade} />
        </linearGradient>
        <filter id="hand-shadow" x="-60%" y="-10%" width="220%" height="130%">
          <feDropShadow dx="10" dy="16" stdDeviation="14" floodColor="#040817" floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter="url(#hand-shadow)">
        <g transform={`rotate(${wristBend})`}>
          {/* Held object sits behind the fingers */}
          {children}

          <g transform={`scale(${HAND_SCALE})`}>
            {/* Thumb, tucked behind the palm edge (seen from the back of the hand) */}
            <g transform={`translate(-19 22) rotate(${16 + release * 14})`}>
              <path d={fingerPath(54, 15)} fill={COLORS.skinShade} />
            </g>
            {/* Palm */}
            <path d={`M -20 0 C -27 24 -29 50 -24 ${knuckleY + 2} Q 0 ${knuckleY + 12} 25 ${knuckleY - 2} C 29 48 27 22 20 0 Z`} fill="url(#hand-skin)" />
            {/* Fingers */}
            {FINGERS.map((f, i) => {
              const a = f.angle + release * f.spread + flutter * (i - 1.5) * 0.6;
              return (
                <path
                  key={i}
                  transform={`translate(${f.bx} ${knuckleY - 8}) rotate(${a})`}
                  d={fingerPath(f.len, f.w)}
                  fill={i % 2 === 0 ? COLORS.skin : '#E3B08E'}
                />
              );
            })}
            {/* Knuckle hint */}
            <path d={`M -18 ${knuckleY - 4} Q 0 ${knuckleY + 3} 22 ${knuckleY - 6}`} fill="none" stroke={COLORS.skinShade} strokeWidth={1.6} opacity={0.6} />
          </g>
        </g>

        {/* Sleeve: fitted at the wrist, widening up the forearm, runs far beyond the frame */}
        <path d="M -36 16 Q 0 28 36 16 L 54 -320 L 110 -1600 L -110 -1600 L -54 -320 Z" fill="url(#hand-sleeve)" />
        <path d="M -8 -40 Q -14 -200 -22 -380" fill="none" stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={6} strokeLinecap="round" />
        <path d="M -36 16 Q 0 28 36 16" fill="none" stroke={COLORS.navy700} strokeWidth={4} strokeLinecap="round" />
      </g>
    </g>
  );
};

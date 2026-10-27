import React from 'react';
import {COLORS} from '../brand/tokens';
import {GentShoe, LadyShoe} from './BallroomShoes';

export type ShoePose = {
  x: number;
  y: number; // ground line
  scale: number;
  /** -1..1: +1 toe left, -1 toe right; values in between = the shoe is turning */
  facing: number;
  tilt: number;
  /** height above the floor in px, for the contact shadow */
  lift: number;
};

const Shoe: React.FC<{pose: ShoePose; lady: boolean}> = ({pose, lady}) => {
  const sx = Math.abs(pose.facing) < 0.06 ? 0.06 * Math.sign(pose.facing || 1) : pose.facing;
  return (
    <g>
      {/* contact shadow on the parquet */}
      <ellipse
        cx={pose.x}
        cy={pose.y + pose.lift + 4}
        rx={110 * pose.scale * (1 - Math.min(pose.lift, 80) / 200)}
        ry={14 * pose.scale}
        fill="#040817"
        opacity={0.45 * (1 - Math.min(pose.lift, 80) / 120)}
      />
      <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.tilt}) scale(${pose.scale * sx} ${pose.scale})`}>{lady ? <LadyShoe /> : <GentShoe />}</g>
    </g>
  );
};

/** The couple (his standard shoe + her Latin sandal), drawn back-to-front by depth. Poses are in scene coordinates. */
export const DancingPair: React.FC<{gent: ShoePose; lady: ShoePose}> = ({gent, lady}) => {
  const items = [
    {pose: gent, lady: false},
    {pose: lady, lady: true},
  ].sort((a, b) => a.pose.y + a.pose.lift - (b.pose.y + b.pose.lift));
  return (
    <g>
      {items.map((it) => (
        <Shoe key={it.lady ? 'lady' : 'gent'} pose={it.pose} lady={it.lady} />
      ))}
    </g>
  );
};

/** Warm pool of light on the parquet. */
export const FloorSpotlight: React.FC<{x: number; y: number; opacity: number; rx?: number; ry?: number}> = ({x, y, opacity, rx = 380, ry = 120}) => (
  <g opacity={opacity}>
    <defs>
      <radialGradient id="spot-pool" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={COLORS.warmBokeh} stopOpacity="0.32" />
        <stop offset="0.6" stopColor={COLORS.mist} stopOpacity="0.1" />
        <stop offset="1" stopColor={COLORS.mist} stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="url(#spot-pool)" />
  </g>
);

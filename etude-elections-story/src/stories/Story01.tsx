import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {VIDEO} from '../brand/tokens';
import {BALLOT_BOX, BallotBox} from '../components/BallotBox';
import {DancerHand} from '../components/DancerHand';
import {ENVELOPE, Envelope} from '../components/Envelope';
import {Sparkles} from '../components/Sparkles';
import {BrushStroke, HebrewHeadline, RussianLine} from '../components/StoryText';
import {SERIES_COPY} from '../series/copy';
import {StoryProps, StoryShell} from '../series/StoryShell';

/** Story 01 — "היום כולם בוחרים… / Сегодня все выбирают…": a hand drops an empty envelope into an ETUDE ballot box. */
export const STORY01_DURATION = 210; // 7 s @ 30 fps

// Timeline (frames @ 30 fps)
const T = {
  boxIn: [0, 30], // 0.0–1.0 s fade + scale 0.95→1
  handIn: 30, // 1.0 s hand starts entering from the top
  pushStart: 84, // envelope edge reaches the slot, hand pushes it in
  release: 104, // ~3.5 s fingers open, envelope slides in alone
  drop: [104, 117], // envelope disappears into the slot
  impact: 117, // ~3.9 s box bounces, sparkles burst
  handOut: [112, 140], // hand leaves upwards, clearing the headline area by ~4.2 s
  text1: 126, // 4.2 s
  text2: 140,
} as const;

const W = VIDEO.width;
const ENV_LOCAL = {x: -ENVELOPE.width / 2 - 10, y: 148}; // envelope top-left relative to the wrist
const HOVER_Y = BALLOT_BOX.slotY - ENV_LOCAL.y - ENVELOPE.height - 14; // envelope just above the slot
const PUSH_Y = HOVER_Y + 76;

export const Story01: React.FC<StoryProps> = ({showText, showSafeZone}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // --- Ballot box entrance + squash & stretch ---------------------------------
  const boxIn = interpolate(frame, T.boxIn, [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const since = frame - T.impact;
  const bounce = since < 0 ? 0 : Math.exp(-since / 7) * Math.sin(since * 0.42); // + squash, − stretch
  const squash = 1 + 0.09 * bounce;
  const hop = bounce < 0 ? bounce * 34 : 0;

  // --- Hand path ---------------------------------------------------------------
  const enter = spring({frame: frame - T.handIn, fps, config: {damping: 18, stiffness: 60, mass: 1.1}, durationInFrames: T.pushStart - T.handIn});
  const push = interpolate(frame, [T.pushStart, T.release], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
  const out = interpolate(frame, T.handOut, [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});

  // Graceful S-curve on the way down, settling on the slot axis.
  const sway = (1 - enter) * 90 * Math.cos(enter * Math.PI * 1.5);
  const startY = -420;
  let wristX = W / 2 + 6 + sway;
  let wristY = startY + (HOVER_Y - startY) * enter + (PUSH_Y - HOVER_Y) * push;
  // Exit: a port-de-bras sweep up and slightly to the right.
  wristX += out * 300;
  wristY -= out * (PUSH_Y + 700);

  const wristBend = (1 - enter) * 26 * Math.sin(enter * Math.PI * 2 + 0.8) + out * -28 + Math.sin(frame / 14) * 1.5 * (1 - out);
  const armAngle = (1 - enter) * -8 + out * 22;
  const release = interpolate(frame, [T.release - 2, T.release + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const flutter = Math.sin(frame / 9) * 4 + release * 3;

  // --- Envelope ----------------------------------------------------------------
  const attached = frame < T.release;
  const dropT = interpolate(frame, T.drop, [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
  // At release the wrist is upright (enter≈1, out=0), so the free envelope continues from the same spot.
  const releaseY = PUSH_Y + ENV_LOCAL.y;
  const freeY = releaseY + dropT * (ENVELOPE.height + 30);
  const freeX = W / 2 + 6 + ENV_LOCAL.x; // wrist x at release

  const scene = (
    <svg width={W} height={VIDEO.height} viewBox={`0 0 ${W} ${VIDEO.height}`}>
      <g transform={`translate(${BALLOT_BOX.cx} ${BALLOT_BOX.bottom}) scale(${0.95 + 0.05 * boxIn}) translate(${-BALLOT_BOX.cx} ${-BALLOT_BOX.bottom})`}>
        <BallotBox opacity={boxIn} squash={squash} hop={hop} />
      </g>
      <Sparkles frame={frame - T.impact} x={BALLOT_BOX.cx} y={BALLOT_BOX.slotY - 6} />
    </svg>
  );

  // Hand + envelope sit above the text so the arm can sweep through the frame.
  const slotClipY = BALLOT_BOX.slotY + 2 + hop;
  const overlay = (
    <svg width={W} height={VIDEO.height} viewBox={`0 0 ${W} ${VIDEO.height}`}>
      <defs>
        <clipPath id="s01-slot" clipPathUnits="userSpaceOnUse">
          <rect x={0} y={-3000} width={W} height={3000 + slotClipY} />
        </clipPath>
        <filter id="s01-env-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="6" dy="12" stdDeviation="10" floodColor="#040817" floodOpacity="0.35" />
        </filter>
      </defs>
      {!attached && dropT < 1 && (
        <g clipPath="url(#s01-slot)">
          <g transform={`translate(${freeX} ${freeY})`} filter="url(#s01-env-shadow)">
            <Envelope />
          </g>
        </g>
      )}
      {out < 1 && (
        <g clipPath={attached ? 'url(#s01-slot)' : undefined}>
          <DancerHand x={wristX} y={wristY} armAngle={armAngle} wristBend={wristBend} release={release} flutter={flutter}>
            {attached && (
              <g transform={`translate(${ENV_LOCAL.x} ${ENV_LOCAL.y})`}>
                <Envelope />
              </g>
            )}
          </DancerHand>
        </g>
      )}
    </svg>
  );

  const text = (
    <div>
      <HebrewHeadline text={SERIES_COPY.story01.he} start={T.text1} />
      <div style={{marginTop: -18}}>
        <BrushStroke start={T.text1 + 10} rtl width={520} />
      </div>
      <div style={{marginTop: 18}}>
        <RussianLine text={SERIES_COPY.story01.ru} start={T.text2} />
      </div>
    </div>
  );

  return <StoryShell showText={showText} showSafeZone={showSafeZone} scene={scene} text={text} overlay={overlay} textTop={440} />;
};

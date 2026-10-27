import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, VIDEO} from '../brand/tokens';
import {BALLOT_BOX, BallotBox} from '../components/BallotBox';
import {GentShoe, LadyShoe} from '../components/BallroomShoes';
import {Sparkles} from '../components/Sparkles';
import {SeriesMusic, Sfx} from '../components/StoryAudio';
import {BrushStroke, HebrewHeadline, RussianLine} from '../components/StoryText';
import {SERIES_COPY} from '../series/copy';
import {STORY_DURATION, StoryProps, StoryShell} from '../series/StoryShell';

/** Story 02 — "…ואנחנו בחרנו מזמן / …а мы свой выбор сделали давно": the ballot box glows and a pair of ballroom shoes rises out of it. */
export const STORY02_DURATION = STORY_DURATION;

const T = {
  text1: 8,
  text2: 22,
  glow: [40, 66], // slot starts to glow, box trembles in anticipation
  beam: [62, 80], // light beam opens
  rise: 64, // shoes rise out of the slot
  burst: 96,
} as const;

const W = VIDEO.width;
/** Where the shoes float (ground line of the pair) — also the starting point of story 03. */
export const SHOES_FLOAT = {x: 540, y: 960, gentDx: -112, ladyDx: 112} as const;

/** Gentle float shared with story 03 so the cut is invisible. `t` = series-relative frame. */
export const floatOffset = (t: number) => ({
  dy: Math.sin(t / 20) * 9,
  tiltGent: Math.sin(t / 26) * 3,
  tiltLady: Math.sin(t / 26 + 1.4) * 3,
});

export const Story02: React.FC<StoryProps> = ({showText, showSafeZone, withMusic}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {cx, slotY, slotWidth} = BALLOT_BOX;

  // Anticipation: slot glow + small tremble
  const glow = interpolate(frame, T.glow, [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
  const trembleAmt = interpolate(frame, [T.glow[0] + 4, T.glow[1] - 2, T.glow[1] + 4], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tremble = Math.sin(frame * 2.3) * 3 * trembleAmt;

  // Beam
  const beam = interpolate(frame, T.beam, [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const beamPulse = beam * (0.85 + 0.15 * Math.sin(frame / 11));

  // Shoes rising out of the slot
  const rise = spring({frame: frame - T.rise, fps, config: {damping: 14, stiffness: 70, mass: 1}});
  const fl = floatOffset(frame + STORY_DURATION);
  const floatIn = interpolate(frame, [T.rise + 20, T.rise + 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const shoesY = slotY + 200 + (SHOES_FLOAT.y - slotY - 200) * rise + fl.dy * floatIn;
  const shoesScale = 0.55 + 0.45 * Math.min(1, rise);
  const spread = interpolate(rise, [0, 1], [0.35, 1]);

  const scene = (
    <svg width={W} height={VIDEO.height} viewBox={`0 0 ${W} ${VIDEO.height}`}>
      <defs>
        <linearGradient id="s02-beam" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={COLORS.warmBokeh} stopOpacity="0.75" />
          <stop offset="0.5" stopColor={COLORS.mist} stopOpacity="0.22" />
          <stop offset="1" stopColor={COLORS.mist} stopOpacity="0" />
        </linearGradient>
        <filter id="s02-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <clipPath id="s02-slot" clipPathUnits="userSpaceOnUse">
          <rect x={0} y={-3000} width={W} height={3000 + slotY + 4} />
        </clipPath>
      </defs>

      <g transform={`translate(${tremble} 0) rotate(${tremble * 0.3} ${cx} ${BALLOT_BOX.bottom})`}>
        <BallotBox />
        {/* Slot glow */}
        <ellipse cx={cx} cy={slotY} rx={slotWidth / 2 + 20} ry={22} fill={COLORS.warmBokeh} opacity={glow * 0.7} filter="url(#s02-blur)" />
        <rect x={cx - slotWidth / 2 + 4} y={slotY - 6} width={slotWidth - 8} height={12} rx={6} fill={COLORS.warmBokeh} opacity={glow * 0.9} />
      </g>

      {/* Light beam from the slot */}
      <polygon
        points={`${cx - slotWidth / 2 + 10},${slotY} ${cx + slotWidth / 2 - 10},${slotY} ${cx + 250},${slotY - 520 * beam} ${cx - 250},${slotY - 520 * beam}`}
        fill="url(#s02-beam)"
        opacity={beamPulse * 0.8}
        style={{mixBlendMode: 'screen'}}
      />

      {/* Shoes emerge from inside the box */}
      {frame >= T.rise && (
        <g clipPath="url(#s02-slot)">
          <g transform={`translate(${SHOES_FLOAT.x} ${shoesY}) scale(${shoesScale})`}>
            <g transform={`translate(${SHOES_FLOAT.gentDx * spread} 6) rotate(${fl.tiltGent * floatIn})`}>
              <GentShoe facing="right" />
            </g>
            <g transform={`translate(${SHOES_FLOAT.ladyDx * spread} 0) rotate(${fl.tiltLady * floatIn})`}>
              <LadyShoe facing="left" />
            </g>
          </g>
        </g>
      )}
      <Sparkles frame={frame - T.burst} x={SHOES_FLOAT.x} y={SHOES_FLOAT.y - 90} duration={40} />
    </svg>
  );

  const c = SERIES_COPY.story02;
  const ruWords = c.ru.split(' ');
  const text = (
    <div>
      <HebrewHeadline text={c.he} start={T.text1} ellipsis="start" />
      <div style={{marginTop: -18}}>
        <BrushStroke start={T.text1 + 10} rtl width={520} />
      </div>
      <div style={{marginTop: 18}}>
        {/* Two lines: "…а мы свой выбор" / "сделали давно" */}
        <RussianLine text={ruWords.slice(0, 4).join(' ')} start={T.text2} ellipsis="start" />
        <RussianLine text={ruWords.slice(4).join(' ')} start={T.text2 + 8} ellipsis="none" />
      </div>
    </div>
  );

  const audio = (
    <>
      {withMusic && <SeriesMusic storyIndex={1} durationInFrames={STORY02_DURATION} />}
      {showText && <Sfx name="text-pop-1" at={T.text1} volume={0.45} />}
      {showText && <Sfx name="text-pop-2" at={T.text2} volume={0.4} />}
      <Sfx name="swell" at={T.glow[0] - 8} volume={0.35} />
      <Sfx name="magic-rise" at={T.beam[0] - 4} volume={0.75} />
      <Sfx name="sparkle" at={T.burst} volume={0.45} />
    </>
  );

  return <StoryShell storyIndex={1} showText={showText} showSafeZone={showSafeZone} scene={scene} text={text} audio={audio} textTop={440} />;
};

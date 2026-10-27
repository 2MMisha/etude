import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {VIDEO} from '../brand/tokens';
import {BALLOT_BOX, BallotBox} from '../components/BallotBox';
import {Footprint} from '../components/BallroomShoes';
import {DancingPair, FloorSpotlight, ShoePose} from '../components/DancingPair';
import {SeriesMusic, Sfx} from '../components/StoryAudio';
import {BrushStroke, HebrewHeadline, InfoLine, RussianLine} from '../components/StoryText';
import {SERIES_COPY} from '../series/copy';
import {STORY_DURATION, StoryProps, StoryShell} from '../series/StoryShell';
import {SHOES_FLOAT, floatOffset} from './Story02';

/** Story 03 — "בחרנו בריקוד / Мы выбрали танец": the shoes land on the parquet and waltz in a circle, leaving glowing footprints. */
export const STORY03_DURATION = STORY_DURATION;

const W = VIDEO.width;
const BEAT = (STORY_DURATION / 12); // 17.5 frames — the music has 12 beats per story
const LAND = 28; // shoes touch the floor
const STEP_LEN = 11; // frames a step takes, landing exactly on the beat
const STEPS = 10; // landings on beats 2..11
const STEP_DEG = 36; // 10 steps = one full turn of the couple

/** The circle the couple waltzes around — shared with story 04. */
export const ORBIT = {cx: 540, cy: 1400, rx: 230, ry: 64, phi0: 20} as const;

const T = {text1: 14, text2: 28, styles: 50} as const;

const deg = (d: number) => (d * Math.PI) / 180;

/** Pose of one shoe on the orbit at angle theta (degrees). */
export const orbitPose = (theta: number, lift: number): ShoePose => {
  const s = Math.sin(deg(theta));
  return {
    x: ORBIT.cx + ORBIT.rx * Math.cos(deg(theta)),
    y: ORBIT.cy + ORBIT.ry * s - lift,
    scale: 0.92 + 0.1 * s,
    facing: Math.max(-1, Math.min(1, s * 6)), // front half moves left → toe left; quick turn at the sides
    tilt: 0,
    lift,
  };
};

const landingFrame = (k: number) => BEAT * (k + 2);

/** Couple rotation angle (deg) and hop height at a given story frame. */
const waltz = (frame: number) => {
  let phi = ORBIT.phi0;
  let lift = 0;
  for (let k = 0; k < STEPS; k++) {
    const end = landingFrame(k);
    const p = interpolate(frame, [end - STEP_LEN, end], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
    phi += STEP_DEG * p;
    if (p > 0 && p < 1) {
      const strongBeat = (k + 2) % 3 === 0; // waltz "down" on 1, rise on 2–3
      lift = Math.sin(Math.PI * p) * (strongBeat ? 14 : 30);
    }
  }
  return {phi, lift};
};

export const Story03: React.FC<StoryProps> = ({showText, showSafeZone, withMusic}) => {
  const frame = useCurrentFrame();

  // The box from stories 1–2 sinks away
  const boxOut = interpolate(frame, [0, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const beamOut = interpolate(frame, [0, 14], [1, 0], {extrapolateRight: 'clamp'});

  // Descent from the floating pose (end of story 02) to the floor
  const fl = floatOffset(frame + 2 * STORY_DURATION);
  const fall = interpolate(frame, [0, LAND], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
  const {phi, lift} = waltz(frame);
  const gentOrbit = orbitPose(phi + 180, lift);
  const ladyOrbit = orbitPose(phi, lift);
  const mix = (a: number, b: number) => a + (b - a) * fall;
  const settle = Math.max(0, Math.sin(Math.PI * interpolate(frame, [LAND, LAND + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}))) * 8;
  const gent: ShoePose =
    fall < 1
      ? {x: mix(SHOES_FLOAT.x + SHOES_FLOAT.gentDx, gentOrbit.x), y: mix(SHOES_FLOAT.y + 6 + fl.dy, gentOrbit.y), scale: mix(1, gentOrbit.scale), facing: -1, tilt: fl.tiltGent * (1 - fall), lift: (1 - fall) * 300}
      : {...gentOrbit, y: gentOrbit.y - settle};
  const lady: ShoePose =
    fall < 1
      ? {x: mix(SHOES_FLOAT.x + SHOES_FLOAT.ladyDx, ladyOrbit.x), y: mix(SHOES_FLOAT.y + fl.dy, ladyOrbit.y), scale: mix(1, ladyOrbit.scale), facing: 1, tilt: fl.tiltLady * (1 - fall), lift: (1 - fall) * 300}
      : {...ladyOrbit, y: ladyOrbit.y - settle};

  // Footprints at every landing, fading out
  const prints: React.ReactNode[] = [];
  for (let k = -1; k < STEPS; k++) {
    const at = k < 0 ? LAND : landingFrame(k);
    const age = frame - at;
    if (age < 0) continue;
    const o = interpolate(age, [0, 3, 55], [0, 0.6, 0], {extrapolateRight: 'clamp'});
    const a = ORBIT.phi0 + STEP_DEG * (k + 1);
    for (const [theta, isLady] of [
      [a, true],
      [a + 180, false],
    ] as const) {
      const p = orbitPose(theta, 0);
      prints.push(<Footprint key={`${k}-${isLady}`} x={p.x} y={p.y + 2} scale={p.scale} opacity={o} lady={isLady} facing={p.facing >= 0 ? 'left' : 'right'} />);
    }
  }

  const spot = interpolate(frame, [6, 36], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const scene = (
    <svg width={W} height={VIDEO.height} viewBox={`0 0 ${W} ${VIDEO.height}`}>
      {boxOut < 1 && (
        <g transform={`translate(0 ${boxOut * 120})`} opacity={1 - boxOut}>
          <BallotBox />
          <ellipse cx={BALLOT_BOX.cx} cy={BALLOT_BOX.slotY} rx={160} ry={20} fill="#FFD7A1" opacity={0.5 * beamOut} />
        </g>
      )}
      <FloorSpotlight x={ORBIT.cx} y={ORBIT.cy + 10} opacity={spot} />
      {prints}
      <DancingPair gent={gent} lady={lady} />
    </svg>
  );

  const c = SERIES_COPY.story03;
  const text = (
    <div>
      <HebrewHeadline text={c.he} start={T.text1} ellipsis="none" fontSize={128} />
      <div style={{marginTop: -18}}>
        <BrushStroke start={T.text1 + 10} rtl width={460} />
      </div>
      <div style={{marginTop: 14}}>
        <RussianLine text={c.ru} start={T.text2} ellipsis="none" fontSize={100} />
      </div>
      <div style={{marginTop: 30}}>
        <InfoLine text={c.stylesHe} start={T.styles} lang="he" fontSize={34} weight={400} opacity={0.8} />
        <InfoLine text={c.stylesRu} start={T.styles + 8} lang="ru" fontSize={30} weight={500} opacity={0.8} />
      </div>
    </div>
  );

  const taps = [LAND, ...Array.from({length: STEPS}, (_, k) => landingFrame(k))];
  const audio = (
    <>
      {withMusic && <SeriesMusic storyIndex={2} durationInFrames={STORY03_DURATION} />}
      <Sfx name="whoosh-out" at={0} volume={0.3} />
      {taps.map((f, i) => (
        <React.Fragment key={i}>
          <Sfx name="heel-tap" at={f} volume={i === 0 ? 0.7 : 0.45} />
          <Sfx name="heel-tap" at={f + 2} volume={i === 0 ? 0.55 : 0.32} />
        </React.Fragment>
      ))}
      {showText && <Sfx name="text-pop-1" at={T.text1} volume={0.45} />}
      {showText && <Sfx name="text-pop-2" at={T.text2} volume={0.4} />}
    </>
  );

  return <StoryShell storyIndex={2} showText={showText} showSafeZone={showSafeZone} scene={scene} text={text} audio={audio} textTop={440} />;
};

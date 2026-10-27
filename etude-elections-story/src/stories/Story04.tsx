import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {VIDEO} from '../brand/tokens';
import {DancingPair, FloorSpotlight, ShoePose} from '../components/DancingPair';
import {Sparkles} from '../components/Sparkles';
import {SeriesMusic, Sfx} from '../components/StoryAudio';
import {HebrewHeadline, InfoLine, RussianLine} from '../components/StoryText';
import {SERIES_COPY} from '../series/copy';
import {STORY_DURATION, StoryProps, StoryShell} from '../series/StoryShell';
import {ORBIT, orbitPose} from './Story03';

/** Story 04 — call to action: the couple comes to rest, ETUDE logo, free trial class, address, WhatsApp. */
export const STORY04_DURATION = STORY_DURATION;

const W = VIDEO.width;
const LOGO_RATIO = 600.75 / 1432.5;
const LOGO = {w: 600, y: 540};
const REST_Y = 1440;
const SETTLE = 24;

const T = {text1: 10, text2: 24, logo: 32, info: [64, 72, 86, 94, 108]} as const;

/** Absolute vertical placement inside the text layer (which starts at `top`). */
const At: React.FC<{y: number; top: number; children: React.ReactNode}> = ({y, top, children}) => (
  <div style={{position: 'absolute', top: y - top, left: 0, right: 0}}>{children}</div>
);

export const Story04: React.FC<StoryProps> = ({showText, showSafeZone, withMusic}) => {
  const frame = useCurrentFrame();

  // From the last waltz position of story 03 to a resting pose, facing each other.
  const p = interpolate(frame, [0, SETTLE], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const hop = Math.sin(Math.PI * p) * 40;
  const g0 = orbitPose(ORBIT.phi0 + 360 + 180, 0);
  const l0 = orbitPose(ORBIT.phi0 + 360, 0);
  const mix = (a: number, b: number) => a + (b - a) * p;
  const gent: ShoePose = {x: mix(g0.x, 418), y: mix(g0.y, REST_Y) - hop, scale: mix(g0.scale, 0.9), facing: -1, tilt: 0, lift: hop};
  const lady: ShoePose = {x: mix(l0.x, 664), y: mix(l0.y, REST_Y + 4) - hop, scale: mix(l0.scale, 0.9), facing: 1, tilt: 0, lift: hop};

  const logoIn = interpolate(frame, [T.logo, T.logo + 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const spot = interpolate(frame, [0, 30], [0.6, 1], {extrapolateRight: 'clamp'});

  const scene = (
    <svg width={W} height={VIDEO.height} viewBox={`0 0 ${W} ${VIDEO.height}`}>
      <FloorSpotlight x={(gent.x + lady.x) / 2} y={mix(ORBIT.cy, REST_Y) + 10} opacity={spot} rx={mix(380, 300)} ry={mix(120, 90)} />
      <DancingPair gent={gent} lady={lady} />
      <Sparkles frame={frame - T.logo - 6} x={W / 2} y={LOGO.y + 150} duration={36} />
    </svg>
  );

  // The large logo is part of the scene, so it stays in the no-text export. No effects on the logo itself.
  const logo = (
    <Img
      src={staticFile('brand/logo-full-he-white.svg')}
      style={{
        position: 'absolute',
        width: LOGO.w,
        height: LOGO.w * LOGO_RATIO,
        left: (W - LOGO.w) / 2,
        top: LOGO.y,
        opacity: logoIn,
        transform: `scale(${0.92 + 0.08 * logoIn})`,
      }}
    />
  );

  const c = SERIES_COPY.story04;
  const top = 290;
  const text = (
    <div style={{position: 'relative', height: '100%'}}>
      <At y={290} top={top}>
        <HebrewHeadline text={c.he} start={T.text1} ellipsis="none" fontSize={104} />
      </At>
      <At y={424} top={top}>
        <RussianLine text={c.ru} start={T.text2} ellipsis="none" fontSize={80} />
      </At>
      <At y={830} top={top}>
        <InfoLine text={c.offerHe} start={T.info[0]} lang="he" fontSize={44} weight={500} />
      </At>
      <At y={898} top={top}>
        <InfoLine text={c.offerRu} start={T.info[1]} lang="ru" fontSize={36} weight={600} />
      </At>
      <At y={972} top={top}>
        <InfoLine text={c.addressHe} start={T.info[2]} lang="he" fontSize={38} weight={400} opacity={0.85} />
      </At>
      <At y={1032} top={top}>
        <InfoLine text={c.addressRu} start={T.info[3]} lang="ru" fontSize={32} weight={500} opacity={0.85} />
      </At>
      <At y={1104} top={top}>
        <InfoLine text={c.contact} start={T.info[4]} lang="ru" fontSize={38} weight={600} />
      </At>
    </div>
  );

  const audio = (
    <>
      {withMusic && <SeriesMusic storyIndex={3} durationInFrames={STORY04_DURATION} fadeOut={0} />}
      <Sfx name="heel-tap" at={SETTLE} volume={0.6} />
      <Sfx name="heel-tap" at={SETTLE + 3} volume={0.5} />
      <Sfx name="bell-chord" at={T.logo} volume={0.6} />
      {showText && <Sfx name="text-pop-1" at={T.text1} volume={0.45} />}
      {showText && <Sfx name="text-pop-2" at={T.text2} volume={0.4} />}
    </>
  );

  return (
    <StoryShell
      storyIndex={3}
      showText={showText}
      showSafeZone={showSafeZone}
      scene={
        <>
          {scene}
          {logo}
        </>
      }
      text={text}
      audio={audio}
      textTop={top}
      watermark={false}
      barreFadeOut
    />
  );
};

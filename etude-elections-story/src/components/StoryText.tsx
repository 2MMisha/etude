import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONTS} from '../brand/tokens';

const entrance = (frame: number, start: number, duration: number) => {
  const t = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return {opacity: t, transform: `translateY(${(1 - t) * 60}px)`};
};

/**
 * Three dots that "breathe" one after another — the sentence continues in the next story.
 * Dots are separate spans so they follow the text direction: in RTL the first dot is the rightmost,
 * so the wave runs in reading direction in both languages.
 */
export const BreathingEllipsis: React.FC<{start: number; period?: number}> = ({start, period}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = period ?? fps * 1.2;
  return (
    <span style={{display: 'inline-block', whiteSpace: 'nowrap'}}>
      {[0, 1, 2].map((i) => {
        const local = Math.max(0, frame - start);
        const wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * local) / p - i * 0.9 - Math.PI / 2);
        const opacity = frame < start ? 1 : 0.3 + 0.7 * wave;
        const scale = frame < start ? 1 : 0.9 + 0.2 * wave;
        return (
          <span key={i} style={{display: 'inline-block', opacity, transform: `scale(${scale})`, transformOrigin: '50% 80%'}}>
            .
          </span>
        );
      })}
    </span>
  );
};

/**
 * Brand brush stroke under the main headline (brandbook §06), drawn on.
 * Mirrored for Hebrew: it is painted from right to left.
 */
export const BrushStroke: React.FC<{start: number; duration?: number; rtl?: boolean; width?: number}> = ({start, duration = 18, rtl = false, width = 560}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [start, start + duration], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const len = 1000;
  return (
    <svg width={width} height={40} viewBox="0 0 560 40" style={{display: 'block', margin: '0 auto', transform: rtl ? 'scaleX(-1)' : undefined}}>
      <path
        d="M 14 26 C 120 12 260 10 380 16 C 450 19 510 24 546 18"
        fill="none"
        stroke={COLORS.softBlue}
        strokeWidth={11}
        strokeLinecap="round"
        pathLength={len}
        strokeDasharray={len}
        strokeDashoffset={len * (1 - t)}
        opacity={0.9}
      />
    </svg>
  );
};

const textShadow = '0 6px 24px rgba(5, 10, 30, 0.55)';

/**
 * 'end'   – breathing ellipsis after the text (the sentence continues in the next story)
 * 'start' – static ellipsis before the text (this story continues the previous one)
 */
export type EllipsisMode = 'end' | 'start' | 'none';

/** Leading "…", split into dots like the breathing one so both stories look the same. */
const LeadingEllipsis: React.FC = () => <span style={{display: 'inline-block', whiteSpace: 'nowrap'}}>...</span>;

/** Hebrew headline: Gveret Levin, RTL. The ellipsis is placed by logical order, so 'end' renders on the visual left and 'start' on the visual right. */
export const HebrewHeadline: React.FC<{text: string; start: number; fontSize?: number; ellipsis?: EllipsisMode}> = ({text, start, fontSize = 118, ellipsis = 'end'}) => {
  const frame = useCurrentFrame();
  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        ...entrance(frame, start, 20),
        fontFamily: FONTS.hebrewBrush,
        fontSize,
        lineHeight: 1.25,
        color: COLORS.mist,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        textShadow,
      }}
    >
      {ellipsis === 'start' && <LeadingEllipsis />}
      {text}
      {ellipsis === 'end' && <BreathingEllipsis start={start + 20} />}
    </div>
  );
};

/** Russian line: Caveat 700, LTR. */
export const RussianLine: React.FC<{text: string; start: number; fontSize?: number; ellipsis?: EllipsisMode}> = ({text, start, fontSize = 92, ellipsis = 'end'}) => {
  const frame = useCurrentFrame();
  return (
    <div
      dir="ltr"
      lang="ru"
      style={{
        ...entrance(frame, start, 20),
        fontFamily: FONTS.russianBrush,
        fontWeight: 700,
        fontSize,
        lineHeight: 1.15,
        color: COLORS.mist,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        textShadow,
      }}
    >
      {ellipsis === 'start' && <LeadingEllipsis />}
      {text}
      {ellipsis === 'end' && <BreathingEllipsis start={start + 20} />}
    </div>
  );
};

/** Small info line in the plain faces (Heebo for Hebrew, Montserrat for Russian/Latin) — numbers, addresses, offers. */
export const InfoLine: React.FC<{text: string; start: number; lang: 'he' | 'ru'; fontSize?: number; weight?: number; opacity?: number}> = ({
  text,
  start,
  lang,
  fontSize = 40,
  weight = 500,
  opacity = 0.92,
}) => {
  const frame = useCurrentFrame();
  const e = entrance(frame, start, 16);
  return (
    <div
      dir={lang === 'he' ? 'rtl' : 'ltr'}
      lang={lang}
      style={{
        ...e,
        opacity: e.opacity * opacity,
        fontFamily: lang === 'he' ? FONTS.hebrew : FONTS.latin,
        fontWeight: weight,
        fontSize: lang === 'he' ? fontSize * 1.05 : fontSize, // brandbook: Hebrew ~5% larger
        lineHeight: lang === 'he' ? 1.4 : 1.3,
        color: COLORS.mist,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        textShadow,
      }}
    >
      {text}
    </div>
  );
};

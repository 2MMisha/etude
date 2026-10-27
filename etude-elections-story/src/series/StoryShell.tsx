import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SAFE_ZONE} from '../brand/tokens';
import '../brand/fonts';
import {BrandWatermark} from '../components/BrandWatermark';
import {SafeZoneGuides} from '../components/SafeZoneGuides';
import {StudioBackground} from '../components/StudioBackground';

export type StoryProps = {
  /** false → the "no text" export: headlines are hidden, logos stay */
  showText: boolean;
  /** draws the story UI bands (top 250 px / bottom 300 px) for checking in Studio */
  showSafeZone: boolean;
};

/**
 * Common frame for every story in the series: background, watermark and layer slots.
 *   scene    – full-frame illustration (usually one 1080×1920 <svg>)
 *   text     – headline block, placed inside the text-safe area, hidden for the no-text export
 *   overlay  – things that must pass in front of the text (e.g. the hand)
 */
export const StoryShell: React.FC<
  StoryProps & {
    scene?: React.ReactNode;
    text?: React.ReactNode;
    overlay?: React.ReactNode;
    /** top of the text block, px from the top of the frame (clamped to the safe zone) */
    textTop?: number;
    backgroundFadeIn?: number;
  }
> = ({showText, showSafeZone, scene, text, overlay, textTop = 430, backgroundFadeIn = 24}) => (
  <AbsoluteFill>
    <StudioBackground fadeInFrames={backgroundFadeIn} />
    {scene && <AbsoluteFill>{scene}</AbsoluteFill>}
    {showText && text && (
      <AbsoluteFill
        style={{
          top: Math.max(textTop, SAFE_ZONE.top),
          bottom: SAFE_ZONE.bottom,
          padding: '0 50px',
          display: 'block',
        }}
      >
        {text}
      </AbsoluteFill>
    )}
    {overlay && <AbsoluteFill>{overlay}</AbsoluteFill>}
    <BrandWatermark />
    {showSafeZone && <SafeZoneGuides />}
  </AbsoluteFill>
);

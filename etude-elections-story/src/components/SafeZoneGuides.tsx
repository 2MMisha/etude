import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SAFE_ZONE} from '../brand/tokens';

/** Debug overlay (enable via the `showSafeZone` prop in Remotion Studio). Never rendered in exports by default. */
export const SafeZoneGuides: React.FC = () => {
  const band: React.CSSProperties = {position: 'absolute', left: 0, right: 0, background: 'rgba(255,0,80,0.22)', borderColor: '#ff0050', borderStyle: 'dashed', borderWidth: 0};
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{...band, top: 0, height: SAFE_ZONE.top, borderBottomWidth: 3}} />
      <div style={{...band, bottom: 0, height: SAFE_ZONE.bottom, borderTopWidth: 3}} />
    </AbsoluteFill>
  );
};

import React from 'react';
import {Img, staticFile} from 'remotion';
import {SAFE_ZONE, VIDEO} from '../brand/tokens';

const LOGO_RATIO = 600.75 / 1432.5; // viewBox of logo-white.svg

/** Small white ETUDE wordmark, top centre, visible for the whole story. No effects on the logo (brandbook). */
export const BrandWatermark: React.FC<{width?: number; opacity?: number}> = ({width = 200, opacity = 0.6}) => (
  <Img
    src={staticFile('brand/logo-white.svg')}
    style={{
      position: 'absolute',
      width,
      height: width * LOGO_RATIO,
      left: (VIDEO.width - width) / 2,
      top: SAFE_ZONE.top - 10,
      opacity,
    }}
  />
);

import React from 'react';
import {Composition, Folder} from 'remotion';
import {VIDEO} from './brand/tokens';
import {SERIES} from './series';

export const RemotionRoot: React.FC = () => (
  <Folder name="Elections-2026">
    {SERIES.map((s) => (
      <React.Fragment key={s.id}>
        <Composition
          id={s.id}
          component={s.component}
          durationInFrames={s.durationInFrames}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{showText: true, showSafeZone: false}}
        />
        <Composition
          id={`${s.id}-NoText`}
          component={s.component}
          durationInFrames={s.durationInFrames}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{showText: false, showSafeZone: false}}
        />
      </React.Fragment>
    ))}
  </Folder>
);

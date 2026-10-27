import React from 'react';
import {Composition, Folder} from 'remotion';
import {VIDEO} from './brand/tokens';
import {SERIES} from './series';
import {SeriesFull} from './series/SeriesFull';
import {DEFAULT_STORY_PROPS} from './series/StoryShell';

const total = SERIES.reduce((sum, s) => sum + s.durationInFrames, 0);

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
          defaultProps={DEFAULT_STORY_PROPS}
        />
        <Composition
          id={`${s.id}-NoText`}
          component={s.component}
          durationInFrames={s.durationInFrames}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{...DEFAULT_STORY_PROPS, showText: false}}
        />
      </React.Fragment>
    ))}
    <Composition id="SeriesFull" component={SeriesFull} durationInFrames={total} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} defaultProps={DEFAULT_STORY_PROPS} />
    <Composition
      id="SeriesFull-NoText"
      component={SeriesFull}
      durationInFrames={total}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={{...DEFAULT_STORY_PROPS, showText: false}}
    />
  </Folder>
);

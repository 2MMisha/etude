import React from 'react';
import {AbsoluteFill, Series} from 'remotion';
import {FullSeriesMusic} from '../components/StoryAudio';
import {SERIES} from './index';
import {StoryProps} from './StoryShell';

/** All stories back to back with the waltz playing through — for preview or a Reel. */
export const SeriesFull: React.FC<StoryProps> = ({showText, showSafeZone, withMusic}) => (
  <AbsoluteFill>
    <Series>
      {SERIES.map((s) => (
        <Series.Sequence key={s.id} durationInFrames={s.durationInFrames} name={s.id}>
          <s.component showText={showText} showSafeZone={showSafeZone} withMusic={false} />
        </Series.Sequence>
      ))}
    </Series>
    {withMusic && <FullSeriesMusic />}
  </AbsoluteFill>
);

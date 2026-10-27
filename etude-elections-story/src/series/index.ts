import React from 'react';
import {Story01, STORY01_DURATION} from '../stories/Story01';
import {StoryProps} from './StoryShell';

export type SeriesEntry = {
  /** composition id; a "-NoText" twin is registered automatically */
  id: string;
  component: React.FC<StoryProps>;
  durationInFrames: number;
};

/**
 * Story series "Сегодня все выбирают… а мы свой выбор сделали давно".
 * To add a story: create src/stories/Story02.tsx (wrap the scene in <StoryShell>), add its copy to copy.ts
 * and append an entry here — Root.tsx registers it (with and without text) automatically.
 */
export const SERIES: SeriesEntry[] = [
  {id: 'Story01', component: Story01, durationInFrames: STORY01_DURATION},
  // {id: 'Story02', component: Story02, durationInFrames: 210},
];

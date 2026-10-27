import React from 'react';
import {Story01, STORY01_DURATION} from '../stories/Story01';
import {Story02, STORY02_DURATION} from '../stories/Story02';
import {Story03, STORY03_DURATION} from '../stories/Story03';
import {Story04, STORY04_DURATION} from '../stories/Story04';
import {StoryProps} from './StoryShell';

export type SeriesEntry = {
  /** composition id; a "-NoText" twin is registered automatically */
  id: string;
  component: React.FC<StoryProps>;
  durationInFrames: number;
};

/**
 * Story series "Сегодня все выбирают… а мы свой выбор сделали давно".
 * To add a story: create src/stories/StoryNN.tsx (wrap the scene in <StoryShell>), add its copy to copy.ts
 * and append an entry here — Root.tsx registers it (with and without text) and adds it to SeriesFull.
 */
export const SERIES: SeriesEntry[] = [
  {id: 'Story01', component: Story01, durationInFrames: STORY01_DURATION},
  {id: 'Story02', component: Story02, durationInFrames: STORY02_DURATION},
  {id: 'Story03', component: Story03, durationInFrames: STORY03_DURATION},
  {id: 'Story04', component: Story04, durationInFrames: STORY04_DURATION},
];

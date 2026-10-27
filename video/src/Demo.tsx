import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Intro, Scope} from './scenes/Intro';
import {Analyze, Reference} from './scenes/Inspect';
import {Approval, Outcomes, Trace, Verify} from './scenes/Workflow';
import {Cloud, Evaluation, Outro} from './scenes/Platform';
import {c} from './theme';

const OVERLAP = 14;

const scenes: [React.FC<{dur: number}>, number][] = [
  [Intro, 150],
  [Scope, 165],
  [Reference, 210],
  [Analyze, 330],
  [Trace, 210],
  [Approval, 220],
  [Verify, 270],
  [Outcomes, 240],
  [Cloud, 260],
  [Evaluation, 300],
  [Outro, 180],
];

export const DEMO_DURATION = scenes.reduce((t, [, d]) => t + d, 0) - OVERLAP * (scenes.length - 1);

export const Demo: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{background: c.bg}}>
      {scenes.map(([S, dur], i) => {
        const start = from;
        from += dur - OVERLAP;
        return (
          <Sequence key={i} from={start} durationInFrames={dur}>
            <S dur={dur} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

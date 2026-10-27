import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {DEMO_DURATION, Demo} from './Demo';
import {FPS, H, W} from './theme';

const Root: React.FC = () =>
  React.createElement(Composition, {
    id: 'ShelfSignalDemo',
    component: Demo,
    durationInFrames: DEMO_DURATION,
    fps: FPS,
    width: W,
    height: H,
  });

registerRoot(Root);

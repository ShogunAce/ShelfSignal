import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {c, mono, sans} from '../theme';
import {Backdrop, Body, Headline, Kicker, Pill, Scene, SignalMark, clamp, prog, useSpring} from '../ui';

export const Intro: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const draw = prog(frame, 6, 30);
  const bars = prog(frame, 26, 24);
  const pop = useSpring(4, 14);
  const word = prog(frame, 34, 24);
  const tag = prog(frame, 58, 22);
  const out = interpolate(frame, [dur - 18, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: out}}>
      <Backdrop />
      <AbsoluteFill style={{opacity: 0.16, filter: 'blur(3px) saturate(0.6)'}}>
        <Img
          src={staticFile('media/pantry.webp')}
          style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.15 - frame * 0.0008})`}}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 50% 50% at 50% 50%, transparent, #0a0e0d 85%)'}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 34, transform: `scale(${0.8 + pop * 0.2})`}}>
          <div
            style={{
              width: 168,
              height: 168,
              borderRadius: 38,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(to top, #315748, #16291f)',
              border: '1px solid #62876c55',
              boxShadow: `0 0 ${80 * bars}px #85c5a155`,
            }}
          >
            <SignalMark size={112} draw={draw} bars={bars} />
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 800,
              fontSize: 150,
              letterSpacing: -8,
              color: c.text,
              clipPath: `inset(0 ${(1 - word) * 100}% 0 0)`,
              transform: `translateX(${(1 - word) * -30}px)`,
            }}
          >
            ShelfSignal<span style={{color: c.mint}}>.</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: sans,
            fontSize: 44,
            fontWeight: 500,
            letterSpacing: -1,
            color: c.dim,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 16}px)`,
          }}
        >
          Evidence before action.
        </div>
        <div
          style={{
            marginTop: 56,
            display: 'flex',
            gap: 18,
            opacity: prog(frame, 78, 20),
          }}
        >
          <Pill>OPENCV 5.0.0</Pill>
          <Pill color={c.blue}>AWS LAMBDA</Pill>
          <Pill color={c.amber}>HUMAN-IN-THE-LOOP</Pill>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const steps = [
  ['01', 'Photograph', 'Capture the shelf against a reference.'],
  ['02', 'Measure', 'OpenCV 5 scores occupancy loss per position.'],
  ['03', 'Review', 'A person approves or rejects the task.'],
  ['04', 'Verify', 'A follow-up photo checks the same positions.'],
];

export const Scope: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  return (
    <Scene dur={dur}>
      <Kicker index="00" label="What it does" />
      <div style={{position: 'absolute', left: 120, top: 210, width: 1500}}>
        <Headline text="A clear view." accent="A considered action." size={112} delay={6} />
        <Body delay={26} style={{marginTop: 30, maxWidth: 1100}}>
          Reference-based shelf inspection for a shift supervisor. Compare, review, verify — then close the loop.
        </Body>
      </div>
      <div style={{position: 'absolute', left: 120, right: 120, top: 640, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 26}}>
        {steps.map(([n, t, d], i) => {
          const p = prog(frame, 40 + i * 8, 22);
          return (
            <div
              key={n}
              style={{
                borderTop: `1px solid ${i === 0 ? c.mint : '#ffffff22'}`,
                paddingTop: 26,
                opacity: p,
                transform: `translateY(${(1 - p) * 40}px)`,
              }}
            >
              <div style={{fontFamily: mono, fontSize: 18, color: '#6a8a75', letterSpacing: 2}}>{n}</div>
              <div style={{fontFamily: sans, fontSize: 40, fontWeight: 650, color: '#d8e5dc', marginTop: 12}}>{t}</div>
              <div style={{fontFamily: sans, fontSize: 23, lineHeight: 1.5, color: '#8d9f92', marginTop: 10}}>{d}</div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 120,
          bottom: 70,
          fontFamily: mono,
          fontSize: 18,
          color: c.faint,
          letterSpacing: 1,
          opacity: prog(frame, 80, 20),
        }}
      >
        NOT SKU RECOGNITION · NOT AN INVENTORY SYSTEM · NO USER RESEARCH CLAIMED
      </div>
    </Scene>
  );
};

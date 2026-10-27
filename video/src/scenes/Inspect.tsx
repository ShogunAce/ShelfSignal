import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {missing, regions} from '../data';
import {Shelf} from '../Shelf';
import {c, mono, sans} from '../theme';
import {Body, Counter, Headline, Kicker, Pill, Scene, Window, clamp, ease, prog} from '../ui';

export const Reference: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const tilt = interpolate(frame, [0, 70], [18, 4], {...clamp, easing: ease});
  const lift = prog(frame, 0, 40);
  const count = Math.min(18, Math.floor(Math.max(0, frame - 40) / 3.2));
  return (
    <Scene dur={dur}>
      <Kicker index="01" label="Reference & positions" />
      <div style={{position: 'absolute', left: 120, top: 250, width: 560}}>
        <Headline text="Start from" accent="a known-good shelf." size={76} delay={6} />
        <Body delay={24} style={{marginTop: 30, fontSize: 27}}>
          The operator marks each expected product position on the baseline. These are annotations of <i>where products
          belong</i> — never labels of what is missing.
        </Body>
        <div style={{marginTop: 44, display: 'flex', alignItems: 'baseline', gap: 18, opacity: prog(frame, 40, 16)}}>
          <span style={{fontFamily: sans, fontWeight: 780, fontSize: 120, color: c.mint, letterSpacing: -5}}>{count}</span>
          <span style={{fontFamily: mono, fontSize: 20, color: c.dim, letterSpacing: 2}}>EXPECTED POSITIONS</span>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 110,
          top: 220,
          perspective: 2200,
        }}
      >
        <div
          style={{
            transform: `rotateY(-${tilt}deg) rotateX(${tilt * 0.3}deg) translateY(${(1 - lift) * 80}px)`,
            transformOrigin: 'left center',
          }}
        >
          <Window title="Reference shelf" tag="BASELINE">
            <Shelf
              src="reference.png"
              width={1060}
              styleFor={(_, i) => ({draw: prog(frame, 40 + i * 3.2, 14), color: c.green})}
            />
          </Window>
        </div>
      </div>
    </Scene>
  );
};

// Deterministic pseudo feature points used to illustrate reference-to-capture matching.
const points = Array.from({length: 46}, (_, i) => ({x: random(`x${i}`) * 0.92 + 0.04, y: random(`y${i}`) * 0.86 + 0.05}));

export const Analyze: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const W1 = 780;
  const H1 = (W1 * 9) / 16;
  // Phase A (0-120): matching between reference and current capture. Phase B: focus + scan.
  const merge = prog(frame, 112, 34);
  const scan = interpolate(frame, [150, 230], [0, 1], {...clamp, easing: ease});
  const panel = prog(frame, 150, 24);
  const target = regions.find((r) => r.id === missing.id)!;
  const flagged = frame > 150 + 80 * (target.box[0] + target.box[2] / 2);
  const leftX = interpolate(merge, [0, 1], [120, -900]);
  const rightX = interpolate(merge, [0, 1], [1020, 120]);
  const rightW = interpolate(merge, [0, 1], [W1, 1120]);
  const lineP = prog(frame, 30, 60);
  return (
    <Scene dur={dur}>
      <Kicker index="02" label="Analyze shelf" />
      <div style={{position: 'absolute', left: 120, top: 150, opacity: Math.max(0, 1 - merge * 2)}}>
        <Headline text="Align first." accent="Then measure." size={64} delay={4} />
      </div>
      <div style={{position: 'absolute', left: 120, top: 150, opacity: Math.max(0, merge * 2 - 1)}}>
        <div style={{fontFamily: sans, fontWeight: 780, fontSize: 64, letterSpacing: -3, color: c.text}}>
          One position lost its edges <span style={{color: '#b7d7c5'}}>and texture.</span>
        </div>
      </div>

      <div style={{position: 'absolute', left: leftX, top: 330}}>
        <Label text="REFERENCE" />
        <Shelf src="reference.png" width={W1} />
      </div>
      <div style={{position: 'absolute', left: rightX, top: 330}}>
        <Label text={merge > 0.5 ? 'CURRENT CAPTURE · MEASURED OVERLAY' : 'CURRENT CAPTURE'} />
        <Shelf
          src="missing-item.png"
          width={rightW}
          styleFor={(id, i) => {
            if (frame < 150) return null;
            const r = regions[i];
            const passed = scan > r.box[0] + r.box[2] / 2;
            if (!passed) return null;
            const bad = id === missing.id;
            return {
              draw: Math.min(1, (scan - r.box[0]) * 4),
              color: bad ? c.red : c.green,
              fill: bad ? '#f0746a22' : undefined,
              glow: bad,
              label: bad || rightW > 1000,
            };
          }}
        >
          {frame > 150 && scan < 1 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${scan * 100}%`,
                width: 160,
                marginLeft: -160,
                background: 'linear-gradient(90deg, transparent, #b7e3ce30)',
                borderRight: `2px solid ${c.mint}`,
                boxShadow: `6px 0 30px ${c.mint}`,
              }}
            />
          )}
        </Shelf>
      </div>

      {/* Illustrative correspondence lines between the two images */}
      {merge < 1 && (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: 1 - merge * 2}}>
          {points.map((p, i) => {
            const show = Math.max(0, Math.min(1, lineP * points.length - i));
            if (show <= 0) return null;
            const x1 = 120 + p.x * W1;
            const y1 = 330 + 36 + p.y * H1;
            const x2 = 1020 + p.x * W1;
            const x = x1 + (x2 - x1) * show;
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x} y2={y1} stroke={c.mint} strokeOpacity={0.35} strokeWidth={1.4} />
                <circle cx={x1} cy={y1} r={4} fill={c.mint} />
                {show >= 1 && <circle cx={x2} cy={y1} r={4} fill={c.mint} />}
              </g>
            );
          })}
        </svg>
      )}
      <div
        style={{
          position: 'absolute',
          left: 120,
          right: 120,
          top: 840,
          display: 'flex',
          gap: 22,
          opacity: prog(frame, 40, 20) * (1 - prog(frame, 100, 14)),
        }}
      >
        <Stat label="FEATURE MATCHES" value={<Counter to={missing.matches} delay={40} dur={50} />} />
        <Stat label="ALIGNMENT INLIERS" value={<Counter to={missing.inliers * 100} decimals={1} delay={50} dur={45} suffix="%" />} />
        <Stat label="REPROJECTION ERROR" value={<Counter to={missing.reprojection} decimals={3} delay={60} dur={40} suffix=" px" />} />
        <Stat label="SHARPNESS" value={<Counter to={missing.sharpness} decimals={2} delay={70} dur={40} />} />
      </div>

      {/* Review panel */}
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 330,
          width: 500,
          opacity: panel,
          transform: `translateX(${(1 - panel) * 60}px)`,
        }}
      >
        <div style={{fontFamily: mono, fontSize: 17, color: c.faint, letterSpacing: 2}}>CANDIDATE POSITION</div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14}}>
          <span style={{fontFamily: sans, fontSize: 52, fontWeight: 700, color: c.text}}>{missing.id}</span>
          <span style={{fontFamily: sans, fontSize: 72, fontWeight: 760, color: flagged ? c.amber : c.faint}}>
            {flagged ? <Counter to={missing.score} decimals={3} delay={195} dur={30} /> : '—'}
          </span>
        </div>
        <div style={{height: 8, borderRadius: 8, background: '#ffffff12', marginTop: 16, overflow: 'hidden'}}>
          <div
            style={{
              height: '100%',
              width: `${prog(frame, 195, 30) * missing.score * 100}%`,
              background: `linear-gradient(90deg, ${c.amber}, ${c.red})`,
            }}
          />
        </div>
        <div style={{fontFamily: sans, fontSize: 22, color: c.dim, marginTop: 14}}>Possible occupancy loss</div>
        <div style={{marginTop: 36, display: 'grid', gap: 16}}>
          {(
            [
              ['Edge ratio', missing.edge.toFixed(3)],
              ['Texture ratio', missing.texture.toFixed(3)],
              ['Changed fraction', missing.changed.toFixed(3)],
              ['Other 17 positions', 'no gap'],
            ] as const
          ).map(([k, v], i) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px solid #ffffff12',
                paddingBottom: 14,
                fontFamily: sans,
                fontSize: 24,
                color: c.dim,
                opacity: prog(frame, 215 + i * 6, 16),
              }}
            >
              <span>{k}</span>
              <span style={{fontFamily: mono, color: c.text}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop: 30, opacity: prog(frame, 250, 20)}}>
          <Pill color={c.amber}>HEURISTIC SCORE · NOT A PROBABILITY</Pill>
        </div>
      </div>
    </Scene>
  );
};

const Label: React.FC<{text: string}> = ({text}) => (
  <div style={{fontFamily: mono, fontSize: 17, color: c.faint, letterSpacing: 2, marginBottom: 14}}>{text}</div>
);

const Stat: React.FC<{label: string; value: React.ReactNode}> = ({label, value}) => (
  <div style={{flex: 1, borderTop: '1px solid #ffffff22', paddingTop: 18}}>
    <div style={{fontFamily: mono, fontSize: 16, color: c.faint, letterSpacing: 2}}>{label}</div>
    <div style={{fontFamily: sans, fontSize: 56, fontWeight: 720, color: c.text, letterSpacing: -2, marginTop: 6}}>{value}</div>
  </div>
);

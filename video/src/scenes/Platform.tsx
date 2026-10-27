import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {aws, evaluation} from '../data';
import {c, mono, sans} from '../theme';
import {Backdrop, Body, Counter, Headline, Kicker, Pill, Scene, SignalMark, clamp, prog, useSpring} from '../ui';

type Node = {id: string; x: number; y: number; w: number; title: string; sub: string; color: string; delay: number};

const nodes: Node[] = [
  {id: 'ui', x: 120, y: 470, w: 330, title: 'React workspace', sub: 'localhost · no credentials', color: c.mint, delay: 10},
  {id: 'api', x: 560, y: 470, w: 330, title: 'Loopback FastAPI', sub: 'Boto3 · signed Invoke', color: c.mint, delay: 22},
  {id: 'lambda', x: 1010, y: 440, w: 380, title: 'AWS Lambda', sub: `OpenCV ${aws.opencv} · Py ${aws.python} · ${aws.arch}`, color: c.amber, delay: 34},
  {id: 's3', x: 1500, y: 300, w: 320, title: 'Private S3', sub: `originals + SHA-256 · ${aws.retentionDays}-day lifecycle`, color: c.blue, delay: 48},
  {id: 'ddb', x: 1500, y: 520, w: 320, title: 'DynamoDB', sub: 'revision pointer · conditional writes', color: c.blue, delay: 56},
  {id: 'cw', x: 1500, y: 740, w: 320, title: 'CloudWatch', sub: '7-day logs', color: c.blue, delay: 64},
  {id: 'ecr', x: 1010, y: 760, w: 380, title: 'CodeBuild → ECR', sub: 'immutable image digest', color: c.faint, delay: 72},
];

const edges: [string, string, number][] = [
  ['ui', 'api', 30],
  ['api', 'lambda', 42],
  ['lambda', 's3', 56],
  ['lambda', 'ddb', 62],
  ['lambda', 'cw', 70],
  ['ecr', 'lambda', 80],
];

const NODE_H = 120;
const center = (n: Node) => ({x: n.x + n.w / 2, y: n.y + NODE_H / 2});

export const Cloud: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <Scene dur={dur} glow="#1c3a4c">
      <Kicker index="07" label="Authenticated AWS workload" />
      <div style={{position: 'absolute', left: 120, top: 150, width: 1600}}>
        <Headline text="Same pipeline," accent="verified in the cloud." size={74} delay={4} />
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {edges.map(([a, b, d]) => {
          const A = byId[a];
          const B = byId[b];
          const from = a === 'ecr' ? {x: center(A).x, y: A.y} : {x: A.x + A.w, y: center(A).y};
          const to = a === 'ecr' ? {x: center(B).x, y: B.y + NODE_H + 30} : {x: B.x, y: center(B).y};
          const mx = (from.x + to.x) / 2;
          const path = a === 'ecr' ? `M${from.x} ${from.y} L${to.x} ${to.y}` : `M${from.x} ${from.y} C${mx} ${from.y} ${mx} ${to.y} ${to.x} ${to.y}`;
          const p = prog(frame, d, 20);
          const t = ((frame - d - 20) % 45) / 45;
          return (
            <g key={a + b}>
              <path d={path} stroke="#ffffff28" strokeWidth={2} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
              {p >= 1 && a !== 'ecr' && (
                <circle r={6} fill={c.mint} style={{offsetPath: `path('${path}')`, offsetDistance: `${t * 100}%`, filter: `drop-shadow(0 0 8px ${c.mint})`} as React.CSSProperties} />
              )}
            </g>
          );
        })}
      </svg>
      {nodes.map((n) => {
        const p = prog(frame, n.delay, 18);
        return (
          <div
            key={n.id}
            style={{
              position: 'absolute',
              left: n.x,
              top: n.y,
              width: n.w,
              height: n.id === 'lambda' ? NODE_H + 60 : NODE_H,
              padding: '22px 26px',
              borderRadius: 16,
              background: n.id === 'lambda' ? '#2a2316' : c.panel,
              border: `1px solid ${n.color}55`,
              boxShadow: n.id === 'lambda' ? `0 0 60px ${c.amber}22` : '0 20px 50px #0008',
              opacity: p,
              transform: `translateY(${(1 - p) * 30}px) scale(${0.92 + p * 0.08})`,
            }}
          >
            <div style={{fontFamily: sans, fontSize: 30, fontWeight: 680, color: c.text}}>{n.title}</div>
            <div style={{fontFamily: mono, fontSize: 17, color: c.dim, marginTop: 10, lineHeight: 1.5}}>{n.sub}</div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 120, top: 700, display: 'grid', gap: 18, opacity: prog(frame, 100, 20)}}>
        <Pill color={c.red}>UNSIGNED REQUEST → HTTP {aws.unsigned}</Pill>
        <Pill color={c.mint}>S3 PUBLIC ACCESS BLOCKED</Pill>
        <Pill color={c.mint}>NO SILENT LOCAL FALLBACK</Pill>
      </div>
    </Scene>
  );
};

export const Evaluation: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const stats: [React.ReactNode, string][] = [
    [<Counter to={evaluation.precision} decimals={1} delay={20} dur={40} suffix="%" />, 'Position precision'],
    [<Counter to={evaluation.recall} delay={26} dur={40} suffix="%" />, 'Position recall'],
    [<><Counter to={evaluation.agreement[0]} delay={32} dur={40} />/{evaluation.agreement[1]}</>, 'Expected action agreement'],
    [<><Counter to={evaluation.followups[0]} delay={38} dur={40} />/{evaluation.followups[1]}</>, 'Follow-ups classified'],
    [<><Counter to={evaluation.wrongShelf[0]} delay={44} dur={40} />/{evaluation.wrongShelf[1]}</>, 'Wrong-shelf rejections'],
    [<Counter to={evaluation.medianMs} decimals={2} delay={50} dur={40} suffix=" ms" />, 'Median OpenCV time'],
  ];
  const fail = prog(frame, 150, 26);
  return (
    <Scene dur={dur}>
      <Kicker index="08" label="Measured evaluation" />
      <div style={{position: 'absolute', left: 120, top: 150, width: 1700}}>
        <Headline text="Measured," accent="including the misses." size={74} delay={4} />
        <Body delay={14} style={{fontSize: 24, marginTop: 18, fontFamily: mono, letterSpacing: 1}}>
          {evaluation.inspections} SYNTHETIC INSPECTIONS · SEED 7200 · NOT REAL-STORE PERFORMANCE
        </Body>
      </div>
      <div style={{position: 'absolute', left: 120, top: 400, width: 1020, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', rowGap: 50, columnGap: 40}}>
        {stats.map(([v, l], i) => {
          const p = prog(frame, 18 + i * 6, 22);
          return (
            <div key={l} style={{borderTop: '1px solid #ffffff22', paddingTop: 22, opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}>
              <div style={{fontFamily: sans, fontWeight: 760, fontSize: 68, letterSpacing: -3, whiteSpace: 'nowrap', color: i < 2 ? c.mint : c.text}}>{v}</div>
              <div style={{fontFamily: sans, fontSize: 23, color: c.dim, marginTop: 6}}>{l}</div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 360,
          width: 620,
          opacity: fail,
          transform: `translateX(${(1 - fail) * 80}px)`,
        }}
      >
        <div style={{borderRadius: 18, overflow: 'hidden', border: `1px solid ${c.red}55`, position: 'relative'}}>
          <Img src={staticFile('media/flat_occlusion.png')} style={{width: 620, display: 'block'}} />
          <div
            style={{
              position: 'absolute',
              left: (185 / 960) * 620,
              top: (215 / 600) * 387.5,
              width: (116 / 960) * 620,
              height: (141 / 600) * 387.5,
              border: `3px solid ${c.red}`,
              borderRadius: 6,
              boxShadow: `0 0 ${20 + 10 * Math.sin(frame / 6)}px ${c.red}`,
            }}
          />
        </div>
        <div style={{marginTop: 26}}>
          <Pill color={c.red}>{evaluation.falsePositives} FALSE POSITIVES · FLAT OCCLUSION</Pill>
        </div>
        <div style={{fontFamily: sans, fontSize: 25, lineHeight: 1.55, color: c.dim, marginTop: 20}}>
          A flat, low-texture object covering a product can look like a gap. That is why every proposal waits for human
          review.
        </div>
      </div>
    </Scene>
  );
};

export const Outro: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const pop = useSpring(6, 14);
  const fade = interpolate(frame, [dur - 20, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: fade * prog(frame, 0, 14)}}>
      <Backdrop />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: 32,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(to top, #315748, #16291f)',
            border: '1px solid #62876c55',
            transform: `scale(${pop})`,
          }}
        >
          <SignalMark size={86} draw={prog(frame, 4, 24)} bars={prog(frame, 18, 20)} />
        </div>
        <Headline text="Evidence" accent="before action." size={120} align="center" delay={14} style={{marginTop: 50}} />
        <div style={{marginTop: 40, fontFamily: mono, fontSize: 28, color: c.mint, letterSpacing: 1, opacity: prog(frame, 40, 20)}}>
          github.com/ShogunAce/ShelfSignal
        </div>
        <div style={{marginTop: 18, fontFamily: sans, fontSize: 24, color: c.dim, opacity: prog(frame, 50, 20)}}>
          Built by Kenosis Interactive
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          width: '100%',
          textAlign: 'center',
          fontFamily: mono,
          fontSize: 17,
          color: c.faint,
          letterSpacing: 1,
          opacity: prog(frame, 60, 20),
        }}
      >
        ALL SHELF IMAGERY IS SYNTHETIC (ELEVENLABS-GENERATED) · METRICS FROM EVALUATION/RESULTS.JSON
      </div>
    </AbsoluteFill>
  );
};

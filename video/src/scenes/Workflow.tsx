import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {followups, missing, trace} from '../data';
import {Shelf} from '../Shelf';
import {c, mono, sans} from '../theme';
import {Body, Counter, Cursor, Headline, Kicker, Pill, Scene, Window, clamp, ease, prog, useSpring} from '../ui';

const stateColor = (s: string) =>
  s === 'APPROVAL_REQUIRED' ? c.amber : s === 'VERIFIED_VISUALLY' ? c.green : s === 'ANALYZING' ? c.blue : c.mint;

export const Trace: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const rows = trace.slice(0, 7);
  const rail = ['CREATED', 'ANALYZING', 'EVIDENCE_READY', 'APPROVAL_REQUIRED'];
  return (
    <Scene dur={dur}>
      <Kicker index="03" label="Policy engine & trace" />
      <div style={{position: 'absolute', left: 120, top: 250, width: 640}}>
        <Headline text="Every tool call," accent="persisted." size={84} delay={6} />
        <Body delay={24} style={{marginTop: 30, fontSize: 27}}>
          A deterministic agent drives an explicit state machine. Evidence quality decides the next action: rescan, no
          proposal, or a task that waits for a person.
        </Body>
      </div>
      <div style={{position: 'absolute', right: 120, top: 200, width: 900}}>
        <Window title="Execution trace" tag="PERSISTED EVIDENCE">
          <div style={{background: '#0f1613', padding: '8px 0'}}>
            {rows.map(([tool, state], i) => {
              const p = prog(frame, 20 + i * 11, 16);
              const last = i === rows.length - 1;
              return (
                <div
                  key={tool}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 26,
                    padding: '20px 30px',
                    borderBottom: '1px solid #ffffff0c',
                    opacity: p,
                    transform: `translateX(${(1 - p) * 40}px)`,
                    background: last && p > 0.9 ? '#e7b46a12' : undefined,
                  }}
                >
                  <span style={{fontFamily: mono, fontSize: 18, color: c.faint, width: 30}}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{fontFamily: mono, fontSize: 27, color: last ? c.amber : c.text, flex: 1}}>{tool}</span>
                  <span style={{fontFamily: mono, fontSize: 16, color: stateColor(state), letterSpacing: 1.5}}>{state}</span>
                </div>
              );
            })}
          </div>
        </Window>
      </div>
      <div style={{position: 'absolute', left: 120, right: 120, bottom: 90, display: 'flex', alignItems: 'center', gap: 16}}>
        {rail.map((s, i) => {
          const on = prog(frame, 40 + i * 22, 14);
          return (
            <React.Fragment key={s}>
              <span style={{opacity: 0.25 + on * 0.75}}>
                <Pill color={on > 0.5 ? stateColor(s) : c.faint}>{s}</Pill>
              </span>
              {i < rail.length - 1 && (
                <div style={{flex: 1, height: 2, background: '#ffffff15', position: 'relative'}}>
                  <div style={{position: 'absolute', inset: 0, width: `${prog(frame, 50 + i * 22, 14) * 100}%`, background: c.mint}} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Scene>
  );
};

export const Approval: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const card = useSpring(8, 16);
  const clickAt = 92;
  const approved = frame >= clickAt + 4;
  const cx = interpolate(frame, [40, clickAt - 6], [1750, 1410], {...clamp, easing: ease});
  const cy = interpolate(frame, [40, clickAt - 6], [980, 600], {...clamp, easing: ease});
  const ripple = prog(frame, clickAt, 22);
  const json = prog(frame, clickAt + 20, 20);
  return (
    <Scene dur={dur} glow="#4a3a1c">
      <Kicker index="04" label="Human approval" />
      <div style={{position: 'absolute', left: 120, top: 250, width: 700}}>
        <Headline text="A person decides." accent="Approval is not completion." size={80} delay={6} />
        <Body delay={26} style={{marginTop: 30, fontSize: 27}}>
          Only <span style={{fontFamily: mono, color: c.text}}>approve_or_reject_task</span> can create a task — and it never
          claims the shelf was physically restocked.
        </Body>
        <div
          style={{
            marginTop: 40,
            padding: '26px 30px',
            borderRadius: 14,
            background: '#0f1613',
            border: '1px solid #ffffff14',
            fontFamily: mono,
            fontSize: 24,
            lineHeight: 1.7,
            color: c.dim,
            opacity: json,
            transform: `translateY(${(1 - json) * 20}px)`,
          }}
        >
          <div>{'"task": {'}</div>
          <div style={{paddingLeft: 30}}>
            "positions": [<span style={{color: c.mint}}>"{missing.id}"</span>],
          </div>
          <div style={{paddingLeft: 30}}>
            "status": <span style={{color: c.green}}>"APPROVED"</span>,
          </div>
          <div style={{paddingLeft: 30}}>
            "physical_completion": <span style={{color: c.amber}}>false</span>
          </div>
          <div>{'}'}</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 200,
          top: 210,
          width: 620,
          padding: 46,
          borderRadius: 26,
          background: c.panel,
          border: '1px solid #ffffff18',
          boxShadow: '0 50px 120px #000a',
          transform: `translateY(${(1 - card) * 120}px) rotate(${(1 - card) * 4}deg)`,
          opacity: card,
        }}
      >
        <div style={{fontFamily: mono, fontSize: 17, letterSpacing: 2.5, color: c.faint}}>NEXT ACTION</div>
        <div style={{fontFamily: sans, fontSize: 48, fontWeight: 700, color: c.text, marginTop: 14, letterSpacing: -1.5}}>
          {approved ? 'Task approved' : 'Review possible gaps'}
        </div>
        <div style={{fontFamily: sans, fontSize: 24, color: c.dim, marginTop: 12}}>
          {approved ? `Restock ${missing.id} · awaiting follow-up photo` : 'Possible gaps found; human review required.'}
        </div>
        <div
          style={{
            marginTop: 30,
            padding: '18px 22px',
            borderLeft: `3px solid ${c.amber}`,
            background: '#e7b46a14',
            color: '#e9c995',
            fontFamily: sans,
            fontSize: 22,
            lineHeight: 1.5,
            borderRadius: 6,
          }}
        >
          Approval creates a task. It does not mark the shelf as restocked.
        </div>
        <div
          style={{
            position: 'relative',
            marginTop: 30,
            height: 76,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            fontFamily: sans,
            fontSize: 26,
            fontWeight: 650,
            color: approved ? '#0a1712' : '#f1fff7',
            background: approved ? c.green : 'linear-gradient(to top,#6bb7a1 0px,#2b755e 4px,#194739 14px,#142a21 40px)',
            border: '1px solid #b7dfd236',
            transform: `scale(${frame >= clickAt && frame < clickAt + 5 ? 0.97 : 1})`,
            overflow: 'hidden',
          }}
        >
          {approved ? '✓  Approved by operator' : '✓  Approve restock task'}
          {ripple > 0 && ripple < 1 && (
            <div
              style={{
                position: 'absolute',
                width: 900 * ripple,
                height: 900 * ripple,
                borderRadius: '50%',
                background: '#ffffff30',
                opacity: 1 - ripple,
              }}
            />
          )}
        </div>
        <div
          style={{
            marginTop: 14,
            height: 66,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            fontFamily: sans,
            fontSize: 23,
            color: c.dim,
            border: '1px solid #ffffff20',
            opacity: approved ? 0.3 : 1,
          }}
        >
          Reject proposal
        </div>
      </div>
      {frame > 36 && frame < dur - 30 && <Cursor x={cx} y={cy} pressed={frame >= clickAt && frame < clickAt + 6} />}
    </Scene>
  );
};

export const Verify: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [50, 120], [0, 1], {...clamp, easing: ease});
  const score = interpolate(frame, [110, 150], [missing.score, followups.refilledAfter], {...clamp, easing: ease});
  const stamp = useSpring(160, 11, 0.8);
  const SW = 1120;
  return (
    <Scene dur={dur}>
      <Kicker index="05" label="Verify follow-through" />
      <div style={{position: 'absolute', left: 120, top: 150}}>
        <Headline text="Close the loop" accent="on the same positions." size={64} delay={4} />
      </div>
      <div style={{position: 'absolute', left: 120, top: 290}}>
        <div style={{position: 'relative', width: SW, height: (SW * 9) / 16}}>
          <div style={{position: 'absolute', inset: 0}}>
            <Shelf
              src="missing-item.png"
              width={SW}
              styleFor={(id) => (id === missing.id ? {draw: 1, color: c.red, fill: '#f0746a22', glow: true} : null)}
            />
          </div>
          <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`}}>
            <Shelf
              src="refilled.jpg"
              width={SW}
              styleFor={(id) => (id === missing.id ? {draw: 1, color: c.green, glow: true} : null)}
            />
          </div>
          {wipe > 0 && wipe < 1 && (
            <div
              style={{
                position: 'absolute',
                top: -10,
                bottom: -10,
                left: `${wipe * 100}%`,
                width: 3,
                background: c.mint,
                boxShadow: `0 0 24px ${c.mint}`,
              }}
            />
          )}
          <div style={{position: 'absolute', left: 20, bottom: 20, display: 'flex', gap: 12}}>
            <Pill color={wipe > 0.5 ? c.green : c.red} style={{background: '#0a0e0dd0'}}>
              {wipe > 0.5 ? 'FOLLOW-UP · SYNTHETIC REFILL' : 'INSPECTION · MISSING ITEM'}
            </Pill>
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', right: 120, top: 300, width: 500}}>
        <div style={{fontFamily: mono, fontSize: 17, letterSpacing: 2, color: c.faint}}>{missing.id} · OCCUPANCY-LOSS SCORE</div>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 18}}>
          <span style={{fontFamily: sans, fontSize: 34, color: c.faint, textDecoration: frame > 150 ? 'line-through' : 'none'}}>
            {missing.score.toFixed(3)}
          </span>
          <span style={{fontFamily: sans, fontSize: 30, color: c.faint}}>→</span>
          <span
            style={{
              fontFamily: sans,
              fontWeight: 780,
              fontSize: 110,
              letterSpacing: -4,
              color: interpolate(frame, [110, 150], [0, 1], clamp) > 0.5 ? c.green : c.amber,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {score.toFixed(3)}
          </span>
        </div>
        <div style={{height: 8, borderRadius: 8, background: '#ffffff12', marginTop: 10, overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${score * 100}%`, background: score > 0.48 ? c.amber : c.green}} />
        </div>
        <div style={{fontFamily: mono, fontSize: 18, color: c.faint, marginTop: 12}}>gap threshold 0.48</div>
        <div
          style={{
            marginTop: 50,
            display: 'inline-block',
            padding: '20px 30px',
            border: `3px solid ${c.green}`,
            borderRadius: 12,
            color: c.green,
            fontFamily: mono,
            fontWeight: 500,
            fontSize: 34,
            letterSpacing: 3,
            transform: `scale(${2 - stamp}) rotate(${-6 * stamp}deg)`,
            opacity: stamp,
            boxShadow: `0 0 40px ${c.green}33`,
          }}
        >
          VERIFIED_VISUALLY
        </div>
        <Body delay={180} style={{marginTop: 40, fontSize: 24}}>
          Compares the original candidate positions only.{' '}
          <span style={{fontFamily: mono, color: c.amber}}>physical_completion_claimed: false</span>
        </Body>
      </div>
    </Scene>
  );
};

const outcomes = [
  {
    src: 'still-empty.jpg',
    title: 'Still empty',
    state: 'UNRESOLVED',
    color: c.red,
    detail: `${missing.id} score ${followups.stillEmpty} after follow-up`,
    region: true,
  },
  {
    src: 'blurred.jpg',
    title: 'Blurred capture',
    state: 'RESCAN_REQUIRED',
    color: c.amber,
    detail: `Sharpness ${followups.blurSharpness} < ${followups.minSharpness} · no approval controls`,
    region: false,
  },
  {
    src: 'no-change.jpg',
    title: 'No change',
    state: 'NO PROPOSAL',
    color: c.blue,
    detail: 'No significant occupancy loss detected',
    region: false,
  },
];

export const Outcomes: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  return (
    <Scene dur={dur}>
      <Kicker index="06" label="Different evidence, different action" />
      <div style={{position: 'absolute', left: 120, top: 160, width: 1600}}>
        <Headline text="Uncertain evidence is" accent="rejected, not guessed." size={80} delay={4} />
      </div>
      <div style={{position: 'absolute', left: 120, right: 120, top: 420, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 36}}>
        {outcomes.map((o, i) => {
          const p = prog(frame, 22 + i * 12, 26);
          const stampP = prog(frame, 70 + i * 14, 14);
          return (
            <div
              key={o.title}
              style={{
                opacity: p,
                transform: `translateY(${(1 - p) * 80}px) rotateX(${(1 - p) * 20}deg)`,
                background: c.panel,
                borderRadius: 20,
                padding: 14,
                border: '1px solid #ffffff14',
              }}
            >
              <Shelf
                src={o.src}
                width={525}
                styleFor={(id) => (o.region && id === missing.id ? {draw: stampP, color: c.red, fill: '#f0746a22', glow: true} : null)}
              />
              <div style={{padding: '24px 12px 12px'}}>
                <div style={{fontFamily: sans, fontSize: 34, fontWeight: 650, color: c.text}}>{o.title}</div>
                <div style={{marginTop: 18, opacity: stampP, transform: `scale(${1.3 - stampP * 0.3})`, transformOrigin: 'left'}}>
                  <Pill color={o.color}>{o.state}</Pill>
                </div>
                <div style={{fontFamily: mono, fontSize: 19, color: c.dim, marginTop: 18, opacity: stampP}}>{o.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

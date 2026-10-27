import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {c, mono, sans} from './theme';

export const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const prog = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], {...clamp, easing: ease});

export const useSpring = (delay = 0, damping = 18, mass = 0.7) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping, mass}});
};

// Ambient backdrop: deep green radial glow, drifting dust and a faint grid.
export const Backdrop: React.FC<{glow?: string}> = ({glow = '#204c34'}) => {
  const frame = useCurrentFrame();
  const drift = frame * 0.15;
  return (
    <AbsoluteFill style={{background: c.bg, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 45% 40% at 50% 55%, ${glow}55, transparent), radial-gradient(ellipse 60% 40% at 50% 110%, #1c322766, transparent)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(#ffffff07 1px, transparent 1px), linear-gradient(90deg, #ffffff07 1px, transparent 1px)',
          backgroundSize: '96px 96px',
          backgroundPosition: `0 ${drift}px`,
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, #000, transparent)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(#c2e0ce80 1px, transparent 1px), radial-gradient(#c2e0ce40 1px, transparent 1px)',
          backgroundSize: '181px 169px, 113px 127px',
          backgroundPosition: `11px ${27 - drift}px, 70px ${47 - drift * 0.6}px`,
          opacity: 0.35,
        }}
      />
    </AbsoluteFill>
  );
};

// Fades/blurs each scene in and out so overlapping sequences cross-dissolve.
export const Scene: React.FC<{dur: number; children: React.ReactNode; glow?: string}> = ({dur, children, glow}) => {
  const frame = useCurrentFrame();
  const inP = prog(frame, 0, 16);
  const outP = interpolate(frame, [dur - 16, dur], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  return (
    <AbsoluteFill style={{opacity: inP * (1 - outP), filter: `blur(${(1 - inP) * 10 + outP * 10}px)`}}>
      <Backdrop glow={glow} />
      <AbsoluteFill style={{transform: `scale(${1.03 - inP * 0.03 + outP * 0.02})`}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Kicker: React.FC<{index: string; label: string; delay?: number}> = ({index, label, delay = 4}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, delay, 18);
  return (
    <div
      style={{
        position: 'absolute',
        top: 72,
        left: 120,
        right: 120,
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: mono,
        fontSize: 18,
        letterSpacing: 3,
        color: c.mint,
        opacity: p,
      }}
    >
      <span>
        {index} — {label.toUpperCase()}
      </span>
      <span style={{color: c.faint, letterSpacing: 1}}>SHELFSIGNAL · SYNTHETIC EXAMPLES</span>
      <div
        style={{
          position: 'absolute',
          top: -22,
          left: 0,
          height: 1,
          width: `${p * 100}%`,
          background: '#ffffff22',
        }}
      />
    </div>
  );
};

// Word-by-word rise-and-unblur headline.
export const Headline: React.FC<{
  text: string;
  accent?: string;
  delay?: number;
  size?: number;
  align?: 'left' | 'center';
  style?: React.CSSProperties;
}> = ({text, accent, delay = 0, size = 96, align = 'left', style}) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');
  const accentWords = accent ? accent.split(' ') : [];
  const all = [...words.map((w) => ({w, a: false})), ...accentWords.map((w) => ({w, a: true}))];
  return (
    <div
      style={{
        fontFamily: sans,
        fontWeight: 780,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: -size * 0.05,
        color: c.text,
        textAlign: align,
        ...style,
      }}
    >
      {all.map(({w, a}, i) => {
        const p = prog(frame, delay + i * 3, 20);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginRight: size * 0.24,
              opacity: p,
              transform: `translateY(${(1 - p) * size * 0.45}px)`,
              filter: `blur(${(1 - p) * 12}px)`,
              color: a ? '#b7d7c5' : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Body: React.FC<{children: React.ReactNode; delay?: number; style?: React.CSSProperties}> = ({
  children,
  delay = 10,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = prog(frame, delay, 22);
  return (
    <div
      style={{
        fontFamily: sans,
        fontSize: 30,
        lineHeight: 1.6,
        color: c.dim,
        opacity: p,
        transform: `translateY(${(1 - p) * 20}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Pill: React.FC<{children: React.ReactNode; color?: string; style?: React.CSSProperties}> = ({
  children,
  color = c.mint,
  style,
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 20px',
      border: `1px solid ${color}55`,
      background: `${color}14`,
      color,
      borderRadius: 10,
      fontFamily: mono,
      fontSize: 22,
      letterSpacing: 1.5,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    <i style={{width: 9, height: 9, borderRadius: 9, background: color, display: 'inline-block'}} />
    {children}
  </span>
);

export const Counter: React.FC<{to: number; decimals?: number; delay?: number; dur?: number; suffix?: string}> = ({
  to,
  decimals = 0,
  delay = 0,
  dur = 30,
  suffix = '',
}) => {
  const frame = useCurrentFrame();
  const v = to * prog(frame, delay, dur);
  return (
    <span style={{fontVariantNumeric: 'tabular-nums'}}>
      {v.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}
      {suffix}
    </span>
  );
};

// Glassy product window that hosts imagery, matching the landing page frame.
export const Window: React.FC<{title: string; tag?: string; children: React.ReactNode; style?: React.CSSProperties}> = ({
  title,
  tag,
  children,
  style,
}) => (
  <div
    style={{
      background: c.panel2,
      border: '1px solid #a8c2ad38',
      borderRadius: 22,
      padding: 10,
      boxShadow: '0 40px 120px #000a, 0 0 0 1px #00000040',
      ...style,
    }}
  >
    <div
      style={{
        height: 46,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px 6px',
        fontFamily: mono,
        fontSize: 16,
        color: '#9caea1',
      }}
    >
      <span style={{display: 'flex', gap: 7}}>
        {['#627469', '#8c9470', '#7aaa89'].map((b) => (
          <i key={b} style={{width: 10, height: 10, borderRadius: 10, background: b, display: 'block'}} />
        ))}
      </span>
      <span>{title}</span>
      <span style={{color: c.faint, letterSpacing: 2}}>{tag ?? ''}</span>
    </div>
    <div style={{borderRadius: 12, overflow: 'hidden', position: 'relative'}}>{children}</div>
  </div>
);

export const SignalMark: React.FC<{size?: number; draw?: number; bars?: number; color?: string}> = ({
  size = 120,
  draw = 1,
  bars = 1,
  color = c.mint,
}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path
      d="M11 4H5a1 1 0 0 0-1 1v6m17-7h6a1 1 0 0 1 1 1v6M4 21v6a1 1 0 0 0 1 1h6m10 0h6a1 1 0 0 0 1-1v-6"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - draw}
    />
    {[
      [10, 20, 12],
      [16, 22, 10],
      [22, 20, 12],
    ].map(([x, y1, y2], i) => {
      const b = Math.max(0, Math.min(1, bars * 3 - i));
      return (
        <path
          key={x}
          d={`M${x} ${y1}V${y1 - (y1 - y2) * b}`}
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={b > 0 ? 1 : 0}
        />
      );
    })}
  </svg>
);

export const Cursor: React.FC<{x: number; y: number; pressed?: boolean}> = ({x, y, pressed}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: `scale(${pressed ? 0.85 : 1})`, zIndex: 50}}>
    <svg width={44} height={44} viewBox="0 0 24 24">
      <path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#0a0e0d" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  </div>
);

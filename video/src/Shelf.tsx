import React from 'react';
import {Img, staticFile} from 'remotion';
import {Box, regions} from './data';
import {c, mono} from './theme';

export type RegionStyle = {draw: number; color?: string; fill?: string; label?: boolean; glow?: boolean};

// A 16:9 synthetic shelf with operator-defined expected positions drawn on top.
export const Shelf: React.FC<{
  src: string;
  width: number;
  styleFor?: (id: string, index: number) => RegionStyle | null;
  imgStyle?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({src, width, styleFor, imgStyle, children}) => {
  const height = (width * 9) / 16;
  return (
    <div style={{position: 'relative', width, height, overflow: 'hidden', borderRadius: 10}}>
      <Img src={staticFile(`media/${src}`)} style={{width, height, display: 'block', ...imgStyle}} />
      {styleFor &&
        regions.map((r, i) => {
          const s = styleFor(r.id, i);
          if (!s || s.draw <= 0) return null;
          return <RegionBox key={r.id} id={r.id} box={r.box} w={width} h={height} {...s} />;
        })}
      {children}
    </div>
  );
};

const RegionBox: React.FC<{id: string; box: Box; w: number; h: number} & RegionStyle> = ({
  id,
  box,
  w,
  h,
  draw,
  color = c.green,
  fill,
  label = true,
  glow,
}) => {
  const [x, y, bw, bh] = box;
  const pw = bw * w;
  const ph = bh * h;
  const perim = 2 * (pw + ph);
  return (
    <div style={{position: 'absolute', left: x * w, top: y * h, width: pw, height: ph}}>
      <svg width={pw} height={ph} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {fill && <rect x={0} y={0} width={pw} height={ph} fill={fill} opacity={draw} rx={4} />}
        <rect
          x={1}
          y={1}
          width={pw - 2}
          height={ph - 2}
          rx={4}
          fill="none"
          stroke={color}
          strokeWidth={glow ? 5 : 2.5}
          strokeDasharray={perim}
          strokeDashoffset={perim * (1 - draw)}
          style={glow ? {filter: `drop-shadow(0 0 12px ${color})`} : undefined}
        />
      </svg>
      {label && (
        <span
          style={{
            position: 'absolute',
            left: 6,
            top: 5,
            padding: '2px 7px',
            borderRadius: 5,
            background: '#0a0e0dcc',
            color,
            fontFamily: mono,
            fontSize: Math.max(12, w / 80),
            opacity: Math.min(1, draw * 1.5),
          }}
        >
          {id}
        </span>
      )}
    </div>
  );
};

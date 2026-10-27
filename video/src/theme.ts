import {loadFont as loadManrope} from '@remotion/google-fonts/Manrope';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

export const sans = loadManrope('normal', {weights: ['400', '500', '600', '700', '800'], subsets: ['latin']}).fontFamily;
export const mono = loadMono('normal', {weights: ['400', '500'], subsets: ['latin']}).fontFamily;

// Mirrors the landing page palette in frontend/src/landing.css.
export const c = {
  bg: '#0a0e0d',
  panel: '#131a17',
  panel2: '#19221d',
  line: '#ffffff16',
  text: '#f0f3ee',
  dim: '#a4afa7',
  faint: '#6f8276',
  mint: '#b7e3ce',
  mintDeep: '#2b755e',
  green: '#85c5a1',
  red: '#f0746a',
  amber: '#e7b46a',
  blue: '#7fb6e6',
};

export const FPS = 30;
export const W = 1920;
export const H = 1080;

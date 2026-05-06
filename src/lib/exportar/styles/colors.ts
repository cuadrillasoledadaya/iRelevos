// ══════════════════════════════════════════════════════════════════
// COLORS — Paleta de colores extraída del HTML/CSS inline existente
// ══════════════════════════════════════════════════════════════════

export const COLORS = {
  // ── Brand / Primary ──
  primary: '#c9a84c',
  primaryDark: '#8a6d2f',
  primaryText: '#5a3e10',

  // ── Dark ──
  dark: '#3d2b1f',
  darkBorder: '#2a1f15',

  // ── Table (Relevos — heredado de styles.ts) ──
  tableHeader: '#d4a574',
  tableHeaderAlt: '#e8d5c4',

  // ── Header variants (Capataz) ──
  headerPri: '#1a5c2a',
  headerUlt: '#8b1a1a',

  // ── Status good / dentro ──
  dentroBg: '#d4edda',
  dentroText: '#155724',
  dentroBorder: '#c3e6cb',

  // ── Status bad / fuera ──
  fueraBg: '#f8d7da',
  fueraText: '#721c24',
  fueraBorder: '#f5c6cb',

  // ── Status warning ──
  warnBg: '#fff3cd',
  warnText: '#856404',
  warnBorder: '#ffc107',

  // ── Repetido (orange) ──
  repBg: '#ff9800',
  repText: '#ffffff',
  repBorder: '#e65100',

  // ── Consecutivo (yellow) ──
  consBg: '#ffe082',
  consText: '#5d4037',
  consBorder: '#ffb300',

  // ── Neutrals ──
  white: '#ffffff',
  black: '#000000',
  gray: '#888888',
  grayLight: '#cccccc',
  grayBorder: '#dddddd',
  grayBg: '#f5f5f5',
  warmBg: '#faf6f0',
  warmPage: '#f9f3e3',
  bodyText: '#111111',

  // ── Footer / muted ──
  footerBg: '#f0e8d8',
  mutedText: '#555555',
  mutedBorder: '#666666',

  // ── Masivo-specific ──
  masivoFueraBg: '#e0e0e0',
  masivoFueraText: '#333333',
  masivoNeutral: '#f9f9f9',
  masivoDimText: '#aaaaaa',
  masivoBorder: '#bbbbbb',
  masivoDarkBorder: '#222222',

  // ── Highlighted cell (Relevos individual) ──
  highlightBg: '#4a4a4a',
  highlightBorder: '#333333',
} as const

export type ColorKey = keyof typeof COLORS

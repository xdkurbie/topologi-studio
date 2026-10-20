import type { ThemeId } from './types';

export interface ThemeTokens {
  id: ThemeId;
  background: string;
  card: string;
  cardBorder: string;
  title: string;
  text: string;
  muted: string;
  blue: string;
  green: string;
  yellow: string;
  red: string;
  grey: string;
  line: string;
  pillFill: string;
  device: string;
  rack: string;
  accent: string;
}

export const DARK_THEME: ThemeTokens = {
  id: 'dark',
  background: '#14171c',
  card: '#1f2530',
  cardBorder: '#3a4555',
  title: '#fff',
  text: '#d6dde8',
  muted: '#9aa6b8',
  blue: '#8fc1ff',
  green: '#4cd97b',
  yellow: '#f5c542',
  red: '#ff6b6b',
  grey: '#7a8494',
  line: '#4a90e2',
  pillFill: '#14171c',
  device: '#2d3644',
  rack: '#e8ebef',
  accent: '#4a90e2',
};

export const LIGHT_THEME: ThemeTokens = {
  id: 'light',
  background: '#f5f7fb',
  card: '#ffffff',
  cardBorder: '#d3dbe6',
  title: '#152033',
  text: '#243044',
  muted: '#66788d',
  blue: '#1d6fbf',
  green: '#1c8a48',
  yellow: '#9a7408',
  red: '#c83b3b',
  grey: '#6d7b8c',
  line: '#2f6fcd',
  pillFill: '#f5f7fb',
  device: '#e7edf5',
  rack: '#d5deea',
  accent: '#2f6fcd',
};

export function themeById(id: ThemeId): ThemeTokens {
  return id === 'light' ? LIGHT_THEME : DARK_THEME;
}

export interface Swatch {
  name: string;
  value: string;
}

export const SWATCHES: Swatch[] = [
  { name: 'Bakgrunn', value: '#14171c' },
  { name: 'Kort', value: '#1f2530' },
  { name: 'Kant', value: '#3a4555' },
  { name: 'Tittel', value: '#ffffff' },
  { name: 'Tekst', value: '#d6dde8' },
  { name: 'Dempet', value: '#9aa6b8' },
  { name: 'Blå', value: '#8fc1ff' },
  { name: 'Linje', value: '#4a90e2' },
  { name: 'Grønn', value: '#4cd97b' },
  { name: 'Gul', value: '#f5c542' },
  { name: 'Rød', value: '#ff6b6b' },
  { name: 'Grå', value: '#7a8494' },
  { name: 'Tillat', value: '#1f5a35' },
  { name: 'Blokker', value: '#5a1f24' },
  { name: 'Retur', value: '#1f3f5a' },
];

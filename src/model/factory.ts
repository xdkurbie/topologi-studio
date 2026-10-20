import { uid } from './ids';
import { themeById, type ThemeTokens } from './theme';
import {
  CELL_PRESETS,
  ICON_NATIVE,
  type CardElement,
  type ConnectorElement,
  type IconElement,
  type IconKind,
  type ImageElement,
  type MatrixElement,
  type PillElement,
  type Routing,
  type TableElement,
  type TextElement,
  type ThemeId,
} from './types';

function base(name: string, x: number, y: number, w: number, h: number) {
  return { id: uid(name), name, x, y, w, h, z: 1, locked: false, opacity: 1 };
}

export function createText(theme: ThemeTokens, x: number, y: number, heading = false): TextElement {
  const fontSize = heading ? 32 : 18;
  const text = heading ? 'Overskrift' : 'Tekst';
  const w = heading ? 360 : 180;
  return {
    ...base(text, x, y, w, fontSize + 8),
    type: 'text',
    text,
    fontSize,
    fontWeight: heading ? 'bold' : 'normal',
    color: heading ? theme.title : theme.text,
    align: 'start',
  };
}

export function createCard(theme: ThemeTokens, x: number, y: number): CardElement {
  const rows = [
    { text: '192.168.1.10', color: theme.text },
    { text: 'VLAN 1', color: theme.blue },
  ];
  return {
    ...base('Kort', x, y, 360, 54 + rows.length * 32),
    type: 'card',
    title: 'Nytt kort',
    titleSize: 25,
    titleColor: theme.title,
    titleWeight: 'bold',
    rows,
    rowSize: 21,
    fill: theme.card,
    stroke: theme.cardBorder,
    strokeWidth: 2,
    radius: 16,
    autoHeight: true,
    frameH: 54,
    padX: 20,
    titleDy: 38,
    rowDy: 74,
    rowStride: 32,
  };
}

export function createPill(theme: ThemeTokens, x: number, y: number): PillElement {
  const text = 'Port';
  const w = text.length * 12.5 + 40;
  return {
    ...base('Pille', x - w / 2, y - 20, w, 40),
    type: 'pill',
    text,
    fontSize: 20,
    textColor: theme.blue,
    fill: theme.pillFill,
    stroke: theme.line,
    strokeWidth: 2.5,
    autoWidth: true,
    charW: 12.5,
    padW: 40,
  };
}

export function createIcon(theme: ThemeTokens, kind: IconKind, x: number, y: number): IconElement {
  const native = ICON_NATIVE[kind];
  return {
    ...base(kind, x - native.w / 2, y, native.w, native.h),
    type: 'icon',
    icon: kind,
    fill: kind === 'globe' ? '#1f4fa8' : kind === 'junction' ? theme.line : kind === 'ont' || kind === 'switch' ? theme.rack : theme.device,
    accent: theme.accent,
    stroke: theme.blue,
    strokeWidth: kind === 'junction' || kind === 'globe' || kind === 'ap' ? 0 : 2,
    glyph: kind === 'globe' ? 'G' : '',
    glyphSize: kind === 'globe' ? 40 : 16,
    glyphColor: '#fff',
    ports: kind === 'ont' ? 6 : kind === 'switch' ? 12 : 0,
    portFill: '#556',
    name: kind,
  };
}

export function createImage(x: number, y: number, w: number, h: number, href: string, mime: string): ImageElement {
  return { ...base('Bilde', x, y, w, h), type: 'image', href, mime };
}

export function createTable(theme: ThemeTokens, x: number, y: number): TableElement {
  return {
    ...base('Tabell', x, y, 640, 220),
    type: 'table',
    title: 'Tabell',
    showTitle: true,
    titleSize: 28,
    titleColor: theme.title,
    titleWeight: 'bold',
    headers: ['Navn', 'Verdi', 'Merknad'],
    rows: [
      ['A', '1', ''],
      ['B', '2', ''],
      ['C', '3', ''],
    ],
    colX: [0, 200, 380],
    titleDy: 28,
    headerDy: 68,
    bodyDy: 104,
    rowStride: 32,
    headerSize: 18,
    bodySize: 18,
    headerColor: theme.blue,
    bodyColor: theme.text,
    headerWeight: 'bold',
  };
}

export function createMatrix(theme: ThemeTokens, x: number, y: number): MatrixElement {
  const labels = ['A', 'B', 'C'];
  const pattern = [
    [CELL_PRESETS[1], CELL_PRESETS[0], CELL_PRESETS[2]],
    [CELL_PRESETS[0], CELL_PRESETS[1], CELL_PRESETS[0]],
    [CELL_PRESETS[2], CELL_PRESETS[0], CELL_PRESETS[1]],
  ];
  return {
    ...base('Matrise', x, y, 620, 340),
    type: 'matrix',
    title: 'Matrise',
    subtitle: 'rad = fra, kolonne = til',
    titleSize: 28,
    titleColor: theme.title,
    subtitleSize: 16,
    subtitleColor: theme.muted,
    rowLabels: labels,
    colLabels: labels,
    cells: pattern.map((row) => row.map((cell) => ({ ...cell }))),
    notes: [],
    labelSize: 18,
    labelColor: theme.blue,
    cellTextSize: 16,
    noteSize: 16,
    noteColor: theme.text,
    radius: 6,
    titleDy: 28,
    subtitleDy: 52,
    colHeaderDy: 82,
    cellX: 90,
    cellY: 96,
    cellW: 150,
    cellH: 40,
    strideX: 158,
    strideY: 48,
    rowLabelDy: 26,
    cellTextDy: 26,
    noteDy: 260,
    noteStride: 24,
  };
}

export function createConnector(
  theme: ThemeTokens,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  routing: Routing,
  dashed = false,
): ConnectorElement {
  return {
    ...base('Kobling', Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1) || 8, Math.abs(y2 - y1) || 8),
    type: 'connector',
    points: [
      { mode: 'abs', x: x1, y: y1 },
      { mode: 'abs', x: x2, y: y2 },
    ],
    routing,
    stroke: theme.line,
    strokeWidth: 4,
    dash: dashed ? [14, 10] : null,
    label: '',
    labelSize: 16,
    labelColor: theme.text,
    startDot: false,
    endDot: false,
    arrow: false,
  };
}

export function themeOf(id: ThemeId): ThemeTokens {
  return themeById(id);
}

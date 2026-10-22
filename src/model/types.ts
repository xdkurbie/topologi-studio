export const FORMAT = 'topologi-studio' as const;
export const FILE_VERSION = 1 as const;
export const APP_VERSION = '0.1.4';

export type ThemeId = 'dark' | 'light';
export type Align = 'start' | 'middle' | 'end';
export type FontWeight = 'normal' | 'bold';
export type Port = 'n' | 's' | 'e' | 'w' | 'c';
export type Routing = 'straight' | 'orthogonal' | 'polyline';
export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type IconKind =
  | 'globe'
  | 'ont'
  | 'switch'
  | 'ap'
  | 'laptop'
  | 'pc'
  | 'phone'
  | 'server'
  | 'junction'
  | 'router'
  | 'firewall'
  | 'cloud'
  | 'vm'
  | 'nas'
  | 'printer'
  | 'camera'
  | 'wifi';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ElementBase extends Box {
  id: string;
  name: string;
  z: number;
  locked: boolean;
  opacity: number;
}

export interface TextElement extends ElementBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontWeight: FontWeight;
  color: string;
  align: Align;
}

export interface CardRow {
  text: string;
  color: string;
}

export interface CardElement extends ElementBase {
  type: 'card';
  title: string;
  titleSize: number;
  titleColor: string;
  titleWeight: FontWeight;
  rows: CardRow[];
  rowSize: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  autoHeight: boolean;
  frameH: number;
  padX: number;
  titleDy: number;
  rowDy: number;
  rowStride: number;
}

export interface PillElement extends ElementBase {
  type: 'pill';
  text: string;
  fontSize: number;
  textColor: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  autoWidth: boolean;
  charW: number;
  padW: number;
}

export interface IconElement extends ElementBase {
  type: 'icon';
  icon: IconKind;
  fill: string;
  accent: string;
  stroke: string;
  strokeWidth: number;
  glyph: string;
  glyphSize: number;
  glyphColor: string;
  ports: number;
  portFill: string;
}

export interface ImageElement extends ElementBase {
  type: 'image';
  href: string;
  mime: string;
}

export interface TableElement extends ElementBase {
  type: 'table';
  title: string;
  showTitle: boolean;
  titleSize: number;
  titleColor: string;
  titleWeight: FontWeight;
  headers: string[];
  rows: string[][];
  colX: number[];
  titleDy: number;
  headerDy: number;
  bodyDy: number;
  rowStride: number;
  headerSize: number;
  bodySize: number;
  headerColor: string;
  bodyColor: string;
  headerWeight: FontWeight;
}

export interface MatrixCell {
  text: string;
  fill: string;
  color: string;
}

export interface MatrixElement extends ElementBase {
  type: 'matrix';
  title: string;
  subtitle: string;
  titleSize: number;
  titleColor: string;
  subtitleSize: number;
  subtitleColor: string;
  rowLabels: string[];
  colLabels: string[];
  cells: MatrixCell[][];
  notes: string[];
  labelSize: number;
  labelColor: string;
  cellTextSize: number;
  noteSize: number;
  noteColor: string;
  radius: number;
  titleDy: number;
  subtitleDy: number;
  colHeaderDy: number;
  cellX: number;
  cellY: number;
  cellW: number;
  cellH: number;
  strideX: number;
  strideY: number;
  rowLabelDy: number;
  cellTextDy: number;
  noteDy: number;
  noteStride: number;
}

export interface ZoneElement extends ElementBase {
  type: 'zone';
  title: string;
  subtitle: string;
  titleSize: number;
  titleColor: string;
  subtitleSize: number;
  subtitleColor: string;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  dash: [number, number] | null;
  radius: number;
  padX: number;
  titleDy: number;
  subtitleDy: number;
}

export type Anchor =
  | { mode: 'abs'; x: number; y: number }
  | { mode: 'el'; id: string; port: Port; t: number; ox: number; oy: number };

export interface ConnectorElement extends ElementBase {
  type: 'connector';
  points: Anchor[];
  routing: Routing;
  stroke: string;
  strokeWidth: number;
  dash: [number, number] | null;
  label: string;
  labelSize: number;
  labelColor: string;
  startDot: boolean;
  endDot: boolean;
  arrow: boolean;
}

export type TopoElement =
  | TextElement
  | CardElement
  | PillElement
  | IconElement
  | ImageElement
  | TableElement
  | MatrixElement
  | ZoneElement
  | ConnectorElement;

export type ElementType = TopoElement['type'];

export interface TopoMeta {
  title: string;
  theme: ThemeId;
  grid: number;
  snap: boolean;
  updated: string;
  appVersion: string;
}

export interface TopoDocument {
  format: typeof FORMAT;
  version: typeof FILE_VERSION;
  meta: TopoMeta;
  canvas: { width: number; height: number; background: string };
  elements: TopoElement[];
}

export interface Guide {
  axis: 'x' | 'y';
  at: number;
}

export const ICON_NATIVE: Record<IconKind, { w: number; h: number }> = {
  globe: { w: 76, h: 76 },
  ont: { w: 220, h: 38 },
  switch: { w: 220, h: 38 },
  ap: { w: 84, h: 84 },
  laptop: { w: 140, h: 74 },
  pc: { w: 110, h: 76 },
  phone: { w: 48, h: 84 },
  server: { w: 120, h: 64 },
  junction: { w: 28, h: 28 },
  router: { w: 96, h: 64 },
  firewall: { w: 88, h: 72 },
  cloud: { w: 120, h: 72 },
  vm: { w: 120, h: 80 },
  nas: { w: 120, h: 72 },
  printer: { w: 100, h: 72 },
  camera: { w: 88, h: 64 },
  wifi: { w: 72, h: 72 },
};

export const CELL_PRESETS: MatrixCell[] = [
  { text: 'Allow All', fill: '#1f5a35', color: '#4cd97b' },
  { text: 'Block All', fill: '#5a1f24', color: '#ff6b6b' },
  { text: 'Allow Return', fill: '#1f3f5a', color: '#8fc1ff' },
];

export function cycleCell(cell: MatrixCell): MatrixCell {
  const index = CELL_PRESETS.findIndex((preset) => preset.text === cell.text);
  const next = CELL_PRESETS[(index + 1) % CELL_PRESETS.length];
  return { ...next };
}

export function typeLabel(type: ElementType): string {
  switch (type) {
    case 'card':
      return 'Kort';
    case 'text':
      return 'Tekst';
    case 'pill':
      return 'Pille';
    case 'icon':
      return 'Enhet';
    case 'image':
      return 'Bilde';
    case 'table':
      return 'Tabell';
    case 'matrix':
      return 'Matrise';
    case 'zone':
      return 'Sone';
    case 'connector':
      return 'Kobling';
  }
}

export function iconLabel(icon: IconKind): string {
  switch (icon) {
    case 'globe':
      return 'Internett';
    case 'ont':
      return 'Modem';
    case 'switch':
      return 'Svitsj';
    case 'ap':
      return 'Aksesspunkt';
    case 'laptop':
      return 'Bærbar';
    case 'pc':
      return 'PC';
    case 'phone':
      return 'Telefon';
    case 'server':
      return 'Server';
    case 'junction':
      return 'Knute';
    case 'router':
      return 'Ruter';
    case 'firewall':
      return 'Brannmur';
    case 'cloud':
      return 'Sky';
    case 'vm':
      return 'Virtuell maskin';
    case 'nas':
      return 'NAS';
    case 'printer':
      return 'Skriver';
    case 'camera':
      return 'Kamera';
    case 'wifi':
      return 'Wi-Fi';
  }
}

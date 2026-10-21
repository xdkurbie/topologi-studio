import { normalize } from '../model/edit';
import { APP_VERSION, FORMAT, FILE_VERSION, type Anchor, type CardElement, type CardRow, type ConnectorElement, type IconElement, type IconKind, type MatrixCell, type MatrixElement, type PillElement, type Port, type TableElement, type TextElement, type TopoDocument, type TopoElement } from '../model/types';
import { CELL_PRESETS } from '../model/types';
import { themeById } from '../model/theme';

const T = '#d6dde8';
const B = '#8fc1ff';
const Y = '#f5c542';
const G = '#4cd97b';
const GR = '#7a8494';
const LINE = '#4a90e2';
const CARD = '#1f2530';
const BORDER = '#3a4555';

function abs(x: number, y: number): Anchor {
  return { mode: 'abs', x, y };
}

function rel(id: string, port: Port, ox = 0, oy = 0, t = 0.5): Anchor {
  return { mode: 'el', id, port, t, ox, oy };
}

function card(id: string, name: string, cx: number, y: number, w: number, title: string, rows: CardRow[], stroke = BORDER): CardElement {
  return {
    id,
    name,
    type: 'card',
    x: cx - w / 2,
    y,
    w,
    h: 54 + rows.length * 32,
    z: 0,
    locked: false,
    opacity: 1,
    title,
    titleSize: 25,
    titleColor: '#fff',
    titleWeight: 'bold',
    rows,
    rowSize: 21,
    fill: CARD,
    stroke,
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

function pill(id: string, name: string, cx: number, cy: number, text: string, stroke = LINE, textColor = B): PillElement {
  const w = text.length * 12.5 + 40;
  return {
    id,
    name,
    type: 'pill',
    x: cx - w / 2,
    y: cy - 20,
    w,
    h: 40,
    z: 0,
    locked: false,
    opacity: 1,
    text,
    fontSize: 20,
    textColor,
    fill: '#14171c',
    stroke,
    strokeWidth: 2.5,
    autoWidth: true,
    charW: 12.5,
    padW: 40,
  };
}

function icon(
  id: string,
  kind: IconKind,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  extras: Partial<IconElement> = {},
): IconElement {
  return {
    id,
    name: id,
    type: 'icon',
    icon: kind,
    x,
    y,
    w,
    h,
    z: 0,
    locked: false,
    opacity: 1,
    fill,
    accent: '#4a90e2',
    stroke: '#8fc1ff',
    strokeWidth: 2,
    glyph: '',
    glyphSize: 16,
    glyphColor: '#fff',
    ports: 0,
    portFill: '#556',
    ...extras,
  };
}

function wire(id: string, name: string, points: Anchor[], dashed = false): ConnectorElement {
  return {
    id,
    name,
    type: 'connector',
    x: 0,
    y: 0,
    w: 8,
    h: 8,
    z: 0,
    locked: false,
    opacity: 1,
    points,
    routing: 'polyline',
    stroke: LINE,
    strokeWidth: 4,
    dash: dashed ? [14, 10] : null,
    label: '',
    labelSize: 16,
    labelColor: T,
    startDot: false,
    endDot: false,
    arrow: false,
  };
}

function cell(kind: 'Allow' | 'Block' | 'Return'): MatrixCell {
  if (kind === 'Allow') return { ...CELL_PRESETS[0] };
  if (kind === 'Block') return { ...CELL_PRESETS[1] };
  return { ...CELL_PRESETS[2] };
}

export function unifiTemplate(): TopoDocument {
  const title: TextElement = {
    id: 'text-title',
    name: 'Tittel',
    type: 'text',
    x: 200,
    y: 22,
    w: 1500,
    h: 48,
    z: 0,
    locked: false,
    opacity: 1,
    text: 'Nettverkstopologi – UniFi Dream Machine SE',
    fontSize: 44,
    fontWeight: 'bold',
    color: '#fff',
    align: 'middle',
  };
  const subtitle: TextElement = {
    id: 'text-sub',
    name: 'Undertittel',
    type: 'text',
    x: 200,
    y: 81,
    w: 1500,
    h: 28,
    z: 0,
    locked: false,
    opacity: 1,
    text: 'Lars · oppdatert 19.10.2026',
    fontSize: 23,
    fontWeight: 'normal',
    color: '#9aa6b8',
    align: 'middle',
  };

  const table: TableElement = {
    id: 'table-vlan',
    name: 'VLAN-tabell',
    type: 'table',
    x: 60,
    y: 1610,
    w: 990,
    h: 280,
    z: 0,
    locked: false,
    opacity: 1,
    title: 'VLAN-er',
    showTitle: true,
    titleSize: 30,
    titleColor: '#fff',
    titleWeight: 'bold',
    headers: ['Navn', 'VLAN', 'Subnett', 'Gateway', 'DHCP-adresser'],
    colX: [0, 190, 310, 600, 840],
    titleDy: 30,
    headerDy: 80,
    bodyDy: 120,
    rowStride: 36,
    headerSize: 21,
    bodySize: 21,
    headerColor: B,
    bodyColor: T,
    headerWeight: 'bold',
    rows: [
      ['Default', '1', '192.168.1.0/24', '192.168.1.1', '249'],
      ['custom1', '10', '192.168.20.0/26', '192.168.20.1', '61'],
      ['custom2', '20', '192.168.30.0/25', '192.168.30.1', '125'],
      ['custom3', '30', '192.168.40.0/27', '192.168.40.1', '29'],
      ['custom4', '40', '192.168.50.0/28', '192.168.50.1', '13'],
    ],
  };

  const matrix: MatrixElement = {
    id: 'matrix-fw',
    name: 'Brannmur',
    type: 'matrix',
    x: 1060,
    y: 1610,
    w: 980,
    h: 390,
    z: 0,
    locked: false,
    opacity: 1,
    title: 'Brannmur mellom VLAN-er',
    subtitle: 'rad = fra, kolonne = til',
    titleSize: 30,
    titleColor: '#fff',
    subtitleSize: 18,
    subtitleColor: '#9aa6b8',
    rowLabels: ['custom1', 'custom2', 'custom3', 'custom4'],
    colLabels: ['custom1', 'custom2', 'custom3', 'custom4'],
    cells: [
      [cell('Block'), cell('Allow'), cell('Block'), cell('Return')],
      [cell('Allow'), cell('Block'), cell('Allow'), cell('Return')],
      [cell('Block'), cell('Return'), cell('Block'), cell('Return')],
      [cell('Allow'), cell('Allow'), cell('Allow'), cell('Block')],
    ],
    notes: [
      '• Alle custom-VLAN: internett (External) og Gateway = Allow All',
      '• Alle custom-VLAN → Internal, VPN, Hotspot, DMZ = Block All',
    ],
    labelSize: 20,
    labelColor: B,
    cellTextSize: 18,
    noteSize: 19,
    noteColor: T,
    radius: 6,
    titleDy: 30,
    subtitleDy: 60,
    colHeaderDy: 90,
    cellX: 153,
    cellY: 105,
    cellW: 144,
    cellH: 40,
    strideX: 150,
    strideY: 46,
    rowLabelDy: 38,
    cellTextDy: 28,
    noteDy: 329,
    noteStride: 32,
  };

  const elements: TopoElement[] = [
    title,
    subtitle,
    wire('wire-backbone', 'Stamlinje', [rel('icon-globe', 'c', 0, 5), rel('icon-j1', 'c')]),
    wire('wire-bus', 'Hovedbuss', [abs(450, 600), rel('icon-j1', 'c'), abs(1350, 600)]),
    wire('wire-drop-ap', 'Ned til AP', [abs(450, 600), rel('icon-ap', 'n', 0, -3)]),
    wire('wire-drop-sw', 'Ned til svitsj', [abs(1350, 600), abs(1350, 700)]),
    wire('wire-u7', 'Fra U7 Pro', [rel('card-u7', 's', 0, -14), rel('icon-j2', 'c')]),
    wire('wire-wifi-bus', 'Wi-Fi-buss', [abs(250, 1200), rel('icon-j2', 'c'), abs(650, 1200)]),
    wire('wire-air', 'Til Larss-Air', [abs(250, 1200), rel('icon-laptop-air', 'n')], true),
    wire('wire-phone', 'Til iPhone', [abs(650, 1200), rel('icon-phone', 'n', 0, 5)], true),
    wire('wire-elbow', 'Fra USW', [rel('card-usw', 's'), abs(1350, 1150), abs(1370, 1150), rel('icon-j3', 'c')]),
    wire('wire-clients', 'Klientbuss', [abs(1020, 1200), rel('icon-j3', 'c'), abs(1720, 1200)]),
    wire('wire-vm', 'Til Hyper-V', [abs(1020, 1200), rel('icon-laptop-vm', 'n')]),
    wire('wire-pc', 'Til stasjonær', [abs(1370, 1200), rel('icon-pc', 'n')]),
    wire('wire-srv', 'Til lab14', [abs(1720, 1200), rel('icon-server', 'n', 0, -5)]),
    icon('icon-globe', 'globe', 862, 132, 76, 76, '#1f4fa8', { strokeWidth: 0, glyph: 'G', glyphSize: 40, name: 'Internett' }),
    card('card-internet', 'Internett', 900, 222, 460, 'Internett – GlobalConnect', [
      ['WAN1: 10.0.8.214', B],
      ['Latency 10 ms · uptime 100 %', T],
    ].map(([text, color]) => ({ text, color }))),
    icon('icon-ont', 'ont', 790, 380, 220, 38, '#e8ebef', { strokeWidth: 0, ports: 6, name: 'Modem' }),
    card('card-gateway', 'Gateway', 900, 432, 520, 'LARS (UDM SE) – gateway', [
      { text: '192.168.1.1/24 · VLAN 1 (Default)', color: T },
      { text: 'VPN-server: Teleport', color: Y },
    ]),
    wire('wire-udm', 'Til portliste', [rel('card-gateway', 'e', 0, 9), rel('card-tagger', 'w', 0, 111)], true),
    card('card-tagger', 'VLAN-tagger', 1530, 250, 440, 'UDM SE – VLAN-tagger per port', [
      { text: 'Port 2 → custom3 (30) · U7 Pro', color: B },
      { text: 'Port 5 → custom4 (40)', color: B },
      { text: 'Port 6 → custom3 (30)', color: B },
      { text: 'Port 7 → custom2 (20)', color: B },
      { text: 'Port 8 → custom1 (10)', color: B },
      { text: 'Øvrige porter → Default (1)', color: T },
      { text: '(inkl. port 1 → USW)', color: GR },
    ]),
    icon('icon-j1', 'junction', 886, 586, 28, 28, LINE, { strokeWidth: 0, name: 'Knute senter' }),
    pill('pill-port2', 'Port 2', 450, 650, 'Port 2 · GbE · VLAN 30'),
    pill('pill-port1', 'Port 1', 1350, 650, 'Port 1 → 1 · GbE · VLAN 1 · STP 32768'),
    icon('icon-ap', 'ap', 408, 703, 84, 84, '#f2f4f7', { strokeWidth: 0, accent: LINE, name: 'U7 Pro' }),
    card('card-u7', 'U7 Pro', 450, 800, 460, 'U7 Pro (AP)', [
      { text: '192.168.40.16 · VLAN 30 (custom3)', color: T },
      { text: '2,4 GHz: ch 1 (20 MHz)', color: B },
      { text: '5 GHz: ch 153 (40 MHz)', color: B },
      { text: '6 GHz: ch 117 (160 MHz)', color: B },
      { text: 'SSID: lars wifi · WPA2/WPA3', color: G },
    ]),
    icon('icon-j2', 'junction', 436, 1186, 28, 28, LINE, { strokeWidth: 0, name: 'Knute AP' }),
    icon('icon-switch', 'switch', 1240, 715, 220, 38, '#e8ebef', { strokeWidth: 0, ports: 12, name: 'Svitsj' }),
    card('card-usw', 'USW-24-G2', 1350, 770, 460, 'USW-24-G2 (switch)', [
      { text: '192.168.1.62/24 · VLAN 1 (Default)', color: T },
      { text: 'gw: 192.168.1.1', color: T },
      { text: 'VLAN-tagger (access-porter):', color: Y },
      { text: 'Port 1–5   → Default (1)', color: B },
      { text: 'Port 6–10  → custom1 (10)', color: B },
      { text: 'Port 11–15 → custom2 (20)', color: B },
      { text: 'Port 16–20 → custom3 (30)', color: B },
      { text: 'Port 21–24 → custom4 (40)', color: B },
    ]),
    icon('icon-j3', 'junction', 1356, 1186, 28, 28, LINE, { strokeWidth: 0, name: 'Knute svitsj' }),
    pill('pill-wifi', 'Wi-Fi', 250, 1250, 'WiFi 5 · 2x2 · ch 153', G, G),
    pill('pill-offline', 'Offline', 650, 1250, 'VLAN 40 · offline', GR, GR),
    icon('icon-laptop-air', 'laptop', 180, 1300, 140, 74, '#2d3644', { accent: B, name: 'Larss-Air-enhet' }),
    card('card-air', 'Larss-Air', 250, 1400, 360, 'Larss-Air', [
      { text: '192.168.40.14/27', color: T },
      { text: 'VLAN 30 (custom3)', color: T },
      { text: 'gw: 192.168.40.1', color: T },
      { text: 'Experience: Excellent', color: G },
    ]),
    icon('icon-phone', 'phone', 626, 1295, 48, 84, '#2d3644', { opacity: 0.5, name: 'iPhone-enhet' }),
    card('card-iphone', 'iPhone', 650, 1400, 360, 'iPhone', [
      { text: '192.168.50.4/28', color: T },
      { text: 'VLAN 40 (custom4)', color: T },
      { text: 'gw: 192.168.50.1', color: T },
      { text: 'Status: offline', color: GR },
    ], '#2a3140'),
    pill('pill-vm', 'Port 8 VM', 1020, 1250, 'Port 8 · VLAN 10'),
    pill('pill-pc', 'Port 8 PC', 1370, 1250, 'Port 8 · VLAN 10'),
    pill('pill-lab', 'Port 14', 1720, 1250, 'Port 14 · VLAN 20'),
    icon('icon-laptop-vm', 'laptop', 950, 1300, 140, 74, '#2d3644', { accent: B, name: 'Hyper-V-enhet' }),
    icon('icon-pc', 'pc', 1315, 1300, 110, 76, '#2d3644', { accent: B, name: 'Stasjonær' }),
    icon('icon-server', 'server', 1660, 1305, 120, 64, '#3a4250', { name: 'lab14-enhet' }),
    card('card-vm', 'Hyper-V VM', 1020, 1400, 330, 'Hyper-V VM', [
      { text: 'MAC 00:15:5d:0e:05:01', color: T },
      { text: '192.168.88.122 (statisk?)', color: Y },
      { text: 'VLAN 10 (custom1)', color: T },
    ]),
    card('card-desktop', 'DESKTOP-ROP', 1370, 1400, 330, 'DESKTOP-ROP…', [
      { text: '192.168.20.50/26', color: T },
      { text: 'VLAN 10 (custom1)', color: T },
      { text: 'gw: 192.168.20.1', color: T },
    ]),
    card('card-lab', 'lab14', 1720, 1400, 330, 'lab14', [
      { text: '192.168.30.93/25', color: T },
      { text: 'VLAN 20 (custom2)', color: T },
      { text: 'gw: 192.168.30.1', color: T },
    ]),
    table,
    matrix,
  ];
  elements.forEach((element, index) => {
    element.z = index + 1;
  });

  return normalize({
    format: FORMAT,
    version: FILE_VERSION,
    meta: {
      title: 'Nettverkstopologi – UniFi Dream Machine SE',
      theme: 'dark',
      grid: 20,
      snap: true,
      updated: '2026-10-19T12:00:00.000Z',
      appVersion: APP_VERSION,
    },
    canvas: { width: 1900, height: 2080, background: '#14171c' },
    elements,
  });
}

function textBlock(id: string, name: string, x: number, baseline: number, text: string, fontSize: number, color: string, weight: TextElement['fontWeight'] = 'normal', align: TextElement['align'] = 'start', w = 800): TextElement {
  return {
    id,
    name,
    type: 'text',
    x,
    y: baseline - fontSize,
    w,
    h: fontSize + 8,
    z: 0,
    locked: false,
    opacity: 1,
    text,
    fontSize,
    fontWeight: weight,
    color,
    align,
  };
}

export function udmVlanTemplate(): TopoDocument {
  const title = textBlock('text-title', 'Tittel', 200, 66, 'Nettverkstopologi – UniFi Dream Machine SE', 44, '#fff', 'bold', 'middle', 1500);
  const subtitle = textBlock('text-sub', 'Undertittel', 200, 104, 'Lars · oppdatert 21.10.2026', 23, '#9aa6b8', 'normal', 'middle', 1500);

  const table: TableElement = {
    id: 'table-vlan',
    name: 'VLAN-tabell',
    type: 'table',
    x: 60,
    y: 1400,
    w: 980,
    h: 280,
    z: 0,
    locked: false,
    opacity: 1,
    title: 'VLAN-er',
    showTitle: true,
    titleSize: 30,
    titleColor: '#fff',
    titleWeight: 'bold',
    headers: ['Navn', 'Eier', 'VLAN', 'Subnett', 'Gateway', 'DHCP i bruk'],
    colX: [0, 115, 240, 315, 540, 740],
    titleDy: 30,
    headerDy: 80,
    bodyDy: 120,
    rowStride: 36,
    headerSize: 21,
    bodySize: 21,
    headerColor: B,
    bodyColor: T,
    headerWeight: 'bold',
    rows: [
      ['Default', '–', '1', '192.168.1.0/24', '192.168.1.1', '2 / 249'],
      ['Vlan 10', 'Mathias', '10', '192.168.10.0/24', '192.168.10.1', '0 / 249'],
      ['Vlan 20', 'Lars', '20', '192.168.20.0/24', '192.168.20.1', '0 / 249'],
      ['Vlan 30', 'Harry', '30', '192.168.30.0/24', '192.168.30.1', '1 / 249'],
      ['Transit', 'Trunk', '100', '192.168.100.0/30', '192.168.100.1', '0 / 1'],
    ],
  };

  const matrix: MatrixElement = {
    id: 'matrix-fw',
    name: 'Brannmur',
    type: 'matrix',
    x: 1060,
    y: 1400,
    w: 820,
    h: 520,
    z: 0,
    locked: false,
    opacity: 1,
    title: 'Brannmur mellom VLAN-er',
    subtitle: 'rad = fra, kolonne = til',
    titleSize: 30,
    titleColor: '#fff',
    subtitleSize: 18,
    subtitleColor: '#9aa6b8',
    rowLabels: ['Vlan 10', 'Vlan 20', 'Vlan 30', 'Transit'],
    colLabels: ['Vlan 10', 'Vlan 20', 'Vlan 30', 'Transit'],
    cells: [
      [cell('Block'), cell('Block'), cell('Block'), cell('Block')],
      [cell('Block'), cell('Block'), cell('Block'), cell('Block')],
      [cell('Block'), cell('Block'), cell('Block'), cell('Block')],
      [cell('Block'), cell('Block'), cell('Block'), cell('Block')],
    ],
    notes: [
      '• Vlan 10 = Mathias · Vlan 20 = Lars · Vlan 30 = Harry',
      '• Vlan 10/20/30/Transit → External og Gateway: Allow All',
      '• Vlan 10/20/30/Transit → Internal, VPN, Hotspot, DMZ: Block All',
      '• Internal → Vlan 10/20/30/Transit: Block All',
      '• External → alle soner: Allow Return',
      '• Gateway → alle soner: Allow All',
    ],
    labelSize: 20,
    labelColor: B,
    cellTextSize: 18,
    noteSize: 19,
    noteColor: T,
    radius: 6,
    titleDy: 30,
    subtitleDy: 60,
    colHeaderDy: 100,
    cellX: 153,
    cellY: 115,
    cellW: 144,
    cellH: 40,
    strideX: 150,
    strideY: 46,
    rowLabelDy: 28,
    cellTextDy: 28,
    noteDy: 339,
    noteStride: 32,
  };

  const elements: TopoElement[] = [
    title,
    subtitle,
    wire('wire-isp', 'Til Internett', [rel('icon-isp', 's'), rel('card-internet', 'n')]),
    wire('wire-wan', 'WAN1', [rel('card-internet', 's'), rel('card-udm', 'n')]),
    wire('wire-down', 'Ned fra UDM', [rel('card-udm', 's'), rel('icon-j1', 'c')]),
    wire('wire-bus', 'Hovedbuss', [abs(450, 700), rel('icon-j1', 'c'), abs(1350, 700)]),
    wire('wire-pc', 'Til Windows PC', [abs(450, 700), rel('card-pc', 'n')]),
    wire('wire-trunk', 'Til USW', [abs(1350, 700), rel('card-usw', 'n')]),
    wire('wire-ports', 'Til portliste', [rel('card-udm', 'e', 0, 0, 88 / 182), rel('card-ports', 'w', 0, 0, 270 / 310)], true),
    icon('icon-isp', 'globe', 862, 132, 76, 76, '#1f4fa8', { strokeWidth: 0, glyph: 'G', glyphSize: 40, name: 'GlobalConnect' }),
    icon('icon-udm', 'switch', 790, 380, 220, 38, '#e8ebef', { strokeWidth: 0, ports: 6, name: 'UDM' }),
    icon('icon-pc', 'pc', 394, 799, 110, 76, '#2d3644', { accent: B, name: 'Windows PC' }),
    icon('icon-switch', 'switch', 1235, 815, 220, 38, '#e8ebef', { strokeWidth: 0, ports: 12, name: 'Svitsj' }),
    icon('icon-j1', 'junction', 886, 686, 28, 28, LINE, { strokeWidth: 0, name: 'Knute' }),
    pill('pill-port1', 'Port 1', 450, 750, 'Port 1 · GbE · Default (1)'),
    pill('pill-trunk', 'Trunk', 1350, 750, 'Port 11 SFP+ → Port 26 · Trunk · native 100', Y, Y),
    card('card-internet', 'Internett', 900, 222, 460, 'Internett – GlobalConnect', [
      { text: 'WAN1 (UDM port 9): 192.168.8.220', color: B },
      { text: 'Latency 10 ms · uptime 100 %', color: T },
    ]),
    card('card-udm', 'UDM SE', 900, 432, 520, 'UDM SE – gateway', [
      { text: '192.168.1.1 · Default (VLAN 1)', color: T },
      { text: 'MAC 70:a7:41:b5:c5:75', color: T },
      { text: 'Versjon 5.1.33 · PoE 0/180 W', color: T },
      { text: 'Ruter + DHCP for alle nett', color: Y },
    ]),
    card('card-ports', 'UDM-porter', 1565, 250, 530, 'UDM SE – native VLAN per port', [
      { text: 'Port 1–2 → Default (1)', color: T },
      { text: 'Port 3–4 → Vlan 10 · Mathias', color: B },
      { text: 'Port 5–6 → Vlan 20 · Lars', color: B },
      { text: 'Port 7–8 → Vlan 30 · Harry', color: B },
      { text: 'Port 9 → WAN1 (GlobalConnect)', color: T },
      { text: 'Port 11 SFP+ → Transit (100)', color: Y },
      { text: '   tagget: 1/10/20/30 (trunk)', color: Y },
      { text: 'Øvrige VLAN tagget på portene', color: GR },
    ]),
    card('card-pc', 'Windows PC', 450, 900, 440, 'Windows PC (0d:ae)', [
      { text: 'UDM SE port 1 · GbE', color: T },
      { text: 'Default (VLAN 1)', color: T },
      { text: '192.168.1.0/24 · gw 192.168.1.1', color: T },
    ]),
    card('card-usw', 'USW-24-G2', 1350, 870, 580, 'USW-24-G2 (switch)', [
      { text: '192.168.1.64 · Default (VLAN 1)', color: T },
      { text: 'MAC 58:d6:1f:5e:eb:db', color: T },
      { text: 'Versjon 7.5.15', color: T },
      { text: 'Uplink: port 26 (SFP) → UDM port 11', color: B },
      { text: 'SFP+-link på GbE', color: B },
      { text: 'Native VLAN per port:', color: Y },
      { text: 'Port 1–6   → Vlan 10 · Mathias', color: B },
      { text: 'Port 7–12  → Vlan 20 · Lars', color: B },
      { text: 'Port 13–18 → Vlan 30 · Harry', color: B },
      { text: 'Port 19–24 → Default (1)', color: T },
      { text: 'Port 25    → Default (1)', color: T },
      { text: 'Port 26    → Transit (100), tagget 1/10/20/30', color: Y },
      { text: 'Ingen klienter ennå', color: GR },
    ]),
    table,
    textBlock('text-vlan-note-1', 'VLAN-merknad', 60, 1730, '• Alle nett rutes på UDM SE (DHCP-server, gw = .1)', 19, T, 'normal', 'start', 720),
    textBlock('text-vlan-note-2', 'VLAN 30-merknad', 60, 1762, '• Vlan 30: 1 lease – ukjent enhet', 19, Y, 'normal', 'start', 720),
    matrix,
  ];
  elements.forEach((element, index) => {
    element.z = index + 1;
  });

  return normalize({
    format: FORMAT,
    version: FILE_VERSION,
    meta: {
      title: 'Nettverkstopologi – UniFi Dream Machine SE',
      theme: 'dark',
      grid: 20,
      snap: true,
      updated: '2026-10-21T12:00:00.000Z',
      appVersion: APP_VERSION,
    },
    canvas: { width: 1900, height: 1940, background: '#14171c' },
    elements,
  });
}

export interface DiagramTemplate {
  id: 'unifi' | 'udm-vlan';
  name: string;
  blurb: string;
  create: () => TopoDocument;
}

export function diagramTemplates(): DiagramTemplate[] {
  return [
    {
      id: 'unifi',
      name: 'UniFi Dream Machine SE',
      blurb: 'Kort, linjer, VLAN-tabell og brannmur. Lars · 19.10.2026.',
      create: unifiTemplate,
    },
    {
      id: 'udm-vlan',
      name: 'UniFi UDM SE – Mathias/Lars/Harry VLAN (21.10.2026)',
      blurb: 'Mathias, Lars og Harry. VLAN, trunk og brannmur. 21.10.2026.',
      create: udmVlanTemplate,
    },
  ];
}

export function blankDocument(themeId: 'dark' | 'light' = 'dark'): TopoDocument {
  const theme = themeById(themeId);
  return normalize({
    format: FORMAT,
    version: FILE_VERSION,
    meta: {
      title: 'Uten navn',
      theme: themeId,
      grid: 20,
      snap: true,
      updated: new Date().toISOString(),
      appVersion: APP_VERSION,
    },
    canvas: { width: 1600, height: 1200, background: theme.background },
    elements: [],
  });
}

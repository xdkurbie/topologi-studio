import { normalize } from '../model/edit';
import { APP_VERSION, FILE_VERSION, FORMAT, CELL_PRESETS, type CardElement, type CardRow, type MatrixCell, type MatrixElement, type TableElement, type TopoDocument, type TopoElement } from '../model/types';
import { card, icon, pill, rel, textBlock, wire } from './unifi';

const T = '#d6dde8';
const B = '#8fc1ff';
const Y = '#f5c542';
const G = '#4cd97b';
const GR = '#7a8494';
const LINE = '#4a90e2';
const BORDER = '#3a4555';

function rows(items: [string, string][]): CardRow[] {
  return items.map(([text, color]) => ({ text, color }));
}

/** Keep the measured box. autoHeight follows frameH + rows, so normalize does not resize it. */
function box(id: string, name: string, x: number, y: number, w: number, h: number, title: string, lines: [string, string][]): CardElement {
  // The PDF raster sits one device pixel up and left of a rect drawn at the measured fill.
  const left = x - 2;
  const top = y - 2;
  const body = rows(lines);
  const base = card(id, name, left + w / 2, top, w, title, body);
  return { ...base, x: left, w, h, frameH: h - body.length * base.rowStride };
}

function block(): MatrixCell {
  return { ...CELL_PRESETS[1] };
}

export function udmLarsTemplate(): TopoDocument {
  const title = textBlock('text-title', 'Tittel', 103, 59, 'Nettverkstopologi – UniFi Dream Machine SE', 44, '#fff', 'bold', 'start', 1400);
  const subtitle = textBlock('text-sub', 'Undertittel', 270, 89, 'Lars · oppdatert 21.10.2026', 23, '#9aa6b8', 'normal', 'start', 700);

  const table: TableElement = {
    id: 'table-vlan',
    name: 'VLAN-tabell',
    type: 'table',
    x: 21,
    y: 1713,
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
    x: 1022,
    y: 1713,
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
      [block(), block(), block(), block()],
      [block(), block(), block(), block()],
      [block(), block(), block(), block()],
      [block(), block(), block(), block()],
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
    wire('wire-wan', 'Fra Internett', [rel('card-internet', 's'), rel('icon-udm', 'n')]),
    wire('wire-sw-udm', 'Til UDM', [rel('icon-udm', 's'), rel('card-udm', 'n')]),
    wire('wire-udm-trunk', 'Til trunk', [rel('card-udm', 's'), rel('pill-trunk', 'n')]),
    wire('wire-trunk-sw', 'Fra trunk', [rel('pill-trunk', 's'), rel('icon-switch', 'n')]),
    wire('wire-sw-usw', 'Til USW', [rel('icon-switch', 's'), rel('card-usw', 'n')]),
    wire('wire-usw-ap', 'Til aksesspunkt', [rel('card-usw', 's'), rel('icon-ap', 'n')]),
    wire('wire-ports', 'Til portliste', [rel('card-udm', 'e', 0, 0, (512 - 424) / 179), rel('card-ports', 'w', 0, 0, (512 - 242) / 307)], true, LINE, 3),
    wire('wire-bus', 'Mot MikroTik', [rel('icon-switch', 'e'), { mode: 'abs', x: 1187, y: 785 }, rel('icon-router', 'n')]),
    wire('wire-port4', 'Port 4', [rel('card-mikrotik', 'w'), { mode: 'abs', x: 872, y: 1046 }, rel('icon-laptop', 'n')]),
    wire('wire-port3', 'port 3', [rel('card-mikrotik', 's'), rel('icon-pc', 'n')]),
    wire('wire-vm', 'Til virtuelle maskiner', [rel('icon-pc', 's'), rel('icon-server', 'n')], false, G, 4),
    icon('icon-isp', 'globe', 388, 125, 76, 76, '#1f4fa8', { strokeWidth: 0, glyph: 'G', glyphSize: 40, name: 'GlobalConnect' }),
    icon('icon-udm', 'switch', 316, 373, 220, 38, '#e8ebef', { strokeWidth: 0, ports: 6, name: 'UDM' }),
    icon('icon-switch', 'switch', 316, 766, 220, 38, '#e8ebef', { strokeWidth: 0, ports: 12, name: 'USW' }),
    icon('icon-router', 'router', 1139, 861, 96, 64, '#2d3644', { accent: LINE, name: 'MikroTik-enhet' }),
    icon('icon-pc', 'pc', 1131, 1274, 110, 76, '#2d3644', { accent: B, name: 'PC' }),
    icon('icon-laptop', 'laptop', 802, 1351, 140, 74, '#2d3644', { accent: LINE, name: 'Laptop' }),
    icon('icon-ap', 'ap', 382, 1347, 84, 84, '#2d3644', { strokeWidth: 0, accent: LINE, name: 'Aksesspunkt' }),
    icon('icon-vm', 'vm', 1127, 1425, 120, 80, '#2d3644', { accent: LINE, name: 'VM' }),
    icon('icon-server', 'server', 1127, 1618, 120, 64, '#2d3644', { accent: LINE, name: 'VM-vert' }),
    pill('pill-trunk', 'Trunk', 426, 701, 'Port 11 SFP+ → Port 26 · Trunk · native 100', Y, Y, 576),
    pill('pill-port12', 'Port 12', 1096, 786, 'Port 12', LINE, B, 102),
    pill('pill-port4', 'Port 4', 870, 1274, 'Port 4', LINE, B, 80),
    pill('pill-port3', 'port 3', 1188.5, 1248, 'port 3 192.168.88.121', BORDER, '#fff', 305),
    pill('pill-vswitch', 'V-switch', 1184, 1387, 'V-switch 192.168.88.122', BORDER, '#fff', 328),
    box('card-internet', 'Internett', 197, 216, 457, 115, 'Internett – GlobalConnect', [
      ['WAN1 (UDM port 9): 192.168.8.220', B],
      ['Latency 10 ms · uptime 100 %', T],
    ]),
    box('card-ports', 'UDM-porter', 827, 244, 527, 307, 'UDM SE – native VLAN per port', [
      ['Port 1–2 → Default (1)', T],
      ['Port 3–4 → Vlan 10 · Mathias', B],
      ['Port 5–6 → Vlan 20 · Lars', B],
      ['Port 7–8 → Vlan 30 · Harry', B],
      ['Port 9 → WAN1 (GlobalConnect)', T],
      ['Port 11 SFP+ → Transit (100)', Y],
      ['   tagget: 1/10/20/30 (trunk)', Y],
      ['Øvrige VLAN tagget på portene', GR],
    ]),
    box('card-udm', 'UDM SE', 167, 426, 517, 179, 'UDM SE – gateway', [
      ['192.168.1.1 · Default (VLAN 1)', T],
      ['MAC 70:a7:41:b5:c5:75', T],
      ['Versjon 5.1.33 · PoE 0/180 W', T],
      ['Ruter + DHCP for alle nett', Y],
    ]),
    box('card-usw', 'USW-24-G2', 136, 805, 577, 468, 'USW-24-G2 (switch)', [
      ['192.168.1.64 · Default (VLAN 1)', T],
      ['MAC 58:d6:1f:5e:eb:db', T],
      ['Versjon 7.5.15', T],
      ['Uplink: port 26 (SFP) → UDM port 11', B],
      ['SFP+-link på GbE', B],
      ['Native VLAN per port:', Y],
      ['Port 1–6   → Vlan 10 · Mathias', B],
      ['Port 7–12  → Vlan 20 · Lars', B],
      ['Port 13–18 → Vlan 30 · Harry', B],
      ['Port 19–24 → Default (1)', T],
      ['Port 25    → Default (1)', T],
      ['Port 26    → Transit (100), tagget 1/10/20/30', Y],
      ['Ingen klienter ennå', GR],
    ]),
    box('card-mikrotik', 'MikroTik', 1007, 925, 357, 246, 'Mikrotik Lars', [
      ['WAN 192.168.20.120/24', T],
      ['LAN 192.168.88.1', B],
      ['NAT Enabled', Y],
      ['DHCP Disabled', Y],
      ['MAC:D0:EA:11:93:D0:EE', T],
      ['ip pool 120-180', Y],
    ]),
    box('card-server', 'WINServer25', 1367, 1270, 486, 345, 'Server WINServer25', [
      ['DVD Drive WINServer25', T],
      ['NET Adapter ETH CUSTOM', B],
      ['RAM 4096', Y],
      ['Storage 50gb', T],
      ['Password: ••••••••', T],
      ['Statisk IP 192.168.88.122/24', Y],
      ['DHCP, ADDS, DNS', T],
      ['Home folder + tmp user', T],
      ['DHCP pool 120-150', B],
    ]),
    box('card-laptop', 'Laptop', 692, 1425, 357, 149, 'Fysisk klient laptop', [
      ['192.168.88.124/24', T],
      ['dns 192.168.88.122', B],
      ['Port 2', Y],
    ]),
    box('card-ap', 'Aksesspunkt', 245, 1433, 357, 141, 'Aksess punkt', [
      ['192.168.20.130', T],
      ['Wifi 2,4ghz, 5ghz og 6ghz', B],
      ['SSID x3 Mathias, Lars, Harry', Y],
    ]),
    table,
    textBlock('text-vlan-note-1', 'VLAN-merknad', 21, 2043, '• Alle nett rutes på UDM SE (DHCP-server, gw = .1)', 19, T, 'normal', 'start', 900),
    textBlock('text-vlan-note-2', 'VLAN 30-merknad', 21, 2075, '• Vlan 30: 1 lease – ukjent enhet', 19, Y, 'normal', 'start', 900),
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
      updated: '2026-10-22T12:00:00.000Z',
      appVersion: APP_VERSION,
    },
    canvas: { width: 1880, height: 2250, background: '#14171c' },
    elements,
  });
}

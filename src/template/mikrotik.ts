import { normalize } from '../model/edit';
import { APP_VERSION, FILE_VERSION, FORMAT, type CardElement, type CardRow, type TableElement, type TopoDocument, type TopoElement, type ZoneElement } from '../model/types';
import { abs, icon, textBlock, wire } from './unifi';

const INK = '#1d2430';
const MUTED = '#5b6575';
const PAPER = '#ffffff';

/**
 * Compact light-theme sketch, 22.10.2026.
 * Zones are their own objects. Link `points` become polyline elbows.
 * The firewall block has a summary and rules, and no cell grid, so the rules
 * live on the notes card instead of an empty matrix.
 */
export function mikrotikTemplate(): TopoDocument {
  const zones: ZoneElement[] = [
    zone('zone-unifi', 'UniFi', 40, 262, 1140, 370, '#3b4658', 'UniFi-nettet · VLAN 1 (Default) og 100 (Transit)', 'Ruter, DHCP og brannmur: UDM SE'),
    zone('zone-v20', 'VLAN 20', 40, 646, 1140, 262, '#0f8f8f', 'VLAN 20 · Lars · 192.168.20.0/24', 'MikroTik-WAN (dobbel NAT bak UDM)'),
    zone('zone-120', 'VLAN 120', 40, 968, 400, 470, '#2f6fd6', 'VLAN 120 · Servere', '10.20.20.0/24 · statisk · gw .1'),
    zone('zone-130', 'VLAN 130', 460, 968, 340, 470, '#1f9d55', 'VLAN 130 · Klienter', '10.20.30.0/24 · DHCP fra DC01'),
    zone('zone-110', 'VLAN 110', 820, 968, 360, 250, '#7b4bd6', 'VLAN 110 · Mgmt', '10.20.10.0/24 · DHCP på MikroTik'),
    zone('zone-140', 'VLAN 140', 820, 1238, 360, 200, '#e07b10', 'VLAN 140 · WiFi', '10.20.40.0/24 · DHCP .100–.199'),
  ];

  const vlan: TableElement = {
    id: 'table-vlan',
    name: 'VLAN-tabell',
    type: 'table',
    x: 1220,
    y: 442,
    w: 560,
    h: 330,
    z: 0,
    locked: false,
    opacity: 1,
    title: 'VLAN-er og subnett',
    showTitle: true,
    titleSize: 18,
    titleColor: INK,
    titleWeight: 'bold',
    headers: ['VLAN', 'Navn', 'Subnett', 'DHCP', 'Segment'],
    colX: [8, 62, 168, 318, 470],
    titleDy: 24,
    headerDy: 58,
    bodyDy: 90,
    rowStride: 30,
    headerSize: 13,
    bodySize: 13,
    headerColor: MUTED,
    bodyColor: INK,
    headerWeight: 'bold',
    rows: [
      ['1', 'Default', '192.168.1.0/24', 'UDM SE', 'udm'],
      ['20', 'Lars (WAN)', '192.168.20.0/24', 'UDM · .2 = MikroTik', 'udm'],
      ['100', 'Transit', '192.168.100.0/30', 'UDM SE', 'udm'],
      ['110', 'Mgmt', '10.20.10.0/24', 'MikroTik', 'mikrotik'],
      ['120', 'Servere', '10.20.20.0/24', 'statisk .10–.49', 'mikrotik'],
      ['130', 'Klienter', '10.20.30.0/24', 'DC01 (relay)', 'mikrotik'],
      ['140', 'WiFi', '10.20.40.0/24', 'MikroTik', 'mikrotik'],
    ],
  };

  const ports: TableElement = {
    id: 'table-pt-mikrotik',
    name: 'Portkart MikroTik',
    type: 'table',
    x: 1220,
    y: 1170,
    w: 540,
    h: 260,
    z: 0,
    locked: false,
    opacity: 1,
    title: 'Portkart – MikroTik hEX PoE',
    showTitle: true,
    titleSize: 16,
    titleColor: INK,
    titleWeight: 'bold',
    headers: ['Port', 'Modus', 'VLAN', 'Til'],
    colX: [0, 80, 164, 308],
    titleDy: 22,
    headerDy: 50,
    bodyDy: 76,
    rowStride: 28,
    headerSize: 13,
    bodySize: 13,
    headerColor: '#2f6fd6',
    bodyColor: INK,
    headerWeight: 'bold',
    rows: [
      ['ether1', 'WAN', '20 untagged', 'USW-24-G2 port 7'],
      ['ether2', 'Trunk', '110 + 120/130', 'lab-switch port 1'],
      ['ether3', 'Access', '130', 'DESKTOP-ROP…'],
      ['ether4', 'Trunk', '110 + 140', 'PoE+-inj. → U7 Pro'],
      ['ether5', 'Access', '110', 'Mgmt / nødport'],
      ['sfp1', 'Ledig', '–', 'valgfri SFP-modul'],
    ],
  };

  const elements: TopoElement[] = [
    ...zones,
    wire('wire-wan1', 'WAN1', [abs(610, 206), abs(610, 300)], false, '#3b4658', 4),
    wire('wire-trunk', 'Trunk', [abs(610, 394), abs(610, 486)], false, '#c99a06', 6),
    wire('wire-ether1', 'ether1', [abs(610, 580), abs(610, 726)], false, '#0f8f8f', 6),
    wire('wire-ether2', 'ether2', [abs(440, 852), abs(440, 875), abs(340, 875), abs(340, 1034)], false, '#2f6fd6', 5),
    wire('wire-ether3', 'ether3', [abs(610, 852), abs(610, 875), abs(730, 875), abs(730, 1034)], false, '#1f9d55', 4),
    wire('wire-ether4', 'ether4', [abs(780, 852), abs(780, 875), abs(1100, 875), abs(1100, 1034)], false, '#7b4bd6', 5),
    wire('wire-labsw-p3', 'lab port 3', [abs(205, 1049), abs(66, 1049), abs(66, 1332.5), abs(90, 1332.5)], false, '#2f6fd6', 3),
    wire('wire-labsw-p2', 'lab port 2', [abs(66, 1161.5), abs(90, 1161.5)], false, '#2f6fd6', 3),
    wire('wire-inj-u7', 'PoE', [abs(1060, 1064), abs(1060, 1090)], false, '#7b4bd6', 5),
    wire('wire-wifi', 'WiFi', [abs(1080, 1184), abs(1080, 1308)], true, '#e07b10', 3),
    lightCard('card-internet', 'Internett', 390, 132, 440, 74, 'Internett – GlobalConnect', [['DHCP fra ISP til UDM WAN1', MUTED]], '#3b4658', 72),
    lightCard('card-udm', 'UDM SE', 360, 300, 500, 94, 'UDM SE (gateway)', [
      ['192.168.1.1/24 · Default (VLAN 1)', INK],
      ['Port 11 SFP+ → USW port 26 (trunk)', '#c99a06'],
    ], '#3b4658', 72),
    lightCard('card-usw', 'USW', 360, 486, 500, 94, 'USW-24-G2 (switch)', [
      ['192.168.1.64/24 · VLAN 1 · reservasjon', INK],
      ['Port 7–12 → VLAN 20 (Lars)', '#0f8f8f'],
    ], '#3b4658', 72),
    lightCard('card-mikrotik', 'MikroTik', 310, 726, 600, 115, 'MikroTik hEX PoE (RB960PGS) · RouterOS 7', [
      ['ether1 WAN · 192.168.20.2 (reservasjon) · NAT', '#0f8f8f'],
      ['Gateway 10.20.x.1 for VLAN 110–140 · DNS-cache', INK],
      ['VLAN i switch-chip QCA8337 · PoE-ut av · ether5 = nødport 110', MUTED],
    ], '#0f8f8f', 72),
    lightCard('card-labsw', 'Lab-switch', 205, 1034, 180, 30, 'lab-switch (L2)', [], '#2f6fd6', 8),
    lightCard('card-dc01', 'DC01', 90, 1104, 336, 115, 'DC01', [
      ['Windows Server 2025', INK],
      ['10.20.20.10/24 · statisk', INK],
      ['AD DS · DNS · DHCP (lars.lan)', MUTED],
    ], '#2f6fd6', 68),
    lightCard('card-hv', 'Hypervisor', 90, 1275, 336, 115, 'Hypervisor-host', [
      ['Proxmox VE / Hyper-V', INK],
      ['10.20.20.20/24 · statisk', INK],
      ['VM-er i VLAN 120 og 130', MUTED],
    ], '#2f6fd6', 68),
    lightCard('card-desktop', 'DESKTOP-ROP', 478, 1034, 304, 115, 'DESKTOP-ROP…', [
      ['Admin-PC (Windows)', INK],
      ['10.20.30.50 · reservasjon', INK],
      ['DNS 10.20.20.10 · lars.lan', MUTED],
    ], '#1f9d55', 68),
    lightCard('card-clients', 'Klienter', 478, 1189, 304, 136, 'Øvrige klienter', [
      ['DHCP 10.20.30.100–.199', INK],
      ['DC01 via DHCP-relay', MUTED],
      ['på MikroTik (10.20.30.1)', MUTED],
      ['f.eks. testklient-VM', MUTED],
    ], '#1f9d55', 68),
    lightCard('card-poe', 'PoE-injektor', 965, 1034, 190, 30, 'PoE+-injektor (802.3at)', [], '#c99a06', 8),
    lightCard('card-u7pro', 'U7 Pro', 838, 1090, 324, 94, 'U7 Pro (WiFi-AP)', [
      ['10.20.10.3 · reservasjon', INK],
      ['SSID «lars wifi» → VLAN 140', '#e07b10'],
    ], '#7b4bd6', 68),
    lightCard('card-wifi', 'WiFi-klienter', 838, 1308, 324, 115, 'WiFi-klienter', [
      ['Larss-Air · iPhone', INK],
      ['10.20.40.100–.199 · DHCP', INK],
      ['gw/DNS 10.20.40.1', MUTED],
    ], '#e07b10', 68),
    icon('icon-globe', 'globe', 404, 146, 40, 40, '#3b4658', { strokeWidth: 0, glyph: ' ', glyphSize: 4, name: 'GlobalConnect' }),
    icon('icon-udm', 'switch', 374, 328, 78, 16, '#3b4658', { strokeWidth: 0, ports: 4, portFill: '#9aa6b8', name: 'UDM SE' }),
    icon('icon-usw', 'switch', 374, 514, 78, 16, '#3b4658', { strokeWidth: 0, ports: 6, portFill: '#9aa6b8', name: 'USW-24-G2' }),
    icon('icon-mikrotik', 'router', 328, 748, 48, 32, '#0f8f8f', { strokeWidth: 0, accent: '#0f8f8f', name: 'MikroTik' }),
    icon('icon-dc', 'server', 104, 1124, 44, 26, '#2f6fd6', { strokeWidth: 0, name: 'DC01' }),
    icon('icon-hv', 'server', 104, 1296, 44, 26, '#2f6fd6', { strokeWidth: 0, name: 'Hypervisor' }),
    icon('icon-pc', 'pc', 492, 1052, 40, 30, '#1f9d55', { strokeWidth: 0, accent: '#1f9d55', name: 'DESKTOP-ROP' }),
    icon('icon-clients', 'pc', 492, 1204, 40, 30, '#1f9d55', { strokeWidth: 0, accent: '#1f9d55', name: 'Klienter' }),
    icon('icon-ap', 'ap', 854, 1104, 36, 36, '#7b4bd6', { strokeWidth: 0, accent: '#fff', name: 'U7 Pro' }),
    icon('icon-laptop', 'laptop', 852, 1324, 52, 28, '#e07b10', { strokeWidth: 0, accent: '#e07b10', name: 'WiFi-klienter' }),
    lightPill('pill-wan', 'WAN', 610, 238, 328, 'UDM port 9 · WAN1 · 192.168.8.220', '#3b4658'),
    lightPill('pill-trunk', 'Trunk', 610, 440, 559, 'Port 11 SFP+ → port 26 · trunk · native 100 (192.168.100.0/30)', '#c99a06'),
    lightPill('pill-ether1', 'ether1', 610, 690, 391, 'USW port 7 → ether1 · VLAN 20 (untagged)', '#0f8f8f'),
    lightPill('pill-ether2', 'ether2', 240, 930, 343, 'ether2 · trunk · native 110 + 120/130', '#2f6fd6'),
    lightPill('pill-ether3', 'ether3', 630, 930, 254, 'ether3 · access · VLAN 130', '#1f9d55'),
    lightPill('pill-ether4', 'ether4', 1000, 930, 306, 'ether4 · trunk · native 110 + 140', '#7b4bd6'),
    textBlock('text-hidden-1', 'Ikke vist', 880, 530, 'Ikke vist (blokkert mot VLAN 20):', 12, MUTED, 'normal', 'start', 270),
    textBlock('text-hidden-2', 'Ikke vist', 880, 548, 'VLAN 10 Mathias, USW port 1–6', 12, MUTED, 'normal', 'start', 270),
    textBlock('text-hidden-3', 'Ikke vist', 880, 566, 'VLAN 30 Harry, port 13–18', 12, MUTED, 'normal', 'start', 270),
    lightCard('card-legend', 'Forklaring', 1220, 108, 540, 168, 'Forklaring', [
      ['WAN / opplink', INK],
      ['Trunk (flere VLAN-er, tagget)', '#c99a06'],
      ['Access (ett VLAN, untagged)', '#0f8f8f'],
      ['Trådløst (WiFi)', '#e07b10'],
      ['Merkelapp: port · modus · VLAN', MUTED],
      ['Soner: 1/100 · 20 · 110 · 120 · 130 · 140', MUTED],
    ], '#d3dbe6', 16),
    vlan,
    textBlock('text-vlan-note', 'VLAN-merknad', 1220, 790, 'Gateway = .1 i alle nett · over streken: UDM, under: MikroTik', 12, MUTED, 'normal', 'start', 540),
    lightCard('card-ip-plan', 'IP-plan', 1220, 808, 540, 148, 'IP-plan bak MikroTik (10.20.x.0/24)', [
      ['.1  gateway (VLAN-IF på MikroTik)', INK],
      ['.2–.9  nettverksutstyr', INK],
      ['.10–.49  statiske servere', INK],
      ['.50–.99  DHCP-reservasjoner', INK],
      ['.100–.199  DHCP-pool', '#1f9d55'],
    ], '#d3dbe6', 16),
    lightCard('card-notes', 'Viktig', 1220, 968, 540, 140, 'Viktig å vite', [
      ['Dobbel NAT: port-forward i både UDM og MikroTik', '#c99a06'],
      ['MikroTik-brannmur: drop mellom VLAN-er som standard', INK],
      ['UDM blokkerer VLAN 20 ↔ VLAN 10/30', INK],
      ['Klienter → DC01 (AD/DNS) og admin-PC → Mgmt er åpnet', '#1f9d55'],
    ], '#d3dbe6', 16),
    ports,
    textBlock('text-fw-1', 'Brannmurregel', 1220, 1452, 'Klienter → Servere: AD, DNS, DHCP, Kerberos, LDAP, SMB, RDP', 12, INK, 'normal', 'start', 540),
    textBlock('text-fw-2', 'Brannmurregel', 1220, 1468, 'WiFi → Servere: DNS · * → Mgmt droppes, unntatt admin-PC 10.20.30.50', 12, INK, 'normal', 'start', 540),
    textBlock('text-fw-3', 'Brannmurregel', 1220, 1484, '* → Internett tillatt · 192.168.1/10/30 droppes, unntatt established,related', 12, INK, 'normal', 'start', 540),
    textBlock('text-title', 'Tittel', 40, 58, 'MikroTik-topologi – Lars sitt nett', 34, INK, 'bold', 'start', 1100),
    textBlock('text-sub', 'Undertittel', 40, 90, 'Forenklet skisse av topologi v4 · UDM SE → USW-24-G2 → hEX PoE · 22.10.2026', 17, MUTED, 'normal', 'start', 1100),
  ];
  elements.forEach((element, index) => {
    element.z = index + 1;
  });

  return normalize({
    format: FORMAT,
    version: FILE_VERSION,
    meta: {
      title: 'MikroTik-topologi – Lars sitt nett',
      theme: 'light',
      grid: 20,
      snap: true,
      updated: '2026-10-22T12:00:00.000Z',
      appVersion: APP_VERSION,
    },
    canvas: { width: 1800, height: 1492, background: PAPER },
    elements,
  });
}

function zone(id: string, name: string, x: number, y: number, w: number, h: number, color: string, title: string, subtitle: string): ZoneElement {
  return {
    id,
    name,
    type: 'zone',
    x,
    y,
    w,
    h,
    z: 0,
    locked: false,
    opacity: 1,
    title,
    subtitle,
    titleSize: 15,
    titleColor: color,
    subtitleSize: 12,
    subtitleColor: MUTED,
    fill: color,
    fillOpacity: 0.07,
    stroke: color,
    strokeWidth: 1.5,
    dash: [8, 6],
    radius: 14,
    padX: 16,
    titleDy: 24,
    subtitleDy: 42,
  };
}

function lightCard(id: string, name: string, x: number, y: number, w: number, h: number, title: string, lines: [string, string][], stroke: string, padX: number): CardElement {
  const rows: CardRow[] = lines.map(([text, color]) => ({ text, color }));
  const rowStride = rows.length === 0 ? 18 : 20;
  const frameH = h - rows.length * rowStride;
  return {
    id,
    name,
    type: 'card',
    x,
    y,
    w,
    h,
    z: 0,
    locked: false,
    opacity: 1,
    title,
    titleSize: rows.length === 0 ? 12 : 15,
    titleColor: stroke === '#d3dbe6' ? INK : stroke,
    titleWeight: 'bold',
    rows,
    rowSize: 13,
    fill: PAPER,
    stroke,
    strokeWidth: 1.6,
    radius: 12,
    autoHeight: true,
    frameH,
    padX,
    titleDy: Math.max(16, Math.min(26, frameH - 8)),
    rowDy: frameH + 12,
    rowStride,
  };
}

function lightPill(id: string, name: string, cx: number, cy: number, w: number, text: string, color: string): TopoElement {
  return {
    id,
    name,
    type: 'pill',
    x: cx - w / 2,
    y: cy - 15,
    w,
    h: 30,
    z: 0,
    locked: false,
    opacity: 1,
    text,
    fontSize: 13,
    textColor: color,
    fill: PAPER,
    stroke: color,
    strokeWidth: 1.5,
    autoWidth: false,
    charW: 7.2,
    padW: 28,
  };
}

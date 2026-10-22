import { normalize } from '../model/edit';
import { APP_VERSION, FILE_VERSION, FORMAT, type Anchor, type CardRow, type MatrixCell, type MatrixElement, type TableElement, type TopoDocument, type TopoElement } from '../model/types';
import { abs, card, icon, pill, textBlock, wire } from './unifi';

const T = '#d6dde8';
const B = '#8fc1ff';
const Y = '#f5c542';
const G = '#4cd97b';
const GR = '#7a8494';
const MUTED = '#9aa6b8';
const RED = '#ff6b6b';

const FW_COLOR: Record<string, { fill: string; color: string }> = {
  Tillat: { fill: '#1f5a35', color: G },
  Blokker: { fill: '#5a1f24', color: RED },
  'Kun retur': { fill: '#1f3f5a', color: B },
  'AD/DNS/RDP': { fill: '#4a3f12', color: Y },
  'Kun DNS': { fill: '#4a3f12', color: Y },
  'Kun admin-PC': { fill: '#4a3f12', color: Y },
  '–': { fill: '#232a35', color: GR },
};

function at(x: number, y: number): Anchor {
  return abs(x, y);
}

function fwCell(text: string): MatrixCell {
  const color = FW_COLOR[text] ?? { fill: '#232a35', color: T };
  return { text, fill: color.fill, color: color.color };
}

function rows(lines: [string, string][]): CardRow[] {
  return lines.map(([text, color]) => ({ text, color }));
}

/**
 * Built-in diagram for Lars, 21.10.2026.
 * Card rows carry the JSON `fields` (model, address, VLAN, uplink) so each value stays editable.
 * `segment` is its own column on the VLAN table. Port maps are table objects.
 * The 5×5 firewall matrix is the rule grid; the notes beside it are the rule text.
 */
export function perfektTemplate(): TopoDocument {
  const title = textBlock('text-title', 'Tittel', 100, 66, 'Nettverkstopologi – UDM SE + MikroTik (Lars)', 44, '#fff', 'bold', 'middle', 1700);
  const subtitle = textBlock('text-sub', 'Undertittel', 100, 104, 'Lars · oppdatert 21.10.2026', 23, MUTED, 'normal', 'middle', 1700);
  const sections = [
    textBlock('text-sec1', 'Avsnitt 1', 40, 150, '1 · Overnett – UDM SE + USW-24-G2 (21.10)', 22, MUTED, 'bold', 'start', 1400),
    textBlock('text-sec2', 'Avsnitt 2', 40, 1190, '2 · MikroTik på Vlan 20 (Lars)', 22, MUTED, 'bold', 'start', 1400),
    textBlock('text-sec3', 'Avsnitt 3', 40, 1800, '3 · Lars sitt segment – anbefalt design (10.20.x.0/24)', 22, MUTED, 'bold', 'start', 1600),
    textBlock('text-sec4', 'Avsnitt 4', 40, 3008, '4 · Portkart, VLAN-er og brannmur', 22, MUTED, 'bold', 'start', 1400),
  ];

  const vlan: TableElement = {
    id: 'table-vlan',
    name: 'VLAN-tabell',
    type: 'table',
    x: 60,
    y: 3458,
    w: 1780,
    h: 430,
    z: 0,
    locked: false,
    opacity: 1,
    title: 'VLAN-er',
    showTitle: true,
    titleSize: 28,
    titleColor: '#fff',
    titleWeight: 'bold',
    headers: ['Navn', 'Eier/rolle', 'VLAN', 'Subnett', 'Gateway', 'DHCP', 'Segment'],
    colX: [0, 160, 500, 600, 840, 1050, 1480],
    titleDy: 30,
    headerDy: 54,
    bodyDy: 90,
    rowStride: 36,
    headerSize: 18,
    bodySize: 18,
    headerColor: B,
    bodyColor: T,
    headerWeight: 'bold',
    rows: [
      ['Default', 'UDM · infrastruktur', '1', '192.168.1.0/24', '192.168.1.1', 'UDM SE', 'udm'],
      ['Vlan 10', 'Mathias (annet segm.)', '10', '192.168.10.0/24', '192.168.10.1', 'UDM SE', 'udm'],
      ['Vlan 20', 'Lars · MikroTik-WAN', '20', '192.168.20.0/24', '192.168.20.1', 'UDM SE · reservasjon .2 = MikroTik', 'udm'],
      ['Vlan 30', 'Harry (annet segm.)', '30', '192.168.30.0/24', '192.168.30.1', 'UDM SE', 'udm'],
      ['Transit', 'Trunk UDM ↔ USW', '100', '192.168.100.0/30', '192.168.100.1', 'UDM SE', 'udm'],
      ['Mgmt', 'Lars · nettverksutstyr', '110', '10.20.10.0/24', '10.20.10.1', 'MikroTik · statisk/reservasjoner', 'mikrotik'],
      ['Servere', 'Lars · AD, hypervisor', '120', '10.20.20.0/24', '10.20.20.1', 'Ingen – statisk .10–.49', 'mikrotik'],
      ['Klienter', 'Lars · domene-PC-er', '130', '10.20.30.0/24', '10.20.30.1', 'DC01 via relay · .100–.199', 'mikrotik'],
      ['WiFi', 'Lars · lars wifi', '140', '10.20.40.0/24', '10.20.40.1', 'MikroTik · .100–.199', 'mikrotik'],
    ],
  };

  const portMikrotik: TableElement = {
    id: 'table-pt-mikrotik',
    name: 'Portkart MikroTik',
    type: 'table',
    x: 40,
    y: 3048,
    w: 890,
    h: 330,
    z: 0,
    locked: false,
    opacity: 1,
    title: 'Portkart – MikroTik hEX PoE',
    showTitle: true,
    titleSize: 26,
    titleColor: '#fff',
    titleWeight: 'bold',
    headers: ['Port', 'Modus', 'VLAN', 'PoE', 'Til'],
    colX: [0, 82, 168, 442, 578],
    titleDy: 28,
    headerDy: 70,
    bodyDy: 108,
    rowStride: 34,
    headerSize: 18,
    bodySize: 18,
    headerColor: B,
    bodyColor: T,
    headerWeight: 'bold',
    rows: [
      ['ether1', 'WAN', '20 untagged', 'inn (passiv)', 'USW-24-G2 port 7'],
      ['ether2', 'Trunk', 'native 110 · tag 120/130', 'ut · av', 'Lab-switch port 1'],
      ['ether3', 'Access', '130', 'ut · av', 'DESKTOP-ROP…'],
      ['ether4', 'Trunk', 'native 110 · tag 140', 'ut · av', 'U7 Pro (PoE+-inj.)'],
      ['ether5', 'Access', '110', 'ut · av', 'Mgmt / nødport'],
      ['sfp1', 'Ledig', '–', '–', 'valgfri SFP-modul'],
    ],
  };

  const portLab: TableElement = {
    id: 'table-pt-labsw',
    name: 'Portkart lab-switch',
    type: 'table',
    x: 970,
    y: 3048,
    w: 890,
    h: 296,
    z: 0,
    locked: false,
    opacity: 1,
    title: 'Portkart – lab-switch',
    showTitle: true,
    titleSize: 26,
    titleColor: '#fff',
    titleWeight: 'bold',
    headers: ['Port', 'Modus', 'VLAN', 'Til'],
    colX: [0, 110, 300, 600],
    titleDy: 28,
    headerDy: 70,
    bodyDy: 108,
    rowStride: 34,
    headerSize: 18,
    bodySize: 18,
    headerColor: B,
    bodyColor: T,
    headerWeight: 'bold',
    rows: [
      ['1', 'Trunk', 'native 110 · tag 120/130', 'MikroTik ether2'],
      ['2', 'Access', '120', 'DC01 (Server 2025)'],
      ['3', 'Trunk', 'native 120 · tag 130', 'Hypervisor-host'],
      ['4–7', 'Access', '120', 'Ledig (servere)'],
      ['8', 'Access', '110', 'Mgmt / nødport'],
    ],
  };

  const matrixRows = [
    ['–', 'Kun retur', 'Kun retur', 'Kun retur', 'Tillat'],
    ['Blokker', '–', 'Kun retur', 'Blokker', 'Tillat'],
    ['Kun admin-PC', 'AD/DNS/RDP', '–', 'Blokker', 'Tillat'],
    ['Blokker', 'Kun DNS', 'Blokker', '–', 'Tillat'],
    ['Kun retur', 'Kun retur', 'Kun retur', 'Kun retur', '–'],
  ];
  const matrix: MatrixElement = {
    id: 'matrix-fw',
    name: 'Brannmur',
    type: 'matrix',
    x: 60,
    y: 4024,
    w: 943,
    h: 340,
    z: 0,
    locked: false,
    opacity: 1,
    title: 'Brannmur på MikroTik (forward-kjeden)',
    subtitle: 'rad = fra, kolonne = til · default drop mellom VLAN-er',
    titleSize: 26,
    titleColor: '#fff',
    subtitleSize: 16,
    subtitleColor: MUTED,
    rowLabels: ['Mgmt', 'Servere', 'Klienter', 'WiFi', 'Internett/opp'],
    colLabels: ['Mgmt', 'Servere', 'Klienter', 'WiFi', 'Internett'],
    cells: matrixRows.map((row) => row.map(fwCell)),
    notes: [],
    labelSize: 16,
    labelColor: B,
    cellTextSize: 15,
    noteSize: 16,
    noteColor: T,
    radius: 6,
    titleDy: 28,
    subtitleDy: 52,
    colHeaderDy: 80,
    cellX: 193,
    cellY: 95,
    cellW: 144,
    cellH: 40,
    strideX: 150,
    strideY: 46,
    rowLabelDy: 26,
    cellTextDy: 26,
    noteDy: 360,
    noteStride: 28,
  };

  const ruleNotes = [
    'Klienter → Servere: AD/DNS/DHCP, Kerberos, LDAP, SMB, RDP',
    'WiFi → Servere: kun DNS (53) · WiFi → Klienter: blokkert',
    'Alle → Mgmt: blokkert, unntatt admin-PC (Klienter)',
    'Alle → Internett: tillatt (masquerade ut ether1)',
    'Internett/opp = WAN; 192.168.1/10/30.0/24 droppes',
    '  (kun established/related slipper gjennom)',
    'Unntak: Mgmt → 192.168.1.1 tcp 8080 (UniFi inform)',
    'Input: winbox/ssh kun fra Mgmt + admin-PC, resten drop',
    'UDM: Vlan 20 ↔ Vlan 10/30 = Block All (som 21.10)',
  ];

  const elements: TopoElement[] = [
    ...sections,
    wire('wire-isp-wan', 'ISP', [at(950, 232), at(950, 240)]),
    wire('wire-wan1', 'WAN1', [at(950, 358), at(950, 500)]),
    wire('wire-udm-p1-pc', 'UDM port 1', [at(540, 570), at(670, 570)]),
    wire('wire-udm-portmap', 'Portkart', [at(1230, 570), at(1330, 570)], true),
    wire('wire-trunk', 'Trunk', [at(950, 682), at(950, 800)], false, Y),
    wire('wire-usw-mathias', 'Mathias', [at(390, 1000), at(620, 1000)], true, GR),
    wire('wire-usw-harry', 'Harry', [at(1280, 1000), at(1510, 1000)], true, GR),
    wire('wire-usw-p7-mikrotik', 'ether1', [at(950, 1124), at(950, 1278)], false, G, 6),
    wire('wire-mikrotik-bus', 'Ned fra MikroTik', [at(950, 1768), at(950, 1870)]),
    wire('wire-lan-bus', 'LAN-buss', [at(330, 1870), at(1570, 1870)]),
    wire('wire-ether2', 'ether2', [at(330, 1870), at(330, 2032)]),
    wire('wire-ether3', 'ether3', [at(950, 1870), at(950, 2050)]),
    wire('wire-ether4', 'ether4', [at(1570, 1870), at(1570, 2050)]),
    wire('wire-labsw-bus', 'Ned fra lab-switch', [at(330, 2256), at(330, 2406)]),
    wire('wire-labsw-bus2', 'Lab-buss', [at(330, 2406), at(950, 2406)]),
    wire('wire-labsw-p2', 'Port 2', [at(330, 2406), at(330, 2556)]),
    wire('wire-labsw-p3', 'Port 3', [at(950, 2406), at(950, 2556)]),
    wire('wire-wifi', 'WiFi', [at(1570, 2306), at(1570, 2376)], true, G),
    wire('wire-wifi-bus', 'WiFi-buss', [at(1420, 2376), at(1730, 2376)], true, G),
    wire('wire-wifi-air', 'Larss-Air', [at(1420, 2376), at(1420, 2436)], true, G),
    wire('wire-wifi-iphone', 'iPhone', [at(1730, 2376), at(1730, 2436)], true, G),
    icon('icon-isp', 'globe', 918, 168, 64, 64, '#1f4fa8', { strokeWidth: 0, glyph: 'G', glyphSize: 34, name: 'GlobalConnect' }),
    icon('icon-udm', 'switch', 840, 446, 220, 38, '#e8ebef', { strokeWidth: 0, ports: 6, name: 'UDM SE' }),
    icon('icon-usw', 'switch', 835, 762, 230, 38, '#e8ebef', { strokeWidth: 0, ports: 12, name: 'USW-24-G2' }),
    icon('icon-mikrotik', 'switch', 830, 1278, 240, 38, '#2b313b', { strokeWidth: 0, ports: 5, portFill: G, name: 'MikroTik' }),
    icon('icon-j1', 'junction', 938, 1858, 24, 24, '#4a90e2', { strokeWidth: 0, name: 'Knute' }),
    icon('icon-lab', 'switch', 250, 1990, 160, 38, '#e8ebef', { strokeWidth: 0, ports: 8, name: 'Lab-switch' }),
    icon('icon-pc', 'pc', 895, 2014, 110, 76, '#2d3644', { accent: B, stroke: B, name: 'DESKTOP-ROP' }),
    icon('icon-ap', 'ap', 1536, 1975, 68, 68, '#f2f4f7', { strokeWidth: 0, accent: '#4a90e2', name: 'U7 Pro' }),
    icon('icon-j2', 'junction', 318, 2394, 24, 24, '#4a90e2', { strokeWidth: 0, name: 'Knute' }),
    icon('icon-dc', 'server', 270, 2496, 120, 64, '#2d3644', { accent: B, stroke: B, name: 'DC01' }),
    icon('icon-hv', 'server', 890, 2496, 120, 64, '#2d3644', { accent: B, stroke: B, name: 'Hypervisor' }),
    icon('icon-air', 'laptop', 1350, 2436, 140, 74, '#2d3644', { accent: B, stroke: B, name: 'Larss-Air' }),
    icon('icon-phone', 'phone', 1706, 2426, 48, 84, '#2d3644', { accent: B, stroke: B, name: 'iPhone' }),
    pill('pill-wan', 'WAN1', 950, 400, 'UDM port 9 · WAN1 · GbE', '#4a90e2', B, 293),
    pill('pill-trunk', 'Trunk', 950, 722, 'Port 11 SFP+ → Port 26 · Trunk · native 100', Y, Y, 471),
    pill('pill-ether1', 'ether1', 950, 1240, 'USW port 7 → ether1 · VLAN 20 (untagged) · GbE', G, G, 532),
    pill('pill-ether2', 'ether2', 330, 1925, 'ether2 · Trunk · native 110 + 120/130', '#4a90e2', B, 418),
    pill('pill-ether3', 'ether3', 950, 1985, 'ether3 · Access · VLAN 130', '#4a90e2', B, 311),
    pill('pill-ether4', 'ether4', 1570, 1925, 'ether4 · Trunk · native 110 + 140', '#4a90e2', B, 373),
    pill('pill-p2', 'Port 2', 330, 2456, 'Port 2 · Access · VLAN 120 · GbE', '#4a90e2', B, 364),
    pill('pill-p3', 'Port 3', 950, 2456, 'Port 3 · Trunk · native 120 + 130', '#4a90e2', B, 366),
    pill('pill-wifi', 'WiFi', 1570, 2341, 'lars wifi · VLAN 140', G, G, 235),
    card('card-internet', 'Internett', 950, 240, 500, 'Internett – GlobalConnect', rows([
      ['WAN1 (UDM port 9): 192.168.8.220', B],
      ['DHCP fra ISP · 10 ms · oppetid 100 %', T],
    ])),
    card('card-udm', 'UDM SE', 950, 500, 560, 'UDM SE – gateway', rows([
      ['192.168.1.1/24 · Default (VLAN 1) · statisk', T],
      ['Ruter, DHCP og brannmur for 1/10/20/30/100', Y],
      ['MAC 70:a7:41:b5:c5:75 · v5.1.33', T],
      ['Port 11 SFP+ → USW port 26 (trunk)', Y],
    ])),
    card('card-udm-ports', 'UDM-porter', 1590, 440, 520, 'UDM SE – porter', rows([
      ['Port 1–2 → Default (1)', T],
      ['Port 3–4 → Vlan 10 · Mathias', GR],
      ['Port 5–6 → Vlan 20 · Lars', G],
      ['Port 7–8 → Vlan 30 · Harry', GR],
      ['Port 9 → WAN1 (GlobalConnect)', T],
      ['Port 11 SFP+ → Transit (100)', Y],
    ])),
    card('card-pc0dae', 'Windows PC', 310, 500, 460, 'Windows PC (0d:ae)', rows([
      ['UDM port 1 · GbE · Default (1)', T],
      ['192.168.1.x/24 · DHCP · gw .1', T],
    ])),
    card('card-usw', 'USW-24-G2', 950, 814, 660, 'USW-24-G2 (switch)', rows([
      ['192.168.1.64/24 · VLAN 1 · reservasjon', T],
      ['MAC 58:d6:1f:5e:eb:db · v7.5.15', T],
      ['Port 1–6   → Vlan 10 · Mathias', GR],
      ['Port 7–12  → Vlan 20 · Lars', G],
      ['Port 13–18 → Vlan 30 · Harry', GR],
      ['Port 19–25 → Default (1)', T],
      ['Port 26    → Transit (100), tagget 1/10/20/30', Y],
      ['Port 7 → MikroTik ether1 (untagged 20)', G],
    ])),
    card('card-seg-mathias', 'Mathias', 250, 920, 420, 'Mathias – annet segment', rows([
      ['Vlan 10 · 192.168.10.0/24', GR],
      ['USW port 1–6 · access', GR],
      ['Isolert fra Vlan 20 i UDM', GR],
    ]), '#2a3140', MUTED),
    card('card-seg-harry', 'Harry', 1650, 920, 420, 'Harry – annet segment', rows([
      ['Vlan 30 · 192.168.30.0/24', GR],
      ['USW port 13–18 · access', GR],
      ['Isolert fra Vlan 20 i UDM', GR],
    ]), '#2a3140', MUTED),
    card('card-mikrotik', 'MikroTik', 950, 1330, 700, 'MikroTik hEX PoE (RB960PGS) · RouterOS 7', rows([
      ['CPU QCA9557 800 MHz (1 kjerne) · switch QCA8337', T],
      ['ether1 = WAN · PoE-inn · DHCP → 192.168.20.2 (res.)', B],
      ['NAT: masquerade ut ether1 (dobbel NAT)', T],
      ['VLAN i switch-chip (/interface ethernet switch)', Y],
      ['bridge1 hw-offload · ether2–5 · vlan-mode=secure', Y],
      ['PoE-ut ether2–5 (av) · U7 Pro via PoE+-injektor', Y],
      ['sfp1 1G · utenfor switch-chipen · ledig/valgfri', GR],
      ['VLAN-IF 110–140 → gw 10.20.x.1 · DNS-cache', T],
      ['DHCP: Mgmt + WiFi lokalt · Klienter → relay DC01', T],
      ['Drop → 192.168.1/10/30.0/24 unntatt established', RED],
      ['Egen admin · kun winbox/ssh fra Mgmt + admin-PC', T],
      ['NTP · RouterOS + RouterBOOT oppdatert · backup', T],
    ])),
    card('card-ip-plan', 'IP-plan', 285, 1330, 500, 'IP-plan (alle 10.20.x.0/24)', rows([
      ['.1  gateway (MikroTik VLAN-IF)', T],
      ['.2–.9  nettverksutstyr', T],
      ['.10–.49  statiske servere', T],
      ['.50–.99  DHCP-reservasjoner', T],
      ['.100–.199  DHCP-pool', G],
      ['.200–.254  ledig / reserve', GR],
      ['VLAN-ID 1xx ↔ 10.20.x.0/24', B],
    ])),
    card('card-notes-important', 'Viktig', 1615, 1330, 490, 'Viktig å vite', rows([
      ['Dobbel NAT: MikroTik bak UDM –', Y],
      ['  port-forward må gjøres i begge', Y],
      ['UDM blokkerer Vlan 20 ↔ 10/30', T],
      ['DHCP på Vlan 20 gir MikroTik', T],
      ['  WAN-adressen (ether1)', T],
      ['Forslag: reservasjon 192.168.20.2', G],
      ['  for MikroTik-MAC i UDM', G],
    ])),
    card('card-labsw', 'Lab-switch', 330, 2042, 580, 'Lab-switch (administrert, 8-port)', rows([
      ['Rolle: L2 VLAN-switch for servere', T],
      ['10.20.10.2/24 · statisk · gw .1', T],
      ['DNS 10.20.10.1 · Mgmt VLAN 110', T],
      ['Port 1 ← ether2 · trunk · GbE', B],
      ['Modell valgfri (CRS/CSS/US-8 e.l.)', GR],
    ])),
    card('card-desktop', 'DESKTOP-ROP', 950, 2120, 560, 'DESKTOP-ROP… (Windows-PC)', rows([
      ['Admin-PC · domene-medlem lars.lan', T],
      ['10.20.30.100–199 · DHCP fra DC01', T],
      ['gw 10.20.30.1 · DNS 10.20.20.10', T],
      ['VLAN 130 · ether3 (access) · GbE', B],
      ['Tillatt: Winbox/SSH → Mgmt', G],
      ['Før: 192.168.20.50 (custom1)', GR],
    ])),
    card('card-u7pro', 'U7 Pro', 1570, 2060, 600, 'U7 Pro (WiFi-AP)', rows([
      ['Mgmt 10.20.10.3/24 · reservasjon', T],
      ['gw/DNS 10.20.10.1 · VLAN 110 (native)', T],
      ['SSID «lars wifi» → VLAN 140 · WPA2/3', G],
      ['2,4 GHz ch 1 · 5 GHz ch 153 · 6 GHz ch 117', B],
      ['ether4 · trunk · GbE · PoE-injektor', B],
      ['Adopsjon: inform → 192.168.1.1:8080', Y],
    ])),
    card('card-dc01', 'DC01', 330, 2586, 580, 'DC01 – Windows Server 2025', rows([
      ['Rolle: AD DS · DNS · DHCP', Y],
      ['Domene lars.lan · DC01.lars.lan', T],
      ['10.20.20.10/24 · statisk · gw .1', T],
      ['DNS 127.0.0.1 → forwarder', T],
      ['  192.168.20.1 / 1.1.1.1', T],
      ['VLAN 120 · lab-switch port 2 · GbE', B],
      ['DHCP-scope 130: .100–.199 (relay)', G],
      ['Reservasjoner .50–.99 · lease 8 t', T],
      ['NTP: PDC ← no.pool.ntp.org', T],
    ])),
    card('card-hv', 'Hypervisor', 950, 2586, 580, 'Hypervisor (Proxmox VE / Hyper-V)', rows([
      ['10.20.20.20/24 · statisk · gw .1', T],
      ['DNS 10.20.20.10 · VLAN 120 (native)', T],
      ['Port 3 · trunk (120 + 130) · GbE', B],
      ['vmbr0 VLAN-aware / vSwitch m/VLAN-ID', Y],
      ['VM-er:', Y],
      ['• Hyper-V VM · 10.20.20.30 · VLAN 120', T],
      ['  MAC 00:15:5d:0e:05:01 · statisk', T],
      ['• lab14 · 10.20.20.31 · VLAN 120', T],
      ['• testklient · DHCP · VLAN 130', T],
    ])),
    card('card-air', 'Larss-Air', 1420, 2526, 300, 'Larss-Air', rows([
      ['MacBook Air', T],
      ['10.20.40.1xx · DHCP', T],
      ['gw/DNS 10.20.40.1', T],
      ['VLAN 140 · 5/6 GHz', B],
    ])),
    card('card-iphone', 'iPhone', 1730, 2526, 300, 'iPhone', rows([
      ['WiFi-klient', T],
      ['10.20.40.1xx · DHCP', T],
      ['gw/DNS 10.20.40.1', T],
      ['VLAN 140 · 5/6 GHz', B],
    ])),
    portMikrotik,
    portLab,
    vlan,
    textBlock('text-vlan-note-1', 'VLAN-merknad', 60, 3896, 'Over streken: UDM SE (192.168.x) · under: bak MikroTik (10.20.x, NAT ut ether1)', 18, MUTED, 'normal', 'start', 1700),
    textBlock('text-vlan-note-2', 'IP-plan-merknad', 60, 3928, 'Gateway = .1 i alle nett · IP-plan: .2–.9 utstyr, .10–.49 servere, .50–.99 reservasjoner, .100–.199 pool', 18, MUTED, 'normal', 'start', 1700),
    matrix,
    ...ruleNotes.map((text, index) => textBlock(`text-fw-${index + 1}`, 'Brannmurregel', 1050, 4074 + index * 32, text, 18, T, 'normal', 'start', 800)),
    title,
    subtitle,
  ];
  elements.forEach((element, index) => {
    element.z = index + 1;
  });

  return normalize({
    format: FORMAT,
    version: FILE_VERSION,
    meta: {
      title: 'Nettverkstopologi – UDM SE + MikroTik (Lars)',
      theme: 'dark',
      grid: 20,
      snap: true,
      updated: '2026-10-21T18:00:00.000Z',
      appVersion: APP_VERSION,
    },
    canvas: { width: 1900, height: 4422, background: '#14171c' },
    elements,
  });
}

import { describe, expect, it } from 'vitest';
import { findElement } from '../model/edit';
import { parseDocument, serializeDocument } from '../model/serialize';
import { documentToSvg } from '../render/scene';
import { rasterPlan } from '../export/raster';
import { diagramTemplates, udmVlanTemplate, unifiTemplate } from './unifi';
import { mikrotikTemplate } from './mikrotik';
import { perfektTemplate } from './perfekt';
import { udmLarsTemplate } from './udm-lars';

const PASSWORD_LINE = 'Password: ••••••••';

describe('UniFi Dream Machine SE – Lars (oppdatert)', () => {
  it('ligger i velgeren og lar de eldre malene stå', () => {
    const templates = diagramTemplates();
    expect(templates.map((item) => item.id)).toEqual(['unifi', 'udm-vlan', 'perfekt', 'mikrotik', 'udm-lars']);
    expect(templates[4].name).toBe('UniFi Dream Machine SE – Lars (oppdatert) 22.10.2026');
    expect(templates[0].create().meta.updated).toBe(unifiTemplate().meta.updated);
    expect(templates[1].create().meta.updated).toBe(udmVlanTemplate().meta.updated);
    expect(templates[2].create().canvas.height).toBe(perfektTemplate().canvas.height);
    expect(templates[3].create().meta.updated).toBe(mikrotikTemplate().meta.updated);
    const doc = udmLarsTemplate();
    expect(doc.meta.title).toBe('Nettverkstopologi – UniFi Dream Machine SE');
    expect(doc.meta.theme).toBe('dark');
    expect(doc.canvas).toEqual({ width: 1880, height: 2250, background: '#14171c' });
    const subtitle = findElement(doc, 'text-sub');
    expect(subtitle?.type === 'text' && subtitle.text).toBe('Lars · oppdatert 21.10.2026');
  });

  it('har kort, VLAN-tabell og en redigerbar brannmur med Block All', () => {
    const doc = udmLarsTemplate();
    const titles = doc.elements.filter((element) => element.type === 'card').map((element) => (element.type === 'card' ? element.title : ''));
    expect(titles).toEqual([
      'Internett – GlobalConnect',
      'UDM SE – native VLAN per port',
      'UDM SE – gateway',
      'USW-24-G2 (switch)',
      'Mikrotik Lars',
      'Server WINServer25',
      'Fysisk klient laptop',
      'Aksess punkt',
    ]);

    const server = findElement(doc, 'card-server');
    expect(server?.type).toBe('card');
    if (server?.type === 'card') {
      expect(server.rows.map((row) => row.text)).toContain('Statisk IP 192.168.88.122/24');
      expect(server.rows.map((row) => row.text)).toContain(PASSWORD_LINE);
      expect(server.rows.some((row) => row.text.startsWith('Password:') && row.text !== PASSWORD_LINE)).toBe(false);
    }
    expect(serializeDocument(doc)).toContain(PASSWORD_LINE);
    expect(serializeDocument(doc)).not.toMatch(/Password:\s*[^\s•]/);

    const mikro = findElement(doc, 'card-mikrotik');
    expect(mikro?.type === 'card' && mikro.rows.map((row) => row.text)).toEqual([
      'WAN 192.168.20.120/24',
      'LAN 192.168.88.1',
      'NAT Enabled',
      'DHCP Disabled',
      'MAC:D0:EA:11:93:D0:EE',
      'ip pool 120-180',
    ]);

    const table = findElement(doc, 'table-vlan');
    expect(table?.type === 'table' && table.rows[1]).toEqual(['Vlan 10', 'Mathias', '10', '192.168.10.0/24', '192.168.10.1', '0 / 249']);

    const matrix = findElement(doc, 'matrix-fw');
    expect(matrix?.type).toBe('matrix');
    if (matrix?.type === 'matrix') {
      expect(matrix.rowLabels).toEqual(['Vlan 10', 'Vlan 20', 'Vlan 30', 'Transit']);
      expect(matrix.colLabels).toEqual(matrix.rowLabels);
      expect(matrix.cells.flat().map((cell) => cell.text)).toEqual(Array(16).fill('Block All'));
      expect(matrix.notes).toHaveLength(6);
    }

    const dashed = findElement(doc, 'wire-ports');
    expect(dashed?.type === 'connector' && dashed.dash).toEqual([14, 10]);
    const elbow = findElement(doc, 'wire-port4');
    expect(elbow?.type === 'connector' && elbow.points).toHaveLength(3);
    const green = findElement(doc, 'wire-vm');
    expect(green?.type === 'connector' && green.stroke).toBe('#4cd97b');

    const parsed = parseDocument(serializeDocument(doc));
    expect(parsed.elements).toHaveLength(doc.elements.length);
    expect(documentToSvg(parsed)).toBe(documentToSvg(doc));
  });

  it('fliser det høye arket slik macOS-eksporten fra 0.1.3 fortsatt gjør', () => {
    const doc = udmLarsTemplate();
    for (const scale of [1, 2, 3]) {
      const plan = rasterPlan(doc.canvas.width, doc.canvas.height, scale);
      expect(plan.width).toBe(Math.round(1880 * scale));
      expect(plan.height).toBe(Math.round(2250 * scale));
      expect(plan.tiles.length).toBeGreaterThan(1);
      for (const tile of plan.tiles) {
        expect(tile.w).toBeLessThanOrEqual(2048);
        expect(tile.h).toBeLessThanOrEqual(2048);
      }
    }
  });
});

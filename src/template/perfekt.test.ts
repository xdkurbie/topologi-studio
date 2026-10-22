import { describe, expect, it } from 'vitest';
import { findElement } from '../model/edit';
import { parseDocument, serializeDocument } from '../model/serialize';
import { documentToSvg } from '../render/scene';
import { rasterPlan } from '../export/raster';
import { rgbToPdf } from '../export/pdf';
import { encodePng } from '../export/raster';
import { diagramTemplates, unifiTemplate } from './unifi';
import { perfektTemplate } from './perfekt';

describe('Perfekt topologi – UDM SE + MikroTik', () => {
  it('ligger i malvelgeren uten å fjerne de eldre malene', () => {
    const templates = diagramTemplates();
    expect(templates.map((item) => item.id)).toEqual(['unifi', 'udm-vlan', 'perfekt', 'mikrotik']);
    expect(templates.map((item) => item.name)).toContain('Perfekt topologi – UDM SE + MikroTik (Lars) 21.10.2026');
    expect(templates[0].create().meta.updated).toBe(unifiTemplate().meta.updated);
    const doc = templates[2].create();
    expect(doc.meta.title).toBe('Nettverkstopologi – UDM SE + MikroTik (Lars)');
    expect(doc.meta.updated).toBe('2026-10-21T18:00:00.000Z');
    expect(doc.canvas).toEqual({ width: 1900, height: 4422, background: '#14171c' });
  });

  it('har redigerbare kort, ikoner, porttabeller, IP-plan, segment og 5×5-brannmur', () => {
    const doc = perfektTemplate();
    const icons = doc.elements.filter((element) => element.type === 'icon');
    expect(icons.map((element) => (element.type === 'icon' ? element.icon : ''))).toEqual([
      'globe',
      'switch',
      'switch',
      'switch',
      'junction',
      'switch',
      'pc',
      'ap',
      'junction',
      'server',
      'server',
      'laptop',
      'phone',
    ]);

    const mikrotik = findElement(doc, 'card-mikrotik');
    expect(mikrotik?.type).toBe('card');
    if (mikrotik?.type === 'card') {
      const text = mikrotik.rows.map((row) => row.text).join('\n');
      expect(mikrotik.title).toContain('hEX PoE');
      expect(text).toContain('192.168.20.2');
      expect(text).toContain('ether1');
      expect(text).toContain('QCA8337');
      expect(text).toContain('110–140');
      expect(mikrotik.h).toBe(54 + 12 * 32);
    }

    const lab = findElement(doc, 'card-labsw');
    if (lab?.type === 'card') {
      const text = lab.rows.map((row) => row.text).join('\n');
      expect(text).toContain('10.20.10.2/24');
      expect(text).toContain('VLAN 110');
      expect(text).toContain('ether2');
    }

    const plan = findElement(doc, 'card-ip-plan');
    if (plan?.type === 'card') {
      expect(plan.rows.map((row) => row.text)).toEqual([
        '.1  gateway (MikroTik VLAN-IF)',
        '.2–.9  nettverksutstyr',
        '.10–.49  statiske servere',
        '.50–.99  DHCP-reservasjoner',
        '.100–.199  DHCP-pool',
        '.200–.254  ledig / reserve',
        'VLAN-ID 1xx ↔ 10.20.x.0/24',
      ]);
    }

    const ports = findElement(doc, 'table-pt-mikrotik');
    expect(ports?.type).toBe('table');
    if (ports?.type === 'table') {
      expect(ports.headers).toEqual(['Port', 'Modus', 'VLAN', 'PoE', 'Til']);
      expect(ports.rows[0]).toEqual(['ether1', 'WAN', '20 untagged', 'inn (passiv)', 'USW-24-G2 port 7']);
      expect(ports.rows).toHaveLength(6);
      expect(ports.rows[5][0]).toBe('sfp1');
    }
    expect(findElement(doc, 'table-pt-labsw')?.type).toBe('table');

    const vlan = findElement(doc, 'table-vlan');
    expect(vlan?.type).toBe('table');
    if (vlan?.type === 'table') {
      expect(vlan.headers.at(-1)).toBe('Segment');
      expect(vlan.rows.map((row) => [row[2], row.at(-1)])).toEqual([
        ['1', 'udm'],
        ['10', 'udm'],
        ['20', 'udm'],
        ['30', 'udm'],
        ['100', 'udm'],
        ['110', 'mikrotik'],
        ['120', 'mikrotik'],
        ['130', 'mikrotik'],
        ['140', 'mikrotik'],
      ]);
    }

    const matrix = findElement(doc, 'matrix-fw');
    expect(matrix?.type).toBe('matrix');
    if (matrix?.type === 'matrix') {
      expect(matrix.rowLabels).toHaveLength(5);
      expect(matrix.colLabels).toHaveLength(5);
      expect(matrix.cells).toHaveLength(5);
      expect(matrix.cells.every((row) => row.length === 5)).toBe(true);
      expect(matrix.cells[2][1].text).toBe('AD/DNS/RDP');
      expect(matrix.cells[2][1].fill).toBe('#4a3f12');
      expect(matrix.cells[0][4].text).toBe('Tillat');
      expect(matrix.cells[1][0].text).toBe('Blokker');
    }

    const rules = doc.elements.filter((element) => element.type === 'text' && element.id.startsWith('text-fw-'));
    expect(rules).toHaveLength(9);
    const ruleText = rules.map((element) => (element.type === 'text' ? element.text : '')).join('\n');
    expect(ruleText).toContain('AD/DNS/DHCP, Kerberos, LDAP, SMB, RDP');
    expect(ruleText).toContain('tcp 8080');
    expect(ruleText).toContain('established/related');

    const dashed = findElement(doc, 'wire-udm-portmap');
    expect(dashed?.type === 'connector' && dashed.dash).toEqual([14, 10]);
    const trunk = findElement(doc, 'wire-trunk');
    expect(trunk?.type === 'connector' && trunk.stroke).toBe('#f5c542');

    const parsed = parseDocument(serializeDocument(doc));
    expect(parsed.elements).toHaveLength(doc.elements.length);
    expect(documentToSvg(parsed)).toBe(documentToSvg(doc));
  });

  it('eksporterer PNG og PDF av malen uten ett lerret over grensen', async () => {
    const doc = perfektTemplate();
    for (const scale of [2, 3]) {
      const plan = rasterPlan(doc.canvas.width, doc.canvas.height, scale);
      expect(plan.tiles.length).toBeGreaterThan(1);
      expect(Math.max(...plan.tiles.map((tile) => Math.max(tile.w, tile.h)))).toBeLessThanOrEqual(2048);
    }
    const rgb = new Uint8Array(doc.canvas.width > 0 ? 2 * 2 * 3 : 0);
    rgb.set([20, 23, 28, 74, 144, 226, 76, 217, 123, 245, 197, 66]);
    const png = await encodePng(2, 2, rgb);
    expect(png[0]).toBe(137);
    const pdf = await rgbToPdf(2, 2, rgb, (doc.canvas.width * 72) / 96, (doc.canvas.height * 72) / 96);
    const text = new TextDecoder().decode(pdf);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Width 2');
    expect(text).toContain('/Height 2');
  });
});

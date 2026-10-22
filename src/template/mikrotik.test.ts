import { describe, expect, it } from 'vitest';
import { findElement } from '../model/edit';
import { parseDocument, serializeDocument } from '../model/serialize';
import { documentToSvg } from '../render/scene';
import { rasterPlan } from '../export/raster';
import { diagramTemplates, udmVlanTemplate, unifiTemplate } from './unifi';
import { perfektTemplate } from './perfekt';
import { mikrotikTemplate } from './mikrotik';

describe('MikroTik-topologi – Lars sitt nett', () => {
  it('ligger i velgeren og lar de eldre malene stå', () => {
    const templates = diagramTemplates();
    expect(templates.map((item) => item.id)).toEqual(['unifi', 'udm-vlan', 'perfekt', 'mikrotik', 'udm-lars']);
    expect(templates[3].name).toBe('MikroTik-topologi – Lars sitt nett 22.10.2026');
    expect(templates[0].create().meta.updated).toBe(unifiTemplate().meta.updated);
    expect(templates[1].create().meta.updated).toBe(udmVlanTemplate().meta.updated);
    expect(templates[2].create().canvas.height).toBe(perfektTemplate().canvas.height);
    const doc = mikrotikTemplate();
    expect(doc.meta.title).toBe('MikroTik-topologi – Lars sitt nett');
    expect(doc.meta.theme).toBe('light');
    expect(doc.canvas).toEqual({ width: 1800, height: 1492, background: '#ffffff' });
  });

  it('har soner, knekkede linjer, porttabell og brannmurregler uten cellematrise', () => {
    const doc = mikrotikTemplate();
    const zones = doc.elements.filter((element) => element.type === 'zone');
    expect(zones).toHaveLength(6);
    expect(zones.map((element) => (element.type === 'zone' ? element.title : ''))).toContain('VLAN 20 · Lars · 192.168.20.0/24');
    const ether2 = findElement(doc, 'wire-ether2');
    expect(ether2?.type).toBe('connector');
    if (ether2?.type === 'connector') {
      expect(ether2.points).toHaveLength(4);
      expect(ether2.routing).toBe('polyline');
      expect(ether2.stroke).toBe('#2f6fd6');
    }
    const wifi = findElement(doc, 'wire-wifi');
    expect(wifi?.type === 'connector' && wifi.dash).toEqual([14, 10]);
    expect(doc.elements.some((element) => element.type === 'matrix')).toBe(false);

    const text = doc.elements
      .flatMap((element) => {
        if (element.type === 'card') return element.rows.map((row) => row.text);
        if (element.type === 'text') return [element.text];
        if (element.type === 'table') return element.rows.flat();
        return [];
      })
      .join('\n');
    expect(text).toContain('drop mellom VLAN-er');
    expect(text).toContain('Kerberos');
    expect(text).toContain('admin-PC 10.20.30.50');
    expect(text).toContain('established,related');
    expect(text).toContain('VLAN 10 Mathias');

    const vlan = findElement(doc, 'table-vlan');
    if (vlan?.type === 'table') {
      expect(vlan.headers.at(-1)).toBe('Segment');
      expect(vlan.rows.map((row) => [row[0], row.at(-1)])).toEqual([
        ['1', 'udm'],
        ['20', 'udm'],
        ['100', 'udm'],
        ['110', 'mikrotik'],
        ['120', 'mikrotik'],
        ['130', 'mikrotik'],
        ['140', 'mikrotik'],
      ]);
    }
    const ports = findElement(doc, 'table-pt-mikrotik');
    expect(ports?.type === 'table' && ports.rows).toHaveLength(6);
    const mikrotik = findElement(doc, 'card-mikrotik');
    expect(mikrotik?.type === 'card' && mikrotik.title).toContain('hEX PoE');

    const svg = documentToSvg(doc);
    expect(svg).toContain('stroke-dasharray="8 6"');
    expect(svg).toContain('fill-opacity="0.07"');
    const parsed = parseDocument(serializeDocument(doc));
    expect(parsed.elements.filter((element) => element.type === 'zone')).toHaveLength(6);
    expect(documentToSvg(parsed)).toBe(svg);
  });

  it('fliser lerretet slik at macOS-eksporten fortsatt holder', () => {
    const doc = mikrotikTemplate();
    for (const scale of [1, 2, 3]) {
      const plan = rasterPlan(doc.canvas.width, doc.canvas.height, scale);
      expect(Math.max(...plan.tiles.map((tile) => Math.max(tile.w, tile.h)))).toBeLessThanOrEqual(2048);
      expect(plan.width).toBe(Math.round(doc.canvas.width * plan.scale));
      expect(plan.height).toBe(Math.round(doc.canvas.height * plan.scale));
      if (scale > 1) expect(plan.tiles.length).toBeGreaterThan(1);
    }
  });
});

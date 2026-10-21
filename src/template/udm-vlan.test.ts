import { describe, expect, it } from 'vitest';
import { anchorPoint } from '../model/geometry';
import { findElement } from '../model/edit';
import { parseDocument, serializeDocument } from '../model/serialize';
import { connectorSegments } from '../model/routing';
import { APP_VERSION } from '../model/types';
import { documentToSvg } from '../render/scene';
import { diagramTemplates, udmVlanTemplate, unifiTemplate } from './unifi';

describe('UDM SE VLAN-malen 21.10.2026', () => {
  it('ligger i malvelgeren sammen med den eksisterende malen', () => {
    const templates = diagramTemplates();
    expect(templates.map((item) => item.id)).toEqual(['unifi', 'udm-vlan']);
    expect(templates.map((item) => item.name)).toContain('UniFi UDM SE – Mathias/Lars/Harry VLAN (21.10.2026)');
    expect(templates[0].create().meta.updated).toBe(unifiTemplate().meta.updated);
    expect(templates[1].create().meta.updated).toBe('2026-10-21T12:00:00.000Z');
  });

  it('laster kort, ikoner, koblinger, VLAN-tabell og brannmur', () => {
    const doc = udmVlanTemplate();
    expect(doc.format).toBe('topologi-studio');
    expect(doc.meta.appVersion).toBe(APP_VERSION);
    expect(doc.meta.title).toBe('Nettverkstopologi – UniFi Dream Machine SE');
    expect(doc.canvas).toEqual({ width: 1900, height: 1940, background: '#14171c' });

    const title = findElement(doc, 'text-title');
    const subtitle = findElement(doc, 'text-sub');
    expect(title?.type === 'text' && title.text).toBe('Nettverkstopologi – UniFi Dream Machine SE');
    expect(subtitle?.type === 'text' && subtitle.text).toBe('Lars · oppdatert 21.10.2026');

    const icons = doc.elements.filter((element) => element.type === 'icon');
    expect(icons.map((element) => (element.type === 'icon' ? element.icon : ''))).toEqual(['globe', 'switch', 'pc', 'switch', 'junction']);

    const table = findElement(doc, 'table-vlan');
    expect(table?.type).toBe('table');
    if (table?.type === 'table') {
      expect(table.headers).toEqual(['Navn', 'Eier', 'VLAN', 'Subnett', 'Gateway', 'DHCP i bruk']);
      expect(table.rows.map((row) => [row[0], row[1], row[2]])).toEqual([
        ['Default', '–', '1'],
        ['Vlan 10', 'Mathias', '10'],
        ['Vlan 20', 'Lars', '20'],
        ['Vlan 30', 'Harry', '30'],
        ['Transit', 'Trunk', '100'],
      ]);
    }

    const matrix = findElement(doc, 'matrix-fw');
    expect(matrix?.type).toBe('matrix');
    if (matrix?.type === 'matrix') {
      expect(matrix.rowLabels).toEqual(['Vlan 10', 'Vlan 20', 'Vlan 30', 'Transit']);
      expect(matrix.colLabels).toEqual(matrix.rowLabels);
      expect(matrix.cells.flat().map((cell) => cell.text)).toEqual(Array(16).fill('Block All'));
      expect(matrix.notes[0]).toContain('Mathias');
      expect(matrix.notes[0]).toContain('Lars');
      expect(matrix.notes[0]).toContain('Harry');
      expect(matrix.notes).toHaveLength(6);
    }

    const dashed = findElement(doc, 'wire-ports');
    expect(dashed?.type === 'connector' && dashed.dash).toEqual([14, 10]);

    const parsed = parseDocument(serializeDocument(doc));
    expect(parsed.elements).toHaveLength(doc.elements.length);
    expect(documentToSvg(parsed)).toBe(documentToSvg(doc));
  });

  it('fester koblingene til referansepunktene', () => {
    const doc = udmVlanTemplate();
    const expectLine = (id: string, points: [number, number][]) => {
      const wire = findElement(doc, id);
      expect(wire?.type).toBe('connector');
      if (wire?.type !== 'connector') return;
      const actual = wire.points.map((anchor) => anchorPoint(doc, anchor));
      expect(actual.map((point) => [point.x, point.y])).toEqual(points);
      const segments = connectorSegments(doc, wire);
      expect(segments.length).toBeGreaterThan(0);
    };
    expectLine('wire-isp', [[900, 208], [900, 222]]);
    expectLine('wire-wan', [[900, 340], [900, 432]]);
    expectLine('wire-down', [[900, 614], [900, 700]]);
    expectLine('wire-bus', [[450, 700], [900, 700], [1350, 700]]);
    expectLine('wire-pc', [[450, 700], [450, 900]]);
    expectLine('wire-trunk', [[1350, 700], [1350, 870]]);
    expectLine('wire-ports', [[1160, 520], [1300, 520]]);
  });
});

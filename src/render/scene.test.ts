import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { anchorPoint } from '../model/geometry';
import { deleteElements, translateElements } from '../model/edit';
import { parseDocument, serializeDocument } from '../model/serialize';
import { findElement } from '../model/edit';
import { documentToSvg } from './scene';
import { unifiTemplate } from '../template/unifi';

function attr(source: string, name: string): string | null {
  const match = source.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return match ? match[1] : null;
}

function num(value: string | null, fallback = 0): number {
  if (value == null || value === '') return fallback;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed * 100) / 100;
}

function collect(svg: string): string[] {
  const signatures: string[] = [];
  for (const match of svg.matchAll(/<line\b([^>]*)\/?>/g)) {
    const tag = match[1];
    signatures.push(
      [
        'L',
        num(attr(tag, 'x1')),
        num(attr(tag, 'y1')),
        num(attr(tag, 'x2')),
        num(attr(tag, 'y2')),
        attr(tag, 'stroke') ?? '',
        num(attr(tag, 'stroke-width'), 1),
        attr(tag, 'stroke-dasharray') ?? '',
      ].join('|'),
    );
  }
  for (const match of svg.matchAll(/<rect\b([^>]*)\/?>/g)) {
    const tag = match[1];
    const stroke = attr(tag, 'stroke') ?? '';
    signatures.push(
      [
        'R',
        num(attr(tag, 'x')),
        num(attr(tag, 'y')),
        num(attr(tag, 'width')),
        num(attr(tag, 'height')),
        num(attr(tag, 'rx')),
        attr(tag, 'fill') ?? '',
        stroke,
        stroke ? num(attr(tag, 'stroke-width'), 1) : 0,
        num(attr(tag, 'opacity'), 1),
      ].join('|'),
    );
  }
  for (const match of svg.matchAll(/<circle\b([^>]*)\/?>/g)) {
    const tag = match[1];
    const stroke = attr(tag, 'stroke') ?? '';
    signatures.push(
      [
        'C',
        num(attr(tag, 'cx')),
        num(attr(tag, 'cy')),
        num(attr(tag, 'r')),
        attr(tag, 'fill') ?? '',
        stroke,
        stroke ? num(attr(tag, 'stroke-width'), 1) : 0,
        num(attr(tag, 'opacity'), 1),
      ].join('|'),
    );
  }
  for (const match of svg.matchAll(/<text\b([^>]*)>(.*?)<\/text>/g)) {
    const tag = match[1];
    signatures.push(
      [
        'T',
        num(attr(tag, 'x')),
        num(attr(tag, 'y')),
        num(attr(tag, 'font-size')),
        attr(tag, 'font-weight') ?? '',
        attr(tag, 'fill') ?? '',
        attr(tag, 'text-anchor') ?? 'start',
        match[2],
      ].join('|'),
    );
  }
  return signatures;
}

function bag(items: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

describe('UniFi-malen', () => {
  const fixturePath = fileURLToPath(new URL('../../tests/fixtures/topologi_v2.svg', import.meta.url));
  const reference = readFileSync(fixturePath, 'utf8');

  it('gjengir de samme figurene som referanse-SVG-en', () => {
    const actual = documentToSvg(unifiTemplate());
    const expectedBag = bag(collect(reference));
    const actualBag = bag(collect(actual));
    const missing: string[] = [];
    const extra: string[] = [];
    for (const [key, count] of expectedBag) {
      const have = actualBag.get(key) ?? 0;
      if (have < count) missing.push(`${count - have}× ${key}`);
    }
    for (const [key, count] of actualBag) {
      const want = expectedBag.get(key) ?? 0;
      if (count > want) extra.push(`${count - want}× ${key}`);
    }
    expect(missing, `mangler\n${missing.join('\n')}\n\nekstra\n${extra.join('\n')}`).toEqual([]);
    expect(extra).toEqual([]);
  });

  it('følger knutepunkt når en enhet flyttes', () => {
    const doc = unifiTemplate();
    const before = anchorPoint(doc, { mode: 'el', id: 'icon-globe', port: 'c', t: 0.5, ox: 0, oy: 5 });
    const moved = translateElements(doc, ['icon-globe'], 30, -12);
    const after = anchorPoint(moved, { mode: 'el', id: 'icon-globe', port: 'c', t: 0.5, ox: 0, oy: 5 });
    expect(after.x).toBeCloseTo(before.x + 30);
    expect(after.y).toBeCloseTo(before.y - 12);
    const wire = findElement(moved, 'wire-backbone');
    expect(wire?.type).toBe('connector');
  });

  it('fryser koblingen når en enhet slettes', () => {
    const doc = unifiTemplate();
    const point = anchorPoint(doc, { mode: 'el', id: 'icon-globe', port: 'c', t: 0.5, ox: 0, oy: 5 });
    const next = deleteElements(doc, ['icon-globe']);
    const wire = findElement(next, 'wire-backbone');
    expect(wire?.type).toBe('connector');
    if (wire?.type === 'connector') {
      expect(wire.points[0]).toMatchObject({ mode: 'abs', x: point.x, y: point.y });
    }
  });

  it('runder .topo-filen uten tap', () => {
    const doc = unifiTemplate();
    const parsed = parseDocument(serializeDocument(doc));
    expect(parsed.canvas).toEqual(doc.canvas);
    expect(parsed.elements).toHaveLength(doc.elements.length);
    expect(documentToSvg(parsed)).toBe(documentToSvg(doc));
  });
});

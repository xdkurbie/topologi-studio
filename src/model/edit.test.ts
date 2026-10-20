import { describe, expect, it } from 'vitest';
import { createCard } from './factory';
import { alignElements, changeZ, distributeElements, duplicateElements, translateElements } from './edit';
import { alignmentSnap, resizeBox, snapValue } from './geometry';
import { History } from './history';
import { orthogonalRoute } from './routing';
import { parseDocument } from './serialize';
import { DARK_THEME } from './theme';
import { blankDocument } from '../template/unifi';
import { addElement } from './edit';

function docWithCards() {
  let doc = blankDocument('dark');
  doc = addElement(doc, { ...createCard(DARK_THEME, 0, 0), id: 'a', w: 100, h: 40 });
  doc = addElement(doc, { ...createCard(DARK_THEME, 50, 80), id: 'b', w: 80, h: 40 });
  doc = addElement(doc, { ...createCard(DARK_THEME, 200, 20), id: 'c', w: 60, h: 40 });
  return doc;
}

describe('redigering', () => {
  it('fester til rutenett', () => {
    expect(snapValue(14, 10, true)).toBe(10);
    expect(snapValue(16, 10, true)).toBe(20);
    expect(snapValue(16, 10, false)).toBe(16);
  });

  it('justerer venstre og fordeler horisontalt', () => {
    const doc = docWithCards();
    const aligned = alignElements(doc, ['a', 'b', 'c'], 'left');
    const xs = ['a', 'b', 'c'].map((id) => aligned.elements.find((element) => element.id === id)?.x);
    expect(xs).toEqual([0, 0, 0]);
    const spread = distributeElements(doc, ['a', 'b', 'c'], 'h');
    const ordered = ['a', 'b', 'c']
      .map((id) => spread.elements.find((element) => element.id === id)!)
      .sort((a, b) => a.x - b.x);
    const gap1 = ordered[1].x - (ordered[0].x + ordered[0].w);
    const gap2 = ordered[2].x - (ordered[1].x + ordered[1].w);
    expect(gap1).toBeCloseTo(gap2);
  });

  it('angrer og gjør om en flytting', () => {
    const history = new History();
    const doc = docWithCards();
    history.checkpoint(doc);
    const moved = translateElements(doc, ['a'], 25, 5);
    const undone = history.undo(moved);
    expect(undone?.elements.find((element) => element.id === 'a')?.x).toBe(0);
    const redone = history.redo(undone!);
    expect(redone?.elements.find((element) => element.id === 'a')?.x).toBe(25);
  });

  it('gir nye id-er ved duplisering og beholder innhold', () => {
    const doc = docWithCards();
    const result = duplicateElements(doc, ['a'], 10, 10);
    expect(result.ids).toHaveLength(1);
    expect(result.ids[0]).not.toBe('a');
    const copy = result.doc.elements.find((element) => element.id === result.ids[0]);
    expect(copy?.x).toBe(10);
    expect(copy?.type === 'card' && copy.title).toBe('Nytt kort');
  });

  it('legger markering foran', () => {
    const doc = docWithCards();
    const next = changeZ(doc, ['a'], 'front');
    const a = next.elements.find((element) => element.id === 'a')!;
    const max = Math.max(...next.elements.map((element) => element.z));
    expect(a.z).toBe(max);
  });

  it('viser hjelpelinjer når kanter møtes', () => {
    const guides = alignmentSnap([{ x: 0, y: 0, w: 40, h: 20 }], [{ x: 100, y: 48, w: 30, h: 20 }], 98, 50, 6);
    expect(guides.dx).toBe(100);
    expect(guides.dy).toBe(48);
    expect(guides.guides.map((guide) => guide.axis).sort()).toEqual(['x', 'y']);
  });

  it('endrer størrelse fra vest uten å bli negativ', () => {
    const box = resizeBox({ x: 10, y: 10, w: 40, h: 20 }, 'w', 30, 0, false);
    expect(box.w).toBeGreaterThanOrEqual(16);
    expect(box.x + box.w).toBeCloseTo(50);
  });

  it('ruter ortogonalt med akseparallelle ledd', () => {
    const points = orthogonalRoute({ x: 0, y: 0 }, { x: 120, y: 80 }, 'e', 'w');
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 120, y: 80 });
    for (let index = 1; index < points.length; index += 1) {
      const horizontal = points[index].y === points[index - 1].y;
      const vertical = points[index].x === points[index - 1].x;
      expect(horizontal || vertical).toBe(true);
    }
  });

  it('avviser fremmed filformat', () => {
    expect(() => parseDocument('{"format":"annet","version":1}')).toThrow(/filformat/i);
    expect(() => parseDocument('{"format":"topologi-studio","version":9,"meta":{},"canvas":{"width":1,"height":1,"background":"#000"},"elements":[]}')).toThrow(/versjon/i);
  });
});

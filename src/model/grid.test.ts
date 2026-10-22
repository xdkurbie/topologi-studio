import { describe, expect, it } from 'vitest';
import { createMatrix, createTable } from './factory';
import { editGrid } from './grid';
import { findElement } from './edit';
import { History } from './history';
import { parseDocument, serializeDocument } from './serialize';
import { documentToSvg } from '../render/scene';
import { overlayMarkup } from '../render/overlay';
import { DARK_THEME } from './theme';
import { blankDocument } from '../template/unifi';

function withMatrix() {
  const matrix = { ...createMatrix(DARK_THEME, 40, 40), id: 'matrix-fw' };
  const doc = blankDocument('dark');
  doc.elements = [matrix];
  return doc;
}

describe('rader og kolonner', () => {
  it('setter inn og sletter rader og kolonner i en matrise, med angre', () => {
    const doc = withMatrix();
    const before = findElement(doc, 'matrix-fw');
    if (before?.type !== 'matrix') throw new Error('mangler matrise');
    const inserted = editGrid(doc, 'matrix-fw', 'add-row-before', 0);
    const row = findElement(inserted, 'matrix-fw');
    if (row?.type !== 'matrix') throw new Error('mangler matrise');
    expect(row.rowLabels[0]).toBe('Ny rad');
    expect(row.rowLabels).toHaveLength(before.rowLabels.length + 1);
    expect(row.cells[0]).toHaveLength(before.colLabels.length);
    expect(row.h).toBe(before.h + before.strideY);

    const widened = editGrid(inserted, 'matrix-fw', 'add-col-after', 1);
    const col = findElement(widened, 'matrix-fw');
    if (col?.type !== 'matrix') throw new Error('mangler matrise');
    expect(col.colLabels[2]).toBe('Ny kolonne');
    expect(col.cells.every((line) => line.length === before.colLabels.length + 1)).toBe(true);
    expect(col.w).toBe(row.w + before.strideX);

    const history = new History();
    history.checkpoint(inserted);
    const undone = history.undo(widened);
    const back = undone && findElement(undone, 'matrix-fw');
    expect(back?.type === 'matrix' && back.colLabels).toEqual(row.colLabels);

    const trimmed = editGrid(widened, 'matrix-fw', 'del-row', 0);
    const fewer = findElement(trimmed, 'matrix-fw');
    expect(fewer?.type === 'matrix' && fewer.rowLabels[0]).toBe(before.rowLabels[0]);
    const stuck = editGrid(editGrid(editGrid(trimmed, 'matrix-fw', 'del-row', 0), 'matrix-fw', 'del-row', 0), 'matrix-fw', 'del-row', 0);
    const last = findElement(stuck, 'matrix-fw');
    expect(last?.type === 'matrix' && last.rowLabels).toHaveLength(1);

    const parsed = parseDocument(serializeDocument(widened));
    expect(documentToSvg(parsed)).toContain('Ny rad');
    expect(documentToSvg(parsed)).toContain('Ny kolonne');
  });

  it('setter inn rad og kolonne i en tabell og beholder cellene', () => {
    const table = { ...createTable(DARK_THEME, 10, 10), id: 'table-ports' };
    const doc = blankDocument('dark');
    doc.elements = [table];
    const next = editGrid(editGrid(doc, 'table-ports', 'add-col-before', 1), 'table-ports', 'add-row-after', 0);
    const edited = findElement(next, 'table-ports');
    if (edited?.type !== 'table') throw new Error('mangler tabell');
    expect(edited.headers[1]).toMatch(/Kolonne/);
    expect(edited.rows[1].every((cell) => cell === '')).toBe(true);
    expect(edited.rows[0][0]).toBe('A');
    expect(edited.rows[0][2]).toBe('1');
    expect(edited.w).toBeGreaterThan(table.w);
    expect(edited.h).toBe(table.h + table.rowStride);
    const parsed = parseDocument(serializeDocument(next));
    const saved = findElement(parsed, 'table-ports');
    expect(saved?.type === 'table' && saved.headers).toEqual(edited.headers);
    expect(saved?.type === 'table' && saved.rows).toEqual(edited.rows);
  });

  it('tegner pluss og minus på kanten av en valgt matrise', () => {
    const doc = withMatrix();
    const html = overlayMarkup({
      doc,
      zoom: 1,
      selected: ['matrix-fw'],
      hoverId: null,
      tool: 'select',
      guides: [],
      marquee: null,
      rubber: null,
      pending: false,
    });
    expect(html).toContain('data-grid="grid:add-row"');
    expect(html).toContain('data-grid="grid:add-col"');
    expect(html).toContain('data-grid="grid:del-row:0"');
    expect(html).toContain('data-grid="grid:del-col:1"');
  });
});

import { findElement, updateElement } from './edit';
import type { MatrixCell, MatrixElement, TableElement, TopoDocument, TopoElement } from './types';

export type GridOp =
  | 'add-row'
  | 'add-row-before'
  | 'add-row-after'
  | 'del-row'
  | 'add-col'
  | 'add-col-before'
  | 'add-col-after'
  | 'del-col';

function clamp(index: number, length: number): number {
  if (!Number.isFinite(index)) return length;
  return Math.max(0, Math.min(length, Math.trunc(index)));
}

function blankCell(sample: MatrixCell | undefined): MatrixCell {
  if (sample) return { text: '–', fill: sample.fill, color: sample.color };
  return { text: '–', fill: '#232a35', color: '#9aa6b8' };
}

function insertAt<T>(items: T[], index: number, value: T): T[] {
  const next = [...items];
  next.splice(index, 0, value);
  return next;
}

export function insertMatrixRow(element: MatrixElement, index: number): MatrixElement {
  const at = clamp(index, element.rowLabels.length);
  const sample = element.cells[Math.min(at, Math.max(0, element.cells.length - 1))]?.[0];
  const cells = element.cells.map((row) => row.map((cell) => ({ ...cell })));
  cells.splice(
    at,
    0,
    element.colLabels.map((_, col) => blankCell(element.cells[Math.min(at, element.cells.length - 1)]?.[col] ?? sample)),
  );
  return {
    ...element,
    rowLabels: insertAt(element.rowLabels, at, 'Ny rad'),
    cells,
    noteDy: element.noteDy + element.strideY,
    h: element.h + element.strideY,
  };
}

export function deleteMatrixRow(element: MatrixElement, index: number): MatrixElement {
  if (element.rowLabels.length <= 1) return element;
  const at = Math.max(0, Math.min(element.rowLabels.length - 1, Math.trunc(index)));
  return {
    ...element,
    rowLabels: element.rowLabels.filter((_, row) => row !== at),
    cells: element.cells.filter((_, row) => row !== at).map((row) => row.map((cell) => ({ ...cell }))),
    noteDy: Math.max(element.cellY, element.noteDy - element.strideY),
    h: Math.max(element.cellY + element.strideY, element.h - element.strideY),
  };
}

export function insertMatrixCol(element: MatrixElement, index: number): MatrixElement {
  const at = clamp(index, element.colLabels.length);
  const cells = element.cells.map((row) => {
    const next = row.map((cell) => ({ ...cell }));
    const sample = row[Math.min(at, Math.max(0, row.length - 1))];
    next.splice(at, 0, blankCell(sample));
    return next;
  });
  return {
    ...element,
    colLabels: insertAt(element.colLabels, at, 'Ny kolonne'),
    cells,
    w: element.w + element.strideX,
  };
}

export function deleteMatrixCol(element: MatrixElement, index: number): MatrixElement {
  if (element.colLabels.length <= 1) return element;
  const at = Math.max(0, Math.min(element.colLabels.length - 1, Math.trunc(index)));
  return {
    ...element,
    colLabels: element.colLabels.filter((_, col) => col !== at),
    cells: element.cells.map((row) => row.filter((_, col) => col !== at).map((cell) => ({ ...cell }))),
    w: Math.max(element.cellX + element.cellW, element.w - element.strideX),
  };
}

function columnGap(colX: number[], index: number): number {
  if (colX.length >= 2) {
    const gaps = colX.slice(1).map((value, item) => value - colX[item]);
    const pick = gaps[Math.max(0, Math.min(gaps.length - 1, index - (index >= colX.length ? 1 : 0)))];
    return Math.max(48, pick || 160);
  }
  return 160;
}

export function insertTableRow(element: TableElement, index: number): TableElement {
  const at = clamp(index, element.rows.length);
  const rows = element.rows.map((row) => [...row]);
  rows.splice(at, 0, element.headers.map(() => ''));
  return { ...element, rows, h: element.h + element.rowStride };
}

export function deleteTableRow(element: TableElement, index: number): TableElement {
  if (element.rows.length <= 1) return element;
  const at = Math.max(0, Math.min(element.rows.length - 1, Math.trunc(index)));
  return {
    ...element,
    rows: element.rows.filter((_, row) => row !== at).map((row) => [...row]),
    h: Math.max(element.bodyDy + element.rowStride, element.h - element.rowStride),
  };
}

export function insertTableCol(element: TableElement, index: number): TableElement {
  const at = clamp(index, element.headers.length);
  const gap = columnGap(element.colX, at);
  const colX = element.colX.map((offset, item) => (item >= at ? offset + gap : offset));
  const placed = at === 0 ? 0 : (element.colX[at - 1] ?? 0) + gap;
  colX.splice(at, 0, placed);
  return {
    ...element,
    headers: insertAt(element.headers, at, `Kolonne ${element.headers.length + 1}`),
    colX,
    rows: element.rows.map((row) => {
      const next = [...row];
      next.splice(at, 0, '');
      return next;
    }),
    w: element.w + gap,
  };
}

export function deleteTableCol(element: TableElement, index: number): TableElement {
  if (element.headers.length <= 1) return element;
  const at = Math.max(0, Math.min(element.headers.length - 1, Math.trunc(index)));
  const removed =
    at < element.colX.length - 1
      ? element.colX[at + 1] - element.colX[at]
      : Math.max(48, element.colX[at] - (element.colX[at - 1] ?? 0));
  const colX = element.colX.filter((_, col) => col !== at).map((offset, item) => (item >= at ? offset - removed : offset));
  return {
    ...element,
    headers: element.headers.filter((_, col) => col !== at),
    colX,
    rows: element.rows.map((row) => row.filter((_, col) => col !== at)),
    w: Math.max((colX.at(-1) ?? 0) + 80, element.w - removed),
  };
}

export function applyGridOp(element: TableElement | MatrixElement, op: GridOp, index: number): TableElement | MatrixElement {
  if (element.type === 'matrix') {
    if (op === 'add-row') return insertMatrixRow(element, element.rowLabels.length);
    if (op === 'add-row-before') return insertMatrixRow(element, index);
    if (op === 'add-row-after') return insertMatrixRow(element, index + 1);
    if (op === 'del-row') return deleteMatrixRow(element, index);
    if (op === 'add-col') return insertMatrixCol(element, element.colLabels.length);
    if (op === 'add-col-before') return insertMatrixCol(element, index);
    if (op === 'add-col-after') return insertMatrixCol(element, index + 1);
    return deleteMatrixCol(element, index);
  }
  if (op === 'add-row') return insertTableRow(element, element.rows.length);
  if (op === 'add-row-before') return insertTableRow(element, index);
  if (op === 'add-row-after') return insertTableRow(element, index + 1);
  if (op === 'del-row') return deleteTableRow(element, index);
  if (op === 'add-col') return insertTableCol(element, element.headers.length);
  if (op === 'add-col-before') return insertTableCol(element, index);
  if (op === 'add-col-after') return insertTableCol(element, index + 1);
  return deleteTableCol(element, index);
}

export function editGrid(doc: TopoDocument, id: string, op: GridOp, index = 0): TopoDocument {
  const element = findElement(doc, id);
  if (!element || (element.type !== 'matrix' && element.type !== 'table') || element.locked) return doc;
  const next = applyGridOp(element, op, index);
  if (next === element) return doc;
  return updateElement(doc, id, next);
}

export function isGridElement(element: TopoElement | undefined): element is TableElement | MatrixElement {
  return element?.type === 'matrix' || element?.type === 'table';
}

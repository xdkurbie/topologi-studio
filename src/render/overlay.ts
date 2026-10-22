import type { Tool } from '../editor/editor';
import { portsOf } from '../model/geometry';
import { connectorPoints } from '../model/routing';
import type { Box, Guide, MatrixElement, Point, TableElement, TopoDocument, TopoElement } from '../model/types';
import { fmt, xmlAttr } from './xml';

export interface OverlayInput {
  doc: TopoDocument;
  zoom: number;
  selected: string[];
  hoverId: string | null;
  tool: Tool;
  guides: Guide[];
  marquee: Box | null;
  rubber: Point[] | null;
  pending: boolean;
}

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

function handlePoint(element: TopoElement, handle: (typeof HANDLES)[number]): Point {
  const { x, y, w, h } = element;
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (handle) {
    case 'nw':
      return { x, y };
    case 'n':
      return { x: cx, y };
    case 'ne':
      return { x: x + w, y };
    case 'e':
      return { x: x + w, y: cy };
    case 'se':
      return { x: x + w, y: y + h };
    case 's':
      return { x: cx, y: y + h };
    case 'sw':
      return { x, y: y + h };
    case 'w':
      return { x, y: cy };
  }
}

export function overlayMarkup(input: OverlayInput): string {
  const { doc, zoom, selected } = input;
  const selectedSet = new Set(selected);
  const parts: string[] = [];
  const stroke = 1.5 / zoom;
  const showPorts = input.tool === 'connect' || input.pending;

  if (doc.elements.length === 0) {
    parts.push(
      `<text x="${fmt(doc.canvas.width / 2)}" y="${fmt(doc.canvas.height / 2)}" text-anchor="middle" fill="#8e9aab" font-size="22" font-family="DejaVu Sans, Arial, sans-serif">Dra inn elementer fra biblioteket</text>`,
    );
  }

  for (const guide of input.guides) {
    if (guide.axis === 'x') {
      parts.push(
        `<line x1="${fmt(guide.at)}" y1="0" x2="${fmt(guide.at)}" y2="${fmt(doc.canvas.height)}" stroke="#8fc1ff" stroke-width="${fmt(1 / zoom)}" stroke-dasharray="${fmt(4 / zoom)} ${fmt(3 / zoom)}" pointer-events="none"/>`,
      );
    } else {
      parts.push(
        `<line y1="${fmt(guide.at)}" x1="0" y2="${fmt(guide.at)}" x2="${fmt(doc.canvas.width)}" stroke="#8fc1ff" stroke-width="${fmt(1 / zoom)}" stroke-dasharray="${fmt(4 / zoom)} ${fmt(3 / zoom)}" pointer-events="none"/>`,
      );
    }
  }

  if (input.marquee) {
    const box = input.marquee;
    const x = Math.min(box.x, box.x + box.w);
    const y = Math.min(box.y, box.y + box.h);
    const w = Math.abs(box.w);
    const h = Math.abs(box.h);
    parts.push(
      `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="rgba(74,144,226,0.12)" stroke="#4a90e2" stroke-width="${fmt(stroke)}" pointer-events="none"/>`,
    );
  }

  if (input.rubber && input.rubber.length > 1) {
    const d = input.rubber.map((point, index) => `${index === 0 ? 'M' : 'L'}${fmt(point.x)} ${fmt(point.y)}`).join(' ');
    parts.push(
      `<path d="${d}" fill="none" stroke="#8fc1ff" stroke-width="${fmt(2 / zoom)}" stroke-dasharray="${fmt(6 / zoom)} ${fmt(4 / zoom)}" pointer-events="none"/>`,
    );
  }

  for (const element of doc.elements) {
    const active = selectedSet.has(element.id) || element.id === input.hoverId;
    if (showPorts || active) {
      if (element.type === 'connector') continue;
      for (const port of portsOf(element)) {
        parts.push(
          `<circle data-port="${port.port}" data-id="${xmlAttr(element.id)}" cx="${fmt(port.x)}" cy="${fmt(port.y)}" r="${fmt(5 / zoom)}" fill="#fff" stroke="#4a90e2" stroke-width="${fmt(1.5 / zoom)}"/>`,
        );
      }
    }
    if (!selectedSet.has(element.id)) continue;
    if (element.type !== 'connector') {
      parts.push(
        `<rect x="${fmt(element.x)}" y="${fmt(element.y)}" width="${fmt(element.w)}" height="${fmt(element.h)}" fill="none" stroke="#4a90e2" stroke-width="${fmt(stroke)}" pointer-events="none"/>`,
      );
      if (!element.locked) {
        for (const handle of HANDLES) {
          const point = handlePoint(element, handle);
          parts.push(
            `<rect data-handle="${handle}" data-id="${xmlAttr(element.id)}" x="${fmt(point.x - 4 / zoom)}" y="${fmt(point.y - 4 / zoom)}" width="${fmt(8 / zoom)}" height="${fmt(8 / zoom)}" fill="#fff" stroke="#4a90e2" stroke-width="${fmt(1.25 / zoom)}"/>`,
          );
        }
      }
    } else {
      const points = connectorPoints(doc, element);
      points.forEach((point, index) => {
        parts.push(
          `<rect data-point="${index}" data-id="${xmlAttr(element.id)}" x="${fmt(point.x - 5 / zoom)}" y="${fmt(point.y - 5 / zoom)}" width="${fmt(10 / zoom)}" height="${fmt(10 / zoom)}" fill="#4a90e2" stroke="#fff" stroke-width="${fmt(1.25 / zoom)}"/>`,
        );
      });
    }
    if (!element.locked && (element.type === 'matrix' || element.type === 'table')) {
      parts.push(gridChips(element, zoom));
    }
  }
  return parts.join('');
}

function gridChip(action: string, id: string, x: number, y: number, label: string, zoom: number): string {
  const radius = 9 / zoom;
  return `<g data-grid="${xmlAttr(action)}" data-id="${xmlAttr(id)}"><circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(radius)}" fill="#4a90e2" stroke="#fff" stroke-width="${fmt(1 / zoom)}"/><text x="${fmt(x)}" y="${fmt(y + 4 / zoom)}" text-anchor="middle" fill="#fff" font-size="${fmt(13 / zoom)}" font-family="DejaVu Sans, Arial, sans-serif" pointer-events="none">${label}</text></g>`;
}

function gridChips(element: MatrixElement | TableElement, zoom: number): string {
  const chips: string[] = [];
  const id = element.id;
  if (element.type === 'matrix') {
    element.rowLabels.forEach((_, row) => {
      if (element.rowLabels.length > 1) {
        chips.push(gridChip(`grid:del-row:${row}`, id, element.x - 16 / zoom, element.y + element.cellY + row * element.strideY + element.cellH / 2, '−', zoom));
      }
    });
    element.colLabels.forEach((_, col) => {
      if (element.colLabels.length > 1) {
        chips.push(gridChip(`grid:del-col:${col}`, id, element.x + element.cellX + col * element.strideX + element.cellW / 2, element.y + element.colHeaderDy - 18 / zoom, '−', zoom));
      }
    });
    chips.push(gridChip('grid:add-row', id, element.x + element.cellX + element.cellW / 2, element.y + element.h + 16 / zoom, '+', zoom));
    chips.push(gridChip('grid:add-col', id, element.x + element.w + 16 / zoom, element.y + element.cellY + element.cellH / 2, '+', zoom));
    return chips.join('');
  }
  element.rows.forEach((_, row) => {
    if (element.rows.length > 1) {
      chips.push(gridChip(`grid:del-row:${row}`, id, element.x - 16 / zoom, element.y + element.bodyDy + row * element.rowStride - 6, '−', zoom));
    }
  });
  element.headers.forEach((_, col) => {
    if (element.headers.length > 1) {
      chips.push(gridChip(`grid:del-col:${col}`, id, element.x + (element.colX[col] ?? 0) + 28, element.y + element.headerDy - 18 / zoom, '−', zoom));
    }
  });
  chips.push(gridChip('grid:add-row', id, element.x + 28, element.y + element.h + 16 / zoom, '+', zoom));
  chips.push(gridChip('grid:add-col', id, element.x + element.w + 16 / zoom, element.y + element.headerDy, '+', zoom));
  return chips.join('');
}

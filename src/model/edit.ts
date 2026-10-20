import { almost, anchorPoint, boxOf, snapValue, unionBox } from './geometry';
import { uid } from './ids';
import { connectorBounds } from './routing';
import type { Anchor, Box, ConnectorElement, TopoDocument, TopoElement } from './types';

export type AlignMode = 'left' | 'right' | 'top' | 'bottom' | 'hcenter' | 'vcenter';
export type ZDir = 'front' | 'back' | 'forward' | 'backward';

function sameBox(a: Box, b: Box): boolean {
  return almost(a.x, b.x) && almost(a.y, b.y) && almost(a.w, b.w) && almost(a.h, b.h);
}

function normalizeSize(element: TopoElement): TopoElement {
  if (element.type === 'card' && element.autoHeight) {
    const height = element.frameH + element.rows.length * element.rowStride;
    if (almost(height, element.h)) return element;
    return { ...element, h: height };
  }
  if (element.type === 'pill' && element.autoWidth) {
    const width = element.text.length * element.charW + element.padW;
    const x = element.x + element.w / 2 - width / 2;
    if (almost(width, element.w) && almost(x, element.x)) return element;
    return { ...element, w: width, x };
  }
  return element;
}

export function normalize(doc: TopoDocument): TopoDocument {
  const sized = doc.elements.map(normalizeSize);
  const sizedDoc = { ...doc, elements: sized };
  let changed = sized.some((element, index) => element !== doc.elements[index]);
  const elements = sized.map((element) => {
    if (element.type !== 'connector') return element;
    const bounds = connectorBounds(sizedDoc, element);
    if (sameBox(element, bounds)) return element;
    changed = true;
    return { ...element, ...bounds };
  });
  return changed ? { ...doc, elements } : doc;
}

export function findElement(doc: TopoDocument, id: string): TopoElement | undefined {
  return doc.elements.find((element) => element.id === id);
}

export function updateElement(doc: TopoDocument, id: string, patch: Partial<TopoElement>): TopoDocument {
  return normalize({
    ...doc,
    elements: doc.elements.map((element) => (element.id === id ? ({ ...element, ...patch } as TopoElement) : element)),
  });
}

function translateAnchor(anchor: Anchor, dx: number, dy: number, moved: Set<string>): Anchor {
  if (anchor.mode === 'abs') return { ...anchor, x: anchor.x + dx, y: anchor.y + dy };
  if (moved.has(anchor.id)) return anchor;
  return anchor;
}

export function translateElements(doc: TopoDocument, ids: string[], dx: number, dy: number): TopoDocument {
  if (dx === 0 && dy === 0) return doc;
  const moving = new Set(
    ids.filter((id) => {
      const element = findElement(doc, id);
      return element && !element.locked;
    }),
  );
  return normalize({
    ...doc,
    elements: doc.elements.map((element) => {
      if (!moving.has(element.id)) return element;
      if (element.type === 'connector') {
        return {
          ...element,
          points: element.points.map((anchor) => translateAnchor(anchor, dx, dy, moving)),
        };
      }
      return { ...element, x: element.x + dx, y: element.y + dy };
    }),
  });
}

export function resizeElement(doc: TopoDocument, id: string, box: Box): TopoDocument {
  const element = findElement(doc, id);
  if (!element || element.locked || element.type === 'connector') return doc;
  let next: TopoElement = { ...element, ...box };
  if (next.type === 'pill') next = { ...next, autoWidth: false };
  if (next.type === 'card' && !almost(box.h, element.h)) next = { ...next, autoHeight: false };
  return normalize({
    ...doc,
    elements: doc.elements.map((item) => (item.id === id ? next : item)),
  });
}

function freezeAnchor(doc: TopoDocument, anchor: Anchor, removed: Set<string>): Anchor {
  if (anchor.mode === 'el' && removed.has(anchor.id)) {
    const point = anchorPoint(doc, anchor);
    return { mode: 'abs', x: point.x, y: point.y };
  }
  return anchor;
}

export function deleteElements(doc: TopoDocument, ids: string[]): TopoDocument {
  const removed = new Set(
    ids.filter((id) => {
      const element = findElement(doc, id);
      return element && !element.locked;
    }),
  );
  if (removed.size === 0) return doc;
  return normalize({
    ...doc,
    elements: doc.elements
      .filter((element) => !removed.has(element.id))
      .map((element) => {
        if (element.type !== 'connector') return element;
        return { ...element, points: element.points.map((anchor) => freezeAnchor(doc, anchor, removed)) };
      }),
  });
}

function retarget(anchor: Anchor, map: Map<string, string>, dx: number, dy: number): Anchor {
  if (anchor.mode === 'abs') return { ...anchor, x: anchor.x + dx, y: anchor.y + dy };
  const next = map.get(anchor.id);
  return next ? { ...anchor, id: next } : anchor;
}

export function duplicateElements(
  doc: TopoDocument,
  ids: string[],
  dx = 24,
  dy = 24,
): { doc: TopoDocument; ids: string[] } {
  const chosen = doc.elements.filter((element) => ids.includes(element.id));
  if (chosen.length === 0) return { doc, ids: [] };
  const map = new Map(chosen.map((element) => [element.id, uid(element.type)]));
  let z = doc.elements.reduce((max, element) => Math.max(max, element.z), 0);
  const copies = chosen.map((element) => {
    const copy = structuredClone(element);
    copy.id = map.get(element.id) ?? uid(element.type);
    copy.z = ++z;
    copy.name = element.name;
    if (copy.type === 'connector') {
      copy.points = copy.points.map((anchor) => retarget(anchor, map, dx, dy));
    } else {
      copy.x += dx;
      copy.y += dy;
    }
    return copy;
  });
  return {
    doc: normalize({ ...doc, elements: [...doc.elements, ...copies] }),
    ids: copies.map((element) => element.id),
  };
}

export function alignElements(doc: TopoDocument, ids: string[], mode: AlignMode): TopoDocument {
  const items = doc.elements.filter((element) => ids.includes(element.id) && !element.locked && element.type !== 'connector');
  const bounds = unionBox(items.map(boxOf));
  if (!bounds || items.length < 2) return doc;
  let next = doc;
  for (const element of items) {
    let dx = 0;
    let dy = 0;
    if (mode === 'left') dx = bounds.x - element.x;
    if (mode === 'right') dx = bounds.x + bounds.w - (element.x + element.w);
    if (mode === 'hcenter') dx = bounds.x + bounds.w / 2 - (element.x + element.w / 2);
    if (mode === 'top') dy = bounds.y - element.y;
    if (mode === 'bottom') dy = bounds.y + bounds.h - (element.y + element.h);
    if (mode === 'vcenter') dy = bounds.y + bounds.h / 2 - (element.y + element.h / 2);
    next = translateElements(next, [element.id], dx, dy);
  }
  return next;
}

export function distributeElements(doc: TopoDocument, ids: string[], axis: 'h' | 'v'): TopoDocument {
  const items = doc.elements.filter((element) => ids.includes(element.id) && !element.locked && element.type !== 'connector');
  if (items.length < 3) return doc;
  const sorted = [...items].sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = axis === 'h' ? last.x + last.w - first.x : last.y + last.h - first.y;
  const total = sorted.reduce((sum, element) => sum + (axis === 'h' ? element.w : element.h), 0);
  const gap = (span - total) / (sorted.length - 1);
  let cursor = axis === 'h' ? first.x : first.y;
  const deltas = new Map<string, { dx: number; dy: number }>();
  for (const element of sorted) {
    const position = axis === 'h' ? element.x : element.y;
    const delta = cursor - position;
    deltas.set(element.id, { dx: axis === 'h' ? delta : 0, dy: axis === 'h' ? 0 : delta });
    cursor += (axis === 'h' ? element.w : element.h) + gap;
  }
  let next = doc;
  for (const [id, delta] of deltas) next = translateElements(next, [id], delta.dx, delta.dy);
  return next;
}

function reindex(doc: TopoDocument, ordered: TopoElement[]): TopoDocument {
  const zOf = new Map(ordered.map((element, index) => [element.id, index + 1]));
  return {
    ...doc,
    elements: doc.elements.map((element) => ({ ...element, z: zOf.get(element.id) ?? element.z })),
  };
}

export function changeZ(doc: TopoDocument, ids: string[], dir: ZDir): TopoDocument {
  const selected = new Set(ids);
  const ordered = [...doc.elements].sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
  if (dir === 'front' || dir === 'back') {
    const rest = ordered.filter((element) => !selected.has(element.id));
    const picked = ordered.filter((element) => selected.has(element.id));
    return reindex(doc, dir === 'front' ? [...rest, ...picked] : [...picked, ...rest]);
  }
  if (dir === 'forward') {
    for (let index = ordered.length - 2; index >= 0; index -= 1) {
      if (selected.has(ordered[index].id) && !selected.has(ordered[index + 1].id)) {
        const swap = ordered[index];
        ordered[index] = ordered[index + 1];
        ordered[index + 1] = swap;
      }
    }
    return reindex(doc, ordered);
  }
  for (let index = 1; index < ordered.length; index += 1) {
    if (selected.has(ordered[index].id) && !selected.has(ordered[index - 1].id)) {
      const swap = ordered[index];
      ordered[index] = ordered[index - 1];
      ordered[index - 1] = swap;
    }
  }
  return reindex(doc, ordered);
}

export function snapDrag(origin: Box, dx: number, dy: number, grid: number, enabled: boolean): { dx: number; dy: number } {
  if (!enabled) return { dx, dy };
  const x = snapValue(origin.x + dx, grid, true);
  const y = snapValue(origin.y + dy, grid, true);
  return { dx: x - origin.x, dy: y - origin.y };
}

export function addElement(doc: TopoDocument, element: TopoElement): TopoDocument {
  const z = doc.elements.reduce((max, item) => Math.max(max, item.z), 0) + 1;
  return normalize({ ...doc, elements: [...doc.elements, { ...element, z }] });
}

export function importElements(
  doc: TopoDocument,
  incoming: TopoElement[],
  dx = 24,
  dy = 24,
): { doc: TopoDocument; ids: string[] } {
  if (incoming.length === 0) return { doc, ids: [] };
  const map = new Map(incoming.map((element) => [element.id, uid(element.type)]));
  let z = doc.elements.reduce((max, element) => Math.max(max, element.z), 0);
  const copies = incoming.map((source) => {
    const copy = structuredClone(source);
    copy.id = map.get(source.id) ?? uid(source.type);
    copy.z = ++z;
    if (copy.type === 'connector') {
      copy.points = copy.points.map((anchor) => {
        if (anchor.mode === 'abs') return { ...anchor, x: anchor.x + dx, y: anchor.y + dy };
        const mapped = map.get(anchor.id);
        if (mapped) return { ...anchor, id: mapped };
        const point = anchorPoint(doc, anchor);
        return { mode: 'abs' as const, x: point.x + dx, y: point.y + dy };
      });
    } else {
      copy.x += dx;
      copy.y += dy;
    }
    return copy;
  });
  return {
    doc: normalize({ ...doc, elements: [...doc.elements, ...copies] }),
    ids: copies.map((element) => element.id),
  };
}

export function elementsReferencing(connector: ConnectorElement): string[] {
  return connector.points.flatMap((anchor) => (anchor.mode === 'el' ? [anchor.id] : []));
}

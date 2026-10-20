import type { Anchor, Box, Guide, Handle, Point, Port, TopoDocument, TopoElement } from './types';

export function snapValue(value: number, grid: number, enabled: boolean): number {
  if (!enabled || grid <= 0) return value;
  return Math.round(value / grid) * grid;
}

export function almost(a: number, b: number, eps = 1e-4): boolean {
  return Math.abs(a - b) <= eps;
}

export function boxOf(el: Pick<TopoElement, 'x' | 'y' | 'w' | 'h'>): Box {
  return { x: el.x, y: el.y, w: el.w, h: el.h };
}

export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const box of boxes) {
    x0 = Math.min(x0, box.x);
    y0 = Math.min(y0, box.y);
    x1 = Math.max(x1, box.x + box.w);
    y1 = Math.max(y1, box.y + box.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInBox(point: Point, box: Box, pad = 0): boolean {
  return (
    point.x >= box.x - pad &&
    point.x <= box.x + box.w + pad &&
    point.y >= box.y - pad &&
    point.y <= box.y + box.h + pad
  );
}

export function portPoint(el: Box, port: Port, t = 0.5): Point {
  const clamped = Math.min(1, Math.max(0, t));
  switch (port) {
    case 'n':
      return { x: el.x + el.w * clamped, y: el.y };
    case 's':
      return { x: el.x + el.w * clamped, y: el.y + el.h };
    case 'w':
      return { x: el.x, y: el.y + el.h * clamped };
    case 'e':
      return { x: el.x + el.w, y: el.y + el.h * clamped };
    case 'c':
      return { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  }
}

export function anchorPoint(doc: TopoDocument, anchor: Anchor): Point {
  if (anchor.mode === 'abs') return { x: anchor.x, y: anchor.y };
  const element = doc.elements.find((item) => item.id === anchor.id);
  if (!element) return { x: anchor.ox, y: anchor.oy };
  const point = portPoint(element, anchor.port, anchor.t);
  return { x: point.x + anchor.ox, y: point.y + anchor.oy };
}

export function portsOf(el: Box): { port: Exclude<Port, 'c'>; x: number; y: number }[] {
  return (['n', 'e', 's', 'w'] as const).map((port) => {
    const point = portPoint(el, port, 0.5);
    return { port, x: point.x, y: point.y };
  });
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  if (length === 0) return distance(point, a);
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / length;
  t = Math.max(0, Math.min(1, t));
  return distance(point, { x: a.x + t * dx, y: a.y + t * dy });
}

export interface EdgeAnchor {
  id: string;
  port: Exclude<Port, 'c'>;
  t: number;
  x: number;
  y: number;
  distance: number;
}

export function nearestAnchor(
  doc: TopoDocument,
  point: Point,
  excludeId?: string,
  maxDistance = 16,
): EdgeAnchor | null {
  let best: EdgeAnchor | null = null;
  for (const element of doc.elements) {
    if (element.id === excludeId || element.type === 'connector') continue;
    for (const port of ['n', 'e', 's', 'w'] as const) {
      const origin = portPoint(element, port, 0.5);
      const dist = distance(point, origin);
      if (dist <= maxDistance && (!best || dist < best.distance)) {
        best = { id: element.id, port, t: 0.5, x: origin.x, y: origin.y, distance: dist };
      }
    }
    const edges: { port: Exclude<Port, 'c'>; t: number; at: Point }[] = [];
    if (point.y >= element.y - 8 && point.y <= element.y + element.h + 8) {
      const t = element.h === 0 ? 0.5 : (point.y - element.y) / element.h;
      if (Math.abs(point.x - element.x) <= 10) {
        edges.push({ port: 'w', t, at: portPoint(element, 'w', t) });
      }
      if (Math.abs(point.x - (element.x + element.w)) <= 10) {
        edges.push({ port: 'e', t, at: portPoint(element, 'e', t) });
      }
    }
    if (point.x >= element.x - 8 && point.x <= element.x + element.w + 8) {
      const t = element.w === 0 ? 0.5 : (point.x - element.x) / element.w;
      if (Math.abs(point.y - element.y) <= 10) {
        edges.push({ port: 'n', t, at: portPoint(element, 'n', t) });
      }
      if (Math.abs(point.y - (element.y + element.h)) <= 10) {
        edges.push({ port: 's', t, at: portPoint(element, 's', t) });
      }
    }
    for (const edge of edges) {
      const dist = distance(point, edge.at);
      if (dist <= maxDistance && (!best || dist < best.distance)) {
        best = {
          id: element.id,
          port: edge.port,
          t: Math.min(1, Math.max(0, edge.t)),
          x: edge.at.x,
          y: edge.at.y,
          distance: dist,
        };
      }
    }
  }
  return best;
}

export function anchorFromPoint(doc: TopoDocument, point: Point, excludeId?: string): Anchor {
  const near = nearestAnchor(doc, point, excludeId, 16);
  if (!near) return { mode: 'abs', x: point.x, y: point.y };
  return { mode: 'el', id: near.id, port: near.port, t: near.t, ox: 0, oy: 0 };
}

export function resizeBox(origin: Box, handle: Handle, dx: number, dy: number, lockAspect: boolean): Box {
  let x = origin.x;
  let y = origin.y;
  let w = origin.w;
  let h = origin.h;
  if (handle.includes('e')) w = origin.w + dx;
  if (handle.includes('s')) h = origin.h + dy;
  if (handle.includes('w')) {
    x = origin.x + dx;
    w = origin.w - dx;
  }
  if (handle.includes('n')) {
    y = origin.y + dy;
    h = origin.h - dy;
  }
  if (lockAspect && origin.h !== 0) {
    const aspect = origin.w / origin.h;
    const horizontal = handle === 'e' || handle === 'w';
    const vertical = handle === 'n' || handle === 's';
    if (horizontal) {
      const nextH = w / aspect;
      y = origin.y + (origin.h - nextH) / 2;
      h = nextH;
    } else if (vertical) {
      const nextW = h * aspect;
      x = origin.x + (origin.w - nextW) / 2;
      w = nextW;
    } else if (Math.abs(w - origin.w) >= Math.abs(h - origin.h)) {
      const nextH = w / aspect;
      if (handle.includes('n')) y = origin.y + origin.h - nextH;
      h = nextH;
    } else {
      const nextW = h * aspect;
      if (handle.includes('w')) x = origin.x + origin.w - nextW;
      w = nextW;
    }
  }
  if (w < 16) {
    if (handle.includes('w')) x -= 16 - w;
    w = 16;
  }
  if (h < 16) {
    if (handle.includes('n')) y -= 16 - h;
    h = 16;
  }
  return { x, y, w, h };
}

export function alignmentSnap(
  originals: Box[],
  others: Box[],
  dx: number,
  dy: number,
  threshold: number,
): { dx: number; dy: number; guides: Guide[] } {
  const guides: Guide[] = [];
  let shiftX = 0;
  let shiftY = 0;
  let bestX = threshold + 1;
  let bestY = threshold + 1;
  const proposed = originals.map((box) => ({ ...box, x: box.x + dx, y: box.y + dy }));
  const xTargets: number[] = [];
  const yTargets: number[] = [];
  for (const box of others) {
    xTargets.push(box.x, box.x + box.w / 2, box.x + box.w);
    yTargets.push(box.y, box.y + box.h / 2, box.y + box.h);
  }
  for (const box of proposed) {
    const xs = [box.x, box.x + box.w / 2, box.x + box.w];
    const ys = [box.y, box.y + box.h / 2, box.y + box.h];
    for (const value of xs) {
      for (const target of xTargets) {
        const delta = target - value;
        if (Math.abs(delta) <= threshold && Math.abs(delta) < bestX) {
          bestX = Math.abs(delta);
          shiftX = delta;
        }
      }
    }
    for (const value of ys) {
      for (const target of yTargets) {
        const delta = target - value;
        if (Math.abs(delta) <= threshold && Math.abs(delta) < bestY) {
          bestY = Math.abs(delta);
          shiftY = delta;
        }
      }
    }
  }
  if (bestX <= threshold) {
    const sample = proposed[0];
    const edges = [sample.x + shiftX, sample.x + sample.w / 2 + shiftX, sample.x + sample.w + shiftX];
    const at = edges.reduce((best, edge) => {
      const match = xTargets.some((target) => almost(target, edge, 0.1));
      return match ? edge : best;
    }, edges[0]);
    guides.push({ axis: 'x', at });
  } else {
    shiftX = 0;
  }
  if (bestY <= threshold) {
    const sample = proposed[0];
    const edges = [sample.y + shiftY, sample.y + sample.h / 2 + shiftY, sample.y + sample.h + shiftY];
    const at = edges.reduce((best, edge) => {
      const match = yTargets.some((target) => almost(target, edge, 0.1));
      return match ? edge : best;
    }, edges[0]);
    guides.push({ axis: 'y', at });
  } else {
    shiftY = 0;
  }
  return { dx: dx + shiftX, dy: dy + shiftY, guides };
}

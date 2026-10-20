import { anchorPoint } from './geometry';
import type { Anchor, ConnectorElement, Point, Port, TopoDocument } from './types';

function step(point: Point, port: Port, distance: number): Point {
  switch (port) {
    case 'n':
      return { x: point.x, y: point.y - distance };
    case 's':
      return { x: point.x, y: point.y + distance };
    case 'w':
      return { x: point.x - distance, y: point.y };
    case 'e':
      return { x: point.x + distance, y: point.y };
    case 'c':
      return point;
  }
}

function dedupe(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    if (!previous || Math.hypot(previous.x - point.x, previous.y - point.y) > 0.4) {
      result.push(point);
    }
  }
  return result;
}

export function orthogonalRoute(start: Point, end: Point, startPort: Port | null, endPort: Port | null): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < 0.6 || Math.abs(dy) < 0.6) return [start, end];
  const leave = startPort && startPort !== 'c' ? startPort : Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'e' : 'w') : dy >= 0 ? 's' : 'n';
  const enter = endPort && endPort !== 'c' ? endPort : leave === 'e' ? 'w' : leave === 'w' ? 'e' : leave === 's' ? 'n' : 's';
  const stub = 28;
  const a = step(start, leave, stub);
  const b = step(end, enter, stub);
  const horizontal = leave === 'e' || leave === 'w';
  const otherHorizontal = enter === 'e' || enter === 'w';
  if (horizontal && otherHorizontal) {
    const mid = (a.x + b.x) / 2;
    return dedupe([start, a, { x: mid, y: a.y }, { x: mid, y: b.y }, b, end]);
  }
  if (!horizontal && !otherHorizontal) {
    const mid = (a.y + b.y) / 2;
    return dedupe([start, a, { x: a.x, y: mid }, { x: b.x, y: mid }, b, end]);
  }
  if (horizontal) return dedupe([start, a, { x: b.x, y: a.y }, b, end]);
  return dedupe([start, a, { x: a.x, y: b.y }, b, end]);
}

function portOf(anchor: Anchor): Port | null {
  return anchor.mode === 'el' ? anchor.port : null;
}

export function connectorPoints(doc: TopoDocument, connector: ConnectorElement): Point[] {
  const resolved = connector.points.map((anchor) => anchorPoint(doc, anchor));
  if (resolved.length < 2) return resolved;
  if (connector.routing === 'straight') return [resolved[0], resolved[resolved.length - 1]];
  if (connector.routing === 'orthogonal') {
    return orthogonalRoute(
      resolved[0],
      resolved[resolved.length - 1],
      portOf(connector.points[0]),
      portOf(connector.points[connector.points.length - 1]),
    );
  }
  return resolved;
}

export function simplifyColinear(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const simplified = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = simplified[simplified.length - 1];
    const current = points[index];
    const next = points[index + 1];
    const cross = (current.x - previous.x) * (next.y - previous.y) - (current.y - previous.y) * (next.x - previous.x);
    if (Math.abs(cross) > 0.5) simplified.push(current);
  }
  simplified.push(points[points.length - 1]);
  return simplified;
}

export function connectorSegments(doc: TopoDocument, connector: ConnectorElement): [Point, Point][] {
  const points = simplifyColinear(connectorPoints(doc, connector));
  const segments: [Point, Point][] = [];
  for (let index = 1; index < points.length; index += 1) {
    segments.push([points[index - 1], points[index]]);
  }
  return segments;
}

export function connectorBounds(doc: TopoDocument, connector: ConnectorElement): { x: number; y: number; w: number; h: number } {
  const points = connectorPoints(doc, connector);
  if (points.length === 0) return { x: connector.x, y: connector.y, w: Math.max(connector.w, 8), h: Math.max(connector.h, 8) };
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const point of points) {
    x0 = Math.min(x0, point.x);
    y0 = Math.min(y0, point.y);
    x1 = Math.max(x1, point.x);
    y1 = Math.max(y1, point.y);
  }
  const pad = Math.max(8, connector.strokeWidth);
  if (x1 - x0 < 1) {
    x0 -= pad;
    x1 += pad;
  }
  if (y1 - y0 < 1) {
    y0 -= pad;
    y1 += pad;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

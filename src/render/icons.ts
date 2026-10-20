import { ICON_NATIVE, type IconElement, type IconKind } from '../model/types';
import { fmt, primToSvg, type Prim } from './xml';

function mapPrim(element: IconElement, nativeW: number, nativeH: number, prim: Prim): Prim {
  const sx = element.w / nativeW;
  const sy = element.h / nativeH;
  const scale = (sx + sy) / 2;
  const next: Prim = { ...prim, opacity: element.opacity < 0.999 ? element.opacity : prim.opacity };
  if (prim.x !== undefined) next.x = element.x + prim.x * sx;
  if (prim.y !== undefined) next.y = element.y + prim.y * sy;
  if (prim.w !== undefined) next.w = prim.w * sx;
  if (prim.h !== undefined) next.h = prim.h * sy;
  if (prim.rx) next.rx = prim.rx * scale;
  if (prim.cx !== undefined) next.cx = element.x + prim.cx * sx;
  if (prim.cy !== undefined) next.cy = element.y + prim.cy * sy;
  if (prim.r !== undefined) next.r = prim.r * scale;
  if (prim.x1 !== undefined) next.x1 = element.x + prim.x1 * sx;
  if (prim.y1 !== undefined) next.y1 = element.y + prim.y1 * sy;
  if (prim.x2 !== undefined) next.x2 = element.x + prim.x2 * sx;
  if (prim.y2 !== undefined) next.y2 = element.y + prim.y2 * sy;
  if (prim.sw) next.sw = prim.sw * scale;
  if (prim.size) next.size = prim.size * scale;
  return next;
}

function place(element: IconElement, prims: Prim[]): Prim[] {
  const native = ICON_NATIVE[element.icon];
  return prims.map((prim) => mapPrim(element, native.w, native.h, prim));
}

function rackPorts(count: number, origin: number, step: number, width: number): Prim[] {
  const ports: Prim[] = [];
  for (let index = 0; index < count; index += 1) {
    ports.push({ t: 'rect', x: origin + index * step, y: 13, w: width, h: 12, fill: '#556' });
  }
  return ports;
}

export function iconPrims(element: IconElement): Prim[] {
  const fill = element.fill;
  const accent = element.accent;
  const stroke = element.strokeWidth > 0 ? element.stroke : '';
  const sw = element.strokeWidth || 2;
  switch (element.icon) {
    case 'globe':
      return place(element, [
        { t: 'circle', cx: 38, cy: 38, r: 38, fill },
        {
          t: 'text',
          x: 38,
          y: 38 + 14 * (element.glyphSize / 40),
          text: element.glyph || 'G',
          size: element.glyphSize,
          weight: 'bold',
          fill: element.glyphColor,
          anchor: 'middle',
        },
      ]);
    case 'ap':
      return place(element, [
        { t: 'circle', cx: 42, cy: 42, r: 42, fill },
        { t: 'circle', cx: 42, cy: 42, r: 10, fill: accent },
      ]);
    case 'junction':
      return [
        {
          t: 'circle',
          cx: element.x + element.w / 2,
          cy: element.y + element.h / 2,
          r: Math.min(element.w, element.h) / 2,
          fill,
          opacity: element.opacity < 0.999 ? element.opacity : undefined,
        },
      ];
    case 'ont':
      return place(element, [
        { t: 'rect', x: 0, y: 0, w: 220, h: 38, rx: 8, fill },
        ...rackPorts(element.ports || 6, 120, 14, 10).map((port) => ({ ...port, fill: element.portFill })),
      ]);
    case 'switch':
      return place(element, [
        { t: 'rect', x: 0, y: 0, w: 220, h: 38, rx: 6, fill },
        ...rackPorts(element.ports || 12, 15, 16, 11).map((port) => ({ ...port, fill: element.portFill })),
      ]);
    case 'laptop':
      return place(element, [
        { t: 'rect', x: 15, y: 0, w: 110, h: 64, rx: 6, fill, stroke, sw },
        { t: 'rect', x: 0, y: 64, w: 140, h: 10, rx: 4, fill: accent },
      ]);
    case 'pc':
      return place(element, [
        { t: 'rect', x: 0, y: 0, w: 110, h: 64, rx: 8, fill, stroke, sw },
        { t: 'rect', x: 37, y: 64, w: 36, h: 12, fill: accent },
      ]);
    case 'phone':
      return place(element, [{ t: 'rect', x: 0, y: 0, w: 48, h: 84, rx: 10, fill, stroke, sw }]);
    case 'server':
      return place(element, [
        { t: 'rect', x: 0, y: 0, w: 120, h: 30, rx: 5, fill, stroke, sw },
        { t: 'rect', x: 0, y: 34, w: 120, h: 30, rx: 5, fill, stroke, sw },
      ]);
    case 'router':
      return place(element, [
        { t: 'line', x1: 30, y1: 18, x2: 22, y2: 2, stroke: accent, sw: 3 },
        { t: 'line', x1: 66, y1: 18, x2: 74, y2: 2, stroke: accent, sw: 3 },
        { t: 'rect', x: 16, y: 16, w: 64, h: 36, rx: 8, fill, stroke, sw },
        { t: 'circle', cx: 68, cy: 34, r: 3.5, fill: accent },
        { t: 'rect', x: 28, y: 40, w: 10, h: 6, rx: 1, fill: element.portFill },
        { t: 'rect', x: 42, y: 40, w: 10, h: 6, rx: 1, fill: element.portFill },
      ]);
    case 'firewall':
      return place(element, [
        { t: 'rect', x: 14, y: 8, w: 60, h: 56, rx: 8, fill, stroke, sw },
        { t: 'rect', x: 22, y: 18, w: 44, h: 8, rx: 2, fill: accent },
        { t: 'rect', x: 22, y: 32, w: 20, h: 8, rx: 2, fill: element.portFill },
        { t: 'rect', x: 46, y: 32, w: 20, h: 8, rx: 2, fill: element.portFill },
        { t: 'rect', x: 22, y: 46, w: 44, h: 8, rx: 2, fill: accent },
      ]);
    case 'cloud':
      return place(element, [
        { t: 'circle', cx: 38, cy: 42, r: 20, fill, stroke, sw },
        { t: 'circle', cx: 64, cy: 34, r: 24, fill, stroke, sw },
        { t: 'circle', cx: 90, cy: 44, r: 16, fill, stroke, sw },
        { t: 'rect', x: 30, y: 40, w: 62, h: 22, fill },
      ]);
    case 'vm':
      return place(element, [
        { t: 'rect', x: 28, y: 8, w: 78, h: 48, rx: 6, fill, stroke, sw },
        { t: 'rect', x: 10, y: 22, w: 78, h: 48, rx: 6, fill, stroke: accent, sw },
        { t: 'rect', x: 36, y: 70, w: 28, h: 6, fill: accent },
      ]);
    case 'nas':
      return place(element, [
        { t: 'rect', x: 16, y: 8, w: 88, h: 56, rx: 6, fill, stroke, sw },
        { t: 'rect', x: 26, y: 18, w: 68, h: 8, rx: 2, fill: element.portFill },
        { t: 'rect', x: 26, y: 30, w: 68, h: 8, rx: 2, fill: element.portFill },
        { t: 'rect', x: 26, y: 42, w: 68, h: 8, rx: 2, fill: element.portFill },
        { t: 'circle', cx: 92, cy: 18, r: 3, fill: accent },
      ]);
    case 'printer':
      return place(element, [
        { t: 'rect', x: 28, y: 4, w: 44, h: 16, rx: 2, fill: '#f4f7fb', stroke, sw: 1.5 },
        { t: 'rect', x: 14, y: 18, w: 72, h: 32, rx: 6, fill, stroke, sw },
        { t: 'rect', x: 24, y: 48, w: 52, h: 12, rx: 2, fill: accent },
        { t: 'circle', cx: 74, cy: 30, r: 3, fill: accent },
      ]);
    case 'camera':
      return place(element, [
        { t: 'rect', x: 8, y: 18, w: 72, h: 40, rx: 8, fill, stroke, sw },
        { t: 'rect', x: 30, y: 10, w: 22, h: 10, rx: 2, fill: accent },
        { t: 'circle', cx: 44, cy: 38, r: 12, fill: '#14171c', stroke: accent, sw: 3 },
      ]);
    case 'wifi': {
      const sx = element.w / 72;
      const sy = element.h / 72;
      const scale = (sx + sy) / 2;
      const xAt = (value: number) => element.x + value * sx;
      const yAt = (value: number) => element.y + value * sy;
      const arc = (radius: number, y: number) =>
        `M${fmt(xAt(36 - radius))} ${fmt(yAt(y))} A ${fmt(radius * scale)} ${fmt(radius * scale)} 0 0 1 ${fmt(xAt(36 + radius))} ${fmt(yAt(y))}`;
      const opacity = element.opacity < 0.999 ? element.opacity : undefined;
      return [
        { t: 'circle', cx: xAt(36), cy: yAt(52), r: 4 * scale, fill: accent, opacity },
        { t: 'path', d: arc(14, 40), fill: 'none', stroke: accent, sw: 3 * scale, opacity },
        { t: 'path', d: arc(22, 30), fill: 'none', stroke: accent, sw: 3 * scale, opacity },
        { t: 'path', d: arc(30, 20), fill: 'none', stroke: accent, sw: 3 * scale, opacity },
      ];
    }
    default:
      return place(element, [{ t: 'rect', x: 0, y: 0, w: element.w, h: element.h, fill }]);
  }
}

export function iconPreview(kind: IconKind, themeFill: string, themeAccent: string): string {
  const native = ICON_NATIVE[kind];
  const element: IconElement = {
    id: 'preview',
    name: kind,
    type: 'icon',
    icon: kind,
    x: 0,
    y: 0,
    w: native.w,
    h: native.h,
    z: 1,
    locked: false,
    opacity: 1,
    fill: kind === 'globe' ? '#1f4fa8' : kind === 'junction' ? themeAccent : kind === 'ont' || kind === 'switch' ? '#e8ebef' : themeFill,
    accent: themeAccent,
    stroke: '#8fc1ff',
    strokeWidth: kind === 'junction' || kind === 'globe' || kind === 'ap' ? 0 : 2,
    glyph: 'G',
    glyphSize: 40,
    glyphColor: '#fff',
    ports: kind === 'ont' ? 6 : kind === 'switch' ? 12 : 0,
    portFill: '#556',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${native.w} ${native.h}">${iconPrims(element).map(primToSvg).join('')}</svg>`;
}

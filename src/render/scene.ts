import type { ConnectorElement, TopoDocument, TopoElement } from '../model/types';
import { connectorPoints, connectorSegments } from '../model/routing';
import { iconPrims } from './icons';
import { fmt, primToSvg, xmlAttr, type Prim } from './xml';

export interface SceneOptions {
  interactive?: boolean;
  fonts?: string;
}

function textPrim(
  x: number,
  y: number,
  text: string,
  size: number,
  fill: string,
  weight: 'bold' | 'normal' = 'normal',
  anchor: 'start' | 'middle' | 'end' = 'start',
  opacity?: number,
): Prim {
  return { t: 'text', x, y, text, size, fill, weight, anchor, opacity };
}

function elementPrims(doc: TopoDocument, element: TopoElement): Prim[] {
  const opacity = element.opacity < 0.999 ? element.opacity : undefined;
  switch (element.type) {
    case 'text': {
      const x = element.align === 'middle' ? element.x + element.w / 2 : element.align === 'end' ? element.x + element.w : element.x;
      return [textPrim(x, element.y + element.fontSize, element.text, element.fontSize, element.color, element.fontWeight, element.align, opacity)];
    }
    case 'card': {
      const prims: Prim[] = [
        {
          t: 'rect',
          x: element.x,
          y: element.y,
          w: element.w,
          h: element.h,
          rx: element.radius,
          fill: element.fill,
          stroke: element.stroke,
          sw: element.strokeWidth,
          opacity,
        },
        textPrim(element.x + element.padX, element.y + element.titleDy, element.title, element.titleSize, element.titleColor, element.titleWeight, 'start', opacity),
      ];
      element.rows.forEach((row, index) => {
        prims.push(
          textPrim(
            element.x + element.padX,
            element.y + element.rowDy + index * element.rowStride,
            row.text,
            element.rowSize,
            row.color,
            'normal',
            'start',
            opacity,
          ),
        );
      });
      return prims;
    }
    case 'pill':
      return [
        {
          t: 'rect',
          x: element.x,
          y: element.y,
          w: element.w,
          h: element.h,
          rx: element.h / 2,
          fill: element.fill,
          stroke: element.stroke,
          sw: element.strokeWidth,
          opacity,
        },
        textPrim(element.x + element.w / 2, element.y + element.h / 2 + 7, element.text, element.fontSize, element.textColor, 'normal', 'middle', opacity),
      ];
    case 'icon':
      return iconPrims(element);
    case 'image':
      return [{ t: 'image', x: element.x, y: element.y, w: element.w, h: element.h, href: element.href, opacity }];
    case 'table': {
      const prims: Prim[] = [];
      if (element.showTitle && element.title) {
        prims.push(textPrim(element.x, element.y + element.titleDy, element.title, element.titleSize, element.titleColor, element.titleWeight, 'start', opacity));
      }
      element.headers.forEach((header, index) => {
        prims.push(
          textPrim(
            element.x + (element.colX[index] ?? 0),
            element.y + element.headerDy,
            header,
            element.headerSize,
            element.headerColor,
            element.headerWeight,
            'start',
            opacity,
          ),
        );
      });
      element.rows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          prims.push(
            textPrim(
              element.x + (element.colX[colIndex] ?? 0),
              element.y + element.bodyDy + rowIndex * element.rowStride,
              cell,
              element.bodySize,
              element.bodyColor,
              'normal',
              'start',
              opacity,
            ),
          );
        });
      });
      return prims;
    }
    case 'matrix': {
      const prims: Prim[] = [
        textPrim(element.x, element.y + element.titleDy, element.title, element.titleSize, element.titleColor, 'bold', 'start', opacity),
      ];
      if (element.subtitle) {
        prims.push(textPrim(element.x, element.y + element.subtitleDy, element.subtitle, element.subtitleSize, element.subtitleColor, 'normal', 'start', opacity));
      }
      element.colLabels.forEach((label, index) => {
        prims.push(
          textPrim(
            element.x + element.cellX + index * element.strideX + element.cellW / 2,
            element.y + element.colHeaderDy,
            label,
            element.labelSize,
            element.labelColor,
            'bold',
            'middle',
            opacity,
          ),
        );
      });
      element.rowLabels.forEach((label, row) => {
        const top = element.y + element.cellY + row * element.strideY;
        prims.push(textPrim(element.x, top + element.rowLabelDy, label, element.labelSize, element.labelColor, 'bold', 'start', opacity));
        element.cells[row]?.forEach((cell, col) => {
          const left = element.x + element.cellX + col * element.strideX;
          prims.push({
            t: 'rect',
            x: left,
            y: top,
            w: element.cellW,
            h: element.cellH,
            rx: element.radius,
            fill: cell.fill,
            opacity,
          });
          prims.push(
            textPrim(left + element.cellW / 2, top + element.cellTextDy, cell.text, element.cellTextSize, cell.color, 'normal', 'middle', opacity),
          );
        });
      });
      element.notes.forEach((note, index) => {
        prims.push(textPrim(element.x, element.y + element.noteDy + index * element.noteStride, note, element.noteSize, element.noteColor, 'normal', 'start', opacity));
      });
      return prims;
    }
    case 'connector':
      return connectorPrims(doc, element);
  }
}

function connectorPrims(doc: TopoDocument, element: ConnectorElement): Prim[] {
  const prims: Prim[] = [];
  const opacity = element.opacity < 0.999 ? element.opacity : undefined;
  for (const [start, end] of connectorSegments(doc, element)) {
    prims.push({
      t: 'line',
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      stroke: element.stroke,
      sw: element.strokeWidth,
      dash: element.dash,
      opacity,
    });
  }
  const points = connectorPoints(doc, element);
  if (points.length >= 2 && element.label) {
    const mid = points[Math.floor(points.length / 2)];
    prims.push(textPrim(mid.x, mid.y - 6, element.label, element.labelSize, element.labelColor, 'normal', 'middle', opacity));
  }
  if (points.length >= 1 && element.startDot) {
    prims.push({ t: 'circle', cx: points[0].x, cy: points[0].y, r: 7, fill: element.stroke, opacity });
  }
  if (points.length >= 2 && element.endDot) {
    const end = points[points.length - 1];
    prims.push({ t: 'circle', cx: end.x, cy: end.y, r: 7, fill: element.stroke, opacity });
  }
  if (points.length >= 2 && element.arrow) {
    const end = points[points.length - 1];
    const prev = points[points.length - 2];
    const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
    const size = 10 + element.strokeWidth;
    const a = {
      x: end.x - Math.cos(angle - 0.4) * size,
      y: end.y - Math.sin(angle - 0.4) * size,
    };
    const b = {
      x: end.x - Math.cos(angle + 0.4) * size,
      y: end.y - Math.sin(angle + 0.4) * size,
    };
    prims.push({
      t: 'path',
      d: `M${fmt(end.x)} ${fmt(end.y)} L${fmt(a.x)} ${fmt(a.y)} L${fmt(b.x)} ${fmt(b.y)} Z`,
      fill: element.stroke,
      opacity,
    });
  }
  return prims;
}

function needsHitRect(element: TopoElement): boolean {
  return element.type === 'text' || element.type === 'table' || element.type === 'matrix';
}

export function sceneMarkup(doc: TopoDocument, interactive = false): string {
  const ordered = [...doc.elements].sort((a, b) => a.z - b.z);
  return ordered
    .map((element) => {
      const body = elementPrims(doc, element).map(primToSvg).join('');
      if (!interactive) return body;
      const hit = needsHitRect(element)
        ? `<rect x="${fmt(element.x)}" y="${fmt(element.y)}" width="${fmt(element.w)}" height="${fmt(element.h)}" fill="transparent"/>`
        : '';
      const wire =
        element.type === 'connector'
          ? connectorSegments(doc, element)
              .map(
                ([start, end]) =>
                  `<line x1="${fmt(start.x)}" y1="${fmt(start.y)}" x2="${fmt(end.x)}" y2="${fmt(end.y)}" stroke="${xmlAttr(element.stroke)}" stroke-width="${fmt(Math.max(16, element.strokeWidth + 10))}" stroke-opacity="0" pointer-events="stroke"/>`,
              )
              .join('')
          : '';
      return `<g data-id="${xmlAttr(element.id)}" data-type="${element.type}">${hit}${wire}${body}</g>`;
    })
    .join('');
}

export function documentToSvg(doc: TopoDocument, options: SceneOptions = {}): string {
  const { width, height, background } = doc.canvas;
  const style = options.fonts ? `<defs><style><![CDATA[${options.fonts}]]></style></defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(height)}" viewBox="0 0 ${fmt(width)} ${fmt(height)}" font-family="DejaVu Sans, Arial, sans-serif" xml:space="preserve">${style}<rect width="${fmt(width)}" height="${fmt(height)}" fill="${xmlAttr(background)}"/>${sceneMarkup(doc, false)}</svg>`;
}

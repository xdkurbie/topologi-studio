export function fmt(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 1000) / 1000;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) return String(Math.round(rounded));
  return String(rounded);
}

export function xmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function xmlAttr(value: string): string {
  return xmlText(value).replace(/"/g, '&quot;');
}

export interface Prim {
  t: 'rect' | 'circle' | 'line' | 'text' | 'path' | 'image';
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rx?: number;
  cx?: number;
  cy?: number;
  r?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  fill?: string;
  stroke?: string;
  sw?: number;
  dash?: [number, number] | null;
  opacity?: number;
  text?: string;
  size?: number;
  weight?: 'bold' | 'normal';
  anchor?: 'start' | 'middle' | 'end';
  d?: string;
  href?: string;
  hit?: boolean;
  fillOpacity?: number;
}

function attrs(parts: [string, string | number | undefined | null][]): string {
  return parts
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ` ${key}="${typeof value === 'number' ? fmt(value) : xmlAttr(String(value))}"`)
    .join('');
}

export function primToSvg(prim: Prim): string {
  const opacity = prim.opacity !== undefined && prim.opacity < 0.999 ? prim.opacity : undefined;
  if (prim.t === 'rect') {
    return `<rect${attrs([
      ['x', prim.x],
      ['y', prim.y],
      ['width', prim.w],
      ['height', prim.h],
      ['rx', prim.rx && prim.rx > 0 ? prim.rx : undefined],
      ['fill', prim.fill],
      ['fill-opacity', prim.fillOpacity !== undefined && prim.fillOpacity < 0.999 ? prim.fillOpacity : undefined],
      ['stroke', prim.stroke || undefined],
      ['stroke-width', prim.stroke ? prim.sw : undefined],
      ['stroke-dasharray', prim.dash ? `${fmt(prim.dash[0])} ${fmt(prim.dash[1])}` : undefined],
      ['opacity', opacity],
      ['data-hit', prim.hit ? '1' : undefined],
    ])}/>`;
  }
  if (prim.t === 'circle') {
    return `<circle${attrs([
      ['cx', prim.cx],
      ['cy', prim.cy],
      ['r', prim.r],
      ['fill', prim.fill],
      ['stroke', prim.stroke || undefined],
      ['stroke-width', prim.stroke ? prim.sw : undefined],
      ['opacity', opacity],
    ])}/>`;
  }
  if (prim.t === 'line') {
    return `<line${attrs([
      ['x1', prim.x1],
      ['y1', prim.y1],
      ['x2', prim.x2],
      ['y2', prim.y2],
      ['stroke', prim.stroke],
      ['stroke-width', prim.sw],
      ['stroke-dasharray', prim.dash ? `${fmt(prim.dash[0])} ${fmt(prim.dash[1])}` : undefined],
      ['opacity', opacity],
      ['stroke-opacity', prim.hit ? 0 : undefined],
      ['pointer-events', prim.hit ? 'stroke' : undefined],
    ])}/>`;
  }
  if (prim.t === 'text') {
    const anchor = prim.anchor && prim.anchor !== 'start' ? prim.anchor : undefined;
    return `<text${attrs([
      ['x', prim.x],
      ['y', prim.y],
      ['text-anchor', anchor],
      ['font-size', prim.size],
      ['font-weight', prim.weight === 'bold' ? 'bold' : undefined],
      ['fill', prim.fill],
      ['opacity', opacity],
    ])}>${xmlText(prim.text ?? '')}</text>`;
  }
  if (prim.t === 'path') {
    return `<path${attrs([
      ['d', prim.d],
      ['fill', prim.fill ?? 'none'],
      ['stroke', prim.stroke || undefined],
      ['stroke-width', prim.stroke ? prim.sw : undefined],
      ['stroke-linecap', prim.stroke ? 'round' : undefined],
      ['opacity', opacity],
    ])}/>`;
  }
  return `<image${attrs([
    ['x', prim.x],
    ['y', prim.y],
    ['width', prim.w],
    ['height', prim.h],
    ['href', prim.href],
    ['opacity', opacity],
  ])}/>`;
}

import boldUrl from '../assets/fonts/DejaVuSans-Bold.ttf?url';
import regularUrl from '../assets/fonts/DejaVuSans.ttf?url';
import type { TopoDocument } from '../model/types';
import { documentToSvg } from '../render/scene';
import { rgbToPdf, zlibCompress } from './pdf';

let fontCss: Promise<string> | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

async function embeddedFontCss(): Promise<string> {
  fontCss ??= (async () => {
    const [regular, bold] = await Promise.all([fetch(regularUrl), fetch(boldUrl)]);
    const regular64 = bytesToBase64(new Uint8Array(await regular.arrayBuffer()));
    const bold64 = bytesToBase64(new Uint8Array(await bold.arrayBuffer()));
    return `@font-face{font-family:"DejaVu Sans";src:url(data:font/ttf;base64,${regular64}) format("truetype");font-weight:400;font-style:normal;}@font-face{font-family:"DejaVu Sans";src:url(data:font/ttf;base64,${bold64}) format("truetype");font-weight:700;font-style:normal;}`;
  })();
  return fontCss;
}

export async function documentSvg(doc: TopoDocument, embedFonts: boolean): Promise<string> {
  const fonts = embedFonts ? await embeddedFontCss() : undefined;
  return documentToSvg(doc, { fonts });
}

/** WebKit aborts or drops the web process when one canvas side or area is too large. */
export const CANVAS_TILE = 2048;
/** Full-document pixel cap. Above this the requested scale is reduced instead of allocating a giant buffer. */
export const MAX_EXPORT_PIXELS = 80_000_000;

export interface RasterTile {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RasterPlan {
  scale: number;
  width: number;
  height: number;
  clamped: boolean;
  tiles: RasterTile[];
}

export function rasterPlan(docWidth: number, docHeight: number, requestedScale: number): RasterPlan {
  const sourceW = Math.max(1, docWidth);
  const sourceH = Math.max(1, docHeight);
  let scale = Number.isFinite(requestedScale) && requestedScale > 0 ? requestedScale : 1;
  let width = Math.max(1, Math.round(sourceW * scale));
  let height = Math.max(1, Math.round(sourceH * scale));
  if (width * height > MAX_EXPORT_PIXELS) {
    scale = Math.sqrt(MAX_EXPORT_PIXELS / (sourceW * sourceH));
    width = Math.max(1, Math.round(sourceW * scale));
    height = Math.max(1, Math.round(sourceH * scale));
    while (width * height > MAX_EXPORT_PIXELS && scale > 0.05) {
      scale *= 0.99;
      width = Math.max(1, Math.round(sourceW * scale));
      height = Math.max(1, Math.round(sourceH * scale));
    }
  }
  const tiles: RasterTile[] = [];
  for (let y = 0; y < height; y += CANVAS_TILE) {
    for (let x = 0; x < width; x += CANVAS_TILE) {
      tiles.push({
        x,
        y,
        w: Math.min(CANVAS_TILE, width - x),
        h: Math.min(CANVAS_TILE, height - y),
      });
    }
  }
  const requested = Number.isFinite(requestedScale) && requestedScale > 0 ? requestedScale : 1;
  return { scale, width, height, clamped: Math.abs(scale - requested) > 0.02, tiles };
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc ^= data[index];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return ~crc >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);
  const checksum = crc32(body);
  const out = new Uint8Array(4 + body.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(body, 4);
  view.setUint32(4 + body.length, checksum);
  return out;
}

export async function encodePng(width: number, height: number, rgb: Uint8Array): Promise<Uint8Array> {
  if (width < 1 || height < 1 || rgb.length !== width * height * 3) {
    throw new Error('RGB-bufferen samsvarer ikke med bildestørrelsen.');
  }
  const ihdr = new Uint8Array(13);
  const header = new DataView(ihdr.buffer);
  header.setUint32(0, width);
  header.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = new Uint8Array(height * (1 + width * 3));
  let source = 0;
  let target = 0;
  for (let y = 0; y < height; y += 1) {
    raw[target] = 0;
    target += 1;
    raw.set(rgb.subarray(source, source + width * 3), target);
    source += width * 3;
    target += width * 3;
  }
  const compressed = await zlibCompress(raw);
  return concat([
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', new Uint8Array()),
  ]);
}

function tileSvg(svg: string, viewX: number, viewY: number, viewW: number, viewH: number, pixelW: number, pixelH: number): string {
  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelW}" height="${pixelH}" viewBox="${trim(viewX)} ${trim(viewY)} ${trim(viewW)} ${trim(viewH)}" font-family="DejaVu Sans, Arial, sans-serif" xml:space="preserve">`;
  if (!/<svg\b[^>]*>/.test(svg)) throw new Error('SVG-en mangler rot-element.');
  return svg.replace(/<svg\b[^>]*>/, open);
}

function trim(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

async function rasterTile(svg: string, width: number, height: number): Promise<Uint8ClampedArray> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'sync';
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Kunne ikke lage lerret for eksport.');
    context.drawImage(image, 0, 0, width, height);
    return context.getImageData(0, 0, width, height).data;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Kunne ikke')) throw error;
    throw new Error('Kunne ikke tegne dokumentet for eksport. Prøv en lavere oppløsning.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function renderBitmap(doc: TopoDocument, scale: number): Promise<{ png: Blob; width: number; height: number; rgb: Uint8Array; scale: number; notice?: string }> {
  const plan = rasterPlan(doc.canvas.width, doc.canvas.height, scale);
  const svg = await documentSvg(doc, true);
  const rgb = new Uint8Array(plan.width * plan.height * 3);
  const scaleX = plan.width / Math.max(1, doc.canvas.width);
  const scaleY = plan.height / Math.max(1, doc.canvas.height);
  for (const tile of plan.tiles) {
    const tiled = tileSvg(svg, tile.x / scaleX, tile.y / scaleY, tile.w / scaleX, tile.h / scaleY, tile.w, tile.h);
    const pixels = await rasterTile(tiled, tile.w, tile.h);
    for (let row = 0; row < tile.h; row += 1) {
      const dest = ((tile.y + row) * plan.width + tile.x) * 3;
      const source = row * tile.w * 4;
      for (let col = 0; col < tile.w; col += 1) {
        const from = source + col * 4;
        const to = dest + col * 3;
        rgb[to] = pixels[from];
        rgb[to + 1] = pixels[from + 1];
        rgb[to + 2] = pixels[from + 2];
      }
    }
  }
  const pngBytes = await encodePng(plan.width, plan.height, rgb);
  const png = new Blob([pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength) as ArrayBuffer], { type: 'image/png' });
  const notice = plan.clamped
    ? `Dokumentet er for stort til ${scale}×. Eksporterer ${trim(plan.scale)}× (${plan.width}×${plan.height}).`
    : undefined;
  return { png, width: plan.width, height: plan.height, rgb, scale: plan.scale, notice };
}

export async function renderPdf(doc: TopoDocument, scale: number): Promise<{ pdf: Uint8Array; notice?: string }> {
  const bitmap = await renderBitmap(doc, scale);
  const pageWidth = (doc.canvas.width * 72) / 96;
  const pageHeight = (doc.canvas.height * 72) / 96;
  return { pdf: await rgbToPdf(bitmap.width, bitmap.height, bitmap.rgb, pageWidth, pageHeight), notice: bitmap.notice };
}

export function fileStem(title: string): string {
  const stem = title.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '');
  return stem || 'topologi';
}

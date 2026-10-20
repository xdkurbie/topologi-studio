import boldUrl from '../assets/fonts/DejaVuSans-Bold.ttf?url';
import regularUrl from '../assets/fonts/DejaVuSans.ttf?url';
import type { TopoDocument } from '../model/types';
import { documentToSvg } from '../render/scene';
import { rgbToPdf } from './pdf';

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

export async function renderBitmap(doc: TopoDocument, scale: number): Promise<{ png: Blob; width: number; height: number; rgb: Uint8Array }> {
  const svg = await documentSvg(doc, true);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'sync';
    image.src = url;
    await image.decode();
    const width = Math.max(1, Math.round(doc.canvas.width * scale));
    const height = Math.max(1, Math.round(doc.canvas.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Kunne ikke lage lerret for eksport.');
    context.drawImage(image, 0, 0, width, height);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('PNG-eksport feilet.'))), 'image/png');
    });
    const pixels = context.getImageData(0, 0, width, height).data;
    const rgb = new Uint8Array(width * height * 3);
    for (let index = 0, target = 0; index < pixels.length; index += 4) {
      rgb[target++] = pixels[index];
      rgb[target++] = pixels[index + 1];
      rgb[target++] = pixels[index + 2];
    }
    return { png, width, height, rgb };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function renderPdf(doc: TopoDocument, scale: number): Promise<Uint8Array> {
  const bitmap = await renderBitmap(doc, scale);
  const pageWidth = (doc.canvas.width * 72) / 96;
  const pageHeight = (doc.canvas.height * 72) / 96;
  return rgbToPdf(bitmap.width, bitmap.height, bitmap.rgb, pageWidth, pageHeight);
}

export function fileStem(title: string): string {
  const stem = title.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '');
  return stem || 'topologi';
}

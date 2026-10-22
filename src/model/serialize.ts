import { normalize } from './edit';
import { APP_VERSION, FILE_VERSION, FORMAT, type TopoDocument, type TopoElement } from './types';

const TYPES = new Set(['text', 'card', 'pill', 'icon', 'image', 'table', 'matrix', 'zone', 'connector']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireNumber(record: Record<string, unknown>, key: string, label: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} mangler et gyldig tall «${key}».`);
  }
  return value;
}

export function serializeDocument(doc: TopoDocument): string {
  return JSON.stringify(normalize(doc), null, 2);
}

export function parseDocument(raw: string): TopoDocument {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Filen er ikke gyldig JSON.');
  }
  if (!isRecord(data)) throw new Error('Ugyldig topologifil.');
  if (data.format !== FORMAT) throw new Error('Ukjent filformat. Forventet en .topo-fil fra Topologi Studio.');
  if (data.version !== FILE_VERSION) throw new Error('Filversjonen støttes ikke av denne utgaven.');
  if (!isRecord(data.meta) || !isRecord(data.canvas) || !Array.isArray(data.elements)) {
    throw new Error('Filen mangler meta, lerret eller elementer.');
  }
  const elements = data.elements.map((item, index) => {
    if (!isRecord(item) || typeof item.type !== 'string' || !TYPES.has(item.type)) {
      throw new Error(`Element ${index + 1} har ukjent type.`);
    }
    if (typeof item.id !== 'string' || item.id.length === 0) throw new Error(`Element ${index + 1} mangler id.`);
    requireNumber(item, 'x', item.id);
    requireNumber(item, 'y', item.id);
    requireNumber(item, 'w', item.id);
    requireNumber(item, 'h', item.id);
    requireNumber(item, 'z', item.id);
    if (item.type === 'connector' && !Array.isArray(item.points)) {
      throw new Error(`Koblingen «${item.id}» mangler punkter.`);
    }
    const element = {
      locked: false,
      opacity: 1,
      ...item,
    } as TopoElement;
    return element;
  });
  const theme = data.meta.theme === 'light' ? 'light' : 'dark';
  const doc: TopoDocument = {
    format: FORMAT,
    version: FILE_VERSION,
    meta: {
      title: typeof data.meta.title === 'string' ? data.meta.title : 'Uten navn',
      theme,
      grid: typeof data.meta.grid === 'number' ? data.meta.grid : 20,
      snap: data.meta.snap !== false,
      updated: typeof data.meta.updated === 'string' ? data.meta.updated : new Date().toISOString(),
      appVersion: typeof data.meta.appVersion === 'string' ? data.meta.appVersion : APP_VERSION,
    },
    canvas: {
      width: requireNumber(data.canvas, 'width', 'lerret'),
      height: requireNumber(data.canvas, 'height', 'lerret'),
      background: typeof data.canvas.background === 'string' ? data.canvas.background : '#14171c',
    },
    elements,
  };
  return normalize(doc);
}

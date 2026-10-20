import {
  alignElements,
  changeZ,
  deleteElements,
  distributeElements,
  duplicateElements,
  findElement,
  importElements,
  normalize,
  translateElements,
  type AlignMode,
  type ZDir,
} from '../model/edit';
import { History } from '../model/history';
import type { Routing, TopoDocument, TopoElement } from '../model/types';

export type Tool = 'select' | 'pan' | 'connect';

export interface WireStyle {
  routing: Routing;
  dash: [number, number] | null;
}

type Listener = () => void;

function sameDoc(a: TopoDocument, b: TopoDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class Editor {
  doc: TopoDocument;
  readonly history = new History();
  selection: string[] = [];
  tool: Tool = 'select';
  wire: WireStyle = { routing: 'orthogonal', dash: null };
  panX = 48;
  panY = 48;
  zoom = 1;
  showGrid = true;
  filePath: string | null = null;
  dirty = false;
  clipboard: TopoElement[] | null = null;
  private listeners = new Set<Listener>();
  private gesture: { snapshot: TopoDocument; dirty: boolean } | null = null;

  constructor(doc: TopoDocument) {
    this.doc = normalize(doc);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(): void {
    for (const listener of this.listeners) listener();
  }

  load(doc: TopoDocument, path: string | null): void {
    this.doc = normalize(doc);
    this.filePath = path;
    this.dirty = false;
    this.selection = [];
    this.history.clear();
    this.gesture = null;
    this.emit();
  }

  begin(): void {
    if (this.gesture) return;
    this.gesture = { snapshot: this.doc, dirty: this.dirty };
    this.history.checkpoint(this.doc);
  }

  previewFromStart(change: (base: TopoDocument) => TopoDocument): void {
    const base = this.gesture?.snapshot ?? this.doc;
    this.doc = normalize(change(base));
    this.dirty = true;
    this.emit();
  }

  previewLive(change: (doc: TopoDocument) => TopoDocument): void {
    this.doc = normalize(change(this.doc));
    this.dirty = true;
    this.emit();
  }

  commit(): void {
    if (!this.gesture) return;
    if (sameDoc(this.doc, this.gesture.snapshot)) {
      this.history.dropCheckpoint();
      this.doc = this.gesture.snapshot;
      this.dirty = this.gesture.dirty;
    }
    this.gesture = null;
    this.emit();
  }

  cancel(): void {
    if (!this.gesture) return;
    this.doc = this.gesture.snapshot;
    this.dirty = this.gesture.dirty;
    this.history.dropCheckpoint();
    this.gesture = null;
    this.emit();
  }

  apply(change: (doc: TopoDocument) => TopoDocument): void {
    this.begin();
    this.previewFromStart(change);
    this.commit();
  }

  undo(): void {
    const previous = this.history.undo(this.doc);
    if (!previous) return;
    this.doc = previous;
    this.selection = this.selection.filter((id) => findElement(this.doc, id));
    this.dirty = true;
    this.emit();
  }

  redo(): void {
    const next = this.history.redo(this.doc);
    if (!next) return;
    this.doc = next;
    this.selection = this.selection.filter((id) => findElement(this.doc, id));
    this.dirty = true;
    this.emit();
  }

  select(ids: string[], mode: 'replace' | 'add' | 'toggle' = 'replace'): void {
    if (mode === 'replace') this.selection = [...ids];
    else if (mode === 'add') this.selection = [...new Set([...this.selection, ...ids])];
    else {
      const next = new Set(this.selection);
      for (const id of ids) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      this.selection = [...next];
    }
    this.emit();
  }

  selectedElements(): TopoElement[] {
    return this.selection.map((id) => findElement(this.doc, id)).filter((element): element is TopoElement => !!element);
  }

  removeSelection(): void {
    if (this.selection.length === 0) return;
    const ids = [...this.selection];
    this.apply((doc) => deleteElements(doc, ids));
    this.selection = [];
    this.emit();
  }

  duplicateSelection(): void {
    if (this.selection.length === 0) return;
    const result = duplicateElements(this.doc, this.selection, 24, 24);
    this.apply(() => result.doc);
    this.selection = result.ids;
    this.emit();
  }

  copy(): void {
    const picked = this.selectedElements();
    this.clipboard = picked.length ? structuredClone(picked) : null;
  }

  cut(): void {
    this.copy();
    this.removeSelection();
  }

  paste(): void {
    if (!this.clipboard?.length) return;
    const result = importElements(this.doc, this.clipboard, 24, 24);
    this.apply(() => result.doc);
    this.selection = result.ids;
    this.emit();
  }

  nudge(dx: number, dy: number): void {
    if (this.selection.length === 0 || (dx === 0 && dy === 0)) return;
    const ids = [...this.selection];
    this.apply((doc) => translateElements(doc, ids, dx, dy));
  }

  align(mode: AlignMode): void {
    const ids = [...this.selection];
    this.apply((doc) => alignElements(doc, ids, mode));
  }

  distribute(axis: 'h' | 'v'): void {
    const ids = [...this.selection];
    this.apply((doc) => distributeElements(doc, ids, axis));
  }

  order(dir: ZDir): void {
    const ids = [...this.selection];
    this.apply((doc) => changeZ(doc, ids, dir));
  }

  zoomAt(screenX: number, screenY: number, factor: number): void {
    const next = Math.min(4, Math.max(0.08, this.zoom * factor));
    const worldX = (screenX - this.panX) / this.zoom;
    const worldY = (screenY - this.panY) / this.zoom;
    this.zoom = next;
    this.panX = screenX - worldX * next;
    this.panY = screenY - worldY * next;
    this.emit();
  }

  panBy(dx: number, dy: number): void {
    this.panX += dx;
    this.panY += dy;
    this.emit();
  }

  zoomSet(zoom: number, viewW: number, viewH: number): void {
    const next = Math.min(4, Math.max(0.08, zoom));
    const cx = viewW / 2;
    const cy = viewH / 2;
    const worldX = (cx - this.panX) / this.zoom;
    const worldY = (cy - this.panY) / this.zoom;
    this.zoom = next;
    this.panX = cx - worldX * next;
    this.panY = cy - worldY * next;
    this.emit();
  }

  fit(viewW: number, viewH: number, pad = 72): void {
    const { width, height } = this.doc.canvas;
    const zoom = Math.min(4, Math.max(0.08, Math.min((viewW - pad) / width, (viewH - pad) / height)));
    this.zoom = zoom;
    this.panX = (viewW - width * zoom) / 2;
    this.panY = (viewH - height * zoom) / 2;
    this.emit();
  }
}

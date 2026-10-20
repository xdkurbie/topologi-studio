import type { TopoDocument } from './types';

export class History {
  private past: string[] = [];
  private future: string[] = [];

  constructor(private readonly limit = 100) {}

  checkpoint(doc: TopoDocument): void {
    this.past.push(JSON.stringify(doc));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  dropCheckpoint(): void {
    this.past.pop();
  }

  undo(current: TopoDocument): TopoDocument | null {
    const previous = this.past.pop();
    if (!previous) return null;
    this.future.push(JSON.stringify(current));
    return JSON.parse(previous) as TopoDocument;
  }

  redo(current: TopoDocument): TopoDocument | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(JSON.stringify(current));
    return JSON.parse(next) as TopoDocument;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}

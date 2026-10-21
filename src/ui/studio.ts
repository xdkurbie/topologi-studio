import { Editor } from '../editor/editor';
import {
  fileStem,
  documentSvg,
  renderBitmap,
  renderPdf,
} from '../export/raster';
import {
  addElement,
  findElement,
  resizeElement,
  translateElements,
  updateElement,
} from '../model/edit';
import {
  alignmentSnap,
  anchorFromPoint,
  anchorPoint,
  intersects,
  portsOf,
  resizeBox,
  snapValue,
} from '../model/geometry';
import { connectorPoints, orthogonalRoute } from '../model/routing';
import {
  createCard,
  createConnector,
  createIcon,
  createImage,
  createMatrix,
  createPill,
  createTable,
  createText,
} from '../model/factory';
import { cycleCell, ICON_NATIVE, type Box, type Handle, type IconKind, type Port, type TopoElement } from '../model/types';
import { themeById } from '../model/theme';
import {
  chord,
  clearAutosave,
  inTauri,
  isApplePlatform,
  launchFiles,
  listRecent,
  listenMenu,
  listenOpenPath,
  loadAutosave,
  openTopo,
  quitApp,
  readPath,
  rememberRecent,
  saveBinary,
  saveTopo,
  setWindowTitle,
  storeAutosave,
} from '../platform/native';
import { overlayMarkup } from '../render/overlay';
import { sceneMarkup } from '../render/scene';
import { blankDocument, diagramTemplates } from '../template/unifi';
import { parseDocument, serializeDocument } from '../model/serialize';
import { aboutDialog, choose, exportScaleDialog, newDocumentDialog, recentDialog, shortcutsDialog } from './dialogs';
import { esc } from './html';
import { documentInspector, inspectorHtml } from './inspector';
import { libraryHtml } from './library';
import { documentToSvg } from '../render/scene';

type Drag =
  | null
  | { kind: 'pan'; sx: number; sy: number; panX: number; panY: number }
  | { kind: 'move'; ids: string[]; wx: number; wy: number }
  | { kind: 'marquee'; x: number; y: number; additive: boolean; base: string[] }
  | { kind: 'resize'; id: string; handle: Handle; origin: Box }
  | { kind: 'endpoint'; id: string; index: number };

interface InlineEdit {
  id: string;
  mode: 'text' | 'card-title' | 'card-row' | 'pill' | 'table' | 'matrix' | 'connector';
  row?: number;
  col?: number;
}

export class Studio {
  private readonly editor: Editor;
  private drag: Drag = null;
  private guides: { axis: 'x' | 'y'; at: number }[] = [];
  private marquee: Box | null = null;
  private rubber: { x: number; y: number }[] | null = null;
  private pending: { id: string; port: Port } | null = null;
  private hoverId: string | null = null;
  private space = false;
  private inspectorKey = '';
  private forceInspector = false;
  private search = '';
  private tab: 'library' | 'layers' = 'library';
  private autosaveTimer = 0;
  private toastTimer = 0;
  private raf = 0;
  private inline: InlineEdit | null = null;
  private readonly svg: SVGSVGElement;
  private readonly viewport: SVGGElement;
  private readonly grid: SVGGElement;
  private readonly scene: SVGGElement;
  private readonly overlay: SVGGElement;
  private readonly page: SVGRectElement;
  private readonly shadow: SVGRectElement;
  private readonly inspector: HTMLElement;
  private readonly library: HTMLElement;
  private readonly layers: HTMLElement;
  private readonly status: HTMLElement;
  private readonly title: HTMLElement;
  private readonly inlineInput: HTMLInputElement;
  private readonly context: HTMLElement;
  private readonly stage: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    this.editor = new Editor(blankDocument('dark'));
    this.root.innerHTML = shellHtml();
    this.svg = this.root.querySelector('#svg') as SVGSVGElement;
    this.viewport = this.root.querySelector('#viewport') as SVGGElement;
    this.grid = this.root.querySelector('#grid') as SVGGElement;
    this.scene = this.root.querySelector('#scene') as SVGGElement;
    this.overlay = this.root.querySelector('#overlay') as SVGGElement;
    this.page = this.root.querySelector('#page') as SVGRectElement;
    this.shadow = this.root.querySelector('#shadow') as SVGRectElement;
    this.inspector = this.root.querySelector('#inspector') as HTMLElement;
    this.library = this.root.querySelector('#lib-list') as HTMLElement;
    this.layers = this.root.querySelector('#layers') as HTMLElement;
    this.status = this.root.querySelector('#status') as HTMLElement;
    this.title = this.root.querySelector('#doc-title') as HTMLElement;
    this.inlineInput = this.root.querySelector('#inline') as HTMLInputElement;
    this.context = this.root.querySelector('#context') as HTMLElement;
    this.stage = this.root.querySelector('#stage') as HTMLElement;
    this.bind();
    this.editor.subscribe(() => this.schedulePaint());
    this.paint();
  }

  documentSvg(): string {
    return documentToSvg(this.editor.doc);
  }

  async pngBase64(scale = 2): Promise<string> {
    const rendered = await renderBitmap(this.editor.doc, scale);
    const bytes = new Uint8Array(await rendered.png.arrayBuffer());
    let binary = '';
    const size = 0x8000;
    for (let index = 0; index < bytes.length; index += size) {
      binary += String.fromCharCode(...bytes.subarray(index, index + size));
    }
    return btoa(binary);
  }

  showArea(x: number, y: number, zoom: number): void {
    this.editor.zoom = zoom;
    this.editor.panX = 28 - x * zoom;
    this.editor.panY = 28 - y * zoom;
    this.editor.emit();
  }

  async start(): Promise<void> {
    if (inTauri()) document.documentElement.classList.add('tauri');
    if (isApplePlatform()) document.documentElement.classList.add('mac');
    const params = new URLSearchParams(location.search);
    if (params.get('frame') === 'mac') document.documentElement.classList.add('tauri', 'mac');
    await listenMenu((id) => {
      void this.run(id, 'menu');
    });
    await listenOpenPath((path) => {
      void this.openFromPath(path);
    });
    const preset = params.get('doc');
    const launched = inTauri() ? await launchFiles().catch(() => []) : [];
    const opened = preset ? diagramTemplates().find((item) => item.id === preset) : undefined;
    if (opened) this.editor.load(opened.create(), null);
    else if (preset === 'blank') this.editor.load(blankDocument(this.editor.doc.meta.theme), null);
    else if (launched[0]) await this.openFromPath(launched[0]);
    else await this.welcome();
    requestAnimationFrame(() => this.editor.fit(this.stage.clientWidth, this.stage.clientHeight));
    window.addEventListener('resize', () => this.schedulePaint());
  }

  private async openFromPath(path: string): Promise<void> {
    if (!path || this.editor.filePath === path) return;
    try {
      this.editor.load(parseDocument(await readPath(path)), path);
      await rememberRecent(path, this.editor.doc.meta.title);
      this.editor.fit(this.stage.clientWidth, this.stage.clientHeight);
    } catch (error) {
      await this.alert(error);
    }
  }

  private async welcome(): Promise<void> {
    const saved = await loadAutosave().catch(() => null);
    if (saved) {
      const choice = await choose('Ulagret økt', 'Topologi Studio fant arbeid som ikke ble lagret. Vil du gjenopprette det?', [
        { id: 'restore', label: 'Gjenopprett', primary: true },
        { id: 'new', label: 'Ny topologi' },
        { id: 'open', label: 'Åpne fil' },
      ]);
      if (choice === 'restore') {
        try {
          this.editor.load(parseDocument(saved), null);
          this.editor.dirty = true;
          return;
        } catch (error) {
          await this.alert(error);
        }
      } else if (choice === 'open') {
        await this.open();
        return;
      } else if (choice !== 'new') {
        this.editor.load(blankDocument('dark'), null);
        return;
      }
    }
    await this.newDocument(false);
  }

  private bind(): void {
    this.root.addEventListener('click', (event) => {
      const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (action?.dataset.action && !action.closest('#context') && !action.closest('.menu-pop')) {
        void this.run(action.dataset.action);
      }
      const menuAction = (event.target as HTMLElement).closest<HTMLElement>('.menu-pop [data-action]');
      if (menuAction?.dataset.action) {
        this.closeMenus();
        void this.run(menuAction.dataset.action);
      }
      const top = (event.target as HTMLElement).closest<HTMLElement>('.menu-top');
      if (top) {
        const menu = top.parentElement;
        const open = menu?.classList.contains('open');
        this.closeMenus();
        if (!open) menu?.classList.add('open');
        return;
      }
      if (!(event.target as HTMLElement).closest('.menu')) this.closeMenus();
      if (!(event.target as HTMLElement).closest('#context')) this.context.hidden = true;
    });
    this.root.querySelector('#lib-search')?.addEventListener('input', (event) => {
      this.search = (event.target as HTMLInputElement).value;
      this.renderLibrary();
    });
    this.library.addEventListener('click', (event) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>('[data-library]');
      if (!item?.dataset.library) return;
      const center = this.centerWorld();
      void this.placeLibrary(item.dataset.library, center.x, center.y);
    });
    this.library.addEventListener('dragstart', (event) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>('[data-library]');
      if (!item?.dataset.library || !event.dataTransfer) return;
      event.dataTransfer.setData('application/x-topologi-item', item.dataset.library);
      event.dataTransfer.effectAllowed = 'copy';
    });
    this.layers.addEventListener('click', (event) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-layer]');
      if (!row?.dataset.layer) return;
      this.editor.select([row.dataset.layer], event.shiftKey ? 'toggle' : 'replace');
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        this.tab = button.dataset.tab === 'layers' ? 'layers' : 'library';
        this.root.querySelectorAll('[data-tab]').forEach((item) => item.classList.toggle('on', item === button));
        (this.root.querySelector('#lib-pane') as HTMLElement).hidden = this.tab !== 'library';
        this.layers.hidden = this.tab !== 'layers';
        this.schedulePaint();
      });
    });
    this.inspector.addEventListener('focusin', (event) => {
      if ((event.target as HTMLElement).matches('input, select, textarea')) this.editor.begin();
    });
    this.inspector.addEventListener('focusout', (event) => {
      const next = event.relatedTarget as Node | null;
      if (!next || !this.inspector.contains(next)) this.editor.commit();
      else this.editor.commit();
    });
    this.inspector.addEventListener('input', (event) => this.onInspector(event.target as HTMLElement));
    this.inspector.addEventListener('change', (event) => this.onInspector(event.target as HTMLElement));
    this.inspector.addEventListener('click', (event) => this.onInspectorClick(event));
    this.svg.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    this.svg.addEventListener('pointermove', (event) => this.onPointerMove(event));
    this.svg.addEventListener('pointerup', (event) => this.onPointerUp(event));
    this.svg.addEventListener('pointercancel', (event) => this.onPointerUp(event));
    this.svg.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
    this.svg.addEventListener('dblclick', (event) => this.onDoubleClick(event));
    this.svg.addEventListener('contextmenu', (event) => this.onContext(event));
    this.stage.addEventListener('dragover', (event) => {
      if (event.dataTransfer?.types.includes('application/x-topologi-item') || event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
      }
    });
    this.stage.addEventListener('drop', (event) => {
      event.preventDefault();
      const world = this.eventWorld(event);
      const kind = event.dataTransfer?.getData('application/x-topologi-item');
      if (kind) {
        void this.placeLibrary(kind, world.x, world.y);
        return;
      }
      const file = event.dataTransfer?.files?.[0];
      if (file) void this.importImageFile(file, world.x, world.y);
    });
    this.inlineInput.addEventListener('input', () => this.commitInlineLive());
    this.inlineInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.closeInline(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.closeInline(false);
      }
    });
    this.inlineInput.addEventListener('blur', () => this.closeInline(true));
    window.addEventListener('keydown', (event) => this.onKey(event));
    window.addEventListener('keyup', (event) => {
      if (event.code === 'Space') {
        this.space = false;
        this.stage.classList.remove('space-pan');
      }
    });
    window.addEventListener('paste', (event) => {
      if (isTyping(event.target)) return;
      const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith('image/') || item.name.endsWith('.svg'));
      if (!file) return;
      event.preventDefault();
      const center = this.centerWorld();
      void this.importImageFile(file, center.x, center.y);
    });
    this.context.addEventListener('click', (event) => {
      const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!action?.dataset.action) return;
      this.context.hidden = true;
      void this.run(action.dataset.action);
    });
  }

  private async run(action: string, source: 'menu' | 'ui' = 'ui'): Promise<void> {
    if (source === 'menu' && this.swallow(action)) return;
    switch (action) {
      case 'new':
        await this.newDocument(true);
        break;
      case 'open':
        await this.open();
        break;
      case 'recent':
        await this.openRecent();
        break;
      case 'save':
        await this.save(false);
        break;
      case 'save-as':
        await this.save(true);
        break;
      case 'export-png':
        await this.exportKind('png');
        break;
      case 'export-svg':
        await this.exportKind('svg');
        break;
      case 'export-pdf':
        await this.exportKind('pdf');
        break;
      case 'undo':
        this.closeInline(true);
        this.editor.undo();
        break;
      case 'redo':
        this.editor.redo();
        break;
      case 'cut':
        this.editor.cut();
        break;
      case 'copy':
        this.editor.copy();
        break;
      case 'paste':
        this.editor.paste();
        break;
      case 'duplicate':
        this.editor.duplicateSelection();
        break;
      case 'delete':
        this.editor.removeSelection();
        break;
      case 'select-all':
        this.editor.select(this.editor.doc.elements.map((element) => element.id));
        break;
      case 'zoom-in':
        this.editor.zoomAt(this.stage.clientWidth / 2, this.stage.clientHeight / 2, 1.1);
        break;
      case 'zoom-out':
        this.editor.zoomAt(this.stage.clientWidth / 2, this.stage.clientHeight / 2, 1 / 1.1);
        break;
      case 'zoom-100':
        this.editor.zoomSet(1, this.stage.clientWidth, this.stage.clientHeight);
        break;
      case 'zoom-fit':
        this.editor.fit(this.stage.clientWidth, this.stage.clientHeight);
        break;
      case 'toggle-grid':
        this.editor.showGrid = !this.editor.showGrid;
        this.editor.emit();
        break;
      case 'toggle-snap':
        this.editor.apply((doc) => ({ ...doc, meta: { ...doc.meta, snap: !doc.meta.snap } }));
        break;
      case 'theme-dark':
      case 'theme-light':
        this.setTheme(action.endsWith('light') ? 'light' : 'dark');
        break;
      case 'front':
      case 'back':
      case 'forward':
      case 'backward':
        this.editor.order(action);
        break;
      case 'align-left':
      case 'align-right':
      case 'align-top':
      case 'align-bottom':
      case 'align-hcenter':
      case 'align-vcenter':
        this.editor.align(action.slice(6) as 'left' | 'right' | 'top' | 'bottom' | 'hcenter' | 'vcenter');
        break;
      case 'distribute-h':
        this.editor.distribute('h');
        break;
      case 'distribute-v':
        this.editor.distribute('v');
        break;
      case 'shortcuts':
        shortcutsDialog();
        break;
      case 'about':
        aboutDialog();
        break;
      case 'settings':
        this.editor.select([]);
        break;
      case 'import-image': {
        const center = this.centerWorld();
        const file = await pickImage();
        if (file) await this.importImageFile(file, center.x, center.y);
        break;
      }
      case 'quit':
        await this.autosave();
        await quitApp();
        break;
      case 'tool-select':
      case 'tool-pan':
      case 'tool-connect':
        this.editor.tool = action === 'tool-pan' ? 'pan' : action === 'tool-connect' ? 'connect' : 'select';
        if (this.editor.tool !== 'connect') this.pending = null;
        this.editor.emit();
        break;
      default:
        break;
    }
  }

  private lastRun = { id: '', at: 0 };

  private swallow(action: string): boolean {
    const now = performance.now();
    if (this.lastRun.id === action && now - this.lastRun.at < 80) return true;
    this.lastRun = { id: action, at: now };
    return false;
  }

  private async newDocument(guard: boolean): Promise<void> {
    if (guard && !(await this.confirmDiscard())) return;
    const thumbs = Object.fromEntries(diagramTemplates().map((item) => [item.id, documentToSvg(item.create())]));
    const kind = await newDocumentDialog(thumbs);
    const chosen = kind ? diagramTemplates().find((item) => item.id === kind) : undefined;
    if (chosen) this.editor.load(chosen.create(), null);
    else if (kind === 'blank') this.editor.load(blankDocument(this.editor.doc.meta.theme), null);
    else return;
    this.editor.fit(this.stage.clientWidth, this.stage.clientHeight);
  }

  private async open(): Promise<void> {
    if (!(await this.confirmDiscard())) return;
    try {
      const opened = await openTopo();
      if (!opened) return;
      this.editor.load(parseDocument(opened.text), opened.path);
      if (opened.path) await rememberRecent(opened.path, this.editor.doc.meta.title);
      this.editor.fit(this.stage.clientWidth, this.stage.clientHeight);
    } catch (error) {
      await this.alert(error);
    }
  }

  private async openRecent(): Promise<void> {
    const files = await listRecent();
    const path = await recentDialog(files);
    if (!path) return;
    if (!(await this.confirmDiscard())) return;
    try {
      this.editor.load(parseDocument(await readPath(path)), path);
      await rememberRecent(path, this.editor.doc.meta.title);
      this.editor.fit(this.stage.clientWidth, this.stage.clientHeight);
    } catch (error) {
      await this.alert(error);
    }
  }

  private async save(saveAs: boolean): Promise<boolean> {
    try {
      const doc = {
        ...this.editor.doc,
        meta: { ...this.editor.doc.meta, updated: new Date().toISOString() },
      };
      const contents = serializeDocument(doc);
      const path = await saveTopo(`${fileStem(doc.meta.title)}.topo`, contents, saveAs ? null : this.editor.filePath);
      if (inTauri() && !path && !this.editor.filePath) return false;
      if (inTauri() && saveAs && !path) return false;
      this.editor.doc = doc;
      if (path) this.editor.filePath = path;
      this.editor.dirty = false;
      if (path) await rememberRecent(path, doc.meta.title);
      await clearAutosave().catch(() => undefined);
      this.editor.emit();
      return true;
    } catch (error) {
      await this.alert(error);
      return false;
    }
  }

  private async exportKind(kind: 'png' | 'svg' | 'pdf'): Promise<void> {
    const stem = fileStem(this.editor.doc.meta.title);
    this.status.textContent = 'Eksporterer…';
    try {
      if (kind === 'svg') {
        const svg = await documentSvg(this.editor.doc, true);
        await saveBinary(`${stem}.svg`, new TextEncoder().encode(svg), 'SVG', ['svg']);
      } else {
        const scale = await exportScaleDialog(kind.toUpperCase());
        if (!scale) return;
        if (kind === 'png') {
          const bitmap = await renderBitmap(this.editor.doc, scale);
          if (bitmap.notice) this.toast(bitmap.notice);
          const bytes = new Uint8Array(await bitmap.png.arrayBuffer());
          const saved = await saveBinary(`${stem}@${bitmap.scale}x.png`, bytes, 'PNG', ['png']);
          if (!saved) return;
        } else {
          const rendered = await renderPdf(this.editor.doc, scale);
          if (rendered.notice) this.toast(rendered.notice);
          const saved = await saveBinary(`${stem}.pdf`, rendered.pdf, 'PDF', ['pdf']);
          if (!saved) return;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Eksporten feilet.';
      this.toast(message);
    } finally {
      this.paint();
    }
  }

  private setTheme(theme: 'dark' | 'light'): void {
    const current = themeById(this.editor.doc.meta.theme);
    const next = themeById(theme);
    this.editor.apply((doc) => ({
      ...doc,
      meta: { ...doc.meta, theme },
      canvas: {
        ...doc.canvas,
        background: doc.canvas.background === current.background ? next.background : doc.canvas.background,
      },
    }));
    this.forceInspector = true;
  }

  private async confirmDiscard(): Promise<boolean> {
    if (!this.editor.dirty) return true;
    const choice = await choose('Ulagrede endringer', 'Vil du lagre den åpne topologien før du fortsetter?', [
      { id: 'save', label: 'Lagre', primary: true },
      { id: 'discard', label: 'Ikke lagre', danger: true },
      { id: 'cancel', label: 'Avbryt' },
    ]);
    if (choice === 'save') return this.save(false);
    return choice === 'discard';
  }

  private toast(message: string): void {
    let element = this.root.querySelector('#toast');
    if (!(element instanceof HTMLElement)) {
      element = document.createElement('div');
      element.id = 'toast';
      element.setAttribute('role', 'status');
      this.root.append(element);
    }
    element.textContent = message;
    element.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => element?.classList.remove('show'), 7000);
  }

  private async alert(error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : 'Noe gikk galt.';
    await choose('Topologi Studio', message, [{ id: 'ok', label: 'OK', primary: true }]);
  }

  private schedulePaint(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.paint();
    });
  }

  private paint(): void {
    const { doc, zoom, panX, panY } = this.editor;
    document.documentElement.classList.toggle('theme-light', doc.meta.theme === 'light');
    document.documentElement.classList.toggle('theme-dark', doc.meta.theme !== 'light');
    this.viewport.setAttribute('transform', `translate(${panX} ${panY}) scale(${zoom})`);
    this.page.setAttribute('width', String(doc.canvas.width));
    this.page.setAttribute('height', String(doc.canvas.height));
    this.page.setAttribute('fill', doc.canvas.background);
    this.page.setAttribute('stroke', doc.meta.theme === 'light' ? '#d5dce8' : '#2c3544');
    this.page.setAttribute('stroke-width', String(1 / zoom));
    this.shadow.setAttribute('width', String(doc.canvas.width));
    this.shadow.setAttribute('height', String(doc.canvas.height));
    this.grid.innerHTML = this.editor.showGrid ? gridMarkup(doc.canvas.width, doc.canvas.height, doc.meta.grid, zoom) : '';
    this.scene.innerHTML = sceneMarkup(doc, true);
    this.overlay.innerHTML = overlayMarkup({
      doc,
      zoom,
      selected: this.editor.selection,
      hoverId: this.hoverId,
      tool: this.editor.tool,
      guides: this.guides,
      marquee: this.marquee,
      rubber: this.rubber,
      pending: !!this.pending,
    });
    const name = this.editor.filePath?.split(/[/\\]/).pop() ?? doc.meta.title;
    this.title.textContent = `${this.editor.dirty ? '● ' : ''}${name}`;
    void setWindowTitle(`${this.editor.dirty ? '● ' : ''}${name} — Topologi Studio`);
    this.renderChrome();
    this.renderLibrary();
    if (this.tab === 'layers') this.renderLayers();
    const key = structureKey(this.editor);
    if (this.forceInspector || key !== this.inspectorKey) {
      this.inspectorKey = key;
      this.forceInspector = false;
      this.renderInspector();
    }
    if (this.editor.dirty) this.queueAutosave();
  }

  private renderChrome(): void {
    const { tool, zoom, doc } = this.editor;
    this.stage.classList.toggle('tool-pan', tool === 'pan');
    this.stage.classList.toggle('tool-connect', tool === 'connect');
    this.root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
      button.classList.toggle('on', button.dataset.tool === tool);
    });
    const zoomLabel = this.root.querySelector('#zoom-label');
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)} %`;
    this.root.querySelector('#grid-toggle')?.classList.toggle('on', this.editor.showGrid);
    this.root.querySelector('#snap-toggle')?.classList.toggle('on', doc.meta.snap);
    const count = this.editor.selection.length;
    const one = count === 1 ? findElement(doc, this.editor.selection[0]) : undefined;
    const where = one ? `  ·  x ${Math.round(one.x)}  y ${Math.round(one.y)}` : '';
    this.status.textContent = `${count === 0 ? 'Ingen markering' : `${count} valgt`}${where}  ·  ${doc.canvas.width}×${doc.canvas.height}  ·  rutenett ${doc.meta.grid}  ·  ${doc.meta.snap ? 'fest på' : 'fest av'}`;
  }

  private renderLibrary(): void {
    const active = document.activeElement;
    if (active && this.library.contains(active)) return;
    this.library.innerHTML = libraryHtml(themeById(this.editor.doc.meta.theme), this.search);
  }

  private renderLayers(): void {
    const selected = new Set(this.editor.selection);
    const rows = [...this.editor.doc.elements].sort((a, b) => b.z - a.z);
    this.layers.innerHTML = rows
      .map(
        (element) =>
          `<button type="button" class="layer${selected.has(element.id) ? ' on' : ''}" data-layer="${esc(element.id)}"><span>${esc(element.name || element.type)}</span><small>${esc(element.type)}</small></button>`,
      )
      .join('');
  }

  private renderInspector(): void {
    const elements = this.editor.selectedElements();
    this.inspector.innerHTML = elements.length
      ? inspectorHtml(elements)
      : documentInspector(
          this.editor.doc.meta.title,
          this.editor.doc.canvas.width,
          this.editor.doc.canvas.height,
          this.editor.doc.canvas.background,
          this.editor.doc.meta.grid,
          this.editor.doc.meta.snap,
        );
  }

  private onInspector(target: HTMLElement): void {
    const field = target.dataset.field;
    if (field) {
      this.patchField(field, target);
      return;
    }
    if (target.dataset.rowText !== undefined) this.patchRows((rows) => rows.map((row, index) => (index === Number(target.dataset.rowText) ? { ...row, text: (target as HTMLInputElement).value } : row)));
    if (target.dataset.rowColor !== undefined) this.patchRows((rows) => rows.map((row, index) => (index === Number(target.dataset.rowColor) ? { ...row, color: (target as HTMLInputElement).value } : row)));
    if (target.dataset.header !== undefined) this.patchTableHeaders(Number(target.dataset.header), (target as HTMLInputElement).value);
    if (target.dataset.cell) {
      const [row, col] = target.dataset.cell.split(':').map(Number);
      this.patchTableCell(row, col, (target as HTMLInputElement).value);
    }
    if (target.dataset.colLabel !== undefined || target.dataset.rowLabel !== undefined) this.patchMatrixLabels(target);
    if (target.dataset.note !== undefined) this.patchNote(Number(target.dataset.note), (target as HTMLInputElement).value);
  }

  private patchField(field: string, target: HTMLElement): void {
    const input = target as HTMLInputElement;
    const value = input.type === 'checkbox' ? input.checked : input.type === 'number' || input.type === 'range' ? Number(input.value) : input.value;
    if (typeof value === 'number' && !Number.isFinite(value)) return;
    if (input.dataset.kind === 'hex' && typeof value === 'string' && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) return;
    if (field.startsWith('doc-')) {
      this.editor.previewLive((doc) => patchDocument(doc, field, value));
      return;
    }
    const ids = [...this.editor.selection];
    this.editor.previewLive((doc) => {
      let next = doc;
      for (const id of ids) {
        const element = findElement(next, id);
        if (!element) continue;
        next = patchElement(next, element, field, value);
      }
      return next;
    });
    if (input.type === 'color') {
      const hex = input.parentElement?.querySelector<HTMLInputElement>('[data-kind="hex"]');
      if (hex && hex !== input) hex.value = input.value;
    }
  }

  private patchRows(change: (rows: { text: string; color: string }[]) => { text: string; color: string }[]): void {
    const id = this.editor.selection[0];
    this.editor.previewLive((doc) => {
      const element = findElement(doc, id);
      if (element?.type !== 'card') return doc;
      return updateElement(doc, id, { rows: change(element.rows) });
    });
  }

  private patchTableHeaders(index: number, value: string): void {
    const id = this.editor.selection[0];
    this.editor.previewLive((doc) => {
      const element = findElement(doc, id);
      if (element?.type !== 'table') return doc;
      const headers = element.headers.map((header, headerIndex) => (headerIndex === index ? value : header));
      return updateElement(doc, id, { headers });
    });
  }

  private patchTableCell(row: number, col: number, value: string): void {
    const id = this.editor.selection[0];
    this.editor.previewLive((doc) => {
      const element = findElement(doc, id);
      if (element?.type !== 'table') return doc;
      const rows = element.rows.map((cells, rowIndex) => (rowIndex === row ? cells.map((cell, colIndex) => (colIndex === col ? value : cell)) : cells));
      return updateElement(doc, id, { rows });
    });
  }

  private patchMatrixLabels(target: HTMLElement): void {
    const id = this.editor.selection[0];
    const value = (target as HTMLInputElement).value;
    this.editor.previewLive((doc) => {
      const element = findElement(doc, id);
      if (element?.type !== 'matrix') return doc;
      if (target.dataset.colLabel !== undefined) {
        const colLabels = element.colLabels.map((label, index) => (index === Number(target.dataset.colLabel) ? value : label));
        return updateElement(doc, id, { colLabels });
      }
      const rowLabels = element.rowLabels.map((label, index) => (index === Number(target.dataset.rowLabel) ? value : label));
      return updateElement(doc, id, { rowLabels });
    });
  }

  private patchNote(index: number, value: string): void {
    const id = this.editor.selection[0];
    this.editor.previewLive((doc) => {
      const element = findElement(doc, id);
      if (element?.type !== 'matrix') return doc;
      const notes = element.notes.map((note, noteIndex) => (noteIndex === index ? value : note));
      return updateElement(doc, id, { notes });
    });
  }

  private onInspectorClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action) {
      void this.run(action);
      return;
    }
    const swatch = target.closest<HTMLElement>('[data-swatch]');
    const swatchColor = swatch?.dataset.swatch;
    if (swatch && swatchColor) {
      const field = swatch.dataset.swatchTarget || 'fill';
      const ids = [...this.editor.selection];
      if (field.startsWith('doc-')) {
        this.editor.apply((doc) => patchDocument(doc, field, swatchColor));
      } else if (ids.length) {
        this.editor.apply((doc) => ids.reduce((next, id) => {
          const element = findElement(next, id);
          return element ? patchElement(next, element, field, swatchColor) : next;
        }, doc));
      }
      this.forceInspector = true;
      return;
    }
    const id = this.editor.selection[0];
    if (!id) return;
    if (target.dataset.addRow !== undefined) this.mutateStructured(id, 'add-row');
    if (target.dataset.rowDel !== undefined) this.mutateStructured(id, 'del-row', Number(target.dataset.rowDel));
    if (target.dataset.rowUp !== undefined) this.mutateStructured(id, 'up-row', Number(target.dataset.rowUp));
    if (target.dataset.addCol !== undefined) this.mutateStructured(id, 'add-col');
    if (target.dataset.colDel !== undefined) this.mutateStructured(id, 'del-col', Number(target.dataset.colDel));
    if (target.dataset.addNote !== undefined) this.mutateStructured(id, 'add-note');
    if (target.dataset.noteDel !== undefined) this.mutateStructured(id, 'del-note', Number(target.dataset.noteDel));
    if (target.dataset.addBend !== undefined) this.addBend(id);
    if (target.dataset.cycle) {
      const [row, col] = target.dataset.cycle.split(':').map(Number);
      this.cycleMatrix(id, row, col);
    }
  }

  private mutateStructured(id: string, op: string, index = 0): void {
    this.editor.apply((doc) => {
      const element = findElement(doc, id);
      if (!element) return doc;
      if (element.type === 'card') {
        const rows = [...element.rows];
        if (op === 'add-row') rows.push({ text: 'Ny rad', color: themeById(doc.meta.theme).text });
        if (op === 'del-row') rows.splice(index, 1);
        if (op === 'up-row' && index > 0) {
          const [row] = rows.splice(index, 1);
          rows.splice(index - 1, 0, row);
        }
        return updateElement(doc, id, { rows });
      }
      if (element.type === 'table') {
        if (op === 'add-row') return updateElement(doc, id, { rows: [...element.rows, element.headers.map(() => '')] });
        if (op === 'del-row') return updateElement(doc, id, { rows: element.rows.filter((_, row) => row !== index) });
        if (op === 'add-col') {
          const headers = [...element.headers, `Kolonne ${element.headers.length + 1}`];
          const colX = [...element.colX, (element.colX.at(-1) ?? 0) + 160];
          const rows = element.rows.map((row) => [...row, '']);
          return updateElement(doc, id, { headers, colX, rows });
        }
        if (op === 'del-col') {
          return updateElement(doc, id, {
            headers: element.headers.filter((_, col) => col !== index),
            colX: element.colX.filter((_, col) => col !== index),
            rows: element.rows.map((row) => row.filter((_, col) => col !== index)),
          });
        }
      }
      if (element.type === 'matrix' && op === 'add-note') return updateElement(doc, id, { notes: [...element.notes, 'Nytt notat'] });
      if (element.type === 'matrix' && op === 'del-note') return updateElement(doc, id, { notes: element.notes.filter((_, note) => note !== index) });
      return doc;
    });
    this.forceInspector = true;
  }

  private addBend(id: string): void {
    this.editor.apply((doc) => {
      const element = findElement(doc, id);
      if (element?.type !== 'connector' || element.points.length < 2) return doc;
      const start = anchorPoint(doc, element.points[0]);
      const end = anchorPoint(doc, element.points[element.points.length - 1]);
      const mid = { mode: 'abs' as const, x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      return updateElement(doc, id, { routing: 'polyline', points: [element.points[0], mid, element.points[element.points.length - 1]] });
    });
    this.forceInspector = true;
  }

  private cycleMatrix(id: string, row: number, col: number): void {
    this.editor.apply((doc) => {
      const element = findElement(doc, id);
      if (element?.type !== 'matrix') return doc;
      const cells = element.cells.map((line, rowIndex) => line.map((cell, colIndex) => (rowIndex === row && colIndex === col ? cycleCell(cell) : cell)));
      return updateElement(doc, id, { cells });
    });
    this.forceInspector = true;
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button === 2) return;
    this.closeInline(true);
    this.context.hidden = true;
    const world = this.eventWorld(event);
    const info = hitInfo(event);
    if (this.space || this.editor.tool === 'pan' || event.button === 1) {
      this.drag = { kind: 'pan', sx: event.clientX, sy: event.clientY, panX: this.editor.panX, panY: this.editor.panY };
      this.svg.setPointerCapture(event.pointerId);
      return;
    }
    if (info.handle && info.id) {
      const element = findElement(this.editor.doc, info.id);
      if (element && !element.locked) {
        this.editor.select([info.id]);
        this.editor.begin();
        this.drag = { kind: 'resize', id: info.id, handle: info.handle, origin: { x: element.x, y: element.y, w: element.w, h: element.h } };
        this.svg.setPointerCapture(event.pointerId);
      }
      return;
    }
    if (info.point !== undefined && info.id) {
      this.editor.select([info.id]);
      this.editor.begin();
      this.drag = { kind: 'endpoint', id: info.id, index: Number(info.point) };
      this.svg.setPointerCapture(event.pointerId);
      return;
    }
    if ((this.editor.tool === 'connect' || info.port) && info.id) {
      const element = findElement(this.editor.doc, info.id);
      if (element && element.type !== 'connector') {
        const port = (info.port as Port | undefined) ?? nearestPort(element, world);
        this.armConnect(element.id, port, world);
        this.svg.setPointerCapture(event.pointerId);
        return;
      }
    }
    if (info.id && event.detail < 2) {
      const element = findElement(this.editor.doc, info.id);
      if (!element) return;
      if (event.altKey && element.type === 'matrix') {
        const cell = matrixCellAt(element, world);
        if (cell) {
          this.cycleMatrix(element.id, cell.row, cell.col);
          return;
        }
      }
      if (event.shiftKey) this.editor.select([info.id], 'toggle');
      else if (!this.editor.selection.includes(info.id)) this.editor.select([info.id]);
      if (!element.locked) {
        this.editor.begin();
        this.drag = { kind: 'move', ids: [...this.editor.selection], wx: world.x, wy: world.y };
      }
      this.svg.setPointerCapture(event.pointerId);
      return;
    }
    if (!event.shiftKey) this.editor.select([]);
    this.drag = { kind: 'marquee', x: world.x, y: world.y, additive: event.shiftKey, base: [...this.editor.selection] };
    this.svg.setPointerCapture(event.pointerId);
  }

  private armConnect(id: string, port: Port, world: { x: number; y: number }): void {
    if (this.pending && !(this.pending.id === id && this.pending.port === port)) {
      this.finishConnect(id, port);
      return;
    }
    this.pending = { id, port };
    this.editor.tool = 'connect';
    const anchor = { mode: 'el' as const, id, port, t: 0.5, ox: 0, oy: 0 };
    const start = anchorPoint(this.editor.doc, anchor);
    this.rubber = [start, world];
    this.schedulePaint();
  }

  private finishConnect(id: string, port: Port): void {
    if (!this.pending) return;
    const from = this.pending;
    this.pending = null;
    this.rubber = null;
    if (from.id === id && from.port === port) {
      this.schedulePaint();
      return;
    }
    const theme = themeById(this.editor.doc.meta.theme);
    const connector = createConnector(theme, 0, 0, 10, 10, this.editor.wire.routing, !!this.editor.wire.dash);
    connector.points = [
      { mode: 'el', id: from.id, port: from.port, t: 0.5, ox: 0, oy: 0 },
      { mode: 'el', id, port, t: 0.5, ox: 0, oy: 0 },
    ];
    connector.stroke = theme.line;
    const next = addElement(this.editor.doc, connector);
    this.editor.apply(() => next);
    this.editor.select([connector.id]);
    this.editor.tool = 'select';
  }

  private onPointerMove(event: PointerEvent): void {
    const world = this.eventWorld(event);
    const info = hitInfo(event);
    this.hoverId = info.id ?? null;
    if (!this.drag && (this.editor.tool === 'connect' || this.pending)) this.schedulePaint();
    if (this.pending && !this.drag) {
      const start = anchorPoint(this.editor.doc, { mode: 'el', id: this.pending.id, port: this.pending.port, t: 0.5, ox: 0, oy: 0 });
      this.rubber = routeRubber(this.editor, start, world, this.pending.port);
      this.schedulePaint();
    }
    if (!this.drag) return;
    if (this.drag.kind === 'pan') {
      this.editor.panX = this.drag.panX + (event.clientX - this.drag.sx);
      this.editor.panY = this.drag.panY + (event.clientY - this.drag.sy);
      this.editor.emit();
      return;
    }
    if (this.drag.kind === 'move') {
      let dx = world.x - this.drag.wx;
      let dy = world.y - this.drag.wy;
      if (event.shiftKey) {
        if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const ids = this.drag.ids;
      this.editor.previewFromStart((base) => {
        const primary = ids.map((id) => findElement(base, id)).find((element) => element && element.type !== 'connector' && !element.locked);
        let nextDx = dx;
        let nextDy = dy;
        if (primary && base.meta.snap && !event.altKey) {
          nextDx = snapValue(primary.x + dx, base.meta.grid, true) - primary.x;
          nextDy = snapValue(primary.y + dy, base.meta.grid, true) - primary.y;
        }
        const moving = ids
          .map((id) => findElement(base, id))
          .filter((element): element is TopoElement => !!element && element.type !== 'connector');
        const others = base.elements.filter((element) => !ids.includes(element.id) && element.type !== 'connector');
        if (!event.altKey && moving.length) {
          const snapped = alignmentSnap(moving, others, nextDx, nextDy, 6 / this.editor.zoom);
          nextDx = snapped.dx;
          nextDy = snapped.dy;
          this.guides = snapped.guides;
        } else this.guides = [];
        return translateElements(base, ids, nextDx, nextDy);
      });
      return;
    }
    if (this.drag.kind === 'resize') {
      const { origin, handle, id } = this.drag;
      let dx = world.x - (handle.includes('w') ? origin.x : origin.x + origin.w);
      let dy = world.y - (handle.includes('n') ? origin.y : origin.y + origin.h);
      if (handle === 'n' || handle === 's') dx = 0;
      if (handle === 'e' || handle === 'w') dy = 0;
      this.editor.previewFromStart((base) => {
        const element = findElement(base, id);
        if (!element) return base;
        let box = resizeBox(origin, handle, dx, dy, event.shiftKey && element.type !== 'text');
        if (base.meta.snap && !event.altKey) {
          if (handle.includes('e')) box.w = snapValue(origin.x + box.w, base.meta.grid, true) - origin.x;
          if (handle.includes('s')) box.h = snapValue(origin.y + box.h, base.meta.grid, true) - origin.y;
          if (handle.includes('w')) {
            const x = snapValue(box.x, base.meta.grid, true);
            box.w = origin.x + origin.w - x;
            box.x = x;
          }
          if (handle.includes('n')) {
            const y = snapValue(box.y, base.meta.grid, true);
            box.h = origin.y + origin.h - y;
            box.y = y;
          }
        }
        return resizeElement(base, id, box);
      });
      return;
    }
    if (this.drag.kind === 'marquee') {
      this.marquee = { x: this.drag.x, y: this.drag.y, w: world.x - this.drag.x, h: world.y - this.drag.y };
      const rect = normalizeBox(this.marquee);
      const hits = this.editor.doc.elements.filter((element) => intersects(rect, element) && !element.locked).map((element) => element.id);
      this.editor.select(this.drag.additive ? [...new Set([...this.drag.base, ...hits])] : hits);
      this.schedulePaint();
      return;
    }
    if (this.drag.kind === 'endpoint') {
      const { id, index } = this.drag;
      this.editor.previewFromStart((base) => {
        const element = findElement(base, id);
        if (element?.type !== 'connector') return base;
        const anchor = anchorFromPoint(base, world, id);
        const points = element.points.map((point, pointIndex) => (pointIndex === index ? anchor : point));
        return updateElement(base, id, { points, routing: element.routing === 'orthogonal' ? 'polyline' : element.routing });
      });
    }
  }

  private onPointerUp(event: PointerEvent): void {
    const world = this.eventWorld(event);
    if (this.drag?.kind === 'move') {
      const dx = world.x - this.drag.wx;
      const dy = world.y - this.drag.wy;
      if (Math.hypot(dx, dy) < 2) this.editor.cancel();
      else this.editor.commit();
    } else if (this.drag?.kind === 'resize' || this.drag?.kind === 'endpoint') {
      this.editor.commit();
    }
    const released = hitInfoFrom(document.elementFromPoint(event.clientX, event.clientY));
    if (this.pending && released.port && released.id && !(this.pending.id === released.id && this.pending.port === released.port)) {
      this.finishConnect(released.id, released.port as Port);
    }
    this.drag = null;
    this.guides = [];
    this.marquee = null;
    this.forceInspector = true;
    this.schedulePaint();
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const scale = event.deltaMode === 1 ? 16 : 1;
    if (event.ctrlKey || event.metaKey) this.editor.zoomAt(x, y, Math.exp(-event.deltaY * scale * 0.0015));
    else this.editor.panBy(-event.deltaX * scale, -event.deltaY * scale);
  }

  private onDoubleClick(event: MouseEvent): void {
    const info = hitInfo(event);
    if (!info.id) return;
    const element = findElement(this.editor.doc, info.id);
    if (!element) return;
    this.openInline(element, this.eventWorld(event));
  }

  private openInline(element: TopoElement, world: { x: number; y: number }): void {
    let mode: InlineEdit['mode'] | null = null;
    let value = '';
    let box = { x: element.x, y: element.y, w: Math.max(80, element.w), h: 28 };
    let row: number | undefined;
    let col: number | undefined;
    if (element.type === 'text') {
      mode = 'text';
      value = element.text;
      box = { x: element.x, y: element.y, w: element.w, h: element.h };
    } else if (element.type === 'pill') {
      mode = 'pill';
      value = element.text;
      box = { x: element.x, y: element.y, w: element.w, h: element.h };
    } else if (element.type === 'card') {
      const local = world.y - element.y;
      if (local < element.frameH) {
        mode = 'card-title';
        value = element.title;
        box = { x: element.x + 12, y: element.y + 8, w: element.w - 24, h: 32 };
      } else {
        row = Math.max(0, Math.min(element.rows.length - 1, Math.floor((local - element.frameH) / element.rowStride)));
        mode = 'card-row';
        value = element.rows[row]?.text ?? '';
        box = { x: element.x + 12, y: element.y + element.frameH + row * element.rowStride, w: element.w - 24, h: element.rowStride };
      }
    } else if (element.type === 'table') {
      const localX = world.x - element.x;
      const localY = world.y - element.y;
      col = 0;
      element.colX.forEach((offset, index) => {
        if (localX >= offset) col = index;
      });
      if (localY >= element.bodyDy - 10) {
        row = Math.max(0, Math.min(element.rows.length - 1, Math.floor((localY - element.bodyDy) / element.rowStride)));
        mode = 'table';
        value = element.rows[row]?.[col] ?? '';
        box = { x: element.x + (element.colX[col] ?? 0), y: element.y + element.bodyDy + row * element.rowStride - 18, w: 140, h: 28 };
      }
    } else if (element.type === 'matrix') {
      const cell = matrixCellAt(element, world);
      if (cell) {
        mode = 'matrix';
        row = cell.row;
        col = cell.col;
        value = element.cells[cell.row][cell.col].text;
        box = {
          x: element.x + element.cellX + cell.col * element.strideX,
          y: element.y + element.cellY + cell.row * element.strideY,
          w: element.cellW,
          h: element.cellH,
        };
      }
    } else if (element.type === 'connector') {
      mode = 'connector';
      value = element.label;
      const points = connectorPoints(this.editor.doc, element);
      const mid = points[Math.floor(points.length / 2)] ?? world;
      box = { x: mid.x - 80, y: mid.y - 28, w: 160, h: 28 };
    }
    if (!mode) return;
    this.inline = { id: element.id, mode, row, col };
    this.editor.begin();
    const screen = this.worldToStage(box.x, box.y);
    this.inlineInput.value = value;
    this.inlineInput.style.display = 'block';
    this.inlineInput.style.left = `${screen.x}px`;
    this.inlineInput.style.top = `${screen.y}px`;
    this.inlineInput.style.width = `${Math.max(60, box.w * this.editor.zoom)}px`;
    this.inlineInput.style.height = `${Math.max(22, box.h * this.editor.zoom)}px`;
    this.inlineInput.style.fontSize = `${Math.max(12, 16 * this.editor.zoom)}px`;
    this.inlineInput.focus();
    this.inlineInput.select();
  }

  private commitInlineLive(): void {
    if (!this.inline) return;
    const { id, mode, row, col } = this.inline;
    const value = this.inlineInput.value;
    this.editor.previewLive((doc) => {
      const element = findElement(doc, id);
      if (!element) return doc;
      if (mode === 'text' && element.type === 'text') return updateElement(doc, id, { text: value });
      if (mode === 'pill' && element.type === 'pill') return updateElement(doc, id, { text: value });
      if (mode === 'card-title' && element.type === 'card') return updateElement(doc, id, { title: value });
      if (mode === 'card-row' && element.type === 'card' && row !== undefined) {
        const rows = element.rows.map((item, index) => (index === row ? { ...item, text: value } : item));
        return updateElement(doc, id, { rows });
      }
      if (mode === 'table' && element.type === 'table' && row !== undefined && col !== undefined) {
        const rows = element.rows.map((cells, rowIndex) => (rowIndex === row ? cells.map((cell, colIndex) => (colIndex === col ? value : cell)) : cells));
        return updateElement(doc, id, { rows });
      }
      if (mode === 'matrix' && element.type === 'matrix' && row !== undefined && col !== undefined) {
        const cells = element.cells.map((line, rowIndex) => line.map((cell, colIndex) => (rowIndex === row && colIndex === col ? { ...cell, text: value } : cell)));
        return updateElement(doc, id, { cells });
      }
      if (mode === 'connector' && element.type === 'connector') return updateElement(doc, id, { label: value });
      return doc;
    });
  }

  private closeInline(commit: boolean): void {
    if (!this.inline) return;
    this.inline = null;
    this.inlineInput.style.display = 'none';
    if (commit) this.editor.commit();
    else this.editor.cancel();
    this.forceInspector = true;
  }

  private onContext(event: MouseEvent): void {
    event.preventDefault();
    const info = hitInfo(event);
    if (info.id && !this.editor.selection.includes(info.id)) this.editor.select([info.id]);
    const items = [
      ['copy', 'Kopier'],
      ['paste', 'Lim inn'],
      ['duplicate', 'Dupliser'],
      ['delete', 'Slett'],
      ['front', 'Legg foran'],
      ['back', 'Legg bakerst'],
    ];
    this.context.innerHTML = items.map(([action, label]) => `<button type="button" data-action="${action}">${label}</button>`).join('');
    this.context.hidden = false;
    this.context.style.left = `${event.clientX}px`;
    this.context.style.top = `${event.clientY}px`;
  }

  private onKey(event: KeyboardEvent): void {
    if (event.code === 'Space' && !isTyping(event.target)) {
      event.preventDefault();
      this.space = true;
      this.stage.classList.add('space-pan');
      return;
    }
    if (isTyping(event.target)) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void this.run('save');
      }
      return;
    }
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (inTauri() && mod && ['s', 'o', 'n', 'z', 'c', 'x', 'v', 'd', 'a', 'e', '0', '1', '=', '-', '+', ']', '['].includes(key)) return;
    if (key === 'escape') {
      this.pending = null;
      this.rubber = null;
      this.editor.select([]);
      this.context.hidden = true;
      this.closeMenus();
      this.schedulePaint();
      return;
    }
    if (mod && key === 's' && event.shiftKey) return void event.preventDefault(), void this.run('save-as');
    if (mod && key === 's') return void event.preventDefault(), void this.run('save');
    if (mod && key === 'o') return void event.preventDefault(), void this.run('open');
    if (mod && key === 'n') return void event.preventDefault(), void this.run('new');
    if (mod && key === 'z' && event.shiftKey) return void event.preventDefault(), void this.run('redo');
    if (mod && key === 'z') return void event.preventDefault(), void this.run('undo');
    if (mod && key === 'y') return void event.preventDefault(), void this.run('redo');
    if (mod && key === 'c') return void event.preventDefault(), void this.run('copy');
    if (mod && key === 'x') return void event.preventDefault(), void this.run('cut');
    if (mod && key === 'v') return void event.preventDefault(), void this.run('paste');
    if (mod && key === 'd') return void event.preventDefault(), void this.run('duplicate');
    if (mod && key === 'a') return void event.preventDefault(), void this.run('select-all');
    if (mod && key === 'e' && event.shiftKey) return void event.preventDefault(), void this.run('export-png');
    if (mod && (key === '=' || key === '+')) return void event.preventDefault(), void this.run('zoom-in');
    if (mod && key === '-') return void event.preventDefault(), void this.run('zoom-out');
    if (mod && key === '0') return void event.preventDefault(), void this.run('zoom-100');
    if (mod && key === '1') return void event.preventDefault(), void this.run('zoom-fit');
    if (mod && key === ']') return void event.preventDefault(), void this.run(event.shiftKey ? 'front' : 'forward');
    if (mod && key === '[') return void event.preventDefault(), void this.run(event.shiftKey ? 'back' : 'backward');
    if (key === 'backspace' || key === 'delete') return void event.preventDefault(), void this.run('delete');
    if (key === 'v') return void this.run('tool-select');
    if (key === 'h') return void this.run('tool-pan');
    if (key === 'k') return void this.run('tool-connect');
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowLeft') this.editor.nudge(this.editor.selection.length ? -step : 0, 0), this.editor.selection.length ? null : this.editor.panBy(40, 0);
    if (event.key === 'ArrowRight') this.editor.selection.length ? this.editor.nudge(step, 0) : this.editor.panBy(-40, 0);
    if (event.key === 'ArrowUp') return void event.preventDefault(), void (this.editor.selection.length ? this.editor.nudge(0, -step) : this.editor.panBy(0, 40));
    if (event.key === 'ArrowDown') return void event.preventDefault(), void (this.editor.selection.length ? this.editor.nudge(0, step) : this.editor.panBy(0, -40));
  }

  private async placeLibrary(id: string, x: number, y: number): Promise<void> {
    const theme = themeById(this.editor.doc.meta.theme);
    const grid = this.editor.doc.meta.grid;
    const snap = this.editor.doc.meta.snap;
    const sx = snapValue(x, grid, snap);
    const sy = snapValue(y, grid, snap);
    if (id === 'wire:straight' || id === 'wire:orthogonal' || id === 'wire:dashed') {
      this.editor.wire = { routing: id === 'wire:straight' ? 'straight' : 'orthogonal', dash: id === 'wire:dashed' ? [14, 10] : null };
      this.editor.tool = 'connect';
      this.editor.emit();
      return;
    }
    if (id === 'image') {
      const file = await pickImage();
      if (file) await this.importImageFile(file, sx, sy);
      return;
    }
    let element: TopoElement;
    if (id === 'card') element = createCard(theme, sx - 180, sy - 40);
    else if (id === 'heading') element = createText(theme, sx - 80, sy - 16, true);
    else if (id === 'text') element = createText(theme, sx - 40, sy - 12, false);
    else if (id === 'pill') element = createPill(theme, sx, sy);
    else if (id === 'table') element = createTable(theme, sx - 200, sy - 40);
    else if (id === 'matrix') element = createMatrix(theme, sx - 200, sy - 40);
    else if (id.startsWith('icon:')) element = createIcon(theme, id.slice(5) as IconKind, sx, sy);
    else return;
    const next = addElement(this.editor.doc, element);
    this.editor.apply(() => next);
    const created = next.elements[next.elements.length - 1];
    this.editor.select([created.id]);
    this.forceInspector = true;
  }

  private async importImageFile(file: File, x: number, y: number): Promise<void> {
    const image = await readImage(file);
    const element = createImage(x, y, image.w, image.h, image.href, image.mime);
    const next = addElement(this.editor.doc, element);
    this.editor.apply(() => next);
    this.editor.select([next.elements[next.elements.length - 1].id]);
  }

  private queueAutosave(): void {
    window.clearTimeout(this.autosaveTimer);
    this.autosaveTimer = window.setTimeout(() => void this.autosave(), 700);
  }

  private async autosave(): Promise<void> {
    if (!this.editor.dirty) return;
    await storeAutosave(serializeDocument(this.editor.doc)).catch(() => undefined);
  }

  private eventWorld(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - this.editor.panX) / this.editor.zoom,
      y: (event.clientY - rect.top - this.editor.panY) / this.editor.zoom,
    };
  }

  private worldToStage(x: number, y: number): { x: number; y: number } {
    return { x: x * this.editor.zoom + this.editor.panX, y: y * this.editor.zoom + this.editor.panY };
  }

  private centerWorld(): { x: number; y: number } {
    return {
      x: (this.stage.clientWidth / 2 - this.editor.panX) / this.editor.zoom,
      y: (this.stage.clientHeight / 2 - this.editor.panY) / this.editor.zoom,
    };
  }

  private closeMenus(): void {
    this.root.querySelectorAll('.menu.open').forEach((menu) => menu.classList.remove('open'));
  }
}

function shellHtml(): string {
  return `<nav class="menubar">
    ${menu('Fil', [
      ['new', 'Nytt…', chord('N')],
      ['open', 'Åpne…', chord('O')],
      ['recent', 'Åpne nylig…', ''],
      ['save', 'Lagre', chord('S')],
      ['save-as', 'Lagre som…', chord('S', true)],
      ['export-png', 'Eksporter PNG…', chord('E', true)],
      ['export-svg', 'Eksporter SVG…', ''],
      ['export-pdf', 'Eksporter PDF…', ''],
    ])}
    ${menu('Rediger', [
      ['undo', 'Angre', chord('Z')],
      ['redo', 'Gjør om', chord('Z', true)],
      ['cut', 'Klipp ut', chord('X')],
      ['copy', 'Kopier', chord('C')],
      ['paste', 'Lim inn', chord('V')],
      ['duplicate', 'Dupliser', chord('D')],
      ['delete', 'Slett', isApplePlatform() ? '⌫' : 'Del'],
      ['select-all', 'Merk alt', chord('A')],
    ])}
    ${menu('Vis', [
      ['zoom-in', 'Forstørr', chord('+')],
      ['zoom-out', 'Forminsk', chord('−')],
      ['zoom-100', '100 %', chord('0')],
      ['zoom-fit', 'Tilpass vindu', chord('1')],
      ['toggle-grid', 'Rutenett', ''],
      ['toggle-snap', 'Fest til rutenett', ''],
      ['theme-dark', 'Mørkt tema', ''],
      ['theme-light', 'Lyst tema', ''],
    ])}
    ${menu('Objekt', [
      ['front', 'Legg foran', chord(']', true)],
      ['back', 'Legg bakerst', chord('[', true)],
      ['forward', 'Flytt frem', chord(']')],
      ['backward', 'Flytt bak', chord('[')],
      ['align-left', 'Venstrejuster', ''],
      ['align-hcenter', 'Midtstill horisontalt', ''],
      ['align-right', 'Høyrejuster', ''],
      ['align-top', 'Toppjuster', ''],
      ['align-vcenter', 'Midtstill vertikalt', ''],
      ['align-bottom', 'Bunnjuster', ''],
      ['distribute-h', 'Fordel horisontalt', ''],
      ['distribute-v', 'Fordel vertikalt', ''],
    ])}
    ${menu('Hjelp', [
      ['shortcuts', 'Tastatursnarveier', ''],
      ['about', 'Om Topologi Studio', ''],
    ])}
  </nav>
  <header class="toolbar">
    <div class="tb-group">
      <button type="button" data-tool="select" data-action="tool-select" title="Velg (V)">${glyph('select')}</button>
      <button type="button" data-tool="pan" data-action="tool-pan" title="Hånd (H)">${glyph('pan')}</button>
      <button type="button" data-tool="connect" data-action="tool-connect" title="Kobling (K)">${glyph('connect')}</button>
    </div>
    <div class="tb-group">
      <button type="button" data-action="undo" title="Angre">${glyph('undo')}</button>
      <button type="button" data-action="redo" title="Gjør om">${glyph('redo')}</button>
    </div>
    <div class="tb-group align-group">
      <button type="button" data-action="align-left" title="Venstrejuster">${glyph('align-left')}</button>
      <button type="button" data-action="align-hcenter" title="Midtstill">${glyph('align-center')}</button>
      <button type="button" data-action="align-right" title="Høyrejuster">${glyph('align-right')}</button>
      <button type="button" data-action="align-top" title="Toppjuster">${glyph('align-top')}</button>
      <button type="button" data-action="distribute-h" title="Fordel">${glyph('distribute')}</button>
    </div>
    <div class="tb-title" id="doc-title">Uten navn</div>
    <div class="tb-group tb-right">
      <button type="button" data-action="zoom-out" title="Forminsk">−</button>
      <button type="button" id="zoom-label" data-action="zoom-100" title="100 %">100 %</button>
      <button type="button" data-action="zoom-in" title="Forstørr">+</button>
      <button type="button" data-action="zoom-fit" title="Tilpass">Tilpass</button>
      <button type="button" id="grid-toggle" data-action="toggle-grid" title="Rutenett">${glyph('grid')}</button>
      <button type="button" id="snap-toggle" data-action="toggle-snap" title="Fest til rutenett">${glyph('snap')}</button>
    </div>
  </header>
  <div class="workspace">
    <aside class="panel left">
      <div class="tabs">
        <button type="button" data-tab="library" class="on">Bibliotek</button>
        <button type="button" data-tab="layers">Lag</button>
      </div>
      <div id="lib-pane">
        <input id="lib-search" type="search" placeholder="Søk i biblioteket" aria-label="Søk i biblioteket">
        <div id="lib-list" class="scroll"></div>
      </div>
      <div id="layers" class="scroll" hidden></div>
    </aside>
    <div id="stage" class="stage">
      <svg id="svg" xmlns="http://www.w3.org/2000/svg" xml:space="preserve">
        <rect id="backdrop" width="100%" height="100%" fill="transparent"></rect>
        <g id="viewport">
          <rect id="shadow" x="10" y="14" fill="rgba(0,0,0,0.28)"></rect>
          <rect id="page" x="0" y="0"></rect>
          <g id="grid"></g>
          <g id="scene"></g>
          <g id="overlay"></g>
        </g>
      </svg>
      <input id="inline" type="text" autocomplete="off" spellcheck="false">
    </div>
    <aside class="panel right">
      <div class="panel-head">Inspektør</div>
      <div id="inspector" class="scroll"></div>
    </aside>
  </div>
  <footer id="status" class="status"></footer>
  <div id="context" class="context" hidden></div>`;
}

function menu(label: string, items: [string, string, string][]): string {
  return `<div class="menu"><button type="button" class="menu-top">${label}</button><div class="menu-pop">${items
    .map(([action, text, shortcut]) => `<button type="button" data-action="${action}"><span>${text}</span>${shortcut ? `<kbd>${shortcut}</kbd>` : ''}</button>`)
    .join('')}</div></div>`;
}

function glyph(name: string): string {
  const common = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  const paths: Record<string, string> = {
    select: `<path d="M4 3 L4 14 L7.5 10.5 L10 15 L12 14 L9.4 9.6 L14 9 Z" fill="currentColor" stroke="none"/>`,
    pan: `<path ${common} d="M8 3 v4 M8 13 v4 M3 8 h4 M13 8 h4 M8 8"/>`,
    connect: `<path ${common} d="M4 12 H10 V6 H16"/><circle cx="4" cy="12" r="1.4" fill="currentColor"/><circle cx="16" cy="6" r="1.4" fill="currentColor"/>`,
    undo: `<path ${common} d="M7 7 H4 V4"/><path ${common} d="M4.5 7 A6 6 0 1 1 6 14"/>`,
    redo: `<path ${common} d="M13 7 h3 V4"/><path ${common} d="M15.5 7 A6 6 0 1 0 14 14"/>`,
    'align-left': `<path ${common} d="M4 4 v12 M7 7 h8 M7 12 h5"/>`,
    'align-center': `<path ${common} d="M10 3 v14 M6 7 h8 M7.5 12 h5"/>`,
    'align-right': `<path ${common} d="M16 4 v12 M5 7 h8 M8 12 h5"/>`,
    'align-top': `<path ${common} d="M4 4 h12 M7 7 v6 M12 7 v4"/>`,
    distribute: `<path ${common} d="M3 4 v12 M17 4 v12 M7 7 h2 v6 H7z M11 9 h2 v4 h-2z"/>`,
    grid: `<path ${common} d="M4 4 h12 v12 H4z M8 4 v12 M12 4 v12 M4 8 h12 M4 12 h12"/>`,
    snap: `<path ${common} d="M8 3 v4 M12 14 a4 4 0 1 1-4-4 h4"/>`,
  };
  return `<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">${paths[name] ?? ''}</svg>`;
}

function gridMarkup(width: number, height: number, grid: number, zoom: number): string {
  const lines: string[] = [];
  const stroke = 1 / zoom;
  for (let x = grid; x < width; x += grid) {
    const major = Math.round(x / grid) % 5 === 0;
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${major ? 'var(--grid-major)' : 'var(--grid-minor)'}" stroke-width="${stroke}" pointer-events="none"/>`);
  }
  for (let y = grid; y < height; y += grid) {
    const major = Math.round(y / grid) % 5 === 0;
    lines.push(`<line y1="${y}" x1="0" y2="${y}" x2="${width}" stroke="${major ? 'var(--grid-major)' : 'var(--grid-minor)'}" stroke-width="${stroke}" pointer-events="none"/>`);
  }
  return lines.join('');
}

function hitInfo(event: Event): { id?: string; port?: string; handle?: Handle; point?: string } {
  const node = event.target instanceof Element ? event.target : null;
  return hitInfoFrom(node);
}

function hitInfoFrom(node: Element | null): { id?: string; port?: string; handle?: Handle; point?: string } {
  const port = node?.closest<Element>('[data-port]');
  const handle = node?.closest<Element>('[data-handle]');
  const point = node?.closest<Element>('[data-point]');
  const host = (port ?? handle ?? point ?? node)?.closest<Element>('[data-id]');
  return {
    id: host?.getAttribute('data-id') ?? undefined,
    port: port?.getAttribute('data-port') ?? undefined,
    handle: (handle?.getAttribute('data-handle') as Handle | null) ?? undefined,
    point: point?.getAttribute('data-point') ?? undefined,
  };
}

function nearestPort(element: TopoElement, world: { x: number; y: number }): Port {
  let best: Port = 'e';
  let distance = Infinity;
  for (const port of portsOf(element)) {
    const next = Math.hypot(port.x - world.x, port.y - world.y);
    if (next < distance) {
      distance = next;
      best = port.port;
    }
  }
  return best;
}

function routeRubber(editor: Editor, start: { x: number; y: number }, end: { x: number; y: number }, port: Port): { x: number; y: number }[] {
  if (editor.wire.routing === 'straight') return [start, end];
  if (editor.wire.routing === 'polyline') return [start, end];
  return orthogonalRoute(start, end, port, null);
}

function normalizeBox(box: Box): Box {
  return {
    x: Math.min(box.x, box.x + box.w),
    y: Math.min(box.y, box.y + box.h),
    w: Math.abs(box.w),
    h: Math.abs(box.h),
  };
}

function matrixCellAt(element: Extract<TopoElement, { type: 'matrix' }>, world: { x: number; y: number }): { row: number; col: number } | null {
  const col = Math.floor((world.x - element.x - element.cellX) / element.strideX);
  const row = Math.floor((world.y - element.y - element.cellY) / element.strideY);
  if (row < 0 || col < 0 || row >= element.rowLabels.length || col >= element.colLabels.length) return null;
  return { row, col };
}

function structureKey(editor: Editor): string {
  return editor.selection
    .map((id) => {
      const element = findElement(editor.doc, id);
      if (!element) return id;
      if (element.type === 'card') return `${id}:card:${element.rows.length}:${element.autoHeight}`;
      if (element.type === 'table') return `${id}:table:${element.rows.length}x${element.headers.length}`;
      if (element.type === 'matrix') return `${id}:matrix:${element.rowLabels.length}:${element.notes.length}:${element.cells.map((row) => row.map((cell) => cell.text).join(',')).join(';')}`;
      if (element.type === 'connector') return `${id}:wire:${element.points.length}:${element.routing}`;
      if (element.type === 'icon') return `${id}:icon:${element.icon}`;
      return `${id}:${element.type}`;
    })
    .join('|');
}

function patchDocument(doc: Editor['doc'], field: string, value: string | number | boolean): Editor['doc'] {
  if (field === 'doc-title' && typeof value === 'string') return { ...doc, meta: { ...doc.meta, title: value } };
  if (field === 'doc-width' && typeof value === 'number') return { ...doc, canvas: { ...doc.canvas, width: Math.max(200, value) } };
  if (field === 'doc-height' && typeof value === 'number') return { ...doc, canvas: { ...doc.canvas, height: Math.max(200, value) } };
  if (field === 'doc-background' && typeof value === 'string') return { ...doc, canvas: { ...doc.canvas, background: value } };
  if (field === 'doc-grid' && typeof value === 'number') return { ...doc, meta: { ...doc.meta, grid: Math.max(2, value) } };
  if (field === 'doc-snap') return { ...doc, meta: { ...doc.meta, snap: Boolean(value) } };
  return doc;
}

function patchElement(doc: Editor['doc'], element: TopoElement, field: string, value: string | number | boolean): Editor['doc'] {
  if (field === 'x' && typeof value === 'number') return translateElements(doc, [element.id], value - element.x, 0);
  if (field === 'y' && typeof value === 'number') return translateElements(doc, [element.id], 0, value - element.y);
  if ((field === 'w' || field === 'h') && typeof value === 'number' && element.type !== 'connector') {
    const box = { x: element.x, y: element.y, w: field === 'w' ? Math.max(16, value) : element.w, h: field === 'h' ? Math.max(16, value) : element.h };
    return resizeElement(doc, element.id, box);
  }
  if (field === 'fontSize' && typeof value === 'number' && element.type === 'text') {
    const baseline = element.y + element.fontSize;
    return updateElement(doc, element.id, { fontSize: value, y: baseline - value });
  }
  if (field === 'icon' && element.type === 'icon' && typeof value === 'string') {
    const native = ICON_NATIVE[value as IconKind];
    const cx = element.x + element.w / 2;
    const cy = element.y + element.h / 2;
    return updateElement(doc, element.id, { icon: value as IconKind, w: native.w, h: native.h, x: cx - native.w / 2, y: cy - native.h / 2 });
  }
  if (field === 'dash') return updateElement(doc, element.id, { dash: value ? [14, 10] : null });
  return updateElement(doc, element.id, { [field]: value } as Partial<TopoElement>);
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
}

function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/svg+xml';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

async function readImage(file: File): Promise<{ href: string; mime: string; w: number; h: number }> {
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    const text = await file.text();
    const viewBox = text.match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/);
    return {
      href: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`,
      mime: 'image/svg+xml',
      w: viewBox ? Number(viewBox[1]) : 240,
      h: viewBox ? Number(viewBox[2]) : 160,
    };
  }
  const href = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const size = await new Promise<{ w: number; h: number }>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ w: image.naturalWidth || 240, h: image.naturalHeight || 160 });
    image.onerror = () => resolve({ w: 240, h: 160 });
    image.src = href;
  });
  const scale = Math.min(1, 480 / Math.max(size.w, size.h));
  return { href, mime: file.type || 'image/png', w: Math.max(16, Math.round(size.w * scale)), h: Math.max(16, Math.round(size.h * scale)) };
}

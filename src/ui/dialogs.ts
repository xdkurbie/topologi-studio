import { esc } from './html';
import type { RecentFile } from '../platform/native';

export interface Choice {
  id: string;
  label: string;
  primary?: boolean;
  danger?: boolean;
}

let root: HTMLElement | null = null;

function host(): HTMLElement {
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.append(root);
  }
  return root;
}

function open(html: string): { element: HTMLElement; close: () => void } {
  const element = document.createElement('div');
  element.className = 'modal-back';
  element.innerHTML = html;
  host().append(element);
  const close = () => element.remove();
  element.addEventListener('mousedown', (event) => {
    if (event.target === element) close();
  });
  return { element, close };
}

export function choose(title: string, body: string, buttons: Choice[]): Promise<string | null> {
  return new Promise((resolve) => {
    const dialog = open(`<div class="modal" role="dialog" aria-modal="true">
      <h2>${esc(title)}</h2>
      <p>${esc(body)}</p>
      <div class="modal-actions">${buttons
        .map((button) => `<button type="button" data-choice="${esc(button.id)}" class="${button.primary ? 'primary' : ''} ${button.danger ? 'danger' : ''}">${esc(button.label)}</button>`)
        .join('')}</div>
    </div>`);
    const finish = (value: string | null) => {
      dialog.close();
      resolve(value);
    };
    dialog.element.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-choice]');
      if (button) finish(button.dataset.choice ?? null);
    });
    dialog.element.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') finish(null);
    });
  });
}

export function newDocumentDialog(unifiSvg: string): Promise<'blank' | 'unifi' | null> {
  return new Promise((resolve) => {
    const dialog = open(`<div class="modal wide" role="dialog" aria-modal="true">
      <h2>Ny topologi</h2>
      <p>Velg et tomt ark, eller åpne malen som gjenskaper UniFi-skissen.</p>
      <div class="template-grid">
        <button type="button" class="template" data-template="blank">
          <span class="thumb blank-thumb"></span>
          <strong>Tomt dokument</strong>
          <span>Et mørkt ark uten elementer.</span>
        </button>
        <button type="button" class="template" data-template="unifi">
          <span class="thumb">${unifiSvg}</span>
          <strong>UniFi Dream Machine SE</strong>
          <span>Kort, linjer, VLAN-tabell og brannmur. Lars · 19.10.2026.</span>
        </button>
      </div>
      <div class="modal-actions"><button type="button" data-template="">Avbryt</button></div>
    </div>`);
    const finish = (value: 'blank' | 'unifi' | null) => {
      dialog.close();
      resolve(value);
    };
    dialog.element.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-template]');
      if (!button) return;
      const value = button.dataset.template;
      finish(value === 'blank' || value === 'unifi' ? value : null);
    });
  });
}

export function exportScaleDialog(kind: string): Promise<number | null> {
  return new Promise((resolve) => {
    const dialog = open(`<div class="modal" role="dialog">
      <h2>Eksporter ${esc(kind)}</h2>
      <p>Velg oppløsning. 2× er skarpt nok til utskrift og deling.</p>
      <div class="scale-row">
        <button type="button" data-scale="1">1×</button>
        <button type="button" class="primary" data-scale="2">2×</button>
        <button type="button" data-scale="3">3×</button>
      </div>
      <div class="modal-actions"><button type="button" data-scale="">Avbryt</button></div>
    </div>`);
    dialog.element.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-scale]');
      if (!button) return;
      const value = button.dataset.scale ?? '';
      dialog.close();
      resolve(value ? Number(value) : null);
    });
  });
}

export function recentDialog(files: RecentFile[]): Promise<string | null> {
  return new Promise((resolve) => {
    const list = files.length
      ? files.map((file) => `<button type="button" class="recent" data-path="${esc(file.path)}"><strong>${esc(file.title)}</strong><span>${esc(file.path)}</span></button>`).join('')
      : '<p class="hint">Ingen nylige filer ennå.</p>';
    const dialog = open(`<div class="modal" role="dialog"><h2>Nylige filer</h2>${list}<div class="modal-actions"><button type="button" data-path="">Lukk</button></div></div>`);
    dialog.element.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-path]');
      if (!button) return;
      dialog.close();
      resolve(button.dataset.path || null);
    });
  });
}

export function shortcutsDialog(): void {
  const rows: [string, string][] = [
    ['V / H / K', 'Velg, hånd, kobling'],
    ['Mellomrom + dra', 'Panorer'],
    ['Rullehjul', 'Panorer'],
    ['Klyp eller Cmd-rull', 'Zoom mot pekeren'],
    ['Cmd + / Cmd − / Cmd 0 / Cmd 1', 'Zoom inn, ut, 100 %, tilpass'],
    ['Shift-klikk', 'Legg til i markering'],
    ['Dra på tomt område', 'Marker flere'],
    ['Piltaster', 'Flytt 1 px, Shift flytter 10 px'],
    ['Cmd Z / Cmd Shift Z', 'Angre / gjør om'],
    ['Cmd C / X / V / D', 'Kopier, klipp ut, lim inn, dupliser'],
    ['Delete', 'Slett markering'],
    ['Cmd A', 'Merk alt'],
    ['Cmd ] / Cmd [', 'Legg foran / bak'],
    ['Cmd S / Cmd Shift S / Cmd O / Cmd N', 'Lagre, lagre som, åpne, ny'],
    ['Cmd Shift E', 'Eksporter PNG'],
    ['Dobbeltklikk', 'Rediger tekst'],
    ['Alt-klikk i matrise', 'Bytt Allow / Block / Return'],
    ['Escape', 'Avbryt kobling eller markering'],
  ];
  const dialog = open(`<div class="modal wide" role="dialog"><h2>Tastatursnarveier</h2>
    <table class="shortcuts">${rows.map(([keys, label]) => `<tr><td>${esc(keys)}</td><td>${esc(label)}</td></tr>`).join('')}</table>
    <div class="modal-actions"><button type="button" data-close>Lukk</button></div></div>`);
  dialog.element.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-close]')) dialog.close();
  });
}

export function aboutDialog(): void {
  const dialog = open(`<div class="modal" role="dialog">
    <h2>Topologi Studio</h2>
    <p>Versjon 0.1.0. Et skrivebordsprogram for nettverkstopologi, laget med Rust og Tauri.</p>
    <p>Standardstilen følger skissen «Nettverkstopologi – UniFi Dream Machine SE».</p>
    <div class="modal-actions"><button type="button" class="primary" data-close>Lukk</button></div>
  </div>`);
  dialog.element.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-close]')) dialog.close();
  });
}

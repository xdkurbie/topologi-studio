import type { ThemeTokens } from '../model/theme';
import { iconLabel, type IconKind } from '../model/types';
import { iconPreview } from '../render/icons';
import { esc } from './html';

export interface LibraryItem {
  id: string;
  group: string;
  label: string;
  hint: string;
}

const ICONS: IconKind[] = ['globe', 'ont', 'switch', 'ap', 'laptop', 'pc', 'phone', 'server', 'router', 'firewall', 'cloud', 'vm', 'nas', 'printer', 'camera', 'wifi', 'junction'];

export function libraryItems(): LibraryItem[] {
  return [
    { id: 'card', group: 'Former', label: 'Kort', hint: 'Tittel og fargede rader' },
    { id: 'heading', group: 'Former', label: 'Overskrift', hint: 'Stor tekst' },
    { id: 'text', group: 'Former', label: 'Tekst', hint: 'Etikett eller avsnitt' },
    { id: 'pill', group: 'Former', label: 'Pille', hint: 'Portmerke' },
    { id: 'table', group: 'Former', label: 'Tabell', hint: 'Rader og kolonner' },
    { id: 'matrix', group: 'Former', label: 'Matrise', hint: 'Fargede celler' },
    { id: 'image', group: 'Former', label: 'Bilde', hint: 'PNG, JPG eller SVG' },
    ...ICONS.map((icon) => ({ id: `icon:${icon}`, group: 'Enheter', label: iconLabel(icon), hint: 'Dra inn på lerretet' })),
    { id: 'wire:straight', group: 'Koblinger', label: 'Rett linje', hint: 'Klikk to porter' },
    { id: 'wire:orthogonal', group: 'Koblinger', label: 'Ortogonal', hint: 'Knekk i rett vinkel' },
    { id: 'wire:dashed', group: 'Koblinger', label: 'Stiplet', hint: 'Ortogonal og stiplet' },
  ];
}

export function libraryHtml(theme: ThemeTokens, query: string): string {
  const needle = query.trim().toLowerCase();
  const items = libraryItems().filter((item) => !needle || `${item.label} ${item.group}`.toLowerCase().includes(needle));
  const groups = ['Former', 'Enheter', 'Koblinger'];
  return groups
    .map((group) => {
      const groupItems = items.filter((item) => item.group === group);
      if (groupItems.length === 0) return '';
      return `<section class="lib-group"><h3>${group}</h3><div class="lib-grid">${groupItems.map((item) => itemHtml(item, theme)).join('')}</div></section>`;
    })
    .join('');
}

function itemHtml(item: LibraryItem, theme: ThemeTokens): string {
  const preview = item.id.startsWith('icon:') ? iconPreview(item.id.slice(5) as IconKind, theme.device, theme.accent) : shapePreview(item.id, theme);
  return `<button type="button" class="lib-item" draggable="true" data-library="${esc(item.id)}" title="${esc(item.hint)}"><span class="lib-preview">${preview}</span><span>${esc(item.label)}</span></button>`;
}

function shapePreview(id: string, theme: ThemeTokens): string {
  if (id === 'card') return `<svg viewBox="0 0 80 48"><rect x="4" y="4" width="72" height="40" rx="8" fill="${theme.card}" stroke="${theme.cardBorder}" stroke-width="2"/><rect x="12" y="12" width="36" height="4" fill="${theme.title}"/><rect x="12" y="22" width="48" height="3" fill="${theme.blue}"/><rect x="12" y="30" width="40" height="3" fill="${theme.text}"/></svg>`;
  if (id === 'heading') return `<svg viewBox="0 0 80 48"><text x="8" y="32" fill="${theme.title}" font-size="20" font-weight="700" font-family="DejaVu Sans, Arial, sans-serif">Aa</text></svg>`;
  if (id === 'text') return `<svg viewBox="0 0 80 48"><text x="8" y="30" fill="${theme.text}" font-size="16" font-family="DejaVu Sans, Arial, sans-serif">Tekst</text></svg>`;
  if (id === 'pill') return `<svg viewBox="0 0 80 48"><rect x="8" y="12" width="64" height="24" rx="12" fill="${theme.pillFill}" stroke="${theme.line}" stroke-width="2"/><text x="40" y="29" text-anchor="middle" fill="${theme.blue}" font-size="11" font-family="DejaVu Sans, Arial, sans-serif">Port</text></svg>`;
  if (id === 'table') return `<svg viewBox="0 0 80 48"><text x="6" y="14" fill="${theme.title}" font-size="9" font-weight="700">Tabell</text><text x="6" y="28" fill="${theme.blue}" font-size="8">A</text><text x="28" y="28" fill="${theme.blue}" font-size="8">B</text><text x="6" y="40" fill="${theme.text}" font-size="8">1</text><text x="28" y="40" fill="${theme.text}" font-size="8">2</text></svg>`;
  if (id === 'matrix') return `<svg viewBox="0 0 80 48"><rect x="18" y="8" width="18" height="14" rx="3" fill="#5a1f24"/><rect x="40" y="8" width="18" height="14" rx="3" fill="#1f5a35"/><rect x="18" y="26" width="18" height="14" rx="3" fill="#1f3f5a"/><rect x="40" y="26" width="18" height="14" rx="3" fill="#5a1f24"/></svg>`;
  if (id === 'image') return `<svg viewBox="0 0 80 48"><rect x="10" y="8" width="60" height="32" rx="4" fill="none" stroke="${theme.muted}" stroke-dasharray="3 2"/><circle cx="28" cy="22" r="4" fill="${theme.blue}"/><path d="M18 36 L32 24 L44 34 L52 28 L64 36" fill="none" stroke="${theme.text}" stroke-width="1.5"/></svg>`;
  if (id.startsWith('wire')) {
    const dash = id.endsWith('dashed') ? '4 3' : '';
    const elbow = id.includes('orthogonal') || id.endsWith('dashed');
    const d = elbow ? 'M8 34 H40 V14 H72' : 'M8 34 L72 14';
    return `<svg viewBox="0 0 80 48"><path d="${d}" fill="none" stroke="${theme.line}" stroke-width="3" ${dash ? `stroke-dasharray="${dash}"` : ''}/></svg>`;
  }
  return '';
}

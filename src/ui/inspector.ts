import { iconLabel, typeLabel, CELL_PRESETS, type TopoElement } from '../model/types';
import { SWATCHES } from '../model/theme';
import { colorInputValue, esc } from './html';

function num(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function field(label: string, inner: string): string {
  return `<label class="field"><span>${label}</span>${inner}</label>`;
}

function numberInput(fieldName: string, value: number, step = 1): string {
  return `<input data-field="${fieldName}" type="number" step="${step}" value="${num(value)}">`;
}

function textInput(fieldName: string, value: string): string {
  return `<input data-field="${fieldName}" type="text" value="${esc(value)}">`;
}

function colorInput(fieldName: string, value: string): string {
  return `<span class="color-pair"><input data-field="${fieldName}" type="color" value="${colorInputValue(value)}"><input data-field="${fieldName}" data-kind="hex" type="text" value="${esc(value)}" spellcheck="false"></span>`;
}

function selectInput(fieldName: string, value: string, options: { value: string; label: string }[]): string {
  return `<select data-field="${fieldName}">${options
    .map((option) => `<option value="${esc(option.value)}"${option.value === value ? ' selected' : ''}>${esc(option.label)}</option>`)
    .join('')}</select>`;
}

function checkInput(fieldName: string, label: string, checked: boolean): string {
  return `<label class="check"><input data-field="${fieldName}" type="checkbox"${checked ? ' checked' : ''}><span>${label}</span></label>`;
}

function swatches(target: string): string {
  return `<div class="swatches">${SWATCHES.map(
    (swatch) => `<button type="button" class="swatch" data-swatch="${swatch.value}" data-swatch-target="${target}" title="${esc(swatch.name)}" style="background:${swatch.value}"></button>`,
  ).join('')}</div>`;
}

export function documentInspector(title: string, width: number, height: number, background: string, grid: number, snap: boolean): string {
  return `<div class="inspector-body">
    <h2>Dokument</h2>
    ${field('Tittel', textInput('doc-title', title))}
    <div class="field-row">${field('Bredde', numberInput('doc-width', width, 10))}${field('Høyde', numberInput('doc-height', height, 10))}</div>
    ${field('Bakgrunn', colorInput('doc-background', background))}
    ${swatches('doc-background')}
    ${field('Rutenett', numberInput('doc-grid', grid, 1))}
    ${checkInput('doc-snap', 'Fest til rutenett', snap)}
    <p class="hint">Velg et element på lerretet for å redigere det. Dobbeltklikk tekst for å skrive direkte.</p>
  </div>`;
}

export function inspectorHtml(elements: TopoElement[]): string {
  if (elements.length === 0) return '';
  if (elements.length > 1) {
    return `<div class="inspector-body">
      <h2>${elements.length} valgt</h2>
      <p class="hint">Bruk verktøylinjen for å justere eller fordele. Felles egenskaper under gjelder alle valgte.</p>
      ${field('Dekkevne', `<input data-field="opacity" type="range" min="0.05" max="1" step="0.05" value="${elements[0].opacity}">`)}
      <div class="button-row">
        <button type="button" data-action="front">Legg foran</button>
        <button type="button" data-action="back">Legg bakerst</button>
      </div>
    </div>`;
  }
  const element = elements[0];
  const head = `<h2>${esc(typeLabel(element.type))}</h2>${field('Navn', textInput('name', element.name))}
    <div class="field-row">${field('X', numberInput('x', element.x))}${field('Y', numberInput('y', element.y))}</div>
    ${element.type === 'connector' ? '' : `<div class="field-row">${field('Bredde', numberInput('w', element.w))}${field('Høyde', numberInput('h', element.h))}</div>`}`;
  return `<div class="inspector-body">${head}${body(element)}
    ${field('Dekkevne', `<input data-field="opacity" type="range" min="0.05" max="1" step="0.05" value="${element.opacity}">`)}
    ${checkInput('locked', 'Låst', element.locked)}
    <div class="button-row">
      <button type="button" data-action="forward">Frem</button>
      <button type="button" data-action="backward">Bak</button>
      <button type="button" data-action="front">Foran</button>
      <button type="button" data-action="back">Bakerst</button>
    </div>
  </div>`;
}

function body(element: TopoElement): string {
  switch (element.type) {
    case 'text':
      return `${field('Tekst', textInput('text', element.text))}
        <div class="field-row">${field('Størrelse', numberInput('fontSize', element.fontSize))}${field('Vekt', selectInput('fontWeight', element.fontWeight, [{ value: 'normal', label: 'Vanlig' }, { value: 'bold', label: 'Fet' }]))}</div>
        ${field('Justering', selectInput('align', element.align, [{ value: 'start', label: 'Venstre' }, { value: 'middle', label: 'Midt' }, { value: 'end', label: 'Høyre' }]))}
        ${field('Farge', colorInput('color', element.color))}${swatches('color')}`;
    case 'card':
      return `${field('Tittel', textInput('title', element.title))}
        <div class="field-row">${field('Tittelstørrelse', numberInput('titleSize', element.titleSize))}${field('Radstørrelse', numberInput('rowSize', element.rowSize))}</div>
        ${field('Tittelfarge', colorInput('titleColor', element.titleColor))}
        ${field('Fyll', colorInput('fill', element.fill))}
        ${field('Kant', colorInput('stroke', element.stroke))}
        ${swatches('fill')}
        <div class="field-row">${field('Kantbredde', numberInput('strokeWidth', element.strokeWidth, 0.5))}${field('Radius', numberInput('radius', element.radius))}</div>
        ${checkInput('autoHeight', 'Automatisk høyde', element.autoHeight)}
        <div class="stack-head"><span>Rader</span><button type="button" data-add-row>Legg til</button></div>
        ${element.rows
          .map(
            (row, index) => `<div class="stack-row">
              <input data-row-text="${index}" type="text" value="${esc(row.text)}">
              <input data-row-color="${index}" type="color" value="${colorInputValue(row.color)}">
              <button type="button" data-row-up="${index}" title="Opp">↑</button>
              <button type="button" data-row-del="${index}" title="Slett rad">×</button>
            </div>`,
          )
          .join('')}`;
    case 'pill':
      return `${field('Tekst', textInput('text', element.text))}
        ${field('Tekstfarge', colorInput('textColor', element.textColor))}
        ${field('Fyll', colorInput('fill', element.fill))}
        ${field('Kant', colorInput('stroke', element.stroke))}
        ${swatches('stroke')}
        <div class="field-row">${field('Skrift', numberInput('fontSize', element.fontSize))}${field('Kantbredde', numberInput('strokeWidth', element.strokeWidth, 0.5))}</div>
        ${checkInput('autoWidth', 'Bredde etter tekst', element.autoWidth)}`;
    case 'icon':
      return `${field('Symbol', selectInput('icon', element.icon, iconOptions()))}
        ${field('Fyll', colorInput('fill', element.fill))}
        ${field('Aksent', colorInput('accent', element.accent))}
        ${field('Strek', colorInput('stroke', element.stroke))}
        ${swatches('fill')}
        ${field('Strektykkelse', numberInput('strokeWidth', element.strokeWidth, 0.5))}
        ${element.icon === 'globe' ? field('Bokstav', textInput('glyph', element.glyph)) : ''}
        ${element.icon === 'ont' || element.icon === 'switch' ? field('Porter', numberInput('ports', element.ports)) : ''}`;
    case 'image':
      return `<p class="hint">Bildet er bygget inn i filen. Dra i hjørnene for å skalere. Hold nede Shift for å beholde proporsjon.</p>`;
    case 'table':
      return `${field('Tittel', textInput('title', element.title))}
        ${checkInput('showTitle', 'Vis tittel', element.showTitle)}
        ${field('Tittelfarge', colorInput('titleColor', element.titleColor))}
        ${field('Overskrift', colorInput('headerColor', element.headerColor))}
        ${field('Tekst', colorInput('bodyColor', element.bodyColor))}
        <div class="stack-head"><span>Kolonner</span><button type="button" data-add-col>Legg til</button></div>
        ${element.headers.map((header, index) => `<div class="stack-row"><input data-header="${index}" type="text" value="${esc(header)}"><button type="button" data-col-del="${index}">×</button></div>`).join('')}
        <div class="stack-head"><span>Rader</span><button type="button" data-add-row>Legg til</button></div>
        ${element.rows
          .map(
            (row, rowIndex) =>
              `<div class="stack-row table-cells">${row
                .map((cell, colIndex) => `<input data-cell="${rowIndex}:${colIndex}" type="text" value="${esc(cell)}">`)
                .join('')}<button type="button" data-row-del="${rowIndex}">×</button></div>`,
          )
          .join('')}`;
    case 'matrix':
      return `${field('Tittel', textInput('title', element.title))}
        ${field('Undertekst', textInput('subtitle', element.subtitle))}
        <p class="hint">Klikk en celle for å veksle mellom Allow All, Block All og Allow Return. Pluss og minus på kanten legger til og fjerner rader og kolonner. Høyreklikk en overskrift for å sette inn, slette eller gi nytt navn.</p>
        <div class="button-row"><button type="button" data-add-row>Rad +</button><button type="button" data-add-col>Kolonne +</button></div>
        <div class="stack-head"><span>Slett rad</span></div>
        <div class="button-row">${element.rowLabels.map((label, index) => `<button type="button" data-row-del="${index}" title="Slett ${esc(label)}">${esc(label)}</button>`).join('')}</div>
        <div class="stack-head"><span>Slett kolonne</span></div>
        <div class="button-row">${element.colLabels.map((label, index) => `<button type="button" data-col-del="${index}" title="Slett ${esc(label)}">${esc(label)}</button>`).join('')}</div>
        <div class="matrix-edit" style="grid-template-columns: minmax(72px, 1.1fr) repeat(${element.colLabels.length}, minmax(0, 1fr))">
          <span></span>
          ${element.colLabels.map((label, index) => `<input data-col-label="${index}" type="text" value="${esc(label)}">`).join('')}
          ${element.rowLabels
            .map(
              (label, row) =>
                `<input data-row-label="${row}" type="text" value="${esc(label)}">${(element.cells[row] ?? [])
                  .map(
                    (cell, col) =>
                      `<button type="button" class="matrix-cell" data-cycle="${row}:${col}" style="background:${cell.fill};color:${cell.color}">${esc(cell.text)}</button>`,
                  )
                  .join('')}`,
            )
            .join('')}
        </div>
        <div class="stack-head"><span>Notater</span><button type="button" data-add-note>Legg til</button></div>
        ${element.notes.map((note, index) => `<div class="stack-row"><input data-note="${index}" type="text" value="${esc(note)}"><button type="button" data-note-del="${index}">×</button></div>`).join('')}
        <div class="preset-row">${CELL_PRESETS.map((preset) => `<span class="preset" style="background:${preset.fill};color:${preset.color}">${esc(preset.text)}</span>`).join('')}</div>`;
    case 'zone':
      return `${field('Tittel', textInput('title', element.title))}
        ${field('Undertekst', textInput('subtitle', element.subtitle))}
        ${field('Tittelfarge', colorInput('titleColor', element.titleColor))}
        ${field('Undertekstfarge', colorInput('subtitleColor', element.subtitleColor))}
        ${field('Fyll', colorInput('fill', element.fill))}
        ${field('Kant', colorInput('stroke', element.stroke))}
        ${field('Fylldekning', numberInput('fillOpacity', element.fillOpacity, 0.01))}
        ${checkInput('dash', 'Stiplet', !!element.dash)}`;
    case 'connector':
      return `${field('Ruting', selectInput('routing', element.routing, [{ value: 'straight', label: 'Rett' }, { value: 'orthogonal', label: 'Ortogonal' }, { value: 'polyline', label: 'Fri linje' }]))}
        ${field('Farge', colorInput('stroke', element.stroke))}
        ${swatches('stroke')}
        ${field('Tykkelse', numberInput('strokeWidth', element.strokeWidth, 0.5))}
        ${checkInput('dash', 'Stiplet', !!element.dash)}
        ${field('Etikett', textInput('label', element.label))}
        ${checkInput('startDot', 'Prikk ved start', element.startDot)}
        ${checkInput('endDot', 'Prikk ved slutt', element.endDot)}
        ${checkInput('arrow', 'Pilspiss', element.arrow)}
        <div class="button-row"><button type="button" data-add-bend>Legg til knekk</button></div>`;
  }
}

function iconOptions(): { value: string; label: string }[] {
  const kinds = ['globe', 'ont', 'switch', 'ap', 'laptop', 'pc', 'phone', 'server', 'router', 'firewall', 'cloud', 'vm', 'nas', 'printer', 'camera', 'wifi', 'junction'] as const;
  return kinds.map((kind) => ({ value: kind, label: iconLabel(kind) }));
}

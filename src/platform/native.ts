export interface RecentFile {
  path: string;
  title: string;
}

export function inTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|Macintosh/.test(`${navigator.platform} ${navigator.userAgent}`);
}

export function chord(key: string, shift = false): string {
  if (isApplePlatform()) return `${shift ? '⇧' : ''}⌘${key}`;
  return shift ? `Ctrl+Shift+${key}` : `Ctrl+${key}`;
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: call } = await import('@tauri-apps/api/core');
  return call<T>(command, args);
}

export async function openTopo(): Promise<{ text: string; path: string | null } | null> {
  if (inTauri()) {
    const path = await invoke<string | null>('pick_open');
    if (!path) return null;
    const text = await invoke<string>('read_text', { path });
    return { text, path };
  }
  const file = await pickLocalFile('.topo,application/json');
  if (!file) return null;
  return { text: await file.text(), path: null };
}

export async function saveTopo(suggestedName: string, contents: string, existingPath: string | null): Promise<string | null> {
  if (inTauri()) {
    const path =
      existingPath ??
      (await invoke<string | null>('pick_save', {
        title: 'Lagre topologi',
        fileName: suggestedName,
        filterName: 'Topologi',
        extensions: ['topo'],
      }));
    if (!path) return null;
    await invoke('write_text', { path, contents });
    return path;
  }
  const blob = new Blob([contents], { type: 'application/json' });
  const saved = await saveBlob(suggestedName, blob, { description: 'Topologi', accept: { 'application/json': ['.topo'] } });
  return saved ? existingPath : null;
}

export async function saveBinary(suggestedName: string, bytes: Uint8Array, filterName: string, extensions: string[]): Promise<boolean> {
  if (inTauri()) {
    const path = await invoke<string | null>('pick_save', {
      title: 'Eksporter',
      fileName: suggestedName,
      filterName,
      extensions,
    });
    if (!path) return false;
    await invoke('write_bytes', { path, bytes: Array.from(bytes) });
    return true;
  }
  const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer]);
  return saveBlob(suggestedName, blob, {
    description: filterName,
    accept: { 'application/octet-stream': extensions.map((extension) => `.${extension}`) },
  });
}

export async function rememberRecent(path: string, title: string): Promise<void> {
  if (!inTauri() || !path) return;
  await invoke('recent_add', { path, title });
}

export async function listRecent(): Promise<RecentFile[]> {
  if (!inTauri()) return [];
  return invoke<RecentFile[]>('recent_list');
}

export async function readPath(path: string): Promise<string> {
  return invoke<string>('read_text', { path });
}

export async function storeAutosave(contents: string): Promise<void> {
  if (inTauri()) {
    await invoke('autosave_write', { contents });
    return;
  }
  await idbSet('autosave', contents);
}

export async function loadAutosave(): Promise<string | null> {
  if (inTauri()) return invoke<string | null>('autosave_read');
  const value = await idbGet('autosave');
  return typeof value === 'string' ? value : null;
}

export async function clearAutosave(): Promise<void> {
  if (inTauri()) {
    await invoke('autosave_clear');
    return;
  }
  await idbSet('autosave', '');
}

export async function listenMenu(handler: (id: string) => void): Promise<() => void> {
  if (!inTauri()) return () => undefined;
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<string>('menu', (event) => handler(event.payload));
  return () => {
    unlisten();
  };
}

export async function setWindowTitle(title: string): Promise<void> {
  if (!inTauri()) {
    document.title = title;
    return;
  }
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().setTitle(title);
}

export async function quitApp(): Promise<void> {
  if (!inTauri()) return;
  await invoke('force_close');
}

export async function launchFiles(): Promise<string[]> {
  if (!inTauri()) return [];
  return invoke<string[]>('launch_files');
}

export async function listenOpenPath(handler: (path: string) => void): Promise<() => void> {
  if (!inTauri()) return () => undefined;
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<string>('open-path', (event) => handler(event.payload));
  return () => {
    unlisten();
  };
}

function pickLocalFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

async function saveBlob(name: string, blob: Blob, type: { description: string; accept: Record<string, string[]> }): Promise<boolean> {
  const picker = (window as Window & { showSaveFilePicker?: (options: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ suggestedName: name, types: [type] });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch {
      return false;
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
  return true;
}

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('topologi-studio', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('kv')) request.result.createObjectStore('kv');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await idb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(key: string): Promise<unknown> {
  const db = await idb();
  const value = await new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const request = tx.objectStore('kv').get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

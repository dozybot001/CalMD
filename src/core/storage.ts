import { detectDefaultLang, type Lang } from './i18n';

export type ThemeId = 'paper' | 'sepia' | 'mist' | 'ink';
export type FontId = 'serif' | 'sans' | 'mono';
export type MeasureId = 'narrow' | 'standard' | 'wide';

export interface ReaderPrefs {
  theme: ThemeId;
  font: FontId;
  fontSize: number; // 15..24
  measure: MeasureId;
  lineHeight: number; // 1.6 | 1.8 | 2.0
  focusMode: boolean;
  lang: Lang;
}

export interface RecentDoc {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
  scrollRatio: number;
  wordCount: number;
}

const PREFS_STORAGE_NAME = 'calmd.prefs.v1';
const DB_NAME = 'calmd-local-db';
const STORE_NAME = 'recent_docs';
const MAX_RECENT = 10;

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: 'paper',
  font: 'serif',
  fontSize: 18,
  measure: 'standard',
  lineHeight: 1.85,
  focusMode: false,
  lang: detectDefaultLang(),
};

export function loadPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_NAME);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<ReaderPrefs>;
    return {
      theme: isOneOf(parsed.theme, ['paper', 'sepia', 'mist', 'ink'])
        ? parsed.theme
        : DEFAULT_PREFS.theme,
      font: isOneOf(parsed.font, ['serif', 'sans', 'mono']) ? parsed.font : DEFAULT_PREFS.font,
      fontSize:
        typeof parsed.fontSize === 'number'
          ? Math.min(24, Math.max(15, Math.round(parsed.fontSize)))
          : DEFAULT_PREFS.fontSize,
      measure: isOneOf(parsed.measure, ['narrow', 'standard', 'wide'])
        ? parsed.measure
        : DEFAULT_PREFS.measure,
      lineHeight: isOneOf(parsed.lineHeight, [1.65, 1.85, 2.05])
        ? parsed.lineHeight
        : DEFAULT_PREFS.lineHeight,
      focusMode: Boolean(parsed.focusMode),
      lang: isOneOf(parsed.lang, ['zh', 'en']) ? parsed.lang : DEFAULT_PREFS.lang,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: ReaderPrefs): void {
  try {
    localStorage.setItem(PREFS_STORAGE_NAME, JSON.stringify(prefs));
  } catch {
    // 隐私模式可能禁用存储，静默降级
  }
}

function isOneOf<T>(val: unknown, list: readonly T[]): val is T {
  return list.includes(val as T);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listRecentDocs(): Promise<RecentDoc[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const items = (req.result as RecentDoc[]).sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(items.slice(0, MAX_RECENT));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveRecentDoc(doc: RecentDoc): Promise<void> {
  try {
    // 超过 2 MB 的巨型文档不写入本地缓存，避免占用空间
    if (doc.content.length > 2_000_000) return;
    const db = await openDb();
    const existing = await listRecentDocs();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(doc);

    const overflow = existing
      .filter((item) => item.id !== doc.id)
      .slice(MAX_RECENT - 1);
    for (const old of overflow) {
      store.delete(old.id);
    }
  } catch {
    // 忽略本地缓存异常
  }
}

export async function updateRecentScroll(id: string, scrollRatio: number): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result as RecentDoc | undefined;
      if (item) {
        item.scrollRatio = Math.max(0, Math.min(1, scrollRatio));
        store.put(item);
      }
    };
  } catch {
    // 忽略
  }
}

export async function clearRecentDocs(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // 忽略
  }
}

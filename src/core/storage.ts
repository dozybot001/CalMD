import { detectDefaultLang, type Lang } from './i18n';
import type { FileSystemFileHandleLike } from './files';

export type ThemeId = 'paper' | 'sepia' | 'mist' | 'ink';
export type FontId = 'serif' | 'sans' | 'mono';
export type MeasureId = 'compact' | 'narrow' | 'standard' | 'wide' | 'full';
export type LineHeightId = 'tight' | 'normal' | 'relaxed';

export interface ReaderPrefs {
  theme: ThemeId;
  font: FontId;
  fontSize: number; // 15..24
  measure: MeasureId;
  lineHeight: LineHeightId;
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
  fileHandle?: FileSystemFileHandleLike;
}

export interface ActiveSession {
  id: string;
  name: string;
  path: string;
  content: string;
  lastModified: number;
  scrollRatio: number;
  fileHandle?: FileSystemFileHandleLike;
}

const PREFS_STORAGE_NAME = 'calmd.prefs.v1';
const SESSION_SCROLL_KEY = 'calmd.session.scroll.v1';
const DB_NAME = 'calmd-local-db';
const DB_VERSION = 2;
const STORE_NAME = 'recent_docs';
const SESSION_STORE_NAME = 'active_session';
const ACTIVE_SESSION_KEY = 'current';
const MAX_RECENT = 10;

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: 'paper',
  font: 'serif',
  fontSize: 18,
  measure: 'standard',
  lineHeight: 'normal',
  focusMode: false,
  lang: detectDefaultLang(),
};

function migrateLineHeight(val: unknown): LineHeightId {
  if (isOneOf(val, ['tight', 'normal', 'relaxed'])) return val;
  if (typeof val === 'number') {
    if (val <= 1.7) return 'tight';
    if (val >= 1.95) return 'relaxed';
    return 'normal';
  }
  return DEFAULT_PREFS.lineHeight;
}

export function loadPrefs(): ReaderPrefs {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_NAME);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      theme: isOneOf(parsed.theme, ['paper', 'sepia', 'mist', 'ink'])
        ? parsed.theme
        : DEFAULT_PREFS.theme,
      font: isOneOf(parsed.font, ['serif', 'sans', 'mono']) ? parsed.font : DEFAULT_PREFS.font,
      fontSize:
        typeof parsed.fontSize === 'number'
          ? Math.min(24, Math.max(15, Math.round(parsed.fontSize)))
          : DEFAULT_PREFS.fontSize,
      measure: isOneOf(parsed.measure, ['compact', 'narrow', 'standard', 'wide', 'full'])
        ? parsed.measure
        : DEFAULT_PREFS.measure,
      lineHeight: migrateLineHeight(parsed.lineHeight),
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

function isOneOf<const T>(val: unknown, list: readonly T[]): val is T {
  return list.includes(val as T);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SESSION_STORE_NAME)) {
        db.createObjectStore(SESSION_STORE_NAME);
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
    const putRecord = (record: RecentDoc) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const existing = (getAllReq.result as RecentDoc[]).sort(
            (a, b) => b.updatedAt - a.updatedAt,
          );
          store.put(record);
          const overflow = existing
            .filter((item) => item.id !== record.id)
            .slice(MAX_RECENT - 1);
          for (const old of overflow) {
            store.delete(old.id);
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    try {
      await putRecord(doc);
    } catch {
      const { fileHandle: _ignored, ...plain } = doc;
      await putRecord(plain);
    }
  } catch {
    // 忽略本地缓存异常
  }
}

export async function updateRecentScroll(id: string, scrollRatio: number): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
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
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 忽略
  }
}

export async function clearRecentDocs(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 忽略
  }
}

export function saveSessionScroll(docId: string, scrollRatio: number): void {
  try {
    sessionStorage.setItem(
      SESSION_SCROLL_KEY,
      JSON.stringify({ id: docId, ratio: Math.max(0, Math.min(1, scrollRatio)) }),
    );
  } catch {
    // 忽略
  }
}

export function loadSessionScroll(docId: string): number | null {
  try {
    const raw = sessionStorage.getItem(SESSION_SCROLL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; ratio?: number };
    if (parsed.id === docId && typeof parsed.ratio === 'number') {
      return Math.max(0, Math.min(1, parsed.ratio));
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSessionScroll(): void {
  try {
    sessionStorage.removeItem(SESSION_SCROLL_KEY);
  } catch {
    // 忽略
  }
}

export async function saveActiveSession(session: ActiveSession): Promise<void> {
  try {
    if (session.content.length > 5_000_000) return;
    saveSessionScroll(session.id, session.scrollRatio);
    const db = await openDb();
    const putRecord = (record: ActiveSession) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(SESSION_STORE_NAME, 'readwrite');
        tx.objectStore(SESSION_STORE_NAME).put(record, ACTIVE_SESSION_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    try {
      await putRecord(session);
    } catch {
      // 某些环境无法序列化 fileHandle，降级为纯文本快照持久化
      const { fileHandle: _ignored, ...plain } = session;
      await putRecord(plain);
    }
  } catch {
    // 忽略本地会话存储异常
  }
}

export async function loadActiveSession(): Promise<ActiveSession | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(SESSION_STORE_NAME, 'readonly');
      const req = tx.objectStore(SESSION_STORE_NAME).get(ACTIVE_SESSION_KEY);
      req.onsuccess = () => resolve((req.result as ActiveSession | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearActiveSession(): Promise<void> {
  clearSessionScroll();
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SESSION_STORE_NAME, 'readwrite');
      tx.objectStore(SESSION_STORE_NAME).delete(ACTIVE_SESSION_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 忽略
  }
}

export interface FileSystemFileHandleLike {
  readonly kind: 'file';
  readonly name: string;
  getFile: () => Promise<File>;
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
}

export interface FileSystemDirectoryHandleLike {
  readonly kind: 'directory';
  readonly name: string;
  values: () => AsyncIterable<FileSystemHandleLike>;
}

export type FileSystemHandleLike = FileSystemFileHandleLike | FileSystemDirectoryHandleLike;

interface FileSystemObserverLike {
  observe: (handle: FileSystemHandleLike) => Promise<void>;
  disconnect: () => void;
}

type FileSystemObserverCtor = new (callback: () => void) => FileSystemObserverLike;

interface WindowWithFSA extends Window {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: Array<{ description?: string; accept: Record<string, string[]> }>;
  }) => Promise<FileSystemFileHandleLike[]>;
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandleLike>;
  FileSystemObserver?: FileSystemObserverCtor;
}

export type FileWithHandle = File & {
  webkitRelativePath?: string;
  __calmdHandle?: FileSystemFileHandleLike;
};

export interface LocalDoc {
  id: string;
  name: string;
  path: string;
  content: string;
  lastModified: number;
  fileHandle?: FileSystemFileHandleLike;
}

export interface DocumentBundle {
  rootName: string;
  docs: LocalDoc[];
  resolveAsset: (docPath: string, src: string) => string | undefined;
  resolveDoc: (docPath: string, href: string) => LocalDoc | undefined;
  dispose: () => void;
}

export interface FileWatcher {
  checkNow: (forceRead?: boolean) => Promise<boolean>;
  stop: () => void;
}

const MD_EXT = /\.(?:md|markdown|mdown|mkd|mdx|txt)$/i;
const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;

export function isMarkdownFileName(name: string): boolean {
  return MD_EXT.test(name);
}

/** 校验 FileSystemFileHandle 是否可直接读取（仅在用户手势下允许弹窗请求权限） */
export async function ensureHandleReadable(
  handle: FileSystemFileHandleLike,
  allowPrompt = false,
): Promise<boolean> {
  try {
    if (typeof handle.queryPermission === 'function') {
      const state = await handle.queryPermission({ mode: 'read' });
      if (state === 'granted') return true;
      if (state === 'denied') return false;
      if (allowPrompt && typeof handle.requestPermission === 'function') {
        return (await handle.requestPermission({ mode: 'read' })) === 'granted';
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** 规范化相对路径，消除 ./ 与 ../ */
export function normalizePath(path: string): string {
  const clean = path.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = clean.split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      out.pop();
    } else {
      out.push(part);
    }
  }
  return out.join('/');
}

/** 根据当前文档路径解析相对资源路径 */
export function resolveRelativePath(docPath: string, assetSrc: string): string {
  const cleanSrc = assetSrc.split('#')[0].split('?')[0];
  let decoded = cleanSrc;
  try {
    decoded = decodeURIComponent(cleanSrc);
  } catch {
    // 保留原字符串
  }

  if (decoded.startsWith('/')) {
    return normalizePath(decoded);
  }
  const dirParts = normalizePath(docPath).split('/');
  dirParts.pop(); // 去掉文件名
  return normalizePath([...dirParts, decoded].join('/'));
}

function attachMetaToFile(
  file: File,
  relPath: string,
  handle?: FileSystemFileHandleLike,
): FileWithHandle {
  const f = file as FileWithHandle;
  if (relPath && relPath !== file.name) {
    Object.defineProperty(f, 'webkitRelativePath', {
      value: relPath,
      configurable: true,
    });
  }
  if (handle) {
    f.__calmdHandle = handle;
  }
  return f;
}

async function walkDirectoryHandle(
  dir: FileSystemDirectoryHandleLike,
  prefix: string,
  out: FileWithHandle[],
): Promise<void> {
  for await (const child of dir.values()) {
    if (child.name.startsWith('.') || child.name === 'node_modules') continue;
    if (child.kind === 'file') {
      const file = await child.getFile();
      const relPath = prefix ? `${prefix}/${child.name}` : child.name;
      out.push(attachMetaToFile(file, relPath, child));
    } else if (child.kind === 'directory') {
      const nextPrefix = prefix ? `${prefix}/${child.name}` : child.name;
      await walkDirectoryHandle(child, nextPrefix, out);
    }
  }
}

/** 使用 File System Access API 选择单个本地文件（保留句柄以支持实时热更新） */
export async function pickLocalFileWithHandle(): Promise<
  'unsupported' | 'cancelled' | { file: FileWithHandle }
> {
  const w = window as WindowWithFSA;
  if (typeof w.showOpenFilePicker !== 'function') return 'unsupported';
  try {
    const [handle] = await w.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: 'Markdown',
          accept: { 'text/markdown': ['.md', '.markdown', '.mdown', '.mkd', '.mdx', '.txt'] },
        },
      ],
    });
    if (!handle) return 'cancelled';
    const file = await handle.getFile();
    return { file: attachMetaToFile(file, file.name, handle) };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

/** 使用 File System Access API 选择本地文件夹（为每篇文档保留句柄） */
export async function pickLocalFolderWithHandles(): Promise<
  'unsupported' | 'cancelled' | { files: FileWithHandle[]; rootName: string }
> {
  const w = window as WindowWithFSA;
  if (typeof w.showDirectoryPicker !== 'function') return 'unsupported';
  try {
    const dir = await w.showDirectoryPicker({ mode: 'read' });
    const files: FileWithHandle[] = [];
    await walkDirectoryHandle(dir, dir.name, files);
    return { files, rootName: dir.name };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

/** 从 FileList 构建 DocumentBundle（支持单文件、webkitdirectory 与 File System Access 句柄） */
export async function buildBundleFromFiles(
  fileList: FileList | File[],
  rootLabel?: string,
): Promise<DocumentBundle | null> {
  const files = Array.from(fileList) as FileWithHandle[];
  const docs: LocalDoc[] = [];
  const assetUrls = new Map<string, string>();
  const createdUrls: string[] = [];

  for (const file of files) {
    const relPath = normalizePath(file.webkitRelativePath || file.name);
    if (relPath.split('/').some((seg) => seg.startsWith('.') || seg === 'node_modules')) {
      continue;
    }

    if (isMarkdownFileName(file.name)) {
      const content = await file.text();
      docs.push({
        id: relPath,
        name: file.name,
        path: relPath,
        content,
        lastModified: file.lastModified || Date.now(),
        fileHandle: file.__calmdHandle,
      });
    } else if (IMAGE_EXT.test(file.name)) {
      const url = URL.createObjectURL(file);
      createdUrls.push(url);
      assetUrls.set(relPath, url);
      assetUrls.set(relPath.toLowerCase(), url);
    }
  }

  if (docs.length === 0) {
    createdUrls.forEach((u) => URL.revokeObjectURL(u));
    return null;
  }

  docs.sort((a, b) => {
    const aReadme = /^readme\.md$/i.test(a.name) ? 0 : 1;
    const bReadme = /^readme\.md$/i.test(b.name) ? 0 : 1;
    if (aReadme !== bReadme) return aReadme - bReadme;
    return a.path.localeCompare(b.path, undefined, { numeric: true });
  });

  const firstDir = docs[0].path.includes('/') ? docs[0].path.split('/')[0] : docs[0].name;

  return {
    rootName: rootLabel || firstDir,
    docs,
    resolveAsset: (docPath: string, src: string) => {
      const candidate = resolveRelativePath(docPath, src);
      if (assetUrls.has(candidate)) return assetUrls.get(candidate);
      if (assetUrls.has(candidate.toLowerCase())) return assetUrls.get(candidate.toLowerCase());

      // 去掉顶层根目录名后再试（兼容用户以仓库根目录写的路径）
      const withoutRoot = candidate.includes('/')
        ? candidate.slice(candidate.indexOf('/') + 1)
        : candidate;
      for (const [k, url] of assetUrls) {
        if (k === withoutRoot || k.endsWith('/' + withoutRoot)) {
          return url;
        }
      }
      return undefined;
    },
    resolveDoc: (docPath: string, href: string) => {
      const candidate = resolveRelativePath(docPath, href);
      const lower = candidate.toLowerCase();
      const exact = docs.find((d) => d.path === candidate || d.path.toLowerCase() === lower);
      if (exact) return exact;

      const withoutRoot = candidate.includes('/')
        ? candidate.slice(candidate.indexOf('/') + 1)
        : candidate;
      const lowerNoRoot = withoutRoot.toLowerCase();
      return docs.find(
        (d) =>
          d.path.toLowerCase() === lowerNoRoot ||
          d.path.toLowerCase().endsWith('/' + lowerNoRoot),
      );
    },
    dispose: () => {
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
      assetUrls.clear();
    },
  };
}

/** 递归读取拖拽事件中的文件与文件夹（优先获取 FileSystemHandle 以启用实时热更新） */
export async function extractFilesFromDataTransfer(dt: DataTransfer): Promise<FileWithHandle[]> {
  const items = Array.from(dt.items || []);
  const fallbackFiles = Array.from(dt.files || []) as FileWithHandle[];

  // 必须在同步事件轮次内一次性发起 getAsFileSystemHandle / webkitGetAsEntry
  const handlePromises: Array<Promise<FileSystemHandleLike | null>> = items.map((item) => {
    const extItem = item as DataTransferItem & {
      getAsFileSystemHandle?: () => Promise<FileSystemHandleLike | null>;
    };
    if (typeof extItem.getAsFileSystemHandle === 'function') {
      return extItem.getAsFileSystemHandle().catch(() => null);
    }
    return Promise.resolve(null);
  });

  const entries = items
    .map((item) =>
      typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null,
    )
    .filter((e): e is FileSystemEntry => e !== null);

  const resolvedHandles = (await Promise.all(handlePromises)).filter(
    (h): h is FileSystemHandleLike => h !== null,
  );

  if (resolvedHandles.length > 0) {
    const collected: FileWithHandle[] = [];
    for (const handle of resolvedHandles) {
      if (handle.name.startsWith('.') || handle.name === 'node_modules') continue;
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        collected.push(attachMetaToFile(file, file.name, handle));
      } else if (handle.kind === 'directory') {
        await walkDirectoryHandle(handle, handle.name, collected);
      }
    }
    if (collected.length > 0) return collected;
  }

  if (entries.length === 0) {
    return fallbackFiles;
  }

  const collected: FileWithHandle[] = [];

  async function walk(entry: FileSystemEntry, prefix: string): Promise<void> {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return;
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
      collected.push(attachMetaToFile(file, fullPath));
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const children = await readAllEntries(reader);
      const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
      for (const child of children) {
        await walk(child, nextPrefix);
      }
    }
  }

  for (const entry of entries) {
    await walk(entry, '');
  }
  return collected;
}

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) resolve(all);
          else {
            all.push(...batch);
            readBatch();
          }
        },
        reject,
      );
    };
    readBatch();
  });
}

/** 监听本地文件句柄变更：优先 FileSystemObserver，同时辅以前台轻量检测与切窗立即校验 */
export function watchLocalDoc(
  doc: LocalDoc,
  onUpdate: (content: string, lastModified: number) => void,
  pollMs = 1200,
): FileWatcher | null {
  const handle = doc.fileHandle;
  if (!handle) return null;

  let stopped = false;
  let inFlight = false;
  let lastModified = doc.lastModified;
  let lastContent = doc.content;
  let lastSize = -1;
  let observer: FileSystemObserverLike | null = null;

  const checkNow = async (forceRead = false): Promise<boolean> => {
    if (stopped || inFlight) return false;
    inFlight = true;
    try {
      const file = await handle.getFile();
      const metaChanged =
        forceRead ||
        lastSize === -1 ||
        file.lastModified !== lastModified ||
        file.size !== lastSize;

      if (!metaChanged) return false;

      const text = await file.text();
      lastModified = file.lastModified;
      lastSize = file.size;

      if (text !== lastContent) {
        lastContent = text;
        if (!stopped) {
          onUpdate(text, file.lastModified);
        }
        return true;
      }
      return false;
    } catch {
      // 编辑器原子保存替换文件瞬间可能短暂抛错，静默忽略待下次重试
      return false;
    } finally {
      inFlight = false;
    }
  };

  const ObserverCtor =
    typeof window !== 'undefined' ? (window as WindowWithFSA).FileSystemObserver : undefined;
  let observerTimer: number | null = null;
  if (typeof ObserverCtor === 'function') {
    try {
      observer = new ObserverCtor(() => {
        if (observerTimer !== null) window.clearTimeout(observerTimer);
        observerTimer = window.setTimeout(() => {
          void checkNow(true);
        }, 80);
      });
      void observer.observe(handle).catch(() => {
        observer?.disconnect();
        observer = null;
      });
    } catch {
      observer = null;
    }
  }

  // 前台轻量轮询 + 切回标签/窗口时立即检查，确保各类编辑器保存策略均可靠热更新
  const timer = window.setInterval(() => {
    if (!document.hidden) {
      void checkNow(false);
    }
  }, pollMs);

  const onFocusOrVisible = () => {
    if (!document.hidden) {
      void checkNow(true);
    }
  };
  window.addEventListener('focus', onFocusOrVisible);
  document.addEventListener('visibilitychange', onFocusOrVisible);

  return {
    checkNow,
    stop: () => {
      stopped = true;
      window.clearInterval(timer);
      if (observerTimer !== null) window.clearTimeout(observerTimer);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      observer?.disconnect();
      observer = null;
    },
  };
}

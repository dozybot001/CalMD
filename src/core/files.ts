export interface LocalDoc {
  id: string;
  name: string;
  path: string;
  content: string;
  lastModified: number;
}

export interface DocumentBundle {
  rootName: string;
  docs: LocalDoc[];
  resolveAsset: (docPath: string, src: string) => string | undefined;
  dispose: () => void;
}

const MD_EXT = /\.(?:md|markdown|mdown|mkd|mdx|txt)$/i;
const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;

export function isMarkdownFileName(name: string): boolean {
  return MD_EXT.test(name);
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

/** 从 FileList 构建 DocumentBundle（支持单文件或 webkitdirectory 文件夹） */
export async function buildBundleFromFiles(
  fileList: FileList | File[],
  rootLabel?: string,
): Promise<DocumentBundle | null> {
  const files = Array.from(fileList);
  const docs: LocalDoc[] = [];
  const assetUrls = new Map<string, string>();
  const createdUrls: string[] = [];

  for (const file of files) {
    const relPath = normalizePath(
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    );
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
    dispose: () => {
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
      assetUrls.clear();
    },
  };
}

/** 递归读取拖拽事件中的文件与文件夹 */
export async function extractFilesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const items = Array.from(dt.items || []);
  const entries = items
    .map((item) =>
      typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null,
    )
    .filter((e): e is FileSystemEntry => e !== null);

  if (entries.length === 0) {
    return Array.from(dt.files || []);
  }

  const collected: File[] = [];

  async function walk(entry: FileSystemEntry, prefix: string): Promise<void> {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return;
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
      Object.defineProperty(file, 'webkitRelativePath', {
        value: fullPath,
        configurable: true,
      });
      collected.push(file);
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

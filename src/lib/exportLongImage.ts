import { getFontEmbedCSS, toBlob } from "html-to-image";
import type { ThemeMode } from "../types";

const EXPORT_PADDING = 28;
const EXPORT_FILE_SUFFIX = "长图";
const EXPORT_IMAGE_EXTENSION = "png";
const MAX_EXPORT_PIXEL_RATIO = 2;
const MAX_EXPORT_CANVAS_DIMENSION = 16384;
const IMAGE_WAIT_TIMEOUT_MS = 4000;
const MERMAID_WAIT_TIMEOUT_MS = 4000;
const DOWNLOAD_URL_REVOKE_DELAY_MS = 1000;

type ExportLongImageOptions = {
  element: HTMLElement;
  fileName: string;
  theme: ThemeMode;
};

type ExportStage = {
  root: HTMLDivElement;
  viewport: HTMLDivElement;
  shell: HTMLDivElement;
};

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForFrames(count = 1): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await waitForNextFrame();
  }
}

async function waitForFonts(): Promise<void> {
  if (!("fonts" in document)) {
    return;
  }

  try {
    await document.fonts.ready;
  } catch {
    // ignore font readiness failures and export with currently available fonts
  }
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) {
    if (typeof image.decode === "function") {
      return image.decode().catch(() => undefined);
    }

    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(finish, IMAGE_WAIT_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeoutId);
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
    }

    function finish() {
      cleanup();
      resolve();
    }

    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });

    if (typeof image.decode === "function") {
      void image.decode().then(finish).catch(() => undefined);
    }
  });
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));

  if (images.length === 0) {
    return;
  }

  await Promise.all(
    images.map(async (image) => {
      image.loading = "eager";
      image.decoding = "sync";
      await waitForImage(image);
    }),
  );
}

async function waitForMermaid(root: HTMLElement): Promise<void> {
  const deadline = Date.now() + MERMAID_WAIT_TIMEOUT_MS;

  while (root.querySelector(".mermaid-block--loading") && Date.now() < deadline) {
    await waitForFrames(2);
  }
}

function unwrapElement(element: Element) {
  const parent = element.parentNode;

  if (!parent) {
    return;
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

function prepareCardClone(cardClone: HTMLElement) {
  cardClone.querySelectorAll(
    ".reader-toolbar, .recent-documents--mobile, .mobile-toc, .reading-progress--mobile, .notice",
  ).forEach((element) => element.remove());

  cardClone
    .querySelectorAll(".search-hit")
    .forEach((highlight) => unwrapElement(highlight));

  cardClone.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    image.loading = "eager";
    image.decoding = "sync";
  });
}

function createExportStage(
  element: HTMLElement,
  theme: ThemeMode,
): ExportStage {
  const width = Math.ceil(element.getBoundingClientRect().width);
  const exportWidth = width + EXPORT_PADDING * 2;
  const root = document.createElement("div");
  root.className = "calmmd-root calmmd-export-root";
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const viewport = document.createElement("div");
  viewport.className = "calmmd-export-viewport";
  viewport.style.width = `${exportWidth}px`;

  const shell = document.createElement("div");
  shell.className = "calmmd-export-shell";
  shell.style.width = `${exportWidth}px`;
  shell.style.padding = `${EXPORT_PADDING}px`;

  const cardClone = element.cloneNode(true) as HTMLElement;
  cardClone.style.width = `${width}px`;
  prepareCardClone(cardClone);

  shell.append(cardClone);
  viewport.append(shell);
  root.append(viewport);
  document.body.append(root);

  return {
    root,
    viewport,
    shell,
  };
}

function cleanupExportStage(stage: ExportStage) {
  stage.root.remove();
}

function createDownloadLink(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = objectUrl;
  link.style.display = "none";
  document.body.append(link);
  link.click();

  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }, DOWNLOAD_URL_REVOKE_DELAY_MS);
}

function getBaseFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "").trim();
  const normalized = (withoutExtension || "CalMD").replace(/[\\/:*?"<>|]/g, "-");
  return normalized || "CalMD";
}

function getExportFileName(baseFileName: string): string {
  return `${baseFileName}-${EXPORT_FILE_SUFFIX}.${EXPORT_IMAGE_EXTENSION}`;
}

function getSafePixelRatio(width: number, height: number): number {
  const preferredRatio = Math.min(
    MAX_EXPORT_PIXEL_RATIO,
    Math.max(1, window.devicePixelRatio || 1),
  );
  const limitingEdge = Math.max(width, height);

  if (limitingEdge <= 0) {
    return preferredRatio;
  }

  return Math.min(
    preferredRatio,
    MAX_EXPORT_CANVAS_DIMENSION / limitingEdge,
  );
}

export async function exportLongImage({
  element,
  fileName,
  theme,
}: ExportLongImageOptions) {
  await waitForFonts();
  await waitForMermaid(element);

  const stage = createExportStage(element, theme);

  try {
    await waitForFrames(2);
    await waitForFonts();
    await waitForImages(stage.root);
    await waitForFrames(1);

    const totalHeight = Math.ceil(stage.shell.getBoundingClientRect().height);

    if (totalHeight <= 0) {
      throw new Error("这份文稿还没准备好导出，等内容渲染完成后再试试。");
    }

    stage.viewport.style.height = `${totalHeight}px`;

    const backgroundColor =
      window.getComputedStyle(stage.viewport).backgroundColor || "#f8f2ea";
    let fontEmbedCSS: string | undefined;

    try {
      fontEmbedCSS = await getFontEmbedCSS(stage.viewport, {
        preferredFontFormat: "woff2",
      });
    } catch {
      fontEmbedCSS = undefined;
    }

    const exportWidth = Math.ceil(stage.viewport.getBoundingClientRect().width);
    const pixelRatio = getSafePixelRatio(exportWidth, totalHeight);
    const baseFileName = getBaseFileName(fileName);
    const blob = await toBlob(stage.viewport, {
      backgroundColor,
      cacheBust: true,
      fontEmbedCSS,
      pixelRatio,
      preferredFontFormat: "woff2",
    });

    if (!blob) {
      throw new Error("长图导出失败了，这次没能生成图片文件。");
    }

    createDownloadLink(blob, getExportFileName(baseFileName));
  } finally {
    cleanupExportStage(stage);
  }
}

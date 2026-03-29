import mermaid from "mermaid";
import type { ThemeMode } from "../types";

type MermaidTheme = "dark" | "default";

export type MermaidRenderResult = {
  svg: string;
  error: string;
};

function resolveMermaidTheme(theme: ThemeMode): MermaidTheme {
  return theme === "dark" ? "dark" : "default";
}

function configureMermaid(theme: ThemeMode) {
  mermaid.initialize({
    startOnLoad: false,
    theme: resolveMermaidTheme(theme),
    securityLevel: "strict",
    fontFamily: "inherit",
  });
}

function createMermaidRenderId(index: number): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `calmd-mermaid-${Date.now()}-${index}-${suffix}`;
}

export async function renderMermaidBlocks(
  blocks: string[],
  theme: ThemeMode,
): Promise<MermaidRenderResult[]> {
  configureMermaid(theme);

  const results: MermaidRenderResult[] = [];

  for (const [index, block] of blocks.entries()) {
    try {
      const { svg } = await mermaid.render(
        createMermaidRenderId(index),
        block.trim(),
      );

      results.push({
        svg,
        error: "",
      });
    } catch {
      results.push({
        svg: "",
        error: "图表渲染失败",
      });
    }
  }

  return results;
}

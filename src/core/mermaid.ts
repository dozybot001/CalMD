let mermaidModule: typeof import('mermaid').default | null = null;
let renderCounter = 0;
const sourceStore = new WeakMap<HTMLElement, string>();

/** 仅在文档含 Mermaid 代码块时按需动态加载并渲染 */
export async function renderMermaidBlocks(
  container: HTMLElement,
  isDark: boolean,
): Promise<void> {
  const blocks = Array.from(container.querySelectorAll<HTMLElement>('.calmd-mermaid'));
  if (blocks.length === 0) return;

  if (!mermaidModule) {
    const mod = await import('mermaid');
    mermaidModule = mod.default;
  }

  mermaidModule.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: isDark ? 'dark' : 'neutral',
    fontFamily: 'inherit',
  });

  for (const el of blocks) {
    const source =
      sourceStore.get(el) || el.querySelector('.mermaid-fallback')?.textContent?.trim();
    if (!source) continue;
    sourceStore.set(el, source);
    try {
      const id = `calmd-diagram-${++renderCounter}`;
      const { svg } = await mermaidModule.render(id, source);
      el.innerHTML = svg;
      el.classList.add('is-rendered');
    } catch {
      el.classList.add('is-error');
    }
  }
}

import type {
  HTMLAttributes,
  AnchorHTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
} from "react";
import { Children, isValidElement, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import CodeBlock from "./CodeBlock";
import MermaidBlock from "./MermaidBlock";
import { extractMermaidBlocks } from "../lib/markdown";
import { renderMermaidBlocks } from "../lib/mermaid";
import type { FocusedImage } from "../types";
import type { MermaidRenderResult } from "../lib/mermaid";
import type { ThemeMode } from "../types";

type MarkdownLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: ReactNode;
  node?: unknown;
};

type MarkdownImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  node?: unknown;
};

type MarkdownTableProps = TableHTMLAttributes<HTMLTableElement> & {
  children?: ReactNode;
  node?: unknown;
};

type MarkdownPreProps = HTMLAttributes<HTMLPreElement> & {
  children?: ReactNode;
  node?: unknown;
};

function extractNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  return Children.toArray(node)
    .map((child) => {
      if (!isValidElement(child)) {
        return "";
      }

      return extractNodeText(
        (child.props as { children?: ReactNode }).children,
      );
    })
    .join("");
}

function createMarkdownComponents(
  onOpenImage?: (image: FocusedImage) => void,
  preparedMermaidBlocks: MermaidRenderResult[] = [],
) {
  let mermaidIndex = 0;

  return {
    a: ({ href, children, ...props }: MarkdownLinkProps) => {
      const isExternal = Boolean(href?.startsWith("http"));

      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noreferrer" : undefined}
          {...props}
        >
          {children}
        </a>
      );
    },
    img: ({ alt, src, title, node: _node, ...props }: MarkdownImageProps) => {
      const resolvedSrc = typeof src === "string" ? src : "";
      const resolvedAlt = alt ?? "";
      const caption = title ?? resolvedAlt;
      const openLabel = caption
        ? `查看大图：${caption}`
        : "查看大图";

      const image = (
        <img
          loading="lazy"
          alt={resolvedAlt}
          src={resolvedSrc}
          {...props}
        />
      );

      return (
        <figure className="image-block">
          {onOpenImage && resolvedSrc ? (
            <button
              type="button"
              className="image-block__button"
              aria-label={openLabel}
              onClick={() =>
                onOpenImage({
                  src: resolvedSrc,
                  alt: resolvedAlt,
                  caption,
                })
              }
            >
              {image}
            </button>
          ) : (
            image
          )}
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      );
    },
    table: ({ children, ...props }: MarkdownTableProps) => (
      <div className="table-scroll">
        <table {...props}>{children}</table>
      </div>
    ),
    pre: ({ children, ...props }: MarkdownPreProps) => {
      const child = Children.toArray(children)[0];

      if (isValidElement(child)) {
        const childProps = child.props as {
          className?: string;
          children?: ReactNode;
        };

        const code = extractNodeText(childProps.children);
        const isMermaid = childProps.className === "language-mermaid";

        if (isMermaid) {
          const preparedMermaid = preparedMermaidBlocks[mermaidIndex];
          mermaidIndex += 1;

          return (
            <MermaidBlock
              code={code}
              svg={preparedMermaid?.svg}
              error={preparedMermaid?.error}
            />
          );
        }

        return (
          <CodeBlock
            className={childProps.className}
            code={code}
          />
        );
      }

      return <pre {...props}>{children}</pre>;
    },
  };
}

type MarkdownRendererProps = {
  markdown: string;
  theme: ThemeMode;
  onOpenImage?: (image: FocusedImage) => void;
  onReadyStateChange?: (ready: boolean) => void;
};

export default function MarkdownRenderer({
  markdown,
  theme,
  onOpenImage,
  onReadyStateChange,
}: MarkdownRendererProps) {
  const [preparedMermaidBlocks, setPreparedMermaidBlocks] = useState<MermaidRenderResult[]>(() => []);
  const [mermaidBlockCount, setMermaidBlockCount] = useState(() =>
    extractMermaidBlocks(markdown).length,
  );
  const [isPreparingMermaid, setIsPreparingMermaid] = useState(
    mermaidBlockCount > 0,
  );

  useEffect(() => {
    let cancelled = false;
    const mermaidBlocks = extractMermaidBlocks(markdown);

    setMermaidBlockCount(mermaidBlocks.length);
    setPreparedMermaidBlocks([]);

    if (mermaidBlocks.length === 0) {
      setIsPreparingMermaid(false);
      onReadyStateChange?.(true);
      return;
    }

    setIsPreparingMermaid(true);
    onReadyStateChange?.(false);

    void renderMermaidBlocks(mermaidBlocks, theme).then((results) => {
      if (cancelled) {
        return;
      }

      setPreparedMermaidBlocks(results);
      setIsPreparingMermaid(false);
      onReadyStateChange?.(true);
    });

    return () => {
      cancelled = true;
    };
  }, [markdown, onReadyStateChange, theme]);

  if (isPreparingMermaid) {
    return (
      <div
        className="article-loading"
        data-search-ignore="true"
        role="status"
        aria-live="polite"
      >
        <div className="article-loading__panel">
          <p className="article-loading__eyebrow">预渲染中</p>
          <h2 className="article-loading__title">正在准备图表</h2>
          <p className="article-loading__text">
            {mermaidBlockCount > 1
              ? `这份文稿里有 ${mermaidBlockCount} 张 Mermaid 图表。等它们一次性渲染完成后再进入阅读，会更稳定。`
              : "这份文稿里有一张 Mermaid 图表。等它渲染完成后再进入阅读，会更稳定。"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <article className="article-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSlug, rehypeKatex]}
        components={createMarkdownComponents(onOpenImage, preparedMermaidBlocks)}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}

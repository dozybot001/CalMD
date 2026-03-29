type MermaidBlockProps = {
  code: string;
  svg?: string;
  error?: string;
};

export default function MermaidBlock({
  code,
  svg = "",
  error = "",
}: MermaidBlockProps) {
  if (error) {
    return (
      <div className="mermaid-block mermaid-block--error">
        <p className="mermaid-block__error">{error}</p>
        <pre className="mermaid-block__source">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-block mermaid-block--loading">
        <span className="mermaid-block__placeholder">加载图表…</span>
      </div>
    );
  }

  return (
    <div
      className="mermaid-block"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

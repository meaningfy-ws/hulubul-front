import ReactMarkdown from "react-markdown";

export interface MarkdownTextProps {
  children: string;
  className?: string;
}

/**
 * Renders plain-text markdown (inline links, paragraphs, emphasis).
 * Used for FAQ answers, which come from Strapi's `richtext` field and
 * may contain inline links like `[Vezi harta →](#)`.
 *
 * No HTML allowed — react-markdown sanitises by default.
 */
export function MarkdownText({ children, className }: MarkdownTextProps) {
  return (
    <div className={className}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

import type { FaqSection } from "@/lib/types";
import { Reveal } from "./Reveal";
import { MarkdownText } from "./MarkdownText";
import { SplitTitle } from "./SplitTitle";

export function Faq({ data }: { data: FaqSection }) {
  return (
    <section className="faq-section">
      <Reveal>
        <div className="section-label">{data.label}</div>
        <SplitTitle
          className="site-h2"
          lead={data.titleLead}
          emphasis={data.titleEmphasis}
          trail={data.titleTrail}
        />
      </Reveal>

      <div className="faq-list">
        {data.items.map((item) => (
          <details key={item.id} className="faq-row">
            <summary>{item.question}</summary>
            <MarkdownText className="faq-answer">{item.answer}</MarkdownText>
          </details>
        ))}
      </div>
    </section>
  );
}

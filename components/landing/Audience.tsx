import type { AudienceSection } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SplitTitle } from "./SplitTitle";

export function Audience({ data }: { data: AudienceSection }) {
  return (
    <section className="site-section audience-section">
      <Reveal>
        <div className="section-label">{data.label}</div>
        <SplitTitle className="site-h2" lead={data.titleLead} emphasis={data.titleEmphasis} />
      </Reveal>

      <div className="audience-grid">
        {data.cards.map((card) => {
          const href = card.linkHref.includes("?")
            ? card.linkHref
            : `${card.linkHref}?role=${card.role}`;
          return (
            <Reveal key={card.id} className="audience-card">
              <div className="icon">{card.iconEmoji}</div>
              <SplitTitle as="h3" lead={card.titleLead} emphasis={card.titleEmphasis} />
              <p>{card.description}</p>
              <a href={href} className="audience-link" data-role={card.role}>
                {card.linkLabel}
              </a>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

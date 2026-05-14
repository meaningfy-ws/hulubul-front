import type { AudienceSection } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SplitTitle } from "./SplitTitle";

// Builds a URL that puts `?role=` BEFORE `#fragment`. CMS stores `linkHref` as
// `#signup`; naively appending `?role=expeditor` produces `#signup?role=...`
// where the query is part of the fragment and is not parsed by SignupForm
// (and the anchor jump can fail). We rewrite anchor-only hrefs to
// `/?role=X#signup` so the role query reaches `useSearchParams()`.
function buildCardHref(linkHref: string, role: string): string {
  if (linkHref.startsWith("#")) {
    const fragment = linkHref.slice(1);
    return `/?role=${role}#${fragment}`;
  }
  if (linkHref.includes("?")) return linkHref;
  const [path, hash] = linkHref.split("#");
  const base = `${path}?role=${role}`;
  return hash ? `${base}#${hash}` : base;
}

export function Audience({ data }: { data: AudienceSection }) {
  return (
    <section className="site-section audience-section">
      <Reveal>
        <div className="section-label">{data.label}</div>
        <SplitTitle className="site-h2" lead={data.titleLead} emphasis={data.titleEmphasis} />
      </Reveal>

      <div className="audience-grid">
        {data.cards.map((card) => {
          const href = buildCardHref(card.linkHref, card.role);
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

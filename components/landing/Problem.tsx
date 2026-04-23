import type { ProblemSection } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SplitTitle } from "./SplitTitle";

export function Problem({ data }: { data: ProblemSection }) {
  return (
    <div className="problem-section">
      <div className="problem-inner">
        <Reveal>
          <div className="section-label">{data.label}</div>
          <SplitTitle className="site-h2" lead={data.titleLead} emphasis={data.titleEmphasis} />
          {data.intro ? <p className="section-intro">{data.intro}</p> : null}
        </Reveal>

        <div className="problem-grid">
          {data.cards.map((card) => (
            <Reveal key={card.id} className="problem-card">
              <div className="problem-number">{card.number}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

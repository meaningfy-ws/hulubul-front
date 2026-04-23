import type { HowItWorksSection } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SplitTitle } from "./SplitTitle";

export function HowItWorks({ data }: { data: HowItWorksSection }) {
  return (
    <section className="site-section how-section">
      <Reveal>
        <div className="section-label">{data.label}</div>
        <SplitTitle className="site-h2" lead={data.titleLead} emphasis={data.titleEmphasis} />
        {data.intro ? <p className="section-intro">{data.intro}</p> : null}
      </Reveal>

      <div className="steps">
        <div className="step-line" aria-hidden="true" />
        {data.steps.map((step) => (
          <Reveal key={step.id} className="step">
            <div className="step-num">{step.number}</div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </Reveal>
        ))}
      </div>

      {data.note ? <Reveal className="how-note">{data.note}</Reveal> : null}
    </section>
  );
}

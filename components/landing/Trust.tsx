import type { TrustSection } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SplitTitle } from "./SplitTitle";

export function Trust({ data }: { data: TrustSection }) {
  return (
    <div className="trust-section">
      <div className="trust-inner">
        <Reveal>
          <div className="section-label">{data.label}</div>
          <SplitTitle className="site-h2" lead={data.titleLead} emphasis={data.titleEmphasis} />
        </Reveal>

        <div className="trust-grid">
          {data.items.map((item) => (
            <Reveal key={item.id} className="trust-item">
              <div className="trust-icon">{item.glyph}</div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

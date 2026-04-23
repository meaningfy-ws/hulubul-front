import type { HeroComponent } from "@/lib/types";
import { SplitTitle } from "./SplitTitle";

export function Hero({ data }: { data: HeroComponent }) {
  return (
    <section className="hero">
      <div className="hero-content">
        {data.eyebrow ? <div className="eyebrow">{data.eyebrow}</div> : null}
        <SplitTitle
          as="h1"
          className="hero-title"
          lead={data.titleLead}
          emphasis={data.titleEmphasis}
        />
        {data.subtitle ? <p className="hero-subtitle">{data.subtitle}</p> : null}
        <a href={data.primaryCtaHref} className="cta-primary">
          {data.primaryCtaLabel}
        </a>
        {data.socialProofText ? (
          <div className="social-proof">
            <span className="dot" />
            {data.socialProofText}
          </div>
        ) : null}
      </div>

      <Postcard data={data} />
    </section>
  );
}

function Postcard({ data }: { data: HeroComponent }) {
  return (
    <div className="postcard" aria-hidden="true">
      {data.stampGlyph || data.stampLabel ? (
        <div className="stamp">
          <div className="stamp-inner">
            {data.stampGlyph ? <div className="bird">{data.stampGlyph}</div> : null}
            {data.stampLabel ? <div className="price">{data.stampLabel}</div> : null}
          </div>
        </div>
      ) : null}

      {data.postmarkCity || data.postmarkYear || data.postmarkLabel ? (
        <div className="postmark">
          {data.postmarkCity ? <span className="postmark-text">{data.postmarkCity}</span> : null}
          {data.postmarkYear ? <span className="postmark-date">{data.postmarkYear}</span> : null}
          {data.postmarkLabel ? <span className="postmark-text">{data.postmarkLabel}</span> : null}
        </div>
      ) : null}

      <div className="postcard-content">
        {data.handwrittenLines.map((line) => (
          <div key={line.id} className="postcard-line">
            {line.text}
          </div>
        ))}

        {data.routeFromCity || data.routeToCity ? (
          <div className="postcard-route">
            <div className="city">
              {data.routeFromCity}
              {data.routeFromMeta ? <small>{data.routeFromMeta}</small> : null}
            </div>
            <div className="flight-path">
              <svg viewBox="0 0 100 20" preserveAspectRatio="none">
                <path
                  d="M 2 10 Q 50 -5, 98 10"
                  stroke="var(--stamp-red)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="3 2"
                />
                <circle cx="2" cy="10" r="2" fill="var(--stamp-red)" />
                <circle cx="98" cy="10" r="2" fill="var(--stamp-red)" />
              </svg>
            </div>
            <div className="city" style={{ textAlign: "right" }}>
              {data.routeToCity}
              {data.routeToMeta ? <small>{data.routeToMeta}</small> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

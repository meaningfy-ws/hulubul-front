import { Suspense } from "react";
import type { SignupSection } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SignupForm } from "./SignupForm";
import { SplitTitle } from "./SplitTitle";

export function Signup({ data }: { data: SignupSection }) {
  return (
    <div className="signup-section" id="signup">
      <div className="signup-inner">
        <Reveal>
          <div className="section-label">{data.label}</div>
          <SplitTitle
            className="site-h2"
            lead={data.titleLead}
            emphasis={data.titleEmphasis}
            trail={data.titleTrail}
          />
          {data.intro ? <p className="section-intro">{data.intro}</p> : null}
        </Reveal>

        <Reveal className="form-card">
          <Suspense fallback={null}>
            <SignupForm data={data} />
          </Suspense>
        </Reveal>
      </div>
    </div>
  );
}

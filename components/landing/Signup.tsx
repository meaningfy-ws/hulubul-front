import { Suspense } from "react";
import type { SignupSection } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SignupForm, type SignupFormPrefill } from "./SignupForm";
import { AuthButtons } from "./AuthButtons";
import { SplitTitle } from "./SplitTitle";
import { readServerPrefill } from "@/lib/server-prefill";

export async function Signup({ data }: { data: SignupSection }) {
  const prefill = await readServerPrefill();
  const initialPrefill: SignupFormPrefill | undefined = prefill
    ? {
        email: prefill.email,
        name: prefill.name,
        emailVerified: prefill.emailVerified,
        provider: prefill.provider,
      }
    : undefined;
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
          <AuthButtons hidden={Boolean(initialPrefill)} />
          <Suspense fallback={null}>
            <SignupForm data={data} initialPrefill={initialPrefill} />
          </Suspense>
        </Reveal>
      </div>
    </div>
  );
}

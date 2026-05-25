import { Suspense } from "react";
import type { SignupSection } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SignupForm, type SignupFormPrefill } from "./SignupForm";
import { AuthButtons } from "./AuthButtons";
import { SplitTitle } from "./SplitTitle";
import { readServerPrefill } from "@/lib/server-prefill";
import { getEnabledAuthProviders } from "@/lib/auth-env";

export async function Signup({ data }: { data: SignupSection }) {
  const prefill = await readServerPrefill();
  // Computed here (request-scoped — readServerPrefill above already forces
  // dynamic rendering via cookies()) so the env read happens at request time
  // inside the running container, not at build time when the env is empty.
  const providers = getEnabledAuthProviders();
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
          <AuthButtons
            hidden={Boolean(initialPrefill)}
            providers={providers}
          />
          <Suspense fallback={null}>
            <SignupForm data={data} initialPrefill={initialPrefill} />
          </Suspense>
        </Reveal>
      </div>
    </div>
  );
}

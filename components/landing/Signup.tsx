import { Suspense } from "react";
import { cookies } from "next/headers";
import type { SignupSection } from "@/lib/types";
import { Reveal } from "./Reveal";
import { SignupForm, type SignupFormPrefill } from "./SignupForm";
import { AuthButtons } from "./AuthButtons";
import { SplitTitle } from "./SplitTitle";
import { PREFILL_COOKIE } from "@/lib/cookies";
import { verifyPrefillCookie } from "@/lib/prefill-cookie";
import { logger } from "@/lib/logger";
import { AUTH_EVT } from "@/lib/auth-events";

async function readPrefillFromCookies(): Promise<
  SignupFormPrefill | undefined
> {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) return undefined;
  const jar = await cookies();
  const raw = jar.get(PREFILL_COOKIE)?.value;
  if (!raw) return undefined;
  try {
    const payload = await verifyPrefillCookie(raw, secret);
    logger.info("landing/Signup", AUTH_EVT.prefillConsumed);
    return {
      email: payload.email,
      name: payload.name,
      emailVerified: payload.emailVerified,
      provider: payload.provider,
    };
  } catch {
    // Tampered / expired / wrong-secret cookies are intentionally silent
    // (Stage-1 spec §3.2): no error shown, no exception bubbled — just
    // fall through to manual / remember-me.
    logger.warn("landing/Signup", AUTH_EVT.prefillInvalid);
    return undefined;
  }
}

export async function Signup({ data }: { data: SignupSection }) {
  const initialPrefill = await readPrefillFromCookies();
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
          <AuthButtons />
          <Suspense fallback={null}>
            <SignupForm data={data} initialPrefill={initialPrefill} />
          </Suspense>
        </Reveal>
      </div>
    </div>
  );
}

import type { NavComponent } from "@/lib/types";
import { Logo } from "./Logo";
import { NavCta } from "./NavCta";
import { firstNameOf, readServerPrefill } from "@/lib/server-prefill";

export async function Nav({ data }: { data: NavComponent }) {
  // Server-side read so the nav already greets the visitor on the redirect
  // from /api/auth/callback — without a reload. The client-side fallback in
  // NavCta still upgrades the label from remember-me for returning visitors
  // who didn't go through the Google round-trip on this visit.
  const prefill = await readServerPrefill();
  const prefilledFirstName = prefill ? firstNameOf(prefill.name) : null;
  return (
    <nav className="site-nav">
      <Logo data={data} />
      <NavCta
        ctaLabel={data.ctaLabel}
        ctaHref={data.ctaHref}
        prefilledFirstName={prefilledFirstName ?? undefined}
      />
    </nav>
  );
}

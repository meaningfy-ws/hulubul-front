import type { NavComponent } from "@/lib/types";
import { Logo } from "./Logo";
import { NavCta } from "./NavCta";

export function Nav({ data }: { data: NavComponent }) {
  return (
    <nav className="site-nav">
      <Logo data={data} />
      <NavCta ctaLabel={data.ctaLabel} ctaHref={data.ctaHref} />
    </nav>
  );
}

import Link from "next/link";
import type { FooterSection, NavComponent } from "@/lib/types";

type LogoData = Pick<NavComponent | FooterSection, "logoText" | "logoAccent" | "logoMark">;

export function Logo({ data }: { data: LogoData }) {
  return (
    <Link href="/" className="logo" aria-label="hulubul.com — pagina principală">
      {data.logoMark ? <span className="logo-mark">{data.logoMark}</span> : null}
      <span>
        {data.logoText}
        {data.logoAccent ? <span className="logo-accent">{data.logoAccent}</span> : null}
      </span>
    </Link>
  );
}

import type { FooterSection } from "@/lib/types";
import { buildSignature } from "@/lib/build-info";
import { Logo } from "./Logo";
import { CookiesLink } from "./CookiesLink";

/**
 * Bare anchors (`#signup`) only resolve on the landing page. Prefix `/` so
 * they keep working on `/sondaj`, `/confidentialitate`, etc. CMS values
 * are otherwise trusted verbatim — editorial corrections happen in Strapi.
 */
function normaliseHref(href: string): string {
  if (href.startsWith("#") && href.length > 1) return `/${href}`;
  return href;
}

export function Footer({ data }: { data: FooterSection }) {
  const sig = buildSignature();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo data={data} />
          {data.tagline ? <p>{data.tagline}</p> : null}
        </div>

        {data.columns.map((column) => {
          const isPlatform = column.title
            .toLowerCase()
            .startsWith("platform");
          return (
            <div key={column.id} className="footer-col">
              <h4>{column.title}</h4>
              {column.links.map((link) => (
                <a
                  key={link.id}
                  href={normaliseHref(link.href)}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                >
                  {link.label}
                </a>
              ))}
              {/*
                Survey CTA injected into the "Platformă" column until the CMS
                gains dedicated post-waitlist slots. See
                design/epic-survey/post-waitlist.md §6.
              */}
              {isPlatform ? (
                <>
                  <a href="/sondaj/expeditori">Sondaj pentru expeditori</a>
                  <a href="/doneaza">Donează</a>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="footer-bottom">
        <div>{data.copyrightText}</div>
        {data.locationLine ? <div>{data.locationLine}</div> : null}
        <div>
          <CookiesLink />
        </div>
        {sig ? (
          <div
            className="build-sig"
            title="Versiunea aplicației (commit)"
            aria-label={`Versiune build ${sig}`}
          >
            build {sig}
          </div>
        ) : null}
      </div>
    </footer>
  );
}

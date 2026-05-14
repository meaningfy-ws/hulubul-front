import type { FooterSection } from "@/lib/types";
import { Logo } from "./Logo";

// Safety net for CMS-driven footer links: when an editor leaves `href` as the
// empty fragment "#" (the Strapi default), or uses `#signup` which only works
// on the landing page, we resolve the target by label so the link always goes
// somewhere sensible. The CMS value still wins when it points at a real path.
const FOOTER_HREF_OVERRIDES: Record<string, string> = {
  "lista de așteptare": "/#signup",
  "confidențialitate": "/confidentialitate",
  "termeni": "/termeni",
};

function resolveFooterHref(label: string, href: string): string {
  const key = label.trim().toLowerCase();
  const override = FOOTER_HREF_OVERRIDES[key];
  if (override) return override;
  if (href.startsWith("#") && href.length > 1) return `/${href}`;
  return href;
}

export function Footer({ data }: { data: FooterSection }) {
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
                  href={resolveFooterHref(link.label, link.href)}
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
                <a href="/sondaj/expeditori">Sondaj pentru expeditori</a>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="footer-bottom">
        <div>{data.copyrightText}</div>
        {data.locationLine ? <div>{data.locationLine}</div> : null}
      </div>
    </footer>
  );
}

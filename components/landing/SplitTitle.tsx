import { createElement, type ReactElement } from "react";

type Tag = "h1" | "h2" | "h3";

export interface SplitTitleProps {
  lead: string;
  emphasis: string;
  trail?: string;
  as?: Tag;
  className?: string;
}

/**
 * Renders the site-wide "lead + italic tail" headline motif:
 * `<h2>Ce facem <em>diferit.</em></h2>`
 *
 * A small shared component because the pattern appears ~10 times in the
 * landing page (H1, every H2, audience and signup H3s). The CMS always
 * stores the two halves separately so editors can't accidentally merge
 * the italic and non-italic parts.
 */
export function SplitTitle({
  lead,
  emphasis,
  trail,
  as = "h2",
  className,
}: SplitTitleProps): ReactElement {
  return createElement(
    as,
    { className },
    lead,
    " ",
    <em key="em">{emphasis}</em>,
    trail,
  );
}

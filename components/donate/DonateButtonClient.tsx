"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/tracking/events";

interface DonateButtonClientProps {
  href: string;
  source: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}

/**
 * Thin client wrapper around the donate anchor. The link itself is a real
 * `<a>` (works without JS, screen-reader friendly). The only client-side
 * concern is firing `donate_click { source }` so we can see which surface
 * drives clicks. The event is gated by the consent layer downstream (see
 * `lib/tracking/events.ts`).
 */
export function DonateButtonClient({
  href,
  source,
  className,
  ariaLabel,
  children,
}: DonateButtonClientProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={ariaLabel}
      onClick={() => trackEvent("donate_click", { source })}
    >
      {children}
    </a>
  );
}

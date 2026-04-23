"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface RevealProps {
  children: ReactNode;
  as?: "div" | "section" | "article";
  className?: string;
}

/**
 * Wraps children in a `.reveal` container that gains `.visible` once
 * it scrolls into view. Mirrors the IntersectionObserver snippet from
 * the source HTML. SSR-safe: children render immediately; the fade-in
 * only runs after hydration.
 */
export function Reveal({ children, as = "div", className = "" }: RevealProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour users who prefer reduced motion.
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = as;
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${visible ? "visible" : ""} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}

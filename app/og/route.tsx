import { ImageResponse } from "next/og";

/**
 * Dynamic OG image generator. Renders a 1200×630 PNG using Next.js's
 * built-in `ImageResponse` (a thin wrapper over @vercel/og under the
 * hood). Used by editorial pages without a CMS-supplied share image.
 *
 * The route is purely query-string driven:
 *   /og?title=Despre%20proiect
 *   /og?title=Despre%20proiect&subtitle=Ce%20construim
 *
 * No fonts loaded server-side — `system-ui` is used for portability
 * (the JSX-runtime in `ImageResponse` is forgiving about fonts).
 */
export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") ?? "hulubul.com").slice(0, 120);
  const subtitle = (searchParams.get("subtitle") ?? "").slice(0, 200);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #fdf6e3 0%, #f5ead0 100%)",
          color: "#3d2814",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 56 }}>🕊️</span>
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>
            hulubul<span style={{ color: "#0f9b8e" }}>.com</span>
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                fontSize: 32,
                color: "#5b3f25",
                lineHeight: 1.3,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 22, color: "#5b3f25" }}>
          Conectăm diaspora cu transportatorii care trec prin orașul tău.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

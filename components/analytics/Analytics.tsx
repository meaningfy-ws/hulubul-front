import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";

/**
 * Renders the third-party analytics scripts (GA4, Meta Pixel, LinkedIn Insight Tag).
 *
 * Each script is gated on its env var being set — so production stays dark until the IDs
 * are configured. Once `design/spec-consent.md` ships, every script will additionally be
 * gated on the matching consent category. Until then, set IDs only on environments where
 * tracking is acceptable (staging) and leave them unset in production.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const linkedInPartnerId = process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID;

  return (
    <>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      {metaPixelId ? <MetaPixel pixelId={metaPixelId} /> : null}
      {linkedInPartnerId ? <LinkedInInsight partnerId={linkedInPartnerId} /> : null}
    </>
  );
}

function MetaPixel({ pixelId }: { pixelId: string }) {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

function LinkedInInsight({ partnerId }: { partnerId: string }) {
  return (
    <>
      <Script id="linkedin-insight" strategy="afterInteractive">
        {`_linkedin_partner_id = "${partnerId}";
          window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
          window._linkedin_data_partner_ids.push(_linkedin_partner_id);
          (function(l) {
            if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
            window.lintrk.q=[]}
            var s = document.getElementsByTagName("script")[0];
            var b = document.createElement("script");
            b.type = "text/javascript";b.async = true;
            b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
            s.parentNode.insertBefore(b, s);
          })(window.lintrk);`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://px.ads.linkedin.com/collect/?pid=${partnerId}&fmt=gif`}
        />
      </noscript>
    </>
  );
}

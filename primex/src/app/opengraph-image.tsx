import { ImageResponse } from "next/og";

// Dynamic OpenGraph / Twitter card for public link previews (SEC-151).
// Inherited by all routes under app/ (Twitter falls back to og:image since
// twitter.card = summary_large_image in the root layout). Rendered with the
// ImageResponse default font — no external asset or font fetch needed.

export const alt =
  "Primex Security System — AI-Powered Security Monitoring & Dispatch";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0B1220";
const BLUE = "#1E5BFF";
const MUTED = "#94A3B8";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: NAVY,
          backgroundImage: `radial-gradient(1000px 500px at 80% -10%, rgba(30,91,255,0.28), transparent 60%)`,
        }}
      >
        {/* Logo lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "84px",
              height: "84px",
              borderRadius: "20px",
              backgroundColor: BLUE,
            }}
          >
            <svg width="46" height="46" viewBox="0 0 24 24" fill="#FFFFFF">
              <path d="M12 2 4 5v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V5l-8-3z" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{ fontSize: "40px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}
            >
              Primex
            </span>
            <span
              style={{
                fontSize: "17px",
                fontWeight: 600,
                color: MUTED,
                letterSpacing: "6px",
                marginTop: "6px",
              }}
            >
              SECURITY SYSTEM
            </span>
          </div>
        </div>

        {/* Headline + tagline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", width: "72px", height: "6px", borderRadius: "3px", backgroundColor: BLUE, marginBottom: "28px" }} />
          <span
            style={{
              fontSize: "68px",
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.05,
              maxWidth: "980px",
            }}
          >
            AI-Powered Security Monitoring &amp; Dispatch
          </span>
          <span style={{ fontSize: "28px", color: MUTED, marginTop: "26px" }}>
            24/7 live camera monitoring · instant threat detection · rapid guard dispatch
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}

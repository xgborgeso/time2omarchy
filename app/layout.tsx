import type { Metadata, Viewport } from "next"
import "@/index.css"
import { Inter } from "next/font/google"
import Script from "next/script"
import { DATAFAST_DOMAIN, DATAFAST_SITE_ID } from "@/lib/links"
import { cn } from "@/lib/utils"
import { Providers } from "./providers"

/**
 * Development traffic is not traffic.
 *
 * A dev server hitting the same site id would put every hot reload in the
 * dashboard. Note this is also true of a local `next start`, which sets
 * NODE_ENV to production — deliberate, since that build is what gets deployed
 * and gating on anything more specific means a flag that can be wrong.
 */
const TRACKING = process.env.NODE_ENV === "production"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const TITLE = "time2omarchy — fastest Omarchy installs"
const DESCRIPTION =
  "Public leaderboard of the fastest Omarchy installs. Community project, not affiliated with Omarchy or DHH."
const SITE = "https://time2omarchy.com"

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "time2omarchy",
    title: TITLE,
    description: "A single-page leaderboard of the fastest Omarchy installs.",
    url: "/",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: "A single-page leaderboard of the fastest Omarchy installs.",
    images: ["/og.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#1a1b26",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark", "font-sans", inter.variable)}>
      <body>
        <Providers>{children}</Providers>
        {/*
          The cookieless build, on purpose. It costs multi-day journeys and
          returning-visitor breakdowns, which this site has no use for, and in
          exchange no consent banner is needed to run it.

          `afterInteractive` rather than `beforeInteractive`: nothing on the
          page waits for this, and an analytics script that blocks first paint
          is measuring a page it made slower. No `defer` alongside it — the
          element is injected after load, and defer does nothing on a script
          added that way.
        */}
        {TRACKING ? (
          <Script
            strategy="afterInteractive"
            src="https://datafa.st/js/script.cookieless.js"
            data-website-id={DATAFAST_SITE_ID}
            data-domain={DATAFAST_DOMAIN}
          />
        ) : null}
      </body>
    </html>
  )
}

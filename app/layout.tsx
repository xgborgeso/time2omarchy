import type { Metadata, Viewport } from "next"
import "@/index.css"
import { Providers } from "./providers"

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
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

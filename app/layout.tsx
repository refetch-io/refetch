import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { AuthProvider } from "@/contexts/auth-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "Refetch",
  description: "Refetch is an open-source alternative to Hacker News, featuring curated tech news, discussions, and community-driven content. Discover the latest in technology, startups, and innovation.",
  generator: "eldadfux",
  keywords: "tech news, hacker news alternative, technology, startups, programming, open source",
  openGraph: {
    title: "Refetch - Open Source Hacker News Alternative",
    description: "Discover curated tech news, discussions, and community-driven content on Refetch, the open-source alternative to Hacker News.",
    type: "website",
    url: "https://refetch.io",
    images: [
      {
        url: "https://refetch.io/og.png",
        width: 1200,
        height: 630,
        alt: "Refetch - Tech news and discussions",
      },
    ],
    siteName: "Refetch",
  },
  twitter: {
    card: "summary_large_image",
    title: "Refetch - Open Source Hacker News Alternative",
    description: "Discover curated tech news, discussions, and community-driven content on Refetch, the open-source alternative to Hacker News.",
    images: ["https://refetch.io/og.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <title>Refetch</title>
        <link rel="icon" href="/favicon.png" />
        <script defer data-domain="refetch.io" src="https://plausible.io/js/script.js"></script>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className="bg-gray-100">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

import { ClientPage } from "../client-page"
import { MinesClientWrapper } from "./mines-client-wrapper"
import type { Metadata } from "next"

// Disable cache completely - fetch fresh data on every request
export const revalidate = 0

export const metadata: Metadata = {
  title: "My Posts - Refetch",
  description: "View your submitted posts on Refetch - track your contributions to the tech community and manage your submissions.",
  openGraph: {
    title: "My Posts - Refetch",
    description: "View your submitted posts on Refetch - track your contributions to the tech community and manage your submissions.",
    type: "website",
    url: "https://refetch.io/mines",
    images: [
      {
        url: "https://refetch.io/og.png",
        width: 1200,
        height: 630,
        alt: "My Posts - Refetch",
      },
    ],
    siteName: "Refetch",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Posts - Refetch",
    description: "View your submitted posts on Refetch - track your contributions to the Refetch community and manage your submissions.",
    images: ["https://refetch.io/og.png"],
  },
}

export default async function MinesPage() {
  return <MinesClientWrapper />
}

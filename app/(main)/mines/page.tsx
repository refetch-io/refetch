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
  },
}

export default async function MinesPage() {
  return <MinesClientWrapper />
}

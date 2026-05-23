import type { CSSProperties } from "react"

/**
 * Avatar colors harmonized with brand violet (#6134d8, ~oklch hue 296).
 * Kept at similar lightness/chroma for even contrast with white initials.
 */
const AVATAR_PALETTE = [
  { backgroundColor: "oklch(0.52 0.22 296)", color: "oklch(0.99 0 0)" },
  { backgroundColor: "oklch(0.50 0.20 276)", color: "oklch(0.99 0 0)" },
  { backgroundColor: "oklch(0.54 0.19 316)", color: "oklch(0.99 0 0)" },
  { backgroundColor: "oklch(0.48 0.17 256)", color: "oklch(0.99 0 0)" },
  { backgroundColor: "oklch(0.52 0.14 210)", color: "oklch(0.99 0 0)" },
  { backgroundColor: "oklch(0.56 0.16 340)", color: "oklch(0.99 0 0)" },
  { backgroundColor: "oklch(0.50 0.15 165)", color: "oklch(0.99 0 0)" },
  { backgroundColor: "oklch(0.55 0.14 35)", color: "oklch(0.99 0 0)" },
] as const

export type AvatarAppearance = {
  initials: string
  backgroundColor: string
  color: string
}

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Derives 1–2 display initials from a name, handle, or community slug. */
export function getAvatarInitials(value: string, maxLength = 2): string {
  const trimmed = value.trim()
  if (!trimmed) return "?"

  if (trimmed.length === 1) {
    return trimmed.toUpperCase()
  }

  const withoutPrefix = trimmed.replace(/^[@#]/, "")

  const communityMatch = withoutPrefix.match(/^r\/?(.*)$/i)
  if (communityMatch) {
    const slug = communityMatch[1]?.trim() || withoutPrefix
    return slug.charAt(0).toUpperCase() || "?"
  }

  const userMatch = withoutPrefix.match(/^u\/?(.*)$/i)
  if (userMatch) {
    const handle = userMatch[1]?.trim() || withoutPrefix
    return handle.charAt(0).toUpperCase() || "?"
  }

  const words = withoutPrefix.split(/[\s._-]+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
  }

  return withoutPrefix.slice(0, maxLength).toUpperCase()
}

/** Stable brand-aligned colors for a given seed (name, handle, community, domain, etc.). */
export function getAvatarAppearance(
  seed: string,
  options?: { maxInitials?: number },
): AvatarAppearance {
  const normalized = seed.trim().toLowerCase() || "?"
  const index = hashSeed(normalized) % AVATAR_PALETTE.length
  const palette = AVATAR_PALETTE[index]

  return {
    initials: getAvatarInitials(seed, options?.maxInitials ?? 2),
    backgroundColor: palette.backgroundColor,
    color: palette.color,
  }
}

export function getAvatarInlineStyle(
  seed: string,
  options?: { maxInitials?: number },
): CSSProperties {
  const { backgroundColor, color } = getAvatarAppearance(seed, options)
  return { backgroundColor, color }
}

import type { PersonSummary } from './types'

/*
 * @mentions. Comments keep plain text ("thanks @Ada Lovelace") plus the IDs of
 * the people mentioned, so names read naturally everywhere (emails, search
 * results) and the thread links them. Names can contain spaces, so the
 * composer resolves who is meant when you pick someone from the list.
 */

/** Most people one comment can mention (and notify). */
export const MAX_MENTIONS = 10
/** Longest text after `@` still treated as a name being typed. */
const MAX_QUERY = 40
/** Names have a few words at most; more spaces means you've moved on. */
const MAX_QUERY_SPACES = 2

/** Characters that can sit right before a mention (start of text, space, opening punctuation). */
const BEFORE = /[\s([{"'“‘]/u

export interface MentionQuery {
  /** Index of the `@`. */
  start: number
  /** What's typed after it so far. */
  query: string
}

/** The mention being typed at the caret, if any. */
export function mentionQueryAt(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, caret)
  const at = before.lastIndexOf('@')
  if (at < 0) return null
  if (at > 0 && !BEFORE.test(before[at - 1])) return null
  const query = before.slice(at + 1)
  if (query.length > MAX_QUERY || /[\n@]/.test(query) || query.startsWith(' ')) return null
  if ((query.match(/ /g)?.length ?? 0) > MAX_QUERY_SPACES) return null
  return { start: at, query }
}

/** Replace the typed `@que` with `@Name ` and put the caret after it. */
export function insertMention(
  text: string,
  mention: MentionQuery,
  caret: number,
  name: string,
): { text: string; caret: number } {
  const inserted = `@${name} `
  const rest = text.slice(caret).replace(/^ /, '')
  return { text: text.slice(0, mention.start) + inserted + rest, caret: mention.start + inserted.length }
}

/** Whether `query` matches the start of the name or of any word in it. */
export function nameMatches(name: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const lower = name.toLowerCase()
  return lower.startsWith(q) || lower.split(/\s+/).some((word) => word.startsWith(q))
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Matches `@Name` for any of the people, longest names first, as whole names only. */
function mentionPattern(people: ReadonlyArray<PersonSummary>): RegExp | null {
  const names = [...new Set(people.map((person) => person.name.trim()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  )
  if (names.length === 0) return null
  return new RegExp(`(?<![\\p{L}\\p{N}_@.])@(${names.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}_])`, 'giu')
}

/** People from `candidates` whose `@Name` appears in the text (each once, at most MAX_MENTIONS). */
export function presentMentions(
  text: string,
  candidates: ReadonlyArray<PersonSummary>,
): Array<PersonSummary> {
  const pattern = mentionPattern(candidates)
  if (!pattern) return []
  const found = new Set<string>()
  for (const match of text.matchAll(pattern)) found.add(match[1].toLowerCase())
  const seen = new Set<string>()
  const out: Array<PersonSummary> = []
  for (const person of candidates) {
    if (seen.has(person.id) || !found.has(person.name.trim().toLowerCase())) continue
    seen.add(person.id)
    out.push(person)
    if (out.length >= MAX_MENTIONS) break
  }
  return out
}

export type MentionSegment = { text: string } | { text: string; person: PersonSummary }

/** Split text into plain runs and `@Name` mentions of the given people. */
export function splitMentions(text: string, people: ReadonlyArray<PersonSummary>): Array<MentionSegment> {
  const pattern = mentionPattern(people)
  if (!pattern) return [{ text }]
  const byName = new Map(people.map((person) => [person.name.trim().toLowerCase(), person]))
  const segments: Array<MentionSegment> = []
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    const person = byName.get(match[1].toLowerCase())
    if (!person) continue
    if (index > cursor) segments.push({ text: text.slice(cursor, index) })
    segments.push({ text: match[0], person })
    cursor = index + match[0].length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}

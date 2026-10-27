import type { ResourceType } from './types'

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or self-promotion' },
  { value: 'offtopic', label: 'Off-topic for Refetch' },
  { value: 'abuse', label: 'Harassment or hate' },
  { value: 'misleading', label: 'Misleading or clickbait' },
  { value: 'other', label: 'Something else' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['value']

export const REPORT_REASON_VALUES = REPORT_REASONS.map((reason) => reason.value) as [
  ReportReason,
  ...Array<ReportReason>,
]

export function reportReasonLabel(reason: string): string {
  return REPORT_REASONS.find((option) => option.value === reason)?.label ?? 'Something else'
}

export const REPORT_NOTE_MAX = 500

/** A reported story or comment with its open reports rolled up, for the moderation queue. */
export interface ModerationItem {
  resourceType: ResourceType
  resourceId: string
  /** The story (itself, or the one a comment belongs to); null once deleted. */
  postId: string | null
  postTitle: string | null
  /** Comment text, or the story's link. */
  body: string | null
  author: { id: string; name: string } | null
  createdAt: string | null
  /** False when the content was already deleted. */
  exists: boolean
  reasons: Array<{ reason: ReportReason; count: number }>
  notes: Array<string>
  reportCount: number
  lastReportedAt: string
}

/** Roll individual reports up per resource, most reported first. */
export function groupReports(
  reports: Array<{
    resourceType: ResourceType
    resourceId: string
    postId: string | null
    reason: string
    note: string
    createdAt: string
  }>,
): Array<
  Pick<
    ModerationItem,
    'resourceType' | 'resourceId' | 'postId' | 'reasons' | 'notes' | 'reportCount' | 'lastReportedAt'
  >
> {
  const groups = new Map<
    string,
    {
      resourceType: ResourceType
      resourceId: string
      postId: string | null
      reasons: Map<ReportReason, number>
      notes: Array<string>
      reportCount: number
      lastReportedAt: string
    }
  >()
  for (const report of reports) {
    const key = `${report.resourceType}:${report.resourceId}`
    let group = groups.get(key)
    if (!group) {
      group = {
        resourceType: report.resourceType,
        resourceId: report.resourceId,
        postId: report.postId,
        reasons: new Map(),
        notes: [],
        reportCount: 0,
        lastReportedAt: report.createdAt,
      }
      groups.set(key, group)
    }
    const reason = (REPORT_REASON_VALUES as Array<string>).includes(report.reason)
      ? (report.reason as ReportReason)
      : 'other'
    group.reasons.set(reason, (group.reasons.get(reason) ?? 0) + 1)
    if (report.note.trim()) group.notes.push(report.note.trim())
    group.reportCount++
    if (report.createdAt > group.lastReportedAt) group.lastReportedAt = report.createdAt
    group.postId ??= report.postId
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      reasons: [...group.reasons]
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.reportCount - a.reportCount || b.lastReportedAt.localeCompare(a.lastReportedAt))
}

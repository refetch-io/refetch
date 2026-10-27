import { describe, expect, it } from 'vitest'
import { groupReports, reportReasonLabel } from './reports'

const base = { resourceType: 'comment' as const, postId: 'p1', note: '' }

describe('groupReports', () => {
  it('rolls reports up per item, most reported first, with reason counts', () => {
    const groups = groupReports([
      { ...base, resourceId: 'c1', reason: 'spam', createdAt: '2026-01-01T00:00:01Z' },
      { ...base, resourceId: 'c2', reason: 'abuse', createdAt: '2026-01-01T00:00:02Z', note: ' rude ' },
      { ...base, resourceId: 'c2', reason: 'abuse', createdAt: '2026-01-01T00:00:03Z' },
      { ...base, resourceId: 'c2', reason: 'spam', createdAt: '2026-01-01T00:00:04Z' },
    ])
    expect(groups.map((group) => group.resourceId)).toEqual(['c2', 'c1'])
    expect(groups[0]).toMatchObject({
      reportCount: 3,
      lastReportedAt: '2026-01-01T00:00:04Z',
      notes: ['rude'],
      reasons: [
        { reason: 'abuse', count: 2 },
        { reason: 'spam', count: 1 },
      ],
    })
  })

  it('keeps stories and comments with the same id apart, and files unknown reasons as other', () => {
    const groups = groupReports([
      { ...base, resourceId: 'x', reason: 'spam', createdAt: '2026-01-01T00:00:01Z' },
      {
        ...base,
        resourceType: 'post',
        resourceId: 'x',
        reason: 'nonsense',
        createdAt: '2026-01-01T00:00:02Z',
      },
    ])
    expect(groups).toHaveLength(2)
    expect(groups.find((group) => group.resourceType === 'post')?.reasons).toEqual([
      { reason: 'other', count: 1 },
    ])
  })
})

describe('reportReasonLabel', () => {
  it('names known reasons and falls back for unknown ones', () => {
    expect(reportReasonLabel('spam')).toBe('Spam or self-promotion')
    expect(reportReasonLabel('???')).toBe('Something else')
  })
})

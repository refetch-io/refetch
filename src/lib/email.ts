/** Plain, table-free HTML email that renders well in every client. */

const BRAND = '#4e1cb3'
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Why the email came, then its links (Unsubscribe first, so it's easy to find). */
function footer(reason: string, links: Array<{ label: string; url: string }>): string {
  const items = links
    .map(
      (link) =>
        `<a href="${escapeHtml(link.url)}" style="color:#6e6e73;text-decoration:underline">${escapeHtml(link.label)}</a>`,
    )
    .join(' &nbsp;·&nbsp; ')
  return `<p style="max-width:560px;margin:16px auto 0;text-align:center;font-size:12px;line-height:1.6;color:#86868b">${escapeHtml(reason)}<br>${items}</p>`
}

function page(body: string, after: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px 12px;background:#f5f5f7;font-family:${FONT}">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
${body}
</div>
${after}
</body></html>`
}

export interface NotificationEmail {
  /** One sentence, also used as the subject. */
  headline: string
  /** Comment excerpt shown as a quote. */
  quote?: string
  /** Absolute link to what happened. */
  url: string
  /** Label of the button. */
  action: string
  /** Absolute link to email settings. */
  settingsUrl: string
  /** One-click link that turns these emails off. */
  unsubscribeUrl: string
}

export function renderNotificationEmail(email: NotificationEmail): string {
  const quote = email.quote
    ? `<p style="margin:16px 0 0;padding:12px 14px;border-left:3px solid ${BRAND};background:#f5f5f7;border-radius:8px;color:#3a3a3c;font-size:15px;line-height:1.5">${escapeHtml(email.quote)}</p>`
    : ''
  return page(
    `<p style="margin:0 0 20px;font-size:17px;font-weight:700;color:${BRAND}">Refetch</p>
<p style="margin:0;font-size:17px;line-height:1.45;color:#1d1d1f;font-weight:600">${escapeHtml(email.headline)}</p>
${quote}
<p style="margin:24px 0 0"><a href="${escapeHtml(email.url)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:10px 18px;border-radius:999px">${escapeHtml(email.action)}</a></p>`,
    footer(
      'You get these emails when people reply to you, mention you, comment on your stories or follow you.',
      [
        { label: 'Unsubscribe', url: email.unsubscribeUrl },
        { label: 'Email settings', url: email.settingsUrl },
      ],
    ),
  )
}

/* ──────────────────────────────── Digest ──────────────────────────────── */

export interface DigestStory {
  title: string
  /** The discussion on Refetch. */
  threadUrl: string
  /** The article, when the story links out. */
  articleUrl: string | null
  domain: string | null
  summary: string
  points: number
  comments: number
}

export interface DigestEmail {
  frequency: 'daily' | 'weekly'
  /** "Monday, November 2", shown under the title. */
  dateLabel: string
  /** From the person's channels and the people they follow. */
  forYou: Array<DigestStory>
  top: Array<DigestStory>
  siteUrl: string
  settingsUrl: string
  unsubscribeUrl: string
  /** Switch daily ⇄ weekly in one click (the settings page, preselected). */
  switchUrl: string
}

function plural(count: number, word: string) {
  return `${count} ${count === 1 ? word : `${word}s`}`
}

function storyHtml(story: DigestStory, rank: number): string {
  const summary = story.summary
    ? `<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#3a3a3c">${escapeHtml(story.summary.length > 260 ? `${story.summary.slice(0, 257).trimEnd()}…` : story.summary)}</p>`
    : ''
  const meta = [
    story.domain ? escapeHtml(story.domain) : null,
    plural(story.points, 'point'),
    `<a href="${escapeHtml(story.threadUrl)}" style="color:${BRAND};text-decoration:none;font-weight:600">${plural(story.comments, 'comment')}</a>`,
    story.articleUrl
      ? `<a href="${escapeHtml(story.articleUrl)}" style="color:#6e6e73;text-decoration:underline">Read article</a>`
      : null,
  ]
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ')
  return `<div style="padding:14px 0;border-top:1px solid #e5e5ea">
<p style="margin:0;font-size:16px;line-height:1.35;font-weight:600"><span style="color:#aeaeb2;font-weight:600;margin-right:6px">${rank}</span><a href="${escapeHtml(story.threadUrl)}" style="color:#1d1d1f;text-decoration:none">${escapeHtml(story.title)}</a></p>
${summary}
<p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:#86868b">${meta}</p>
</div>`
}

function section(title: string, stories: Array<DigestStory>, start: number): string {
  if (stories.length === 0) return ''
  return `<p style="margin:24px 0 2px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#86868b">${escapeHtml(title)}</p>
${stories.map((story, i) => storyHtml(story, start + i)).join('\n')}`
}

/** Subject line: the lead story, so the inbox shows what's inside. */
export function digestSubject(email: Pick<DigestEmail, 'frequency' | 'forYou' | 'top'>): string {
  const lead = email.top[0] ?? email.forYou[0]
  const prefix = email.frequency === 'daily' ? 'Today on Refetch' : 'This week on Refetch'
  return lead ? `${prefix}: ${lead.title}` : prefix
}

export function renderDigestEmail(email: DigestEmail): string {
  const daily = email.frequency === 'daily'
  const heading = daily ? 'Your daily Refetch' : 'Your week on Refetch'
  const intro = daily
    ? 'The stories people upvoted and talked about most in the last 24 hours.'
    : 'The most upvoted and discussed stories of the past seven days.'
  return page(
    `<p style="margin:0;font-size:17px;font-weight:700;color:${BRAND}">Refetch</p>
<p style="margin:16px 0 0;font-size:22px;line-height:1.25;font-weight:700;color:#1d1d1f">${heading}</p>
<p style="margin:4px 0 0;font-size:14px;line-height:1.5;color:#6e6e73">${escapeHtml(email.dateLabel)} · ${intro}</p>
${section('For you', email.forYou, 1)}
${section(email.forYou.length > 0 ? 'Top stories' : daily ? 'Today’s top stories' : 'This week’s top stories', email.top, email.forYou.length + 1)}
<p style="margin:24px 0 0"><a href="${escapeHtml(email.siteUrl)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:10px 18px;border-radius:999px">See more on Refetch</a></p>`,
    footer(
      daily
        ? 'You get the daily digest because you chose it in your Refetch settings.'
        : 'You get the weekly digest because you have a Refetch account.',
      [
        { label: 'Unsubscribe', url: email.unsubscribeUrl },
        { label: daily ? 'Switch to weekly' : 'Switch to daily', url: email.switchUrl },
        { label: 'Email settings', url: email.settingsUrl },
      ],
    ),
  )
}

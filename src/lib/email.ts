/** Plain, table-free HTML email that renders well in every client. */

const BRAND = '#4e1cb3'

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
  /** Absolute link to notification settings. */
  settingsUrl: string
}

export function renderNotificationEmail(email: NotificationEmail): string {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
  const quote = email.quote
    ? `<p style="margin:16px 0 0;padding:12px 14px;border-left:3px solid ${BRAND};background:#f5f5f7;border-radius:8px;color:#3a3a3c;font-size:15px;line-height:1.5">${escapeHtml(email.quote)}</p>`
    : ''
  return `<!doctype html>
<html><body style="margin:0;padding:24px 12px;background:#f5f5f7;font-family:${font}">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
<p style="margin:0 0 20px;font-size:17px;font-weight:700;color:${BRAND}">Refetch</p>
<p style="margin:0;font-size:17px;line-height:1.45;color:#1d1d1f;font-weight:600">${escapeHtml(email.headline)}</p>
${quote}
<p style="margin:24px 0 0"><a href="${escapeHtml(email.url)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:10px 18px;border-radius:999px">${escapeHtml(email.action)}</a></p>
</div>
<p style="max-width:520px;margin:16px auto 0;text-align:center;font-size:12px;line-height:1.5;color:#86868b">You get these emails because you have a Refetch account. <a href="${escapeHtml(email.settingsUrl)}" style="color:#86868b">Turn them off</a>.</p>
</body></html>`
}

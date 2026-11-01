/**
 * Digest: every hour, asks the Refetch site to send the email digests that are
 * due (`POST /api/digest`). The site does the work: it picks the stories, applies
 * each reader's mutes, renders the email and sends it with Appwrite Messaging,
 * then schedules that reader's next digest (8 AM in their time zone, daily or
 * on Mondays). A response with `more: true` means the site ran out of time with
 * readers still due, so we call again.
 */

/** Calls per run; each one sends for up to ~25 seconds. */
const MAX_CALLS = 20;
const TIMEOUT_MS = 60_000;

function env(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

export default async function ({ res, log, error }) {
  const site = env('SITE_URL', 'NEXT_PUBLIC_BASE_URL', 'APP_BASE_URL').replace(/\/+$/, '');
  const secret = env('DIGEST_SECRET');
  if (!site || !secret) {
    error('Missing configuration: set SITE_URL and DIGEST_SECRET (the same secret the site has).');
    return res.json({ ok: false, error: 'Missing configuration' }, 500);
  }

  const totals = { sent: 0, scheduled: 0, skipped: 0, failed: 0 };
  for (let call = 1; call <= MAX_CALLS; call++) {
    let response;
    try {
      response = await fetch(`${site}/api/digest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      error(`Call ${call} failed: ${err.message}`);
      return res.json({ ok: false, error: err.message, ...totals }, 502);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      error(`Call ${call}: HTTP ${response.status} ${body.slice(0, 300)}`);
      return res.json({ ok: false, status: response.status, ...totals }, 502);
    }
    const run = await response.json();
    for (const key of Object.keys(totals)) totals[key] += Number(run[key] ?? 0);
    log(`Call ${call}: sent ${run.sent}, scheduled ${run.scheduled}, skipped ${run.skipped}, failed ${run.failed}`);
    if (!run.more) break;
  }
  return res.json({ ok: true, ...totals });
}

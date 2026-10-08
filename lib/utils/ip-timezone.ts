/**
 * IP-Based Timezone Utility
 *
 * Resolves IANA timezone strings from IP addresses using ipapi.co (free, no API key needed).
 * Falls back to 'UTC' on any error. All lookups are cached for 30 minutes to avoid
 * hammering the external API for repeated requests from the same IP.
 *
 * Usage:
 *   const tz = await getTimezoneFromIp(ip);         // → e.g. "Asia/Kolkata"
 *   const nowInTz = getNowInTimezone(tz);           // → current Date in that timezone context
 *   const endOfDayInTz = getEndOfDayInTimezone(tz); // → midnight tonight in that timezone (ms)
 *   const label = formatUtcInTimezone(isoStr, tz);  // → "05 Oct 2026, 4:31 PM IST"
 */

const TZ_CACHE = new Map<string, { timezone: string; cachedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^::1$/,
  /^localhost$/i,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((re) => re.test(ip));
}

/**
 * Resolve IANA timezone from an IP address.
 * Returns 'UTC' if resolution fails or IP is private/local.
 */
export async function getTimezoneFromIp(ip?: string): Promise<string> {
  if (!ip || ip === 'Unknown IP' || isPrivateIp(ip)) {
    return 'UTC';
  }

  const cached = TZ_CACHE.get(ip);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.timezone;
  }

  try {
    // ipapi.co — free tier: 1,000 requests/day, no key needed
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { 'User-Agent': 'QuoteFlow/1.0' },
      signal: AbortSignal.timeout(3000), // 3-second timeout
    });

    if (!res.ok) throw new Error(`ipapi.co returned ${res.status}`);

    const data = await res.json();
    const timezone: string = data?.timezone && typeof data.timezone === 'string'
      ? data.timezone
      : 'UTC';

    TZ_CACHE.set(ip, { timezone, cachedAt: Date.now() });
    return timezone;
  } catch {
    // Silent fallback — never throw; simply use UTC
    return 'UTC';
  }
}

/**
 * Return a Date object representing "now" — the actual moment in time is the same
 * regardless of timezone, but this is useful for extracting local calendar fields.
 */
export function getNowInTimezone(_timezone: string): Date {
  // JavaScript Date is always UTC internally. The timezone only affects formatting.
  // We return a plain Date; callers use Intl.DateTimeFormat for local fields.
  return new Date();
}

/**
 * Returns the Unix timestamp (ms) for the END of today in the given timezone.
 * "End of day" = 23:59:59.999 in the user's local date.
 * Used for computing days-remaining so a trial that ends "today" in IST isn't
 * already expired at UTC midnight.
 */
export function getEndOfDayInTimezone(timezone: string): number {
  const now = new Date();

  // Get local date parts in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // en-CA gives YYYY-MM-DD format
  const localDateStr = formatter.format(now); // e.g. "2026-10-05"
  const [year, month, day] = localDateStr.split('-').map(Number);

  // Construct end-of-day in that timezone by building the next midnight and subtracting 1ms
  // We use Temporal-like trick: create the next-day midnight in the timezone
  const nextDayMidnightUtc = Date.UTC(year, month - 1, day + 1); // naive UTC for date arithmetic
  // Adjust for timezone offset: get the offset in minutes at this moment
  const utcDateStr = now.toISOString().slice(0, 10); // "2026-10-05"
  const localDate = localDateStr;

  // If local date is the same as UTC date, offset is positive (east) or negative (west)
  // We reconstruct local end-of-day by getting local midnight and adding 24h
  const endOfDayMs = getLocalMidnightMs(year, month, day, timezone) + 24 * 60 * 60 * 1000 - 1;
  return endOfDayMs;
}

/**
 * Returns Unix ms for local midnight (start of day) in the given timezone for a given Y/M/D.
 */
function getLocalMidnightMs(year: number, month: number, day: number, timezone: string): number {
  // Use Intl to find the UTC equivalent of midnight in this timezone
  // Strategy: binary search / offset probe
  // Simple approach: construct an approximate ms then refine with offset
  const approxUtcMs = Date.UTC(year, month - 1, day);

  // Get what local date/time that UTC ms maps to in the timezone
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = tzFormatter.formatToParts(new Date(approxUtcMs));
  const getPart = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || '0');
  const localHour = getPart('hour');
  const localMinute = getPart('minute');
  const localSecond = getPart('second');

  // Offset from midnight: how many ms after midnight is approxUtcMs showing as local time?
  const offsetFromMidnightMs =
    (localHour === 24 ? 0 : localHour) * 3600000 +
    localMinute * 60000 +
    localSecond * 1000;

  return approxUtcMs - offsetFromMidnightMs;
}

/**
 * Compute days remaining until `endTimestampMs`, anchored to end-of-day in the user's timezone.
 * Uses the user's local timezone so a trial ending "Oct 5" doesn't expire at UTC midnight
 * for someone in IST (+5:30) who still has hours left in their day.
 */
export function getDaysRemainingInTimezone(endTimestampMs: number, timezone: string): number {
  const nowMs = Date.now();
  if (endTimestampMs <= nowMs) return 0;

  // Get end-of-today in the user's tz; if endTimestamp is within today, count as 1 day
  const endOfToday = getEndOfDayInTimezone(timezone);
  if (endTimestampMs <= endOfToday) return 1;

  return Math.max(0, Math.ceil((endTimestampMs - nowMs) / 86400000));
}

/**
 * Format a UTC ISO string for display in the user's local timezone.
 * Example: "2026-10-05T11:00:00.000Z" + "Asia/Kolkata" → "05 Oct 2026, 4:30 PM IST"
 */
export function formatUtcInTimezone(isoString: string, timezone: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return isoString; // fallback: raw ISO string
  }
}

/**
 * Get the current UTC ISO timestamp — always stored in DB as UTC.
 * The timezone is stored separately for display purposes only.
 */
export function nowUtcIso(): string {
  return new Date().toISOString();
}

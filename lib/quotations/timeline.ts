import { Quotation } from '@/types/database';

export function getQuotationTargetTimestamp(quote: {
  estimated_completion_date?: string | null;
  estimated_days?: number | null;
  estimated_time_text?: string | null;
  in_progress_at?: string | null;
} | null | undefined): number | null {
  if (!quote) return null;

  if (quote.estimated_completion_date) {
    const raw = quote.estimated_completion_date;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      // If date string has no time portion (e.g. YYYY-MM-DD), default to 18:00
      if (!raw.includes('T')) {
        d.setHours(18, 0, 0, 0);
      }
      return d.getTime();
    }
  }

  // Same Day / Today (0 Days)
  if (quote.estimated_days === 0) {
    const d = new Date();
    const timeMatch = quote.estimated_time_text?.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      d.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    } else {
      d.setHours(18, 0, 0, 0); // Default to 6:00 PM today
    }
    return d.getTime();
  }

  // Multi-day timeline (> 0 days)
  if (typeof quote.estimated_days === 'number' && quote.estimated_days > 0) {
    const start = quote.in_progress_at ? new Date(quote.in_progress_at).getTime() : Date.now();
    return start + quote.estimated_days * 86400000;
  }

  return null;
}

export interface InProgressOverdueInfo {
  isOverdue: boolean;
  overdueText: string;
  overdueHours: number;
  overdueDays: number;
  targetDate: Date | null;
}

export function checkQuotationInProgressOverdue(
  quote: {
    status?: string;
    in_progress_at?: string | null;
    estimated_days?: number | null;
    estimated_completion_date?: string | null;
    estimated_time_text?: string | null;
    updated_at?: string | null;
  } | null | undefined
): InProgressOverdueInfo {
  if (!quote || quote.status !== 'IN_PROGRESS') {
    return { isOverdue: false, overdueText: '', overdueHours: 0, overdueDays: 0, targetDate: null };
  }

  const targetTime = getQuotationTargetTimestamp(quote);
  if (!targetTime) {
    return { isOverdue: false, overdueText: '', overdueHours: 0, overdueDays: 0, targetDate: null };
  }

  const now = Date.now();
  const isOverdue = now > targetTime;

  if (!isOverdue) {
    return {
      isOverdue: false,
      overdueText: '',
      overdueHours: 0,
      overdueDays: 0,
      targetDate: new Date(targetTime),
    };
  }

  const diffMs = now - targetTime;
  const overdueHours = Math.floor(diffMs / 3600000);
  const overdueDays = Math.max(1, Math.floor(diffMs / 86400000));

  const overdueText =
    overdueHours < 24
      ? `${Math.max(1, overdueHours)}h Overdue`
      : `${overdueDays}d Overdue`;

  return {
    isOverdue: true,
    overdueText,
    overdueHours,
    overdueDays,
    targetDate: new Date(targetTime),
  };
}

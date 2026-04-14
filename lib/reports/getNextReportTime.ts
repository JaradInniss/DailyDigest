/**
 * Returns the next cron execution time as a Date object.
 * Fixed at 10 AM UTC, configurable via CRON_HOUR_UTC constant.
 */
export const CRON_HOUR_UTC = 10;

export interface NextReportTime {
  nextRun: Date;
  hasRunToday: boolean;
  nextRunFormatted: string;
}

/**
 * Calculates when the next daily cron run will occur.
 * The cron runs at CRON_HOUR_UTC every day (10 AM UTC).
 * 
 * If today's cron has already run, returns tomorrow's scheduled time.
 * 
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York', 'Europe/London').
 *                   If not provided, defaults to 'UTC'.
 */
export function getNextReportTime(timezone: string = 'UTC'): NextReportTime {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Create today's scheduled run time at CRON_HOUR_UTC in UTC
  const todayRun = new Date(today);
  todayRun.setUTCHours(CRON_HOUR_UTC, 0, 0, 0);
  
  let nextRun: Date;
  let hasRunToday: boolean;
  
  if (now >= todayRun) {
    // Today's run has already happened (or is right now)
    // Next run is tomorrow at CRON_HOUR_UTC
    nextRun = new Date(todayRun);
    nextRun.setDate(nextRun.getDate() + 1);
    hasRunToday = true;
  } else {
    // Today's run is still upcoming
    nextRun = todayRun;
    hasRunToday = false;
  }
  
  // Format the next run time in the specified timezone
  const nextRunFormatted = formatTimeInTimezone(nextRun, timezone);
  
  return {
    nextRun,
    hasRunToday,
    nextRunFormatted,
  };
}

/**
 * Formats a Date in a given IANA timezone.
 * Returns time in 12-hour format with AM/PM.
 */
export function formatTimeInTimezone(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });
    
    const parts = formatter.formatToParts(date);
    const hour = parts.find(p => p.type === 'hour')?.value ?? '12';
    const minute = parts.find(p => p.type === 'minute')?.value ?? '00';
    const period = parts.find(p => p.type === 'dayPeriod')?.value ?? 'AM';
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value ?? 'UTC';
    
    return `${hour}:${minute} ${period} ${tzName}`;
  } catch {
    // Fallback to UTC if timezone is invalid
    const hours = date.getUTCHours();
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${displayHours}:00 ${ampm} UTC`;
  }
}

/**
 * Returns a formatted string like "4h 23m" for countdown display.
 * The countdown is always calculated against UTC time, but displayed
 * in the user's timezone.
 */
export function getCountdownString(nextRun: Date, timezone: string = 'UTC'): string {
  const now = new Date();
  const diffMs = nextRun.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return '0m';
  }
  
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

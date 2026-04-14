'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getNextReportTime, getCountdownString } from '@/lib/reports/getNextReportTime';

interface ReportCountdownProps {
  /** Timezone for display - fetched from user settings if not provided */
  timezone?: string;
}

/**
 * Fetches the user's timezone from the API.
 * Falls back to 'UTC' if the fetch fails.
 */
async function fetchUserTimezone(): Promise<string> {
  try {
    const res = await fetch('/api/settings/timezone');
    if (res.ok) {
      const data = await res.json();
      return data.timezone ?? 'UTC';
    }
  } catch {
    // Fallback to UTC on error
  }
  return 'UTC';
}

export default function ReportCountdown({ timezone: initialTimezone }: ReportCountdownProps) {
  const [timezone, setTimezone] = useState<string>(initialTimezone ?? 'UTC');
  const [countdown, setCountdown] = useState<string>('');
  const [isTomorrow, setIsTomorrow] = useState(false);
  
  useEffect(() => {
    // Fetch user timezone if not provided via props
    if (!initialTimezone) {
      fetchUserTimezone().then(setTimezone);
    }
  }, [initialTimezone]);
  
  useEffect(() => {
    const updateCountdown = () => {
      const { nextRun, hasRunToday } = getNextReportTime(timezone);
      
      setIsTomorrow(hasRunToday);
      setCountdown(getCountdownString(nextRun, timezone));
    };
    
    // Initial update
    updateCountdown();
    
    // Update every minute
    const interval = setInterval(updateCountdown, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [timezone]);
  
  // Get display time formatted in the user's timezone
  const getDisplayTime = () => {
    try {
      const { nextRun } = getNextReportTime(timezone);
      return nextRun.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone,
      });
    } catch {
      // Fallback to UTC if timezone is invalid
      const { nextRun } = getNextReportTime('UTC');
      return nextRun.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      });
    }
  };

  if (!countdown) {
    return null;
  }
  
  return (
    <div 
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <Clock 
        className="w-4 h-4 text-[#DC2626]" 
        strokeWidth={2}
        aria-hidden="true"
      />
      <span className="text-sm font-medium text-[#450A0A]" style={{ fontFamily: 'Roboto, sans-serif' }}>
        {isTomorrow ? (
          <>Next report tomorrow at {getDisplayTime()}</>
        ) : (
          <>Next report in: {countdown}</>
        )}
      </span>
    </div>
  );
}

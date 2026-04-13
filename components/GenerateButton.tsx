'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CalendarPlus } from 'lucide-react';

interface GenerateButtonProps {
  className?: string;
}

export default function GenerateButton({ className = '' }: GenerateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      // First, try to delete any existing report for today with 'error' status
      // This allows retrying after a failed attempt
      await fetch('/api/cron/generate-report', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(() => { /* Ignore errors on delete, proceed with generation */ });

      const response = await fetch('/api/cron/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to generate report:', response.status, errorData);
        alert(`Failed to generate report: ${errorData.error || response.status}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center gap-2
        px-6 py-3 text-base font-semibold text-white
        bg-[#1E40AF] rounded-lg
        hover:opacity-90 transition-all duration-200
        cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E40AF]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{ fontFamily: 'Roboto, sans-serif' }}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" size={20} />
          Generating...
        </>
      ) : (
        <>
          <CalendarPlus className="h-5 w-5" size={20} />
          Generate Today&apos;s Report
        </>
      )}
    </button>
  );
}

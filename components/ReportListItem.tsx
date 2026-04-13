'use client';

import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';

interface ReportListItemProps {
  reportDate: string;
  status: 'pending' | 'complete' | 'error';
  summaryCount: number;
}

export default function ReportListItem({
  reportDate,
  status,
  summaryCount,
}: ReportListItemProps) {
  // Format date for display
  const formattedDate = new Date(reportDate + 'T00:00:00').toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  // Format date for URL
  const dateParam = reportDate;

  // Status badge styling
  const statusStyles = {
    complete: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  const statusLabels = {
    complete: 'Complete',
    error: 'Error',
    pending: 'Pending',
  };

  const StatusIcon = {
    complete: CheckCircle,
    error: AlertCircle,
    pending: Loader2,
  }[status];

  return (
    <Link
      href={`/history/${dateParam}`}
      className="
        block bg-white rounded-xl p-6 shadow-md
        hover:shadow-lg hover:-translate-y-0.5
        transition-all duration-200 cursor-pointer
        border-l-4 border-transparent hover:border-l-[#DC2626]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-2
      "
    >
      <div className="flex items-center justify-between">
        {/* Date and summary count */}
        <div className="flex-1">
          <h3
            className="text-xl font-semibold text-[#450A0A] mb-1"
            style={{ fontFamily: 'Newsreader, serif' }}
          >
            {formattedDate}
          </h3>
          <p
            className="text-sm text-gray-500"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {summaryCount} {summaryCount === 1 ? 'summary' : 'summaries'}
          </p>
        </div>

        {/* Status badge */}
        <span
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold
            ${statusStyles[status]}
          `}
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          <StatusIcon className={`w-4 h-4 ${status === 'pending' ? 'animate-spin' : ''}`} size={16} />
          {statusLabels[status]}
        </span>

        {/* Arrow icon */}
        <ChevronRight className="w-5 h-5 text-gray-400 ml-4" size={20} />
      </div>
    </Link>
  );
}

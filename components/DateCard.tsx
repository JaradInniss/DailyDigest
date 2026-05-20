'use client';

import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DateCardProps {
  date: string;
  status: 'pending' | 'complete' | 'error' | 'none';
  dayNumber: number;
}

export default function DateCard({ date, status, dayNumber }: DateCardProps) {
  const statusConfig = {
    complete: {
      icon: CheckCircle,
      iconClass: 'text-green-600',
      bgClass: 'bg-green-50 border-green-200',
      textClass: 'text-green-800',
    },
    error: {
      icon: AlertCircle,
      iconClass: 'text-red-600',
      bgClass: 'bg-red-50 border-red-200',
      textClass: 'text-red-800',
    },
    pending: {
      icon: Loader2,
      iconClass: 'text-yellow-600',
      bgClass: 'bg-yellow-50 border-yellow-200',
      textClass: 'text-yellow-800',
    },
    none: {
      icon: null,
      iconClass: '',
      bgClass: 'bg-gray-50 border-gray-200',
      textClass: 'text-gray-400',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  if (status === 'none' || dayNumber === 0) {
    return (
      <div
        className="
          flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg border
          bg-gray-50 border-gray-200 cursor-not-allowed
        "
      >
        <span className="text-[10px] sm:text-xs font-medium text-gray-400 text-center leading-tight">
          No<br />Report
        </span>
        {dayNumber > 0 && (
          <span className="text-xs sm:text-sm font-medium text-gray-400 mt-0.5 sm:mt-1">
            {dayNumber}
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={`/history/${date}`}
      className={`
        flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg border transition-all duration-150
        hover:shadow-md hover:-translate-y-0.5 hover:border-[#DC2626]
        cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-2
        ${config.bgClass}
      `}
    >
      {StatusIcon && (
        <StatusIcon
          className={`w-3 h-3 sm:w-4 sm:h-4 mb-0.5 sm:mb-1 ${config.iconClass} ${status === 'pending' ? 'animate-spin' : ''}`}
        />
      )}
      <span className={`text-xs sm:text-sm font-medium text-center ${config.textClass}`}>
        {dayNumber}
      </span>
    </Link>
  );
}
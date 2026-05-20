'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DateCard from './DateCard';

interface ReportSummary {
  report_date: string;
  status: 'pending' | 'complete' | 'error';
}

interface MonthCardProps {
  monthKey: string;
  monthLabel: string;
  year: number;
  reports: ReportSummary[];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function MonthCard({ monthKey, monthLabel, year, reports }: MonthCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const monthIndex = parseInt(monthKey.split('-')[1], 10) - 1;
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const firstDay = getFirstDayOfMonth(year, monthIndex);

  const sortedReports = [...reports].sort((a, b) =>
    new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
  );

  const reportMap = new Map<number, ReportSummary>();
  for (const report of sortedReports) {
    const day = new Date(report.report_date + 'T00:00:00').getDate();
    reportMap.set(day, report);
  }

  const cells: { day: number; report: ReportSummary | null }[][] = [];
  let currentDay = 1;
  for (let week = 0; week < 6 && currentDay <= daysInMonth; week++) {
    const weekCells: { day: number; report: ReportSummary | null }[] = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      if (week === 0 && dayOfWeek < firstDay) {
        weekCells.push({ day: 0, report: null });
      } else if (currentDay <= daysInMonth) {
        weekCells.push({ day: currentDay, report: reportMap.get(currentDay) || null });
        currentDay++;
      } else {
        weekCells.push({ day: 0, report: null });
      }
    }
    cells.push(weekCells);
  }

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          w-full flex items-center justify-between p-4
          hover:bg-gray-50 transition-colors duration-150
          cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-2
        "
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-lg font-semibold text-[#450A0A]"
            style={{ fontFamily: 'Newsreader, serif' }}
          >
            {monthLabel}
          </span>
          <span
            className="text-xs px-2 py-1 rounded-full bg-[#FEF2F2] text-[#DC2626] font-medium"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {reports.length} {reports.length === 1 ? 'report' : 'reports'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-2 pb-2 sm:px-4 sm:pb-3">
          <div className="hidden sm:grid grid-cols-7 gap-1 mb-1">
            {dayHeaders.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] sm:text-xs font-medium text-gray-400 py-0.5 sm:py-1"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {cells.map((week, weekIndex) =>
              week.map((cell, dayIndex) => {
                const key = `${weekIndex}-${dayIndex}`;
                if (cell.day === 0) {
                  return <div key={key} className="p-2" />;
                }
                return (
                  <DateCard
                    key={key}
                    date={`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`}
                    status={cell.report?.status || 'none'}
                    dayNumber={cell.day}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
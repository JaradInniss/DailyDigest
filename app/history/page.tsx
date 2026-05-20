import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import YearSection from '@/components/YearSection';

export const metadata = {
  title: 'History — Daily Digest',
  description: 'Browse past daily reports',
};

interface ReportSummary {
  report_date: string;
  status: 'pending' | 'complete' | 'error';
}

interface MonthData {
  monthKey: string;
  monthLabel: string;
  reports: ReportSummary[];
}

interface YearData {
  year: number;
  months: MonthData[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthLabel(monthKey: string): string {
  const monthIndex = parseInt(monthKey.split('-')[1], 10) - 1;
  return MONTH_NAMES[monthIndex] || monthKey;
}

export default async function HistoryPage() {
  const { data: reports, error } = await supabaseAdmin
    .from('reports')
    .select('report_date, status')
    .order('report_date', { ascending: false });

  if (error) {
    console.error('[HistoryPage] Error fetching reports:', error);
  }

  const yearMap = new Map<number, Map<string, ReportSummary[]>>();

  for (const report of reports || []) {
    const date = new Date(report.report_date + 'T00:00:00');
    const year = date.getFullYear();
    const monthKey = report.report_date.substring(0, 7);

    if (!yearMap.has(year)) {
      yearMap.set(year, new Map());
    }
    const monthMap = yearMap.get(year)!;
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, []);
    }
    monthMap.get(monthKey)!.push({
      report_date: report.report_date,
      status: report.status as 'pending' | 'complete' | 'error',
    });
  }

  const years: YearData[] = [];
  for (const [year, monthMap] of yearMap) {
    const months: MonthData[] = [];
    for (const [monthKey, monthReports] of monthMap) {
      months.push({
        monthKey,
        monthLabel: getMonthLabel(monthKey),
        reports: monthReports,
      });
    }
    months.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    years.push({ year, months });
  }
  years.sort((a, b) => b.year - a.year);

  return (
    <main className="min-h-screen bg-[#FEF2F2]">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#DC2626] mb-4 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-2 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Today
          </Link>
          <h1 className="text-4xl font-bold text-[#450A0A] tracking-tight" style={{ fontFamily: 'Newsreader, serif' }}>
            Report Archive
          </h1>
          <p className="mt-2 text-lg text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
            Browse your past daily reports
          </p>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {years.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-300 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-400 mb-2" style={{ fontFamily: 'Newsreader, serif' }}>
              No Reports Yet
            </h2>
            <p className="text-gray-500 text-center max-w-md" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Your report history will appear here once daily reports are generated.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {years.map((yearData) => (
              <YearSection key={yearData.year} year={yearData.year} months={yearData.months} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
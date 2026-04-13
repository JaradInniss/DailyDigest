import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import ReportListItem from '@/components/ReportListItem';

export const metadata = {
  title: 'History — Daily Digest',
  description: 'Browse past daily reports',
};

interface ReportWithCount {
  id: string;
  report_date: string;
  status: 'pending' | 'complete' | 'error';
  created_at: string;
  summary_count: number;
}

export default async function HistoryPage() {
  // Fetch all reports ordered by date descending
  const { data: reports, error } = await supabaseAdmin
    .from('reports')
    .select('id, report_date, status, created_at')
    .order('report_date', { ascending: false });

  if (error) {
    console.error('[HistoryPage] Error fetching reports:', error);
  }

  // Fetch summary counts for each report
  const reportIds = (reports || []).map((r) => r.id);

  let summaryCounts: Record<string, number> = {};

  if (reportIds.length > 0) {
    const { data: summaries } = await supabaseAdmin
      .from('summaries')
      .select('report_id');

    if (summaries) {
      // Count summaries per report
      summaryCounts = summaries.reduce<Record<string, number>>((acc, s) => {
        acc[s.report_id] = (acc[s.report_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  // Attach summary counts to reports
  const reportsWithCounts: ReportWithCount[] = (reports || []).map((r) => ({
    id: r.id,
    report_date: r.report_date,
    status: r.status as 'pending' | 'complete' | 'error',
    created_at: r.created_at,
    summary_count: summaryCounts[r.id] || 0,
  }));

  return (
    <main className="min-h-screen bg-[#FEF2F2]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#DC2626] mb-4 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-2 rounded"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Today
          </Link>

          <h1
            className="text-4xl font-bold text-[#450A0A] tracking-tight"
            style={{ fontFamily: 'Newsreader, serif' }}
          >
            Report Archive
          </h1>
          <p
            className="mt-2 text-lg text-gray-600"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Browse your past daily reports
          </p>
        </div>
      </header>

      {/* Reports List */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {reportsWithCounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            {/* Archive icon */}
            <div className="mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-20 w-20 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
            </div>
            <h2
              className="text-2xl font-bold text-gray-400 mb-2"
              style={{ fontFamily: 'Newsreader, serif' }}
            >
              No Reports Yet
            </h2>
            <p
              className="text-gray-500 text-center max-w-md"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Your report history will appear here once daily reports are generated.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reportsWithCounts.map((report) => (
              <ReportListItem
                key={report.id}
                reportDate={report.report_date}
                status={report.status}
                summaryCount={report.summary_count}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
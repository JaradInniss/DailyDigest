import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import SummaryCard from '@/components/SummaryCard';
import ReportSummaryHeader from '@/components/ReportSummaryHeader';
import { generateUnifiedSummary } from '@/lib/gemini/generateUnifiedSummary';

interface SummaryWithCategory {
  id: string;
  topic_headline: string;
  summary_body: string;
  source_urls: string[];
  thumbnail_url: string | null;
  categories: {
    slug: string;
    label: string;
  } | null;
}

interface CategoryTag {
  slug: string;
  label: string;
}

interface ReportWithSummaries {
  id: string;
  report_date: string;
  status: string;
  summaries: SummaryWithCategory[];
}

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { date } = await params;
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString(
    'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );
  return {
    title: `${formattedDate} Report — Daily Digest`,
    description: `Daily report for ${formattedDate}`,
  };
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { date } = await params;

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return (
      <main className="min-h-screen bg-[#FEF2F2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h1
              className="text-3xl font-bold text-[#450A0A] mb-4"
              style={{ fontFamily: 'Newsreader, serif' }}
            >
              Invalid Date Format
            </h1>
            <p className="text-gray-600 mb-8" style={{ fontFamily: 'Roboto, sans-serif' }}>
              The date format is invalid. Please use YYYY-MM-DD.
            </p>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-[#1E40AF] rounded-lg hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-2"
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
              Back to History
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Fetch the report for this date (including unified_summary)
  const { data: report, error: reportError } = await supabaseAdmin
    .from('reports')
    .select('id, report_date, status, unified_summary')
    .eq('report_date', date)
    .maybeSingle();

  if (reportError && Object.keys(reportError).length > 0) {
    console.error('[ReportDetailPage] Error fetching report:', reportError);
  }

  // If no report exists for this date, show 404-like state
  if (!report) {
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString(
      'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

    return (
      <main className="min-h-screen bg-[#FEF2F2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            {/* Back link */}
            <Link
              href="/history"
              className="self-start inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#DC2626] mb-8 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-2 rounded"
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
              Back to History
            </Link>

            <div className="text-center">
              <h1
                className="text-3xl font-bold text-[#450A0A] mb-4"
                style={{ fontFamily: 'Newsreader, serif' }}
              >
                Report Not Found
              </h1>
              <p
                className="text-lg text-gray-600 mb-2"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                No report exists for {formattedDate}
              </p>
              <p
                className="text-gray-500"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                This report may not have been generated yet.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Fetch summaries for this report
  const { data: summariesData, error: summariesError } = await supabaseAdmin
    .from('summaries')
    .select('id, topic_headline, summary_body, source_urls, thumbnail_url, category_id')
    .eq('report_id', report.id)
    .order('created_at');

  if (summariesError && Object.keys(summariesError).length > 0) {
    console.error('[ReportDetailPage] Error fetching summaries:', summariesError);
  }

  // Fetch category labels and slugs
  const categoryIds = (summariesData || []).map((s) => s.category_id).filter(Boolean);
  let categoryData: Record<string, { slug: string; label: string }> = {};

  if (categoryIds.length > 0) {
    const { data: categoriesData } = await supabaseAdmin
      .from('categories')
      .select('id, slug, label')
      .in('id', categoryIds);

    if (categoriesData) {
      categoryData = categoriesData.reduce<Record<string, { slug: string; label: string }>>((acc, cat) => {
        acc[cat.id] = { slug: cat.slug, label: cat.label };
        return acc;
      }, {});
    }
  }

  // Attach category labels and slugs to summaries
  const typedSummaries = (summariesData || []).map((s) => ({
    ...s,
    categories: s.category_id
      ? { slug: categoryData[s.category_id]?.slug || '', label: categoryData[s.category_id]?.label || 'Unknown' }
      : null,
  })) as unknown as SummaryWithCategory[];

  // Build category tags for ReportSummaryHeader
  const categoryTagsMap = typedSummaries.reduce<Record<string, CategoryTag>>((acc, summary) => {
    if (!summary.categories) return acc;
    const catKey = summary.categories.slug;

    // Only add if we haven't seen this category yet
    if (!acc[catKey]) {
      acc[catKey] = {
        slug: summary.categories.slug,
        label: summary.categories.label,
      };
    }
    return acc;
  }, {});

  const categoryTags = Object.values(categoryTagsMap).sort((a, b) => a.label.localeCompare(b.label));

  // Get unified summary from the report (stored during generation)
  // If not stored (null/empty), generate dynamically for backward compatibility
  let unifiedSummary = report?.unified_summary || '';

  if (!unifiedSummary && categoryTags.length > 0) {
    // Build inputs for unified summary generation
    const categoryInputsForUnified = typedSummaries.reduce<Record<string, { categoryLabel: string; topicHeadline: string; summaryBody: string }>>((acc, summary) => {
      if (!summary.categories) return acc;
      const catKey = summary.categories.slug;
      if (!acc[catKey]) {
        acc[catKey] = {
          categoryLabel: summary.categories.label,
          topicHeadline: summary.topic_headline,
          summaryBody: summary.summary_body,
        };
      }
      return acc;
    }, {});

    const categoryInputs = Object.values(categoryInputsForUnified);
    if (categoryInputs.length > 0) {
      const result = await generateUnifiedSummary(categoryInputs);
      if ('summary' in result) {
        unifiedSummary = result.summary;
        // Optionally save back to database for future visits
        if (report?.id) {
          await supabaseAdmin
            .from('reports')
            .update({ unified_summary: unifiedSummary })
            .eq('id', report.id);
        }
      }
    }
  }

  // Format date for display
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Group summaries by category
  const groupedSummaries = typedSummaries.reduce<Record<string, SummaryWithCategory[]>>((acc, summary) => {
    const categoryLabel = summary.categories?.label || 'Uncategorized';
    if (!acc[categoryLabel]) {
      acc[categoryLabel] = [];
    }
    acc[categoryLabel].push(summary);
    return acc;
  }, {});

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedSummaries).sort();

  // Status badge styling
  const statusStyles: Record<string, string> = {
    complete: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  const statusLabels: Record<string, string> = {
    complete: 'Complete',
    error: 'Error',
    pending: 'Pending',
  };

  return (
    <main className="min-h-screen bg-[#FEF2F2]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back link */}
          <Link
            href="/history"
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
            Back to History
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1
                className="text-4xl font-bold text-[#450A0A] tracking-tight"
                style={{ fontFamily: 'Newsreader, serif' }}
              >
                {formattedDate}
              </h1>
              <p
                className="mt-2 text-lg text-gray-600"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Daily Report
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${statusStyles[report.status]}`}
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              {report.status === 'complete' && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {report.status === 'error' && (
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
              {report.status === 'pending' && (
                <svg
                  className="animate-spin w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {statusLabels[report.status]}
            </span>
          </div>

          {/* Report Summary Header - category tags and unified summary */}
          {categoryTags.length > 0 && (
            <ReportSummaryHeader categoryTags={categoryTags} unifiedSummary={unifiedSummary} />
          )}
        </div>
      </header>

      {/* Content */}
      {report.status === 'error' ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-20 w-20 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2
              className="text-2xl font-bold text-[#450A0A] mb-4"
              style={{ fontFamily: 'Newsreader, serif' }}
            >
              Report Generation Failed
            </h2>
            <p
              className="text-lg text-gray-600 max-w-md mb-8"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              There was an error generating this report. Please try again later or check the cron job logs.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 text-white bg-[#1E40AF] rounded-lg hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-2"
            >
              Go to Today&apos;s Report
            </Link>
          </div>
        </div>
      ) : report.status === 'pending' ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="mb-6">
              <svg
                className="animate-spin h-20 w-20 text-[#1E40AF]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h2
              className="text-2xl font-bold text-[#450A0A] mb-4"
              style={{ fontFamily: 'Newsreader, serif' }}
            >
              Report In Progress
            </h2>
            <p
              className="text-lg text-gray-600 max-w-md"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              This report is still being generated. Please check back shortly.
            </p>
          </div>
        </div>
      ) : (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {sortedCategories.length === 0 ? (
            <div className="text-center py-12">
              <p
                className="text-gray-500"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                No summaries available for this report.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {sortedCategories.map((categoryLabel) => (
                <div key={categoryLabel}>
                  {/* Category heading */}
                  <h2
                    className="text-2xl font-bold text-[#450A0A] mb-6 pb-3 border-b-2 border-[#DC2626]"
                    style={{ fontFamily: 'Newsreader, serif' }}
                  >
                    {categoryLabel}
                  </h2>

                  {/* Summary cards */}
                  <div className="flex flex-col gap-4">
                    {groupedSummaries[categoryLabel].map((summary) => (
                      <SummaryCard
                        key={summary.id}
                        categoryLabel={categoryLabel}
                        topicHeadline={summary.topic_headline}
                        summaryBody={summary.summary_body}
                        sourceUrls={summary.source_urls}
                        thumbnailUrl={summary.thumbnail_url}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
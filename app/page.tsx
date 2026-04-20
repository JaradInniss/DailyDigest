import { supabaseAdmin } from '@/lib/supabase/server';
import SummaryCard from '@/components/SummaryCard';
import ReportEmptyState from '@/components/ReportEmptyState';
import PushSubscriber from '@/components/PushSubscriber';
import GenerateButton from '@/components/GenerateButton';
import ReportCountdown from '@/components/ReportCountdown';
import ReportSummaryHeader from '@/components/ReportSummaryHeader';
import { generateUnifiedSummary } from '@/lib/gemini/generateUnifiedSummary';
import { AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Daily Digest',
  description: 'Your personalized daily news digest',
};

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

export default async function HomePage() {
  const today = getTodayDate();

  // Fetch today's report (including unified_summary)
  const { data: report, error: reportError } = await supabaseAdmin
    .from('reports')
    .select('id, report_date, status, unified_summary')
    .eq('report_date', today)
    .maybeSingle();

  if (reportError && Object.keys(reportError).length > 0) {
    console.error('[HomePage] Error fetching report:', reportError);
  }

  // If no report exists, show empty state
  if (!report) {
    return (
      <main className="min-h-screen bg-[#FEF2F2]">
        <PushSubscriber />
        <ReportEmptyState />
      </main>
    );
  }

  // Fetch summaries for this report (used for complete status)
  const { data: summariesData, error: summariesError } = await supabaseAdmin
    .from('summaries')
    .select('id, topic_headline, summary_body, source_urls, thumbnail_url, category_id')
    .eq('report_id', report.id)
    .order('created_at');

  // If there's an error fetching summaries, log it and show empty state
  if (summariesError && Object.keys(summariesError).length > 0) {
    console.error('[HomePage] Error fetching summaries:', summariesError);
  }

  // Fetch category labels and slugs for the summaries
  const categoryIds = (summariesData || []).map(s => s.category_id).filter(Boolean);
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
  const typedSummaries = (summariesData || []).map(s => ({
    ...s,
    categories: s.category_id ? { slug: categoryData[s.category_id]?.slug || '', label: categoryData[s.category_id]?.label || 'Unknown' } : null
  })) as unknown as SummaryWithCategory[];

  // Handle error status
  if (report.status === 'error') {
    return (
      <main className="min-h-screen bg-[#FEF2F2]">
        <PushSubscriber />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="mb-8">
            <AlertTriangle
              className="h-24 w-24 text-red-500"
              size={96}
              strokeWidth={1.5}
            />
          </div>
          <h2 className="text-3xl font-bold text-[#450A0A] mb-4 text-center" style={{ fontFamily: 'Newsreader, serif' }}>
            Report Generation Failed
          </h2>
          <p className="text-lg text-gray-600 mb-8 text-center max-w-md" style={{ fontFamily: 'Roboto, sans-serif' }}>
            There was an error generating today&apos;s report. Please try again later or contact support.
          </p>
          <GenerateButton />
        </div>
      </main>
    );
  }

  // Handle pending status
  if (report.status === 'pending') {
    return (
      <main className="min-h-screen bg-[#FEF2F2]">
        <PushSubscriber />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="mb-8">
            <Loader2
              className="h-24 w-24 text-[#1E40AF] animate-spin"
              size={96}
              strokeWidth={1.5}
            />
          </div>
          <h2 className="text-3xl font-bold text-[#450A0A] mb-4 text-center" style={{ fontFamily: 'Newsreader, serif' }}>
            Report In Progress
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-md" style={{ fontFamily: 'Roboto, sans-serif' }}>
            Your daily report is being generated. This page will automatically update when it&apos;s ready.
          </p>
        </div>
      </main>
    );
  }

  // Status is 'complete' - typedSummaries already prepared above with category labels attached

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

  return (
    <main className="min-h-screen bg-[#FEF2F2]">
      <PushSubscriber />
      
      {/* Countdown Banner - Above the header, separate from header */}
      {report && (
        <div className="bg-[#FEF2F2] border-b border-transparent">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-center">
            <ReportCountdown />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1
                className="text-4xl font-bold text-[#450A0A] tracking-tight"
                style={{ fontFamily: 'Newsreader, serif' }}
              >
                Daily Digest
              </h1>
              <p
                className="mt-2 text-lg text-gray-600"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckCircle2 className="w-4 h-4 mr-1" size={16} />
                  Complete
                </span>
              </div>
            </div>
          </div>

          {/* Report Summary Header - category tags and unified summary */}
          {categoryTags.length > 0 && (
            <ReportSummaryHeader categoryTags={categoryTags} unifiedSummary={unifiedSummary} />
          )}
        </div>
      </header>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {sortedCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
              No summaries available for today.
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
    </main>
  );
}

'use client';

interface CategoryTag {
  slug: string;
  label: string;
}

interface ReportSummaryHeaderProps {
  categoryTags: CategoryTag[];
  unifiedSummary: string;
}

/**
 * ReportSummaryHeader renders:
 * 1. A horizontal row of pill/chip tags for all categories in the report
 * 2. A unified summary paragraph that flows across all topics without naming categories
 */
export default function ReportSummaryHeader({ categoryTags, unifiedSummary }: ReportSummaryHeaderProps) {
  if (!categoryTags || categoryTags.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 space-y-4">
      {/* Category tag list - horizontal row of pills */}
      <div className="flex flex-wrap gap-2">
        {categoryTags.map((category) => (
          <span
            key={category.slug}
            className="inline-flex items-center px-3 py-1 text-xs font-semibold text-[#450A0A] bg-white border border-[#DC2626] rounded-full"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {category.label}
          </span>
        ))}
      </div>

      {/* Unified summary paragraph */}
      {unifiedSummary && (
        <p
          className="text-base text-gray-700 leading-relaxed"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          {unifiedSummary}
        </p>
      )}
    </div>
  );
}
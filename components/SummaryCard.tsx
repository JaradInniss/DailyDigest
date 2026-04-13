'use client';

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

interface SummaryCardProps {
  categoryLabel: string;
  topicHeadline: string;
  summaryBody: string;
  sourceUrls: string[];
  thumbnailUrl?: string | null;
}

export default function SummaryCard({
  categoryLabel,
  topicHeadline,
  summaryBody,
  sourceUrls,
  thumbnailUrl,
}: SummaryCardProps) {
  return (
    <article
      className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200 cursor-default"
      style={{
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        fontFamily: 'Roboto, sans-serif',
      }}
    >
      {/* Category badge */}
      <div className="mb-3">
        <span
          className="inline-block px-3 py-1 text-xs font-semibold text-white bg-[#DC2626] rounded-full"
          style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          {categoryLabel}
        </span>
      </div>

      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="mb-4 relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={thumbnailUrl}
            alt={topicHeadline}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}

      {/* Headline */}
      <h3
        className="text-xl font-bold text-[#450A0A] mb-3 leading-tight"
        style={{ fontFamily: 'Newsreader, serif' }}
      >
        {topicHeadline}
      </h3>

      {/* Summary body */}
      <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
        {summaryBody}
      </p>

      {/* Source URLs */}
      <div className="flex flex-wrap gap-2">
        {(sourceUrls || []).map((url, index) => (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center gap-1
              px-3 py-1.5 text-sm font-medium
              text-[#1E40AF] bg-blue-50
              rounded-md
              hover:bg-blue-100 transition-colors duration-150
              cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-1
            "
          >
            <ExternalLink className="h-4 w-4" size={16} />
            Source {index + 1}
          </a>
        ))}
      </div>
    </article>
  );
}
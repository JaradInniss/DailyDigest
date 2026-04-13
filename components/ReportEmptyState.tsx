'use client';

import { Newspaper } from 'lucide-react';
import GenerateButton from './GenerateButton';

export default function ReportEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Newspaper icon */}
      <div className="mb-8">
        <Newspaper
          className="h-24 w-24 text-[#DC2626]"
          size={96}
          strokeWidth={1.5}
        />
      </div>

      {/* Text content */}
      <h2
        className="text-3xl font-bold text-[#450A0A] mb-4 text-center"
        style={{ fontFamily: 'Newsreader, serif' }}
      >
        No Report Generated Yet
      </h2>
      <p
        className="text-lg text-gray-600 mb-8 text-center max-w-md"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        Your daily digest is waiting. Generate your first report to see the latest news from your selected categories.
      </p>

      {/* Generate button */}
      <GenerateButton />

      {/* Helper text */}
      <p
        className="mt-6 text-sm text-gray-400 text-center"
        style={{ fontFamily: 'Roboto, sans-serif' }}
      >
        Reports are automatically generated daily at 7 AM UTC
      </p>
    </div>
  );
}

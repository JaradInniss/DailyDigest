import { supabaseAdmin } from '@/lib/supabase/server';
import CategoryCard from '@/components/CategoryCard';
import TimezoneSelector from '@/components/TimezoneSelector';
import { setAllCategories, getUserTimezone } from './actions';
import { Globe } from 'lucide-react';

export const metadata = {
  title: 'Settings — Daily Digest',
  description: 'Select your news categories',
};

export default async function SettingsPage() {
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id, slug, label, is_selected')
    .order('label');

  const selectedCount = categories?.filter((c) => c.is_selected).length ?? 0;

  // Get today's report ID for the add-category confirmation prompt
  const today = new Date().toISOString().split('T')[0];
  const { data: todayReport } = await supabaseAdmin
    .from('reports')
    .select('id')
    .eq('report_date', today)
    .eq('status', 'complete')
    .single();

  const todayReportId = todayReport?.id ?? null;

  // Get user's timezone setting
  const userTimezone = await getUserTimezone();

  return (
    <main className="min-h-screen bg-[#FEF2F2]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-[#450A0A] tracking-tight" style={{ fontFamily: 'Newsreader, serif' }}>
            Settings
          </h1>
          <p className="mt-2 text-lg text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
            Choose your news categories
          </p>
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm font-medium text-gray-500">
              {selectedCount} of 8 selected
              {selectedCount >= 8 && (
                <span className="ml-2 text-xs text-[#DC2626]">(Free tier limit)</span>
              )}
            </span>
            <div className="flex gap-2">
              <form action={setAllCategories.bind(null, true)}>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#1E40AF] rounded-lg
                             hover:opacity-90 transition-opacity cursor-pointer
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E40AF]"
                >
                  Select All
                </button>
              </form>
              <form action={setAllCategories.bind(null, false)}>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-[#DC2626] border-2 border-[#DC2626]
                             rounded-lg hover:bg-red-50 transition-colors cursor-pointer
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#DC2626]"
                >
                  Clear All
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Category Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories?.map((category) => (
            <CategoryCard
              key={category.id}
              id={category.id}
              slug={category.slug}
              label={category.label}
              isSelected={category.is_selected}
              todayReportId={todayReportId}
            />
          ))}
        </div>
      </section>

      {/* Timezone Selector Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[#FEF2F2]">
              <Globe className="w-5 h-5 text-[#DC2626]" strokeWidth={2} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#450A0A]" style={{ fontFamily: 'Newsreader, serif' }}>
                Timezone Settings
              </h2>
              <p className="text-sm text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                The countdown and report time will be displayed in your selected timezone
              </p>
            </div>
          </div>
          
          <TimezoneSelector currentTimezone={userTimezone} />
        </div>
      </section>

      {/* Footer info */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
        <p className="text-sm text-gray-500">
          Your selections are saved automatically. The daily report will include news from your chosen categories.
        </p>
      </footer>
    </main>
  );
}

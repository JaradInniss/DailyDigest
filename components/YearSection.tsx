import MonthCard from './MonthCard';

interface ReportSummary {
  report_date: string;
  status: 'pending' | 'complete' | 'error';
}

interface MonthData {
  monthKey: string;
  monthLabel: string;
  reports: ReportSummary[];
}

interface YearSectionProps {
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

export default function YearSection({ year, months }: YearSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2
          className="text-2xl font-bold text-[#450A0A]"
          style={{ fontFamily: 'Newsreader, serif' }}
        >
          {year}
        </h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="flex flex-row flex-wrap gap-4 w-full">
        {months.map((month) => (
          <div key={month.monthKey} className="w-full md:flex-1 md:min-w-[400px]">
            <MonthCard
              monthKey={month.monthKey}
              monthLabel={getMonthLabel(month.monthKey)}
              year={year}
              reports={month.reports}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
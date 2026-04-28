import { NextResponse } from 'next/server';
import { generateReport } from '@/lib/reports/generateReport';
import { headers } from 'next/headers';

const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET() {
  return handleRequest();
}

export async function POST() {
  return handleRequest();
}

export async function DELETE() {
  // Delete any existing report for today with 'error' status
  // This allows retrying after a failed attempt
  const headersList = await headers();
  const secFetchSite = headersList.get('sec-fetch-site') || '';
  const isBrowserRequest = secFetchSite === 'same-origin' || secFetchSite === 'none';
  const browserTimezone = isBrowserRequest ? (headersList.get('x-timezone') || '') : '';

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let today: string;
  if (browserTimezone) {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: browserTimezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.formatToParts(new Date());
    today = `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
  } else {
    const now = new Date();
    today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('report_date', today);

  if (error) {
    console.error('[DELETE] Failed to delete report:', error);
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Report deleted' }, { status: 200 });
}

async function handleRequest() {
  // --- Step 1: Validate Authorization header ---
  // For personal single-user app: allow browser-generated requests without auth.
  // Browser fetches (sec-fetch-site=same-origin/none) are trusted.
  // External cron calls (sec-fetch-site=cross-site) MUST provide Bearer auth.
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const secFetchSite = headersList.get('sec-fetch-site') || '';
  const isBrowserRequest = secFetchSite === 'same-origin' || secFetchSite === 'none';

  // Extract browser's timezone (sent manually by client via Intl.DateTimeFormat().resolvedOptions().timeZone)
  const browserTimezone = isBrowserRequest ? (headersList.get('x-timezone') || '') : '';

  // Allow unauthenticated requests from browsers, require auth from all other origins
  if (!isBrowserRequest && (!authHeader || !authHeader.startsWith('Bearer '))) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }

  // Validate token only if auth header is present
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized: invalid Bearer token' },
        { status: 401 }
      );
    }
  }

  // --- Step 2: Check if report for today already exists ---
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Use the same timezone as generateReport for the duplicate check
  let today: string;
  if (browserTimezone) {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: browserTimezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.formatToParts(new Date());
    today = `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
  } else {
    const now = new Date();
    today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  const { data: existing } = await supabase
    .from('reports')
    .select('id, status')
    .eq('report_date', today)
    .single();

  if (existing) {
    return NextResponse.json(
      {
        error: `A report for ${today} already exists`,
        existingReportId: existing.id,
        status: existing.status,
      },
      { status: 409 }
    );
  }

  // --- Step 3: Generate the report ---
  let result;
  try {
    result = await generateReport(browserTimezone || undefined);
    console.log('[generate-report] Report generation complete:', JSON.stringify(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during report generation';
    console.error('[generate-report] Exception during generateReport:', err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }

  // --- Step 4: Return success ---
  return NextResponse.json(
    {
      reportId: result.reportId,
      summaryCount: result.summaryCount,
      status: result.status,
      errors: result.errors,
    },
    { status: 200 }
  );
}
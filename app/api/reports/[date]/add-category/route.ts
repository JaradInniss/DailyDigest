import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { summariseCategory } from '@/lib/gemini/summarise';
import { uploadThumbnail } from '@/lib/reports/generateReport';

interface RouteParams {
  params: Promise<{ date: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { date } = await params;

  // --- Step 1: Validate date format (YYYY-MM-DD) ---
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Expected YYYY-MM-DD.' },
      { status: 400 }
    );
  }

  // --- Step 2: Parse categoryId from request body ---
  let body: { categoryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { categoryId } = body;
  if (!categoryId || typeof categoryId !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid categoryId in request body' },
      { status: 400 }
    );
  }

  // --- Step 3: Validate report exists for that date and status = 'complete' ---
  const { data: report, error: reportError } = await supabaseAdmin
    .from('reports')
    .select('id, status')
    .eq('report_date', date)
    .single();

  if (reportError || !report) {
    return NextResponse.json(
      { error: `No report found for date ${date}` },
      { status: 404 }
    );
  }

  if (report.status !== 'complete') {
    return NextResponse.json(
      { error: `Report for ${date} is not complete (current status: ${report.status})` },
      { status: 404 }
    );
  }

  const reportId = report.id;

  // --- Step 4: Validate category is not already in summaries for this report ---
  const { data: existingSummary, error: summaryCheckError } = await supabaseAdmin
    .from('summaries')
    .select('id')
    .eq('report_id', reportId)
    .eq('category_id', categoryId)
    .single();

  if (summaryCheckError && summaryCheckError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is expected if no duplicate
    console.error('[add-category] Error checking for existing summary:', summaryCheckError);
    return NextResponse.json(
      { error: 'Failed to check for existing summary' },
      { status: 500 }
    );
  }

  if (existingSummary) {
    return NextResponse.json(
      { error: 'Category is already summarised in this report' },
      { status: 409 }
    );
  }

  // --- Step 5: Fetch the category row to get its label ---
  const { data: category, error: categoryError } = await supabaseAdmin
    .from('categories')
    .select('id, slug, label')
    .eq('id', categoryId)
    .single();

  if (categoryError || !category) {
    return NextResponse.json(
      { error: 'Category not found' },
      { status: 404 }
    );
  }

  // --- Step 6: Call summariseCategory(label) for the new category only ---
  const result = await summariseCategory(category.label);

  if ('error' in result) {
    console.error(`[add-category] Gemini error for ${category.label}:`, result.error);
    return NextResponse.json(
      { error: `Failed to summarise category: ${result.error}` },
      { status: 500 }
    );
  }

  // --- Step 7: Upload thumbnail to Supabase Storage if present ---
  let thumbnailUrl: string | null = null;
  if (result.thumbnailUrl) {
    thumbnailUrl = await uploadThumbnail(result.thumbnailUrl, reportId, category.slug);
  }

  // --- Step 8: Insert a new summaries row linked to the existing report ---
  const { data: newSummary, error: insertError } = await supabaseAdmin
    .from('summaries')
    .insert({
      report_id: reportId,
      category_id: category.id,
      topic_headline: result.topicHeadline,
      summary_body: result.summaryBody,
      source_urls: result.sourceUrls,
      thumbnail_url: thumbnailUrl,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[add-category] Insert error:', insertError);
    return NextResponse.json(
      { error: 'Failed to insert summary' },
      { status: 500 }
    );
  }

  // --- Step 9: Return { summaryId, categoryLabel } as JSON ---
  return NextResponse.json(
    {
      summaryId: newSummary.id,
      categoryLabel: category.label,
    },
    { status: 200 }
  );
}

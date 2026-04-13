import { supabaseAdmin } from '@/lib/supabase/server';
import { summariseCategory } from '@/lib/gemini/summarise';
import { sendPushNotification } from '@/lib/webpush/send';
import type { SummaryResult } from '@/types/summary';

interface GenerateReportResult {
  reportId: string;
  summaryCount: number;
  status: 'complete' | 'error';
  errors: string[];
}

/**
 * Orchestrates the full daily report generation:
 * 1. Fetches selected categories
 * 2. Creates a pending report row
 * 3. Summarises each category via Gemini
 * 4. Uploads thumbnails to Supabase Storage (if any)
 * 5. Inserts summary rows
 * 6. Updates report status
 * 7. Sends a push notification
 */
export async function generateReport(): Promise<GenerateReportResult> {
  const today = new Date().toISOString().split('T')[0];

  // --- Step 1: Fetch selected categories ---
  const { data: categories, error: catError } = await supabaseAdmin
    .from('categories')
    .select('id, slug, label')
    .eq('is_selected', true);

  if (catError) {
    throw new Error(`Failed to fetch categories: ${catError.message}`);
  }

  if (!categories || categories.length === 0) {
    throw new Error('No categories selected. Please select at least one category in settings.');
  }

  // --- Step 2: Insert pending report row ---
  const { data: report, error: reportError } = await supabaseAdmin
    .from('reports')
    .insert({ report_date: today, status: 'pending' })
    .select()
    .single();

  if (reportError) {
    throw new Error(`Failed to create report: ${reportError.message}`);
  }

  const reportId = report.id;
  const errors: string[] = [];
  let summaryCount = 0;

  // --- Step 3: Process each category ---
  for (const category of categories) {
    console.log(`[generateReport] Processing category: ${category.label}`);
    const result = await summariseCategory(category.label);

    if ('error' in result) {
      console.error(`[generateReport] Gemini error for ${category.label}:`, result.error);
      errors.push(`[${category.label}] ${result.error}`);
      continue;
    }

    console.log(`[generateReport] Gemini success for ${category.label}, headline: ${result.topicHeadline}`);

    // Upload thumbnail if present
    let thumbnailUrl: string | null = null;
    if (result.thumbnailUrl) {
      console.log(`[generateReport] Uploading thumbnail for ${category.label}`);
      thumbnailUrl = await uploadThumbnail(result.thumbnailUrl, reportId, category.slug);
    }

    // Insert summary row
    console.log(`[generateReport] Inserting summary for ${category.label}`);
    const { error: insertError } = await supabaseAdmin.from('summaries').insert({
      report_id: reportId,
      category_id: category.id,
      topic_headline: result.topicHeadline,
      summary_body: result.summaryBody,
      source_urls: result.sourceUrls,
      thumbnail_url: thumbnailUrl,
    });

    if (insertError) {
      console.error(`[generateReport] Insert error for ${category.label}:`, insertError);
      errors.push(`[${category.label}] Failed to insert summary: ${insertError.message}`);
    } else {
      console.log(`[generateReport] Successfully inserted summary for ${category.label}`);
      summaryCount++;
    }
  }

  console.log(`[generateReport] Finished processing. summaryCount=${summaryCount}, errors.length=${errors.length}`);

  // --- Step 4: Update report status ---
  const finalStatus = summaryCount === 0 ? 'error' : 'complete';
  await supabaseAdmin
    .from('reports')
    .update({ status: finalStatus })
    .eq('id', reportId);

  // --- Step 5: Send push notification ---
  const notificationTitle = finalStatus === 'complete'
    ? 'Daily Digest is ready 📰'
    : 'Daily Digest completed with errors ⚠️';
  const notificationBody = finalStatus === 'complete'
    ? `Your report for ${today} is available.`
    : `Your report for ${today} has ${errors.length} error(s).`;

  await sendPushNotification({ title: notificationTitle, body: notificationBody });

  return { reportId, summaryCount, status: finalStatus, errors };
}

/**
 * Downloads an image from thumbnailUrl and uploads it to Supabase Storage.
 * Returns the public URL of the uploaded file, or null on failure.
 */
export async function uploadThumbnail(
  thumbnailUrl: string,
  reportId: string,
  categorySlug: string
): Promise<string | null> {
  try {
    const response = await fetch(thumbnailUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch thumbnail from ${thumbnailUrl}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = getExtensionFromContentType(response.headers.get('content-type') || '');
    const fileName = `${reportId}/${categorySlug}${ext}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('thumbnails')
      .upload(fileName, buffer, {
        contentType: response.headers.get('content-type') || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Failed to upload thumbnail:', uploadError);
      return null;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('thumbnails')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Error uploading thumbnail:', err);
    return null;
  }
}

function getExtensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  };
  return map[contentType] || '.jpg';
}
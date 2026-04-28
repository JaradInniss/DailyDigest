import { supabaseAdmin } from '@/lib/supabase/server';
import { summariseCategory } from '@/lib/gemini/summarise';
import { generateUnifiedSummary } from '@/lib/gemini/generateUnifiedSummary';
import { sendPushNotification } from '@/lib/webpush/send';
import { getUserTimezone } from '@/app/settings/actions';
import type { SummaryResult } from '@/types/summary';

interface GenerateReportResult {
  reportId: string;
  summaryCount: number;
  status: 'complete' | 'error';
  errors: string[];
}

function computeDateInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  return `${year}-${month}-${day}`;
}

/**
 * Orchestrates the full daily report generation:
 * 1. Fetches selected categories
 * 2. Creates a pending report row
 * 3. Summarises each category via Gemini
 * 4. Uploads thumbnails to Supabase Storage (if any)
 * 5. Inserts summary rows
 * 6. Generates and stores unified summary
 * 7. Updates report status
 * 8. Sends a push notification
 *
 * @param timezone - IANA timezone string (e.g. 'Asia/Shanghai', 'America/New_York').
 *                   If not provided, falls back to the user's stored timezone setting.
 */
export async function generateReport(timezone?: string): Promise<GenerateReportResult> {
  const tz = timezone || await getUserTimezone();
  const today = computeDateInTimezone(tz);

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

  // Store category summaries for unified summary generation
  const categorySummariesForUnified: { categoryLabel: string; topicHeadline: string; summaryBody: string }[] = [];

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

    // Upload thumbnail if present (with sourceUrls for og:image fallback)
    let thumbnailUrl: string | null = null;
    if (result.thumbnailUrl) {
      console.log(`[generateReport] Uploading thumbnail for ${category.label}`);
      thumbnailUrl = await uploadThumbnail(result.thumbnailUrl, reportId, category.slug, result.sourceUrls);
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
      // Store for unified summary generation
      categorySummariesForUnified.push({
        categoryLabel: category.label,
        topicHeadline: result.topicHeadline,
        summaryBody: result.summaryBody,
      });
    }
  }

  console.log(`[generateReport] Finished processing. summaryCount=${summaryCount}, errors.length=${errors.length}`);

  // --- Step 4: Generate and store unified summary ---
  let unifiedSummary: string | null = null;
  if (categorySummariesForUnified.length > 0) {
    console.log(`[generateReport] Generating unified summary for ${categorySummariesForUnified.length} categories`);
    const unifiedResult = await generateUnifiedSummary(categorySummariesForUnified);
    if ('summary' in unifiedResult) {
      unifiedSummary = unifiedResult.summary;
      console.log(`[generateReport] Unified summary generated successfully`);
    } else {
      console.error(`[generateReport] Failed to generate unified summary:`, unifiedResult.error);
    }
  }

  // --- Step 5: Update report status and unified summary ---
  const finalStatus = summaryCount === 0 ? 'error' : 'complete';
  await supabaseAdmin
    .from('reports')
    .update({ status: finalStatus, unified_summary: unifiedSummary })
    .eq('id', reportId);

  // --- Step 6: Send push notification ---
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
 *
 * Enhanced with:
 * - URL validation (must be valid HTTP(S) URL)
 * - Content-type verification (must be an image)
 * - Fallback to og:image from source URL if thumbnail is invalid
 */
export async function uploadThumbnail(
  thumbnailUrl: string,
  reportId: string,
  categorySlug: string,
  sourceUrls?: string[]
): Promise<string | null> {
  // Attempt primary thumbnail URL first
  const uploadedUrl = await uploadThumbnailFromUrl(thumbnailUrl, reportId, categorySlug);
  if (uploadedUrl) {
    return uploadedUrl;
  }

  // Fallback: try to extract og:image from first source URL
  if (sourceUrls && sourceUrls.length > 0) {
    console.log(`[uploadThumbnail] Attempting og:image fallback from source: ${sourceUrls[0]}`);
    const ogImageUrl = await extractOgImage(sourceUrls[0]);
    if (ogImageUrl) {
      const fallbackUrl = await uploadThumbnailFromUrl(ogImageUrl, reportId, categorySlug);
      if (fallbackUrl) {
        console.log(`[uploadThumbnail] Og:image fallback succeeded: ${fallbackUrl}`);
        return fallbackUrl;
      }
    }
  }

  console.log(`[uploadThumbnail] All thumbnail attempts failed for category ${categorySlug}`);
  return null;
}

/**
 * Fetches an image from a URL and uploads to Supabase Storage.
 * Returns the public URL on success, or null on failure.
 */
async function uploadThumbnailFromUrl(
  imageUrl: string,
  reportId: string,
  categorySlug: string
): Promise<string | null> {
  // Validate URL is HTTP(S)
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      console.warn(`[uploadThumbnail] Invalid protocol: ${parsedUrl.protocol}`);
      return null;
    }
  } catch {
    console.warn(`[uploadThumbnail] Invalid URL: ${imageUrl}`);
    return null;
  }

  try {
    // Fetch with timeout and image content-type validation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'image/*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[uploadThumbnail] Non-OK status ${response.status} from ${imageUrl}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.warn(`[uploadThumbnail] Not an image: ${contentType} from ${imageUrl}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = getExtensionFromContentType(contentType);
    const fileName = `${reportId}/${categorySlug}${ext}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('thumbnails')
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[uploadThumbnail] Failed to upload thumbnail:', uploadError);
      return null;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('thumbnails')
      .getPublicUrl(fileName);

    console.log(`[uploadThumbnail] Successfully uploaded: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn(`[uploadThumbnail] Timeout fetching: ${imageUrl}`);
    } else {
      console.error('[uploadThumbnail] Error uploading thumbnail:', err);
    }
    return null;
  }
}

/**
 * Extracts og:image meta tag content from a source URL's HTML page.
 * Returns null if no og:image is found or URL is unreachable.
 */
async function extractOgImage(sourceUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('html')) {
      return null;
    }

    const html = await response.text();

    // Extract og:image from HTML
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (ogImageMatch && ogImageMatch[1]) {
      const ogImageUrl = ogImageMatch[1].trim();
      // Validate it's an absolute URL
      if (ogImageUrl.startsWith('http://') || ogImageUrl.startsWith('https://')) {
        return ogImageUrl;
      }
    }

    return null;
  } catch {
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
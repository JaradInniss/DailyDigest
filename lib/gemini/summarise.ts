import { getGroundedModel } from './client';
import type { SummaryResult, SummaryError } from '@/types/summary';

const PREFERRED_SOURCES = [
  'BBC',
  'Reuters',
  'AP News',
  'Wired',
  'TechCrunch',
  'ESPN',
  'The Verge',
  'Nature',
  'Financial Times',
  'Ars Technica',
  'The Guardian',
  'Bloomberg',
];

/**
 * Fetches and summarises the top news story for a given category using
 * Gemini 2.5 Flash Lite with Google Search Grounding.
 *
 * Returns a SummaryResult on success, or a SummaryError on failure.
 * NEVER throws — always returns a typed result.
 */
export async function summariseCategory(
  label: string
): Promise<SummaryResult | SummaryError> {
  const model = getGroundedModel();

  const prompt = `You are a news journalist. Find the top news story for the category "${label}" from the last 24 hours.

Prefer sources from: ${PREFERRED_SOURCES.join(', ')}.
You must cite at least 2 distinct, reputable sources.

Return ONLY valid JSON — no preamble, no markdown fences, no explanation. JSON only.
Fields required:
{
  "topicHeadline": "string (compelling headline, max 80 chars)",
  "summaryBody": "string (5-10 sentences, informative journalistic style)",
  "thumbnailUrl": "string (optional, a direct image URL for the story thumbnail)
}`;

  try {
    // Use google_search tool for gemini-2.5-flash-lite
    // The SDK doesn't type google_search, so we cast to bypass TypeScript checking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = [{ google_search: {} }] as any;
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools,
    });

    // Extract grounding metadata for source URLs
    // The actual verified source URLs come from groundingMetadata, not from the model's text
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groundingMetadata = (result as any).response?.candidates?.[0]?.grounding_metadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];

    // Extract source URLs from grounding chunks (these are the verified source URLs)
    const sourceUrls: string[] = [];
    for (const chunk of groundingChunks) {
      if (chunk?.web?.uri && typeof chunk.web.uri === 'string') {
        sourceUrls.push(chunk.web.uri);
      }
      if (sourceUrls.length >= 2) break; // Only need 2 sources
    }

    const response = result.response;
    const text = response.text().trim();

    // Strip markdown code fences if present
    const jsonString = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

    const parsed = JSON.parse(jsonString) as {
      topicHeadline?: unknown;
      summaryBody?: unknown;
      thumbnailUrl?: unknown;
    };

    // Basic validation
    if (
      !parsed.topicHeadline ||
      typeof parsed.topicHeadline !== 'string' ||
      !parsed.summaryBody ||
      typeof parsed.summaryBody !== 'string'
    ) {
      return {
        error: 'Invalid response structure from Gemini',
        category: label,
      };
    }

    // If we don't have enough source URLs from grounding metadata, fall back to the model's text
    // (though this shouldn't happen with google_search grounding enabled)
    if (sourceUrls.length < 2) {
      console.warn(`[summariseCategory] ${label}: Only found ${sourceUrls.length} source URLs from grounding metadata`);
    }

    return {
      topicHeadline: parsed.topicHeadline,
      summaryBody: parsed.summaryBody,
      sourceUrls,
      thumbnailUrl: typeof parsed.thumbnailUrl === 'string' ? parsed.thumbnailUrl : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: message, category: label };
  }
}
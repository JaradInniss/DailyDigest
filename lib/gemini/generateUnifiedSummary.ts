import { getGroundedModel } from './client';

interface CategorySummaryInput {
  categoryLabel: string;
  topicHeadline: string;
  summaryBody: string;
}

interface UnifiedSummaryResult {
  summary: string;
}

interface UnifiedSummaryError {
  error: string;
}

/**
 * Generates a unified summary paragraph from multiple category summaries.
 * The result is a flowing paragraph that summarizes all categories WITHOUT
 * explicitly naming them in the text - it flows naturally between topics.
 * 
 * Returns a UnifiedSummaryResult on success, or a UnifiedSummaryError on failure.
 * NEVER throws — always returns a typed result.
 */
export async function generateUnifiedSummary(
  categories: CategorySummaryInput[]
): Promise<UnifiedSummaryResult | UnifiedSummaryError> {
  if (!categories || categories.length === 0) {
    return { error: 'No categories provided' };
  }

  const model = getGroundedModel();

  // Build the input text for the prompt
  const categoryInputs = categories
    .map((cat, i) => `Category ${i + 1} (${cat.categoryLabel}):\nHeadline: ${cat.topicHeadline}\nSummary: ${cat.summaryBody}`)
    .join('\n\n');

  const prompt = `You are a news editor creating a brief overview of today's news report.

Given the following category summaries from today's news digest, write ONE flowing paragraph (3-5 sentences) that summarizes the key news across all categories. Do NOT name the categories explicitly in the paragraph - instead, describe the topics in a way that flows naturally.

For example, instead of "In AI/ML news..." or "Regarding Politics...", start with general phrases like "Today in technology..." or "Developments in the AI field..." and transition smoothly between topics.

Keep the tone informative and journalistic. The paragraph should give readers a quick sense of what's happening across all the news categories today.

Category summaries:
${categoryInputs}

Return ONLY valid JSON — no preamble, no markdown fences, no explanation. JSON only.
Field required:
{
  "summary": "string (3-5 sentences, flowing paragraph, no category names explicitly mentioned)"
}`;

  try {
    // Use google_search tool for gemini-2.5-flash-lite
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = [{ google_search: {} }] as any;
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools,
    });

    const response = result.response;
    const text = response.text().trim();

    // Strip markdown code fences if present
    let jsonString = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

    // If the response still isn't valid JSON, try to extract just the JSON object
    // This handles cases where Gemini returns extra text before/after the JSON
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonString) as {
      summary?: unknown;
    };

    // Basic validation
    if (!parsed.summary || typeof parsed.summary !== 'string') {
      return {
        error: 'Invalid response structure from Gemini',
      };
    }

    return {
      summary: parsed.summary,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: message };
  }
}
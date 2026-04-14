/**
 * Parses a source URL to extract display information.
 * - Extracts the hostname and strips `www.`
 * - Title-cases common source names (bbc → BBC, reuters → Reuters, etc.)
 * - Determines if the URL is an article URL (has path beyond root) or homepage
 */

export interface ParsedSource {
  name: string;
  displayUrl: string;
  isArticleUrl: boolean;
}

export interface ValidatedSource {
  name: string;
  displayUrl: string;
  isArticleUrl: boolean;
  isReachable: boolean;
}

/**
 * Extracts the homepage URL for a given URL.
 */
export function getHomepageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}/`;
  } catch {
    return url;
  }
}

/**
 * Validates if a URL is reachable and returns a valid response.
 */
async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Validates a list of sources, checking reachability for article URLs.
 * Falls back to homepage URL if the article URL is not reachable.
 */
export async function validateSources(urls: string[]): Promise<ValidatedSource[]> {
  const results: ValidatedSource[] = [];
  const sources = urls.slice(0, 3).map(parseSource);

  for (const source of sources) {
    let isReachable = true;
    let displayUrl = source.displayUrl;

    if (source.isArticleUrl) {
      isReachable = await validateUrl(source.displayUrl);
      if (!isReachable) {
        // Fall back to homepage
        displayUrl = getHomepageUrl(source.displayUrl);
        isReachable = await validateUrl(displayUrl);
      }
    }

    results.push({
      ...source,
      displayUrl,
      isReachable,
      isArticleUrl: isReachable ? source.isArticleUrl : false,
    });
  }

  return results;
}

/**
 * Map of common source hostname patterns to their display names.
 */
const SOURCE_NAME_MAP: Record<string, string> = {
  'bbc': 'BBC',
  'bbc.co.uk': 'BBC',
  'reuters': 'Reuters',
  'apnews': 'AP News',
  'ap': 'AP News',
  'wired': 'Wired',
  'techcrunch': 'TechCrunch',
  'espn': 'ESPN',
  'theverge': 'The Verge',
  'verge': 'The Verge',
  'nature': 'Nature',
  'financialtimes': 'Financial Times',
  'ft': 'Financial Times',
  'arstechnica': 'Ars Technica',
  'arizona': 'Ars Technica',
  'theguardian': 'The Guardian',
  'guardian': 'The Guardian',
  'bloomberg': 'Bloomberg',
  'cnn': 'CNN',
  'nbcnews': 'NBC News',
  'nbc': 'NBC News',
  'cbsnews': 'CBS News',
  'cbs': 'CBS News',
  'npr': 'NPR',
  'usatoday': 'USA Today',
  'foxnews': 'Fox News',
  'wsj': 'WSJ',
  'wsj.com': 'WSJ',
  'nytimes': 'NY Times',
  'nytimes.com': 'NY Times',
  'washingtonpost': 'Washington Post',
  'washingtonpost.com': 'Washington Post',
  'sciencedaily': 'Science Daily',
  'space.com': 'Space',
  'engadget': 'Engadget',
  'mashable': 'Mashable',
  'theinformation': 'The Information',
  'information': 'The Information',
  'protocol': 'Protocol',
  'techhive': 'TechHive',
};

/**
 * Converts a hostname to a display name using the SOURCE_NAME_MAP.
 */
function extractSourceName(hostname: string): string {
  const base = hostname.replace(/^www\./, '').toLowerCase();

  // Check for exact match first
  if (SOURCE_NAME_MAP[base]) {
    return SOURCE_NAME_MAP[base];
  }

  // Check partial matches
  for (const [key, displayName] of Object.entries(SOURCE_NAME_MAP)) {
    if (base.includes(key)) {
      return displayName;
    }
  }

  // Fallback: title-case the hostname
  const withoutTld = base.split('.')[0];
  return withoutTld
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Determines if a URL path represents an article (has segments beyond root).
 * e.g.:
 *   - `https://bbc.com/news/article` → true (is article)
 *   - `https://bbc.com/` → false (is homepage)
 *   - `https://bbc.com/news` → false (is section, not article)
 */
function isArticleUrl(pathname: string): boolean {
  // Remove trailing slash
  const path = pathname.replace(/\/$/, '');
  
  // Count path segments
  const segments = path.split('/').filter(Boolean);
  
  // If there are 2+ segments, it's likely an article
  // e.g., /news/article has 2 segments
  // /tech has 1 segment - probably not an article, just a section
  return segments.length >= 2;
}

/**
 * Parses a source URL and returns display information.
 */
export function parseSource(url: string): ParsedSource {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const pathname = parsed.pathname;
    const name = extractSourceName(hostname);
    const isArticle = isArticleUrl(pathname);

    return {
      name,
      displayUrl: url,
      isArticleUrl: isArticle,
    };
  } catch {
    // If URL parsing fails, return a fallback
    const hostname = url.replace(/^https?:\/\//, '').split('/')[0];
    return {
      name: extractSourceName(hostname),
      displayUrl: url,
      isArticleUrl: false,
    };
  }
}

/**
 * Formats a list of source URLs for display, taking max 3 sources.
 */
export function formatSources(urls: string[]): ParsedSource[] {
  return urls.slice(0, 3).map(parseSource);
}
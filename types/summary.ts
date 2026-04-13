export interface SummaryResult {
  topicHeadline: string;
  summaryBody: string;
  sourceUrls: string[];
  thumbnailUrl?: string;
}

export interface SummaryError {
  error: string;
  category: string;
}
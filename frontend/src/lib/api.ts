/**
 * AI LawReview API 설정
 */
const DEFAULT_PROD_URL = 'https://communities-santa-valuable-bytes.trycloudflare.com';
const DEFAULT_DEV_URL = 'http://localhost:8001';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? DEFAULT_PROD_URL : DEFAULT_DEV_URL);

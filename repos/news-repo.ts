import { news as fetchNews } from '../lib/espn';
import type { NewsArticle } from '../lib/types';

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function mapNewsRow(row: Record<string, unknown>): NewsArticle {
  const images = parseJsonField<Array<{ url?: string; type?: string }>>(row.images, []);
  const categories = parseJsonField<Array<{ description?: string; type?: string }>>(row.categories, []);
  const headerImage = images.find((i) => i.type === 'header') ?? images[0];
  return {
    id: String(row.id ?? row.now_id ?? ''),
    headline: String(row.headline ?? ''),
    description: String(row.description ?? ''),
    published: String(row.published ?? row.last_modified ?? ''),
    byline: row.byline != null ? String(row.byline) : null,
    imageUrl: headerImage?.url ?? null,
    link: row.links_web_href != null ? String(row.links_web_href) : null,
    premium: Boolean(row.premium),
    categories: categories.map((c) => c.description).filter(Boolean) as string[],
  };
}

export class NewsRepo {
  async getNews(limit = 25): Promise<NewsArticle[]> {
    const rows = await fetchNews(limit, { cacheKey: `news:${limit}`, cacheTtlMs: 10 * 60 * 1000 });
    return (Array.isArray(rows) ? rows : []).map(mapNewsRow).filter((a) => a.id && a.headline);
  }
}

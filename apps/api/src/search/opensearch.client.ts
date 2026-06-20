import { Injectable, Logger } from '@nestjs/common';

export const LISTINGS_INDEX = 'mana_listings';

export interface ListingDoc {
  id: string;
  make: string | null;
  model: string | null;
  variant: string | null;
  city: string | null;
  fuelType: string | null;
  transmission: string | null;
  price: number | null;
  manufactureYear: number | null;
  odometerKm: number | null;
  dealScore: number | null;
  listedAt: string | null;
  dealerName: string | null;
}

export interface SearchQuery {
  q?: string;
  make?: string;
  model?: string;
  city?: string;
  fuelType?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  from: number;
  size: number;
}

/**
 * Thin, dependency-free OpenSearch/Elasticsearch REST client. Key-ready: active
 * only when OPENSEARCH_URL is set, otherwise the SearchService uses Postgres.
 */
@Injectable()
export class OpenSearchClient {
  private readonly logger = new Logger(OpenSearchClient.name);
  private readonly base = (process.env.OPENSEARCH_URL ?? '').replace(/\/$/, '');

  isEnabled(): boolean {
    return this.base.length > 0;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'content-type': 'application/json' };
    const user = process.env.OPENSEARCH_USERNAME;
    const pass = process.env.OPENSEARCH_PASSWORD;
    if (user && pass) {
      h.authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
    }
    return h;
  }

  private async req(method: string, path: string, body?: unknown): Promise<Response> {
    return fetch(`${this.base}${path}`, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  /** Create the index with explicit mappings if it does not already exist. */
  async ensureIndex(): Promise<void> {
    const head = await this.req('HEAD', `/${LISTINGS_INDEX}`);
    if (head.status === 200) return;
    await this.req('PUT', `/${LISTINGS_INDEX}`, {
      mappings: {
        properties: {
          make: { type: 'text', fields: { kw: { type: 'keyword' } } },
          model: { type: 'text', fields: { kw: { type: 'keyword' } } },
          variant: { type: 'text' },
          city: { type: 'text', fields: { kw: { type: 'keyword' } } },
          fuelType: { type: 'keyword' },
          transmission: { type: 'keyword' },
          price: { type: 'integer' },
          manufactureYear: { type: 'integer' },
          odometerKm: { type: 'integer' },
          dealScore: { type: 'float' },
          listedAt: { type: 'date' },
          dealerName: { type: 'text' },
        },
      },
    });
  }

  async indexDoc(doc: ListingDoc): Promise<void> {
    await this.req('PUT', `/${LISTINGS_INDEX}/_doc/${doc.id}`, doc);
  }

  async deleteDoc(id: string): Promise<void> {
    const res = await this.req('DELETE', `/${LISTINGS_INDEX}/_doc/${id}`);
    if (!res.ok && res.status !== 404) {
      this.logger.warn(`deleteDoc ${id} -> ${res.status}`);
    }
  }

  /** Bulk index a batch of docs (used by full reindex). */
  async bulkIndex(docs: ListingDoc[]): Promise<void> {
    if (docs.length === 0) return;
    const lines: string[] = [];
    for (const d of docs) {
      lines.push(JSON.stringify({ index: { _index: LISTINGS_INDEX, _id: d.id } }));
      lines.push(JSON.stringify(d));
    }
    await fetch(`${this.base}/_bulk`, {
      method: 'POST',
      headers: { ...this.headers(), 'content-type': 'application/x-ndjson' },
      body: lines.join('\n') + '\n',
    });
  }

  /** Returns ordered vehicle ids + total hits, or throws so the caller can fall back. */
  async search(q: SearchQuery): Promise<{ total: number; ids: string[] }> {
    const filter: unknown[] = [];
    if (q.make) filter.push({ match: { make: q.make } });
    if (q.model) filter.push({ match: { model: q.model } });
    if (q.city) filter.push({ match: { city: q.city } });
    if (q.fuelType) filter.push({ term: { fuelType: q.fuelType } });
    if (q.minPrice != null || q.maxPrice != null) {
      filter.push({
        range: { price: { gte: q.minPrice ?? 0, lte: q.maxPrice ?? 100_000_000 } },
      });
    }
    const must = q.q
      ? [{ multi_match: { query: q.q, fields: ['make^2', 'model^2', 'variant', 'city'] } }]
      : [{ match_all: {} }];

    const sort = {
      price_asc: [{ price: 'asc' }],
      price_desc: [{ price: 'desc' }],
      deal: [{ dealScore: 'desc' }],
      recent: [{ listedAt: 'desc' }],
    }[q.sort ?? 'recent'];

    const res = await this.req('POST', `/${LISTINGS_INDEX}/_search`, {
      from: q.from,
      size: q.size,
      track_total_hits: true,
      _source: false,
      query: { bool: { must, filter } },
      sort,
    });
    if (!res.ok) throw new Error(`OpenSearch search ${res.status}`);
    const json = (await res.json()) as {
      hits: { total: { value: number }; hits: { _id: string }[] };
    };
    return { total: json.hits.total.value, ids: json.hits.hits.map((h) => h._id) };
  }
}

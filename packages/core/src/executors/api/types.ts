import type { IncludedResource, ProductiveApiMeta } from '@studiometa/productive-api';

export const DEFAULT_MAX_PAGES = 10;
export const MAX_MAX_PAGES = 100;

export interface ApiReadOptions {
  path: string;
  query?: Record<string, string | number | boolean>;
  page?: number;
  paginate?: boolean;
  maxPages?: number;
}

export interface ApiWriteOptions {
  path: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean>;
}

export interface ApiPaginationMeta {
  pagesFetched: number;
  truncated: boolean;
}

export interface RawApiListResponse {
  data: unknown[];
  meta?: ProductiveApiMeta;
  included?: IncludedResource[];
}

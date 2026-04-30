import type { ProductiveApiMeta } from '@studiometa/productive-api';

import type { ExecutorContext } from '../../context/types.js';
import type { ExecutorResult } from '../types.js';

import {
  DEFAULT_MAX_PAGES,
  MAX_MAX_PAGES,
  type ApiPaginationMeta,
  type ApiReadOptions,
  type RawApiListResponse,
} from './types.js';

function isPaginatedListResponse(value: unknown): value is RawApiListResponse {
  return !!value && typeof value === 'object' && Array.isArray((value as RawApiListResponse).data);
}

function hasMorePages(meta?: ProductiveApiMeta): boolean {
  if (!meta) {
    return false;
  }

  const currentPage = meta.current_page ?? meta.page ?? 1;
  const totalPages =
    meta.total_pages ??
    (meta.total_count && meta.page_size
      ? Math.ceil(meta.total_count / meta.page_size)
      : meta.total && meta.per_page
        ? Math.ceil(meta.total / meta.per_page)
        : undefined);

  return totalPages ? currentPage < totalPages : false;
}

export async function readApi(
  options: ApiReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<unknown>> {
  if (!options.paginate) {
    const data = await ctx.api.requestRaw(options.path, {
      method: 'GET',
      query: options.query,
    });

    return { data };
  }

  const maxPages = Math.min(options.maxPages ?? DEFAULT_MAX_PAGES, MAX_MAX_PAGES);
  const combined: unknown[] = [];
  const included: RawApiListResponse['included'] = [];
  let lastResponse: RawApiListResponse | null = null;
  let page = options.page ?? 1;
  let pagesFetched = 0;

  while (page <= maxPages) {
    const response = await ctx.api.requestRaw<RawApiListResponse>(options.path, {
      method: 'GET',
      query: {
        ...options.query,
        'page[number]': page,
      },
    });

    if (!isPaginatedListResponse(response)) {
      return {
        data: response,
        meta: { pagesFetched: page, truncated: false } as ApiPaginationMeta & ProductiveApiMeta,
      };
    }

    combined.push(...response.data);
    if (response.included?.length) {
      included.push(...response.included);
    }

    lastResponse = response;
    pagesFetched += 1;

    if (!hasMorePages(response.meta)) {
      break;
    }

    page += 1;
  }

  const truncated =
    !!lastResponse?.meta && hasMorePages(lastResponse.meta) && pagesFetched >= maxPages;

  return {
    data: combined,
    meta: {
      ...lastResponse?.meta,
      pagesFetched,
      truncated,
    } as ProductiveApiMeta & ApiPaginationMeta,
    ...(included.length ? { included } : {}),
  };
}

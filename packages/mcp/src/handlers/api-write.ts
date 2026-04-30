import { writeApi } from '@studiometa/productive-core';

import type { HandlerContext, ToolResult } from './types.js';

import { UserInputError } from '../errors.js';
import { normalizeApiPath, resolveApiEndpoint } from './api-utils.js';
import { formatError, jsonResult } from './utils.js';

export interface ApiWriteArgs {
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  confirm?: boolean;
  dry_run?: boolean;
}

export async function handleApiWrite(args: ApiWriteArgs, ctx: HandlerContext): Promise<ToolResult> {
  try {
    if (process.env.PRODUCTIVE_MCP_ENABLE_API_WRITE !== 'true') {
      throw new UserInputError(
        'api_write is disabled. Set PRODUCTIVE_MCP_ENABLE_API_WRITE=true to enable it.',
      );
    }

    if (args.confirm !== true) {
      throw new UserInputError('api_write requires confirm=true.');
    }

    const { normalizedPath } = resolveApiEndpoint(args.path, args.method);

    if (args.dry_run) {
      return jsonResult({
        dry_run: true,
        method: args.method,
        path: normalizeApiPath(args.path),
        body: args.body,
      });
    }

    const result = await writeApi(
      {
        method: args.method,
        path: normalizedPath,
        body: args.body,
      },
      ctx.executor(),
    );

    return jsonResult(result.data);
  } catch (error) {
    return formatError(error);
  }
}

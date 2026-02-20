/**
 * Batch handler - execute multiple operations in a single call
 *
 * Enables AI agents to reduce round-trips by batching multiple
 * Productive.io operations into one MCP tool call.
 */

import type { ProductiveCredentials } from '../auth.js';
import type { ToolResult } from './types.js';

import { UserInputError } from '../errors.js';
import { inputErrorResult, jsonResult } from './utils.js';

/** Maximum number of operations allowed in a single batch */
export const MAX_BATCH_SIZE = 10;

/**
 * A single operation within a batch request
 */
export interface BatchOperation {
  resource: string;
  action: string;
  [key: string]: unknown;
}

/**
 * Result of a single batch operation
 */
export interface BatchOperationResult {
  resource: string;
  action: string;
  index: number;
  data?: unknown;
  error?: string;
}

/**
 * Summary of batch execution
 */
export interface BatchSummary {
  total: number;
  succeeded: number;
  failed: number;
}

/**
 * Full batch response
 */
export interface BatchResponse {
  _batch: BatchSummary;
  results: BatchOperationResult[];
}

/**
 * Function signature for executing a single tool operation
 * Injected for testability - in production this is executeToolWithCredentials
 */
export type ExecuteFunction = (
  name: string,
  args: Record<string, unknown>,
  credentials: ProductiveCredentials,
) => Promise<ToolResult>;

/**
 * Validate batch operations array
 */
function validateOperations(operations: unknown): BatchOperation[] {
  // Check if operations is an array
  if (!Array.isArray(operations)) {
    throw new UserInputError('operations must be an array', [
      'Provide an array of operation objects',
      'Each operation needs: { resource: "...", action: "...", ...params }',
    ]);
  }

  // Check if array is empty
  if (operations.length === 0) {
    throw new UserInputError('operations array cannot be empty', [
      'Provide at least one operation',
      'Example: operations: [{ resource: "projects", action: "list" }]',
    ]);
  }

  // Check max size
  if (operations.length > MAX_BATCH_SIZE) {
    throw new UserInputError(`operations array exceeds maximum size of ${MAX_BATCH_SIZE}`, [
      `Split your batch into chunks of ${MAX_BATCH_SIZE} or fewer operations`,
      `You provided ${operations.length} operations`,
    ]);
  }

  // Validate each operation
  const validatedOps: BatchOperation[] = [];
  const errors: string[] = [];

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];

    if (typeof op !== 'object' || op === null) {
      errors.push(`Operation at index ${i}: must be an object`);
      continue;
    }

    const { resource, action } = op as Record<string, unknown>;

    if (typeof resource !== 'string' || resource.trim() === '') {
      errors.push(`Operation at index ${i}: missing or invalid "resource" field`);
    }

    if (typeof action !== 'string' || action.trim() === '') {
      errors.push(`Operation at index ${i}: missing or invalid "action" field`);
    }

    if (errors.length === 0) {
      validatedOps.push(op as BatchOperation);
    }
  }

  if (errors.length > 0) {
    throw new UserInputError('Invalid operations in batch', errors);
  }

  return validatedOps;
}

/**
 * Execute a single operation and capture result
 */
async function executeOperation(
  operation: BatchOperation,
  index: number,
  credentials: ProductiveCredentials,
  execute: ExecuteFunction,
): Promise<BatchOperationResult> {
  const { resource, action, ...params } = operation;

  try {
    const result = await execute('productive', { resource, action, ...params }, credentials);

    // Parse the result content to extract data
    const content = result.content[0];
    if (content?.type === 'text') {
      try {
        const data = JSON.parse(content.text);
        if (result.isError) {
          return { resource, action, index, error: content.text };
        }
        return { resource, action, index, data };
      } catch {
        // If JSON parsing fails, treat text as error message if isError, otherwise as data
        if (result.isError) {
          return { resource, action, index, error: content.text };
        }
        return { resource, action, index, data: content.text };
      }
    }

    return { resource, action, index, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { resource, action, index, error: message };
  }
}

/**
 * Handle batch operation - execute multiple operations in parallel
 *
 * @param operations - Array of operations to execute
 * @param credentials - API credentials
 * @param execute - Function to execute individual operations (injected for testability)
 * @returns Batch response with summary and individual results
 */
export async function handleBatch(
  operations: unknown,
  credentials: ProductiveCredentials,
  execute: ExecuteFunction,
): Promise<ToolResult> {
  // Validate operations
  let validatedOps: BatchOperation[];
  try {
    validatedOps = validateOperations(operations);
  } catch (err) {
    if (err instanceof UserInputError) {
      return inputErrorResult(err);
    }
    throw err;
  }

  // Execute all operations in parallel
  const results = await Promise.all(
    validatedOps.map((op, index) => executeOperation(op, index, credentials, execute)),
  );

  // Calculate summary
  const succeeded = results.filter((r) => r.data !== undefined && r.error === undefined).length;
  const failed = results.filter((r) => r.error !== undefined).length;

  const response: BatchResponse = {
    _batch: {
      total: results.length,
      succeeded,
      failed,
    },
    results,
  };

  return jsonResult(response);
}

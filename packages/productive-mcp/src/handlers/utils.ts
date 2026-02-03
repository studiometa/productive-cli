/**
 * Utility functions for resource handlers
 */

import type { ToolResult } from './types.js';

import { UserInputError, isUserInputError } from '../errors.js';

/**
 * Helper to create a successful JSON response
 */
export function jsonResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Helper to create an error response from a string message
 */
export function errorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: `**Error:** ${message}` }],
    isError: true,
  };
}

/**
 * Helper to create an error response from a UserInputError
 * Includes formatted hints for LLM consumption
 */
export function inputErrorResult(error: UserInputError): ToolResult {
  return {
    content: [{ type: 'text', text: error.toFormattedMessage() }],
    isError: true,
  };
}

/**
 * Helper to create an error response from any error type
 * Automatically formats UserInputError with hints
 */
export function formatError(error: unknown): ToolResult {
  if (isUserInputError(error)) {
    return inputErrorResult(error);
  }

  const message = error instanceof Error ? error.message : String(error);
  return errorResult(message);
}

/**
 * Convert unknown filter to string filter for API
 */
export function toStringFilter(
  filter?: Record<string, unknown>,
): Record<string, string> | undefined {
  if (!filter) return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

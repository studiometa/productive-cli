/**
 * Tests for the batch handler
 */

import { describe, it, expect, vi } from 'vitest';

import type { ProductiveCredentials } from '../auth.js';
import type { ToolResult } from './types.js';

import { handleBatch, MAX_BATCH_SIZE, type BatchOperation, type BatchResponse } from './batch.js';

// Test credentials
const credentials: ProductiveCredentials = {
  apiToken: 'test-token',
  organizationId: 'test-org',
  userId: 'test-user',
};

// Helper to create a successful ToolResult
function successResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
  };
}

// Helper to create an error ToolResult
function errorResultHelper(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

// Helper to parse batch response from ToolResult
function parseResponse(result: ToolResult): BatchResponse {
  const content = result.content[0];
  if (content?.type === 'text') {
    return JSON.parse(content.text);
  }
  throw new Error('Unexpected result format');
}

describe('handleBatch', () => {
  describe('validation', () => {
    it('should error when operations is not an array', async () => {
      const mockExecute = vi.fn();

      const result = await handleBatch('not-an-array', credentials, mockExecute);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('operations must be an array');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should error when operations is null', async () => {
      const mockExecute = vi.fn();

      const result = await handleBatch(null, credentials, mockExecute);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('operations must be an array');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should error when operations is undefined', async () => {
      const mockExecute = vi.fn();

      const result = await handleBatch(undefined, credentials, mockExecute);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('operations must be an array');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should error when operations array is empty', async () => {
      const mockExecute = vi.fn();

      const result = await handleBatch([], credentials, mockExecute);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        'operations array cannot be empty',
      );
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should error when operations exceeds max size', async () => {
      const mockExecute = vi.fn();
      const operations = Array.from({ length: 11 }, (_, i) => ({
        resource: 'projects',
        action: 'list',
        index: i,
      }));

      const result = await handleBatch(operations, credentials, mockExecute);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        `exceeds maximum size of ${MAX_BATCH_SIZE}`,
      );
      expect((result.content[0] as { text: string }).text).toContain('11 operations');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should error when operation is not an object', async () => {
      const mockExecute = vi.fn();

      const result = await handleBatch(['not-an-object'], credentials, mockExecute);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('must be an object');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should error when operation is null', async () => {
      const mockExecute = vi.fn();

      const result = await handleBatch([null], credentials, mockExecute);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain('must be an object');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should error when operation is missing resource', async () => {
      const mockExecute = vi.fn();

      const result = await handleBatch([{ action: 'list' }], credentials, mockExecute);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        'missing or invalid "resource" field',
      );
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should error when operation has empty resource', async () => {
      const mockExecute = vi.fn();

      const result = await handleBatch(
        [{ resource: '  ', action: 'list' }],
        credentials,
        mockExecute,
      );

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        'missing or invalid "resource" field',
      );
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should error when operation is missing action', async () => {
      const mockExecute = vi.fn();

      const result = await handleBatch([{ resource: 'projects' }], credentials, mockExecute);

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        'missing or invalid "action" field',
      );
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should error when operation has empty action', async () => {
      const mockExecute = vi.fn();

      const result = await handleBatch(
        [{ resource: 'projects', action: '' }],
        credentials,
        mockExecute,
      );

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        'missing or invalid "action" field',
      );
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should report multiple validation errors', async () => {
      const mockExecute = vi.fn();

      const result = await handleBatch(
        [
          { action: 'list' }, // missing resource
          { resource: 'projects' }, // missing action
        ],
        credentials,
        mockExecute,
      );

      expect(result.isError).toBe(true);
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('index 0');
      expect(text).toContain('index 1');
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('execution', () => {
    it('should execute a single operation successfully', async () => {
      const mockExecute = vi.fn().mockResolvedValue(successResult({ id: '123', name: 'Test' }));

      const operations: BatchOperation[] = [{ resource: 'projects', action: 'get', id: '123' }];

      const result = await handleBatch(operations, credentials, mockExecute);

      expect(result.isError).toBeUndefined();
      const response = parseResponse(result);
      expect(response._batch).toEqual({ total: 1, succeeded: 1, failed: 0 });
      expect(response.results).toHaveLength(1);
      expect(response.results[0]).toEqual({
        resource: 'projects',
        action: 'get',
        index: 0,
        data: { id: '123', name: 'Test' },
      });

      expect(mockExecute).toHaveBeenCalledWith(
        'productive',
        { resource: 'projects', action: 'get', id: '123' },
        credentials,
      );
    });

    it('should execute multiple operations in parallel', async () => {
      const executionOrder: number[] = [];
      const mockExecute = vi.fn().mockImplementation(async (_, args) => {
        const index = (args as { index?: number }).index ?? 0;
        executionOrder.push(index);
        // Simulate varying response times to prove parallel execution
        await new Promise((resolve) => setTimeout(resolve, 10 - index));
        return successResult({ index });
      });

      const operations: BatchOperation[] = [
        { resource: 'projects', action: 'list', index: 0 },
        { resource: 'tasks', action: 'list', index: 1 },
        { resource: 'people', action: 'list', index: 2 },
      ];

      const result = await handleBatch(operations, credentials, mockExecute);

      expect(result.isError).toBeUndefined();
      const response = parseResponse(result);
      expect(response._batch).toEqual({ total: 3, succeeded: 3, failed: 0 });
      expect(response.results).toHaveLength(3);

      // All operations should have been called
      expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and error results', async () => {
      const mockExecute = vi.fn().mockImplementation(async (_, args) => {
        const { resource } = args as { resource: string };
        if (resource === 'projects') {
          return successResult({ id: '123' });
        }
        return errorResultHelper('Not found');
      });

      const operations: BatchOperation[] = [
        { resource: 'projects', action: 'get', id: '123' },
        { resource: 'tasks', action: 'get', id: '999' },
        { resource: 'people', action: 'list' },
      ];

      const result = await handleBatch(operations, credentials, mockExecute);

      expect(result.isError).toBeUndefined();
      const response = parseResponse(result);
      expect(response._batch).toEqual({ total: 3, succeeded: 1, failed: 2 });

      expect(response.results[0].data).toEqual({ id: '123' });
      expect(response.results[0].error).toBeUndefined();

      expect(response.results[1].error).toBe('Not found');
      expect(response.results[1].data).toBeUndefined();

      expect(response.results[2].error).toBe('Not found');
      expect(response.results[2].data).toBeUndefined();
    });

    it('should continue executing other operations when one fails', async () => {
      const callOrder: string[] = [];
      const mockExecute = vi.fn().mockImplementation(async (_, args) => {
        const { resource, action } = args as { resource: string; action: string };
        callOrder.push(`${resource}:${action}`);
        if (resource === 'tasks') {
          throw new Error('API Error');
        }
        return successResult({ resource, action });
      });

      const operations: BatchOperation[] = [
        { resource: 'projects', action: 'list' },
        { resource: 'tasks', action: 'list' }, // This will throw
        { resource: 'people', action: 'list' },
      ];

      const result = await handleBatch(operations, credentials, mockExecute);

      expect(result.isError).toBeUndefined();
      const response = parseResponse(result);

      // All operations should have been attempted
      expect(mockExecute).toHaveBeenCalledTimes(3);

      // Summary should reflect the failure
      expect(response._batch).toEqual({ total: 3, succeeded: 2, failed: 1 });

      // First and third should succeed
      expect(response.results[0].data).toEqual({ resource: 'projects', action: 'list' });
      expect(response.results[2].data).toEqual({ resource: 'people', action: 'list' });

      // Second should have captured error
      expect(response.results[1].error).toBe('API Error');
    });

    it('should preserve operation index in results', async () => {
      const mockExecute = vi.fn().mockResolvedValue(successResult({ ok: true }));

      const operations: BatchOperation[] = [
        { resource: 'projects', action: 'list' },
        { resource: 'tasks', action: 'list' },
        { resource: 'people', action: 'list' },
      ];

      const result = await handleBatch(operations, credentials, mockExecute);

      const response = parseResponse(result);

      expect(response.results[0].index).toBe(0);
      expect(response.results[1].index).toBe(1);
      expect(response.results[2].index).toBe(2);
    });

    it('should pass additional params to each operation', async () => {
      const mockExecute = vi.fn().mockResolvedValue(successResult({ ok: true }));

      const operations: BatchOperation[] = [
        {
          resource: 'time',
          action: 'create',
          service_id: '111',
          date: '2024-01-15',
          time: 60,
          note: 'Test work',
        },
      ];

      const result = await handleBatch(operations, credentials, mockExecute);

      expect(result.isError).toBeUndefined();
      expect(mockExecute).toHaveBeenCalledWith(
        'productive',
        {
          resource: 'time',
          action: 'create',
          service_id: '111',
          date: '2024-01-15',
          time: 60,
          note: 'Test work',
        },
        credentials,
      );
    });

    it('should handle non-JSON text responses as data', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Plain text response' }],
      });

      const operations: BatchOperation[] = [{ resource: 'projects', action: 'list' }];

      const result = await handleBatch(operations, credentials, mockExecute);

      const response = parseResponse(result);
      expect(response.results[0].data).toBe('Plain text response');
    });

    it('should handle empty content gracefully', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        content: [{ type: 'image', url: 'test.png' }],
      });

      const operations: BatchOperation[] = [{ resource: 'projects', action: 'list' }];

      const result = await handleBatch(operations, credentials, mockExecute);

      const response = parseResponse(result);
      expect(response.results[0].data).toBeNull();
    });

    it('should execute exactly MAX_BATCH_SIZE operations', async () => {
      const mockExecute = vi.fn().mockResolvedValue(successResult({ ok: true }));

      const operations = Array.from({ length: MAX_BATCH_SIZE }, (_, i) => ({
        resource: 'projects',
        action: 'list',
        page: i + 1,
      }));

      const result = await handleBatch(operations, credentials, mockExecute);

      expect(result.isError).toBeUndefined();
      const response = parseResponse(result);
      expect(response._batch.total).toBe(MAX_BATCH_SIZE);
      expect(response._batch.succeeded).toBe(MAX_BATCH_SIZE);
      expect(mockExecute).toHaveBeenCalledTimes(MAX_BATCH_SIZE);
    });
  });

  describe('result structure', () => {
    it('should return proper _batch summary structure', async () => {
      const mockExecute = vi.fn().mockResolvedValue(successResult({ ok: true }));

      const operations: BatchOperation[] = [
        { resource: 'projects', action: 'list' },
        { resource: 'tasks', action: 'list' },
      ];

      const result = await handleBatch(operations, credentials, mockExecute);

      const response = parseResponse(result);
      expect(response._batch).toHaveProperty('total');
      expect(response._batch).toHaveProperty('succeeded');
      expect(response._batch).toHaveProperty('failed');
      expect(typeof response._batch.total).toBe('number');
      expect(typeof response._batch.succeeded).toBe('number');
      expect(typeof response._batch.failed).toBe('number');
    });

    it('should return proper result item structure for success', async () => {
      const mockExecute = vi.fn().mockResolvedValue(successResult({ id: '123' }));

      const operations: BatchOperation[] = [{ resource: 'projects', action: 'get', id: '123' }];

      const result = await handleBatch(operations, credentials, mockExecute);

      const response = parseResponse(result);
      const item = response.results[0];
      expect(item).toHaveProperty('resource', 'projects');
      expect(item).toHaveProperty('action', 'get');
      expect(item).toHaveProperty('index', 0);
      expect(item).toHaveProperty('data');
      expect(item).not.toHaveProperty('error');
    });

    it('should return proper result item structure for error', async () => {
      const mockExecute = vi.fn().mockResolvedValue(errorResultHelper('Not found'));

      const operations: BatchOperation[] = [{ resource: 'projects', action: 'get', id: '999' }];

      const result = await handleBatch(operations, credentials, mockExecute);

      const response = parseResponse(result);
      const item = response.results[0];
      expect(item).toHaveProperty('resource', 'projects');
      expect(item).toHaveProperty('action', 'get');
      expect(item).toHaveProperty('index', 0);
      expect(item).toHaveProperty('error');
      expect(item).not.toHaveProperty('data');
    });
  });

  describe('MAX_BATCH_SIZE constant', () => {
    it('should be 10', () => {
      expect(MAX_BATCH_SIZE).toBe(10);
    });
  });
});

/**
 * MCP integration tests — stdio transport
 *
 * Spawns the real productive-mcp binary and connects via StdioClientTransport.
 * Uses the same sandbox pattern as CLI — locked-down env, no real config/keychain.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createMcpStdioClient, type McpStdioClient } from '../helpers/mcp-client.js';
import { startMockServer, type MockServer } from '../helpers/mock-server.js';

describe('MCP: stdio transport', () => {
  let mockServer: MockServer;
  let mcpClient: McpStdioClient;

  beforeAll(async () => {
    mockServer = await startMockServer();
    mcpClient = await createMcpStdioClient(mockServer.apiUrl);
  });

  afterAll(async () => {
    await mcpClient.client.close();
    await mcpClient.sandbox.cleanup();
    await mockServer.close();
  });

  it('should list available tools', async () => {
    const { tools } = await mcpClient.client.listTools();

    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    // The unified tool
    const productiveTool = tools.find((t) => t.name === 'productive');
    expect(productiveTool).toBeDefined();
    expect(productiveTool?.description).toBeTruthy();
  });

  it('should list available prompts', async () => {
    const { prompts } = await mcpClient.client.listPrompts();

    expect(Array.isArray(prompts)).toBe(true);
  });

  it('should call productive tool to list projects', async () => {
    const result = await mcpClient.client.callTool({
      name: 'productive',
      arguments: { resource: 'projects', action: 'list' },
    });

    expect(result.isError).toBeFalsy();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('Alpha Website');
    expect(text).toContain('Beta App');
  });

  it('should call productive tool to get a project by ID', async () => {
    const result = await mcpClient.client.callTool({
      name: 'productive',
      arguments: { resource: 'projects', action: 'get', id: '101' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('Alpha Website');
  });

  it('should call productive tool to list time entries', async () => {
    const result = await mcpClient.client.callTool({
      name: 'productive',
      arguments: { resource: 'time', action: 'list' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('2024-07-15');
  });

  it('should return error result for unknown resource', async () => {
    const result = await mcpClient.client.callTool({
      name: 'productive',
      arguments: { resource: 'nonexistent', action: 'list' },
    });

    // MCP tools return isError=true for user-facing errors (not protocol errors)
    expect(result.isError).toBe(true);
  });
});

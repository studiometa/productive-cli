#!/usr/bin/env node

/**
 * Productive MCP Server - HTTP Transport
 *
 * This is the remote HTTP server mode for Claude Desktop custom connectors.
 * Credentials are passed via Bearer token in the Authorization header.
 *
 * Token format: base64(organizationId:apiToken) or base64(organizationId:apiToken:userId)
 *
 * Generate your token:
 *   echo -n "YOUR_ORG_ID:YOUR_API_TOKEN:YOUR_USER_ID" | base64
 *
 * Usage:
 *   productive-mcp-server
 *   PORT=3000 productive-mcp-server
 *
 * Claude Desktop custom connector config:
 *   Name: Productive
 *   URL: https://productive.mcp.ikko.dev
 *   (No OAuth needed - uses Bearer token)
 */

import { createApp, createRouter, defineEventHandler, readBody, getHeader, setResponseHeader, toNodeListener } from 'h3';
import { createServer } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { TOOLS } from './tools.js';
import { executeToolWithCredentials } from './handlers.js';
import { parseAuthHeader } from './auth.js';
import type { ProductiveCredentials } from './auth.js';

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Store active transports by session
const sessions = new Map<string, { server: Server; credentials: ProductiveCredentials }>();

/**
 * Create a new MCP server instance for a session
 */
function createMcpServer(credentials: ProductiveCredentials): Server {
  const server = new Server(
    {
      name: 'productive-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools (no config tools in HTTP mode)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await executeToolWithCredentials(name, (args as Record<string, unknown>) || {}, credentials);
  });

  return server;
}

/**
 * Generate a session ID
 */
function generateSessionId(): string {
  return crypto.randomUUID();
}

// Create h3 app
const app = createApp();
const router = createRouter();

// Health check endpoint
router.get(
  '/',
  defineEventHandler(() => {
    return { status: 'ok', service: 'productive-mcp', version: '0.1.0' };
  })
);

router.get(
  '/health',
  defineEventHandler(() => {
    return { status: 'ok' };
  })
);

// MCP endpoint - handles JSON-RPC over HTTP
router.post(
  '/mcp',
  defineEventHandler(async (event) => {
    // Parse authorization header
    const authHeader = getHeader(event, 'authorization');
    const credentials = parseAuthHeader(authHeader);

    if (!credentials) {
      setResponseHeader(event, 'Content-Type', 'application/json');
      event.node.res.statusCode = 401;
      return {
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message:
            'Authentication required. Provide Bearer token with base64(organizationId:apiToken:userId)',
        },
        id: null,
      };
    }

    // Get or create session
    let sessionId = getHeader(event, 'x-session-id');
    let session = sessionId ? sessions.get(sessionId) : undefined;

    if (!session) {
      sessionId = generateSessionId();
      const server = createMcpServer(credentials);
      session = { server, credentials };
      sessions.set(sessionId, session);

      // Clean up session after 1 hour of inactivity
      setTimeout(
        () => {
          sessions.delete(sessionId!);
        },
        60 * 60 * 1000
      );
    }

    // Set session ID in response
    setResponseHeader(event, 'X-Session-Id', sessionId);
    setResponseHeader(event, 'Content-Type', 'application/json');

    // Parse JSON-RPC request
    const body = await readBody(event);

    if (!body || typeof body !== 'object') {
      event.node.res.statusCode = 400;
      return {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error: Invalid JSON',
        },
        id: null,
      };
    }

    // Handle the JSON-RPC request manually since we're not using the SDK's transport
    const { method, params, id } = body as { method: string; params?: unknown; id?: string | number };

    try {
      if (method === 'initialize') {
        return {
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'productive-mcp',
              version: '0.1.0',
            },
            capabilities: {
              tools: {},
            },
          },
          id,
        };
      }

      if (method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          result: {
            tools: TOOLS,
          },
          id,
        };
      }

      if (method === 'tools/call') {
        const { name, arguments: args } = params as { name: string; arguments?: Record<string, unknown> };
        const result = await executeToolWithCredentials(name, args || {}, credentials);
        return {
          jsonrpc: '2.0',
          result,
          id,
        };
      }

      // Unknown method
      return {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
        id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Internal error: ${message}`,
        },
        id,
      };
    }
  })
);

// SSE endpoint for server-sent events (optional, for streaming responses)
router.get(
  '/mcp/sse',
  defineEventHandler(async (event) => {
    const authHeader = getHeader(event, 'authorization');
    const credentials = parseAuthHeader(authHeader);

    if (!credentials) {
      event.node.res.statusCode = 401;
      return { error: 'Authentication required' };
    }

    // Set SSE headers
    setResponseHeader(event, 'Content-Type', 'text/event-stream');
    setResponseHeader(event, 'Cache-Control', 'no-cache');
    setResponseHeader(event, 'Connection', 'keep-alive');

    // Generate session ID and send it
    const sessionId = generateSessionId();
    const server = createMcpServer(credentials);
    sessions.set(sessionId, { server, credentials });

    // Send initial session event
    event.node.res.write(`event: session\ndata: ${JSON.stringify({ sessionId })}\n\n`);

    // Keep connection alive
    const keepAlive = setInterval(() => {
      event.node.res.write(': keepalive\n\n');
    }, 30000);

    // Clean up on close
    event.node.req.on('close', () => {
      clearInterval(keepAlive);
      sessions.delete(sessionId);
    });

    // Don't end the response - keep it open for SSE
    return new Promise(() => {});
  })
);

app.use(router);

// Start server
const httpServer = createServer(toNodeListener(app));

httpServer.listen(PORT, HOST, () => {
  console.log(`Productive MCP server running at http://${HOST}:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST ${HOST === '0.0.0.0' ? 'http://localhost' : `http://${HOST}`}:${PORT}/mcp - MCP JSON-RPC endpoint`);
  console.log(`  GET  ${HOST === '0.0.0.0' ? 'http://localhost' : `http://${HOST}`}:${PORT}/health - Health check`);
  console.log('');
  console.log('Authentication:');
  console.log('  Pass Bearer token in Authorization header');
  console.log('  Token format: base64(organizationId:apiToken:userId)');
  console.log('');
  console.log('Generate token:');
  console.log('  echo -n "ORG_ID:API_TOKEN:USER_ID" | base64');
});

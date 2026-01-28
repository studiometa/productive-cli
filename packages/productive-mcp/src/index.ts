#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ProductiveApi, getConfig, setConfig } from '@studiometa/productive-cli';
import type { ProductiveConfig } from '@studiometa/productive-cli';

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'productive_list_projects',
    description: 'List projects from Productive.io with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          description: 'Filters to apply',
          properties: {
            board_id: { type: 'string', description: 'Filter by board ID' },
            company_id: { type: 'string', description: 'Filter by company ID' },
            project_manager_id: { type: 'string', description: 'Filter by project manager ID' },
            workflow_status: { type: 'string', description: 'Filter by workflow status' },
          },
        },
        page: { type: 'number', description: 'Page number (default: 1)' },
        per_page: { type: 'number', description: 'Items per page (default: 50, max: 200)' },
      },
    },
  },
  {
    name: 'productive_get_project',
    description: 'Get details for a specific project by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID', required: true },
      },
      required: ['id'],
    },
  },
  {
    name: 'productive_list_time_entries',
    description: 'List time entries with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          description: 'Filters to apply',
          properties: {
            person_id: { type: 'string', description: 'Filter by person ID' },
            project_id: { type: 'string', description: 'Filter by project ID' },
            service_id: { type: 'string', description: 'Filter by service ID' },
            task_id: { type: 'string', description: 'Filter by task ID' },
            after: { type: 'string', description: 'After date (YYYY-MM-DD)' },
            before: { type: 'string', description: 'Before date (YYYY-MM-DD)' },
          },
        },
        page: { type: 'number', description: 'Page number (default: 1)' },
        per_page: { type: 'number', description: 'Items per page (default: 50, max: 200)' },
      },
    },
  },
  {
    name: 'productive_get_time_entry',
    description: 'Get details for a specific time entry by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Time entry ID', required: true },
      },
      required: ['id'],
    },
  },
  {
    name: 'productive_create_time_entry',
    description: 'Create a new time entry',
    inputSchema: {
      type: 'object',
      properties: {
        person_id: { type: 'string', description: 'Person ID', required: true },
        service_id: { type: 'string', description: 'Service ID', required: true },
        time: { type: 'number', description: 'Time in minutes', required: true },
        date: { type: 'string', description: 'Date (YYYY-MM-DD)', required: true },
        note: { type: 'string', description: 'Note/description' },
        task_id: { type: 'string', description: 'Task ID (optional)' },
      },
      required: ['person_id', 'service_id', 'time', 'date'],
    },
  },
  {
    name: 'productive_list_tasks',
    description: 'List tasks with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          description: 'Filters to apply',
          properties: {
            project_id: { type: 'string', description: 'Filter by project ID' },
            assignee_id: { type: 'string', description: 'Filter by assignee ID' },
            task_list_id: { type: 'string', description: 'Filter by task list ID' },
            workflow_status_id: { type: 'string', description: 'Filter by workflow status ID' },
          },
        },
        page: { type: 'number', description: 'Page number (default: 1)' },
        per_page: { type: 'number', description: 'Items per page (default: 50, max: 200)' },
      },
    },
  },
  {
    name: 'productive_get_task',
    description: 'Get details for a specific task by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID', required: true },
      },
      required: ['id'],
    },
  },
  {
    name: 'productive_list_people',
    description: 'List people from the organization',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          description: 'Filters to apply',
          properties: {
            archived: { type: 'boolean', description: 'Filter by archived status' },
          },
        },
        page: { type: 'number', description: 'Page number (default: 1)' },
        per_page: { type: 'number', description: 'Items per page (default: 50, max: 200)' },
      },
    },
  },
  {
    name: 'productive_get_person',
    description: 'Get details for a specific person by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Person ID', required: true },
      },
      required: ['id'],
    },
  },
  {
    name: 'productive_configure',
    description: 'Configure Productive.io credentials (organization ID, API token, and optionally user ID)',
    inputSchema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', description: 'Your Productive.io organization ID', required: true },
        apiToken: { type: 'string', description: 'Your Productive.io API token', required: true },
        userId: { type: 'string', description: 'Your Productive.io user ID (optional, for time entries)' },
      },
      required: ['organizationId', 'apiToken'],
    },
  },
  {
    name: 'productive_get_config',
    description: 'Get current Productive.io configuration (without exposing the API token)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Initialize MCP server
const server = new Server(
  {
    name: 'productive-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'setup_productive',
        description: 'Interactive setup for Productive.io credentials',
        arguments: [],
      },
    ],
  };
});

// Get prompt
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === 'setup_productive') {
    const config = await getConfig();
    const hasConfig = !!(config.organizationId && config.apiToken);

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: hasConfig
              ? 'I have already configured Productive.io credentials. Would you like to update them?'
              : 'I need to configure my Productive.io credentials. Please help me set up:\n1. Organization ID\n2. API Token\n3. User ID (optional)',
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${request.params.name}`);
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Configuration tools don't need credentials
    if (name === 'productive_configure') {
      const { organizationId, apiToken, userId } = args as any;
      
      // Save configuration
      await setConfig('organizationId', organizationId);
      await setConfig('apiToken', apiToken);
      if (userId) {
        await setConfig('userId', userId);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Productive.io credentials configured successfully',
              configured: {
                organizationId,
                userId: userId || 'not set',
                apiToken: '***' + apiToken.slice(-4),
              },
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'productive_get_config') {
      const currentConfig = await getConfig();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              organizationId: currentConfig.organizationId || 'not configured',
              userId: currentConfig.userId || 'not configured',
              apiToken: currentConfig.apiToken ? '***' + currentConfig.apiToken.slice(-4) : 'not configured',
              configured: !!(currentConfig.organizationId && currentConfig.apiToken),
            }, null, 2),
          },
        ],
      };
    }

    // Get config for API tools
    const config = await getConfig();
    if (!config.organizationId || !config.apiToken) {
      throw new Error(
        'Productive.io credentials not configured. Please use the "productive_configure" tool to set your credentials, or set PRODUCTIVE_ORGANIZATION_ID and PRODUCTIVE_API_TOKEN environment variables.'
      );
    }

    // Initialize API client
    const api = new ProductiveApi({
      apiToken: config.apiToken,
      organizationId: config.organizationId,
    } as Record<string, string>);

    // Handle different tool calls
    switch (name) {
      case 'productive_list_projects': {
        const result = await api.getProjects(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'productive_get_project': {
        const result = await api.getProject((args as any).id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'productive_list_time_entries': {
        const result = await api.getTimeEntries(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'productive_get_time_entry': {
        const result = await api.getTimeEntry((args as any).id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'productive_create_time_entry': {
        const result = await api.createTimeEntry(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'productive_list_tasks': {
        const result = await api.getTasks(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'productive_get_task': {
        const result = await api.getTask((args as any).id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'productive_list_people': {
        const result = await api.getPeople(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'productive_get_person': {
        const result = await api.getPerson((args as any).id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Productive MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

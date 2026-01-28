# @studiometa/productive-mcp

[![npm version](https://img.shields.io/npm/v/@studiometa/productive-mcp?style=flat&colorB=3e63dd&colorA=414853)](https://www.npmjs.com/package/@studiometa/productive-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat&colorB=3e63dd&colorA=414853)](https://opensource.org/licenses/MIT)

MCP (Model Context Protocol) server for [Productive.io](https://productive.io) API integration. Enables Claude Desktop and other MCP clients to interact with Productive.io for project management, time tracking, and task management.

## Features

- ✅ Full Productive.io API access via MCP
- 🔧 Support for projects, tasks, time entries, and people
- 🔐 Secure credential management
- 🐳 Docker-ready for easy deployment
- 📦 Built on [@studiometa/productive-cli](../productive-cli)

## Quick Start

### 1. Install for Claude Desktop

```bash
# Install globally
npm install -g @studiometa/productive-mcp
```

Configure Claude Desktop by editing:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "productive": {
      "command": "productive-mcp"
    }
  }
}
```

Restart Claude Desktop.

### 2. Configure via Claude Desktop

Once Claude Desktop restarts, simply ask Claude:

> "Configure my Productive.io credentials"

Claude will guide you through the setup using the MCP configuration tools. You'll need:

1. **Organization ID** - Found in Productive.io Settings → Integrations → API
2. **API Token** - Generate one in Settings → Integrations → API
3. **User ID** (optional) - For time entry operations

### Alternative: Environment Variables

You can also configure credentials via environment variables in the Claude Desktop config:

```json
{
  "mcpServers": {
    "productive": {
      "command": "productive-mcp",
      "env": {
        "PRODUCTIVE_ORGANIZATION_ID": "your-org-id",
        "PRODUCTIVE_API_TOKEN": "your-auth-token",
        "PRODUCTIVE_USER_ID": "your-user-id"
      }
    }
  }
}
```

### 3. Get Your Productive.io Credentials

1. Log into [Productive.io](https://productive.io)
2. Go to Settings → Integrations → API
3. Generate an API token
4. Note your Organization ID (visible in the API settings or URL)
5. Note your User ID (optional, for time entries)

### 4. Docker Deployment (Recommended for Servers)

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  productive-mcp:
    image: node:24-alpine
    container_name: productive-mcp
    restart: unless-stopped
    environment:
      PRODUCTIVE_ORGANIZATION_ID: ${PRODUCTIVE_ORGANIZATION_ID}
      PRODUCTIVE_API_TOKEN: ${PRODUCTIVE_API_TOKEN}
    volumes:
      - ./data:/data
    command: >
      sh -c "npm install -g @studiometa/productive-mcp &&
             productive-mcp"
```

Create `.env` file with your credentials:

```bash
PRODUCTIVE_ORGANIZATION_ID=12345
PRODUCTIVE_API_TOKEN=your-token-here
PRODUCTIVE_USER_ID=67890
```

Start the server:

```bash
docker-compose up -d
```

#### Using Pre-built Image (Alternative)

Build a custom image for faster startup:

```dockerfile
FROM node:24-alpine

# Install globally
RUN npm install -g @studiometa/productive-mcp

# Run as non-root user
USER node

# Start the server
CMD ["productive-mcp"]
```

Build and run:

```bash
docker build -t productive-mcp .

docker run -d \
  --name productive-mcp \
  --restart unless-stopped \
  -e PRODUCTIVE_ORGANIZATION_ID=12345 \
  -e PRODUCTIVE_API_TOKEN=your-token \
  productive-mcp
```

## Available Tools

The MCP server exposes these tools to Claude:

### Configuration
- `productive_configure` - Configure credentials (organization ID, API token, user ID)
- `productive_get_config` - View current configuration (token is masked)

### Projects
- `productive_list_projects` - List projects with optional filters
- `productive_get_project` - Get project details by ID

### Tasks
- `productive_list_tasks` - List tasks with optional filters
- `productive_get_task` - Get task details by ID

### Time Entries
- `productive_list_time_entries` - List time entries with filters
- `productive_get_time_entry` - Get time entry details by ID
- `productive_create_time_entry` - Create a new time entry

### People
- `productive_list_people` - List people in the organization
- `productive_get_person` - Get person details by ID

## Usage Examples

### First Time Setup

Ask Claude to configure your credentials:

```
You: "Configure my Productive.io credentials"
Claude: "I'll help you set up. Please provide your Organization ID and API Token..."
```

Or configure directly:

```
You: "Use the productive_configure tool with organization ID 12345, API token xxx, and user ID 67890"
```

### Check Configuration

```
You: "Show me my Productive.io configuration"
Claude: Uses productive_get_config tool
```

### Using the API

Once configured, ask Claude to:

- "Show me all active projects in Productive"
- "Create a time entry for 2 hours today on project X"
- "List all tasks assigned to me"
- "Get details for project 12345"
- "Show me time entries from last week"

Claude will automatically use the MCP tools to interact with your Productive.io account.

## Development

```bash
# Clone the repository
git clone https://github.com/studiometa/productive-cli
cd productive-cli

# Install dependencies
npm install

# Build in watch mode
npm run dev -w @studiometa/productive-mcp

# Build for production
npm run build -w @studiometa/productive-mcp

# Test the server
node packages/productive-mcp/dist/index.js
```

## Configuration

The server supports multiple configuration methods (in priority order):

### 1. Interactive Configuration (Recommended)

Use Claude to configure credentials interactively:
- Ask: "Configure my Productive.io credentials"
- Claude will guide you through the setup
- Credentials are stored securely using the CLI's config system

### 2. Environment Variables

Set via Claude Desktop config or shell:

| Variable | Required | Description |
|----------|----------|-------------|
| `PRODUCTIVE_ORGANIZATION_ID` | Yes | Your Productive.io organization ID |
| `PRODUCTIVE_API_TOKEN` | Yes | Your Productive.io API token |
| `PRODUCTIVE_USER_ID` | No | Your user ID (for time entries) |

### 3. Config File

The CLI stores configuration at:
- **macOS/Linux**: `~/.config/productive-cli/config.json`
- **Windows**: `%APPDATA%/productive-cli/config.json`

Credentials can be stored in the system keychain (macOS Keychain, Linux libsecret).

## Troubleshooting

### Server won't start

Check that credentials are correctly set:
```bash
echo $PRODUCTIVE_ORGANIZATION_ID
echo $PRODUCTIVE_API_TOKEN
```

### Authentication errors

- Verify your API token is valid
- Check your organization ID is correct
- Ensure the token has necessary permissions

### Docker logs

View server logs:
```bash
docker logs productive-mcp -f
```

### Test the server manually

```bash
# Send a test request
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | productive-mcp
```

## Requirements

- Node.js 24+
- Productive.io account with API access
- Docker (for server deployment)

## Architecture

```
productive-mcp
├── Uses @modelcontextprotocol/sdk for MCP protocol
├── Wraps @studiometa/productive-cli for API access
└── Exposes tools via stdio transport
```

## Related Packages

- [@studiometa/productive-cli](../productive-cli) - CLI tool for Productive.io
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - Official MCP SDK

## License

MIT © [Studio Meta](https://www.studiometa.fr)

## Links

- [GitHub Repository](https://github.com/studiometa/productive-cli)
- [Productive.io API Docs](https://developer.productive.io)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Issues](https://github.com/studiometa/productive-cli/issues)

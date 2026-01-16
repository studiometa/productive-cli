# Project Structure

```
productive-cli/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD workflow
├── dist/                       # Build output (generated)
│   ├── cli.js                  # CLI executable
│   ├── index.js                # Library entry point
│   ├── *.d.ts                  # TypeScript declarations
│   └── ...
├── scripts/
│   └── postbuild.js            # Post-build script to make CLI executable
├── src/
│   ├── commands/               # Command implementations
│   │   ├── budgets.ts
│   │   ├── config.ts
│   │   ├── people.ts
│   │   ├── projects.ts
│   │   ├── services.ts
│   │   ├── tasks.ts
│   │   └── time.ts
│   ├── utils/                  # Native Node.js utilities
│   │   ├── args.ts            # Argument parser (no dependencies)
│   │   ├── colors.ts          # ANSI colors (no dependencies)
│   │   ├── config-store.ts    # XDG-compliant config storage
│   │   └── spinner.ts         # Loading spinner (no dependencies)
│   ├── api.ts                 # Productive.io API client
│   ├── cli.ts                 # CLI entry point
│   ├── config.ts              # Configuration management
│   ├── index.ts               # Library exports
│   ├── output.ts              # Output formatting
│   └── types.ts               # TypeScript type definitions
├── .env.example               # Example environment variables
├── .gitignore                 # Git ignore rules
├── .npmignore                 # npm publish ignore rules
├── .npmrc                     # npm configuration
├── CHANGELOG.md               # Version history
├── CONTRIBUTING.md            # Contribution guidelines
├── LICENSE                    # MIT License
├── oxlint.json                # oxlint configuration
├── package.json               # Project manifest
├── README.md                  # Main documentation
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite build configuration
```

## Key Design Decisions

### Zero Runtime Dependencies
- Uses **native Node.js 24+ APIs only**
- All utilities implemented from scratch
- No third-party libraries (commander, chalk, ora, etc.)
- Smaller bundle size and fewer security concerns

### Native APIs Used
- `node:fs` - File system operations
- `node:path` - Path manipulation
- `node:os` - OS information (home directory)
- `node:tty` - Terminal interactions
- `globalThis.fetch` - HTTP requests (Node.js 18+)
- `process.argv` - Command-line arguments
- ANSI escape codes - Terminal colors

### XDG Compliance
Config stored in XDG-compliant locations:
- Linux: `$XDG_CONFIG_HOME/productive-cli/config.json` (~/.config)
- macOS: `$XDG_CONFIG_HOME` or `~/Library/Application Support`
- Windows: `%APPDATA%\productive-cli\config.json`

### Build System
- **Vite** - Fast ES modules bundler
- **TypeScript** - Type safety
- **oxlint** - Fast Rust-based linter
- **Vitest** - Fast test runner
- Output: ESM modules for Node.js 24+

### AI Agent Optimization
- JSON output format for structured data
- Consistent error format
- Exit codes: 0 (success), 1 (error)
- No interactive prompts in JSON mode
- Multiple output formats (json, csv, table, human)

### Commands Structure
Each command file (`src/commands/*.ts`):
1. Exports a handler function
2. Supports multiple output formats
3. Uses OutputFormatter for consistent output
4. Uses Spinner for loading states (human mode)
5. Handles errors uniformly

### API Client
- Type-safe API client
- Supports pagination, filtering, sorting
- Consistent error handling
- Uses native fetch
- Follows Productive.io JSON:API spec

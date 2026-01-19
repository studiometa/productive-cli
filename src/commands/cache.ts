import { OutputFormatter } from '../output.js';
import { colors } from '../utils/colors.js';
import { getCache } from '../utils/cache.js';
import type { OutputFormat } from '../types.js';

export function showCacheHelp(subcommand?: string): void {
  if (subcommand === 'status') {
    console.log(`
${colors.bold('productive cache status')} - Show cache statistics

${colors.bold('USAGE:')}
  productive cache status

${colors.bold('OPTIONS:')}
  -f, --format <fmt>  Output format: json, human

${colors.bold('EXAMPLES:')}
  productive cache status
  productive cache status --format json
`);
  } else if (subcommand === 'clear') {
    console.log(`
${colors.bold('productive cache clear')} - Clear cached data

${colors.bold('USAGE:')}
  productive cache clear [pattern]

${colors.bold('ARGUMENTS:')}
  [pattern]           Optional: clear only matching endpoints (e.g., "projects", "time")

${colors.bold('EXAMPLES:')}
  productive cache clear              # Clear all cache
  productive cache clear projects     # Clear only projects cache
  productive cache clear time         # Clear only time entries cache
`);
  } else {
    console.log(`
${colors.bold('productive cache')} - Manage CLI cache

${colors.bold('USAGE:')}
  productive cache <subcommand> [options]

${colors.bold('SUBCOMMANDS:')}
  status              Show cache statistics
  clear [pattern]     Clear cached data

${colors.bold('CACHE BEHAVIOR:')}
  - GET requests are cached automatically
  - Write operations (create, update, delete) invalidate related cache
  - Different TTLs per data type:
    • Projects, People, Services: 1 hour
    • Time entries: 5 minutes
    • Tasks, Budgets: 15 minutes

${colors.bold('GLOBAL OPTIONS:')}
  --no-cache          Bypass cache for a single command
  --refresh           Force refresh (fetch fresh data, update cache)

${colors.bold('EXAMPLES:')}
  productive cache status
  productive cache clear
  productive projects list --no-cache
  productive time list --refresh

Run ${colors.cyan('productive cache <subcommand> --help')} for subcommand details.
`);
  }
}

export function handleCacheCommand(
  subcommand: string,
  args: string[],
  options: Record<string, string | boolean>
): void {
  const format = (options.format || options.f || 'human') as OutputFormat;
  const formatter = new OutputFormatter(format, options['no-color'] === true);

  switch (subcommand) {
    case 'status':
      cacheStatus(formatter);
      break;
    case 'clear':
      cacheClear(args, formatter);
      break;
    default:
      formatter.error(`Unknown cache subcommand: ${subcommand}`);
      console.log(`Run ${colors.cyan('productive cache --help')} for usage information`);
      process.exit(1);
  }
}

function cacheStatus(formatter: OutputFormatter): void {
  const cache = getCache();
  const stats = cache.stats();

  if (formatter['format'] === 'json') {
    formatter.output({
      entries: stats.entries,
      size_bytes: stats.size,
      size_human: formatBytes(stats.size),
      oldest_age_seconds: stats.oldestAge,
      oldest_age_human: formatDuration(stats.oldestAge),
    });
  } else {
    console.log(colors.bold('Cache Statistics'));
    console.log(colors.dim('─'.repeat(40)));
    console.log(colors.cyan('Entries:'), stats.entries);
    console.log(colors.cyan('Size:'), formatBytes(stats.size));
    if (stats.entries > 0) {
      console.log(colors.cyan('Oldest entry:'), formatDuration(stats.oldestAge) + ' ago');
    }
    console.log();
    console.log(colors.dim('Location: ~/.cache/productive-cli/queries/'));
  }
}

function cacheClear(args: string[], formatter: OutputFormatter): void {
  const cache = getCache();
  const pattern = args[0];

  if (pattern) {
    cache.invalidate(pattern);
    formatter.success(`Cache cleared for pattern: ${pattern}`);
  } else {
    cache.clear();
    formatter.success('Cache cleared');
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

import { getConfig, setConfig, clearConfig, showConfig, validateConfig } from '../config.js';
import { OutputFormatter } from '../output.js';
import { colors } from '../utils/colors.js';
import type { OutputFormat } from '../types.js';

export function handleConfigCommand(
  subcommand: string,
  args: string[],
  options: Record<string, string | boolean>
): void {
  const format = (options.format || options.f || 'human') as OutputFormat;
  const formatter = new OutputFormatter(format, options['no-color'] === true);

  switch (subcommand) {
    case 'set':
      configSet(args, formatter);
      break;
    case 'get':
      configGet(args, options, formatter);
      break;
    case 'validate':
      configValidate(formatter);
      break;
    case 'clear':
      configClear(formatter);
      break;
    default:
      formatter.error(`Unknown config subcommand: ${subcommand}`);
      process.exit(1);
  }
}

function configSet(args: string[], formatter: OutputFormatter): void {
  const [key, value] = args;

  if (!key || !value) {
    formatter.error('Usage: productive config set <key> <value>');
    process.exit(1);
  }

  if (!['apiToken', 'organizationId', 'userId', 'baseUrl'].includes(key)) {
    formatter.error(`Invalid configuration key: ${key}`, {
      validKeys: ['apiToken', 'organizationId', 'userId', 'baseUrl'],
    });
    process.exit(1);
  }

  setConfig(key as 'apiToken' | 'organizationId' | 'userId' | 'baseUrl', value);
  formatter.success(`Configuration updated: ${key}`);
}

function configGet(
  args: string[],
  options: Record<string, string | boolean>,
  formatter: OutputFormatter
): void {
  const [key] = args;
  const currentConfig = getConfig();
  const noMask = options['no-mask'] === true;

  if (key) {
    if (!['apiToken', 'organizationId', 'userId', 'baseUrl'].includes(key)) {
      formatter.error(`Invalid configuration key: ${key}`);
      process.exit(1);
    }

    const value = currentConfig[key as keyof typeof currentConfig];

    if (formatter['format'] === 'json') {
      formatter.output({
        key,
        value: key === 'apiToken' && !noMask ? maskToken(value || '') : value,
        set: !!value,
      });
    } else {
      if (value) {
        const displayValue = key === 'apiToken' && !noMask ? maskToken(value) : value;
        console.log(`${key}: ${displayValue}`);
      } else {
        formatter.warning(`${key} is not set`);
      }
    }
  } else {
    if (formatter['format'] === 'json') {
      formatter.output({
        apiToken: noMask ? currentConfig.apiToken : maskToken(currentConfig.apiToken || ''),
        organizationId: currentConfig.organizationId,
        userId: currentConfig.userId,
        baseUrl: currentConfig.baseUrl,
      });
    } else {
      console.log(colors.bold('Current configuration:'));
      console.log('  apiToken:', currentConfig.apiToken ? maskToken(currentConfig.apiToken) : colors.yellow('not set'));
      console.log('  organizationId:', currentConfig.organizationId || colors.yellow('not set'));
      console.log('  userId:', currentConfig.userId || colors.yellow('not set'));
      console.log('  baseUrl:', currentConfig.baseUrl || colors.yellow('not set'));
    }
  }
}

function configValidate(formatter: OutputFormatter): void {
  const validation = validateConfig();

  if (formatter['format'] === 'json') {
    formatter.output({
      valid: validation.valid,
      missing: validation.missing,
    });
    process.exit(validation.valid ? 0 : 1);
  } else {
    if (validation.valid) {
      formatter.success('Configuration is valid');
    } else {
      formatter.error('Configuration is incomplete');
      console.log('Missing required fields:');
      validation.missing.forEach((field) => {
        console.log(`  - ${field}`);
      });
      process.exit(1);
    }
  }
}

function configClear(formatter: OutputFormatter): void {
  clearConfig();
  formatter.success('Configuration cleared');
}

function maskToken(token: string): string {
  if (!token || token.length <= 8) return '***';
  return token.substring(0, 4) + '...' + token.substring(token.length - 4);
}

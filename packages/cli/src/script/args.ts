/**
 * Argument parser for productive run scripts.
 *
 * Separates raw process.argv into positional `args` and named `flags`.
 *
 * Supported syntax:
 *   positional              → args[]
 *   --flag                  → { flag: true }
 *   --flag value            → { flag: 'value' }
 *   --flag=value            → { flag: 'value' }
 *   --no-flag               → { flag: false }
 *   -f                      → { f: true }
 *   -f value                → { f: 'value' }
 *   --flag a --flag b       → { flag: ['a', 'b'] }   (arrays for repeated flags)
 *   -- rest args            → rest treated as positionals
 */

export type FlagValue = string | boolean | string[];
export type ParsedFlags = Record<string, FlagValue>;

export interface ParsedScriptArgs {
  /** Positional (non-flag) arguments. */
  args: string[];
  /** Named flags parsed from argv. */
  flags: ParsedFlags;
}

/** Check whether a string looks like a flag token (starts with -). */
function isFlag(s: string): boolean {
  // Allow negative numbers as values: -1, -3.14
  return s.startsWith('-') && !/^-\d/.test(s);
}

/**
 * Record a (possibly repeated) flag value.
 *
 * If the key already has a value, it is promoted to an array.
 */
function setFlag(flags: ParsedFlags, key: string, value: string | boolean): void {
  const existing = flags[key];
  if (existing === undefined) {
    flags[key] = value;
  } else if (Array.isArray(existing)) {
    existing.push(String(value));
  } else {
    // Promote to array on second occurrence (string values only)
    flags[key] = [String(existing), String(value)];
  }
}

/**
 * Parse a raw argv array (e.g. `process.argv.slice(2)`) into positional
 * arguments and named flags.
 *
 * @example
 * ```ts
 * parseScriptArgs(['--from', '2025-01-01', '--mine', '--', 'extra'])
 * // → { args: ['extra'], flags: { from: '2025-01-01', mine: true } }
 *
 * // Without `--`, the next non-flag token is consumed as the flag's value:
 * parseScriptArgs(['--from', '2025-01-01', '--mine', 'extra'])
 * // → { args: [], flags: { from: '2025-01-01', mine: 'extra' } }
 * ```
 */
export function parseScriptArgs(argv: string[]): ParsedScriptArgs {
  const args: string[] = [];
  const flags: ParsedFlags = {};

  let i = 0;
  let endOfFlags = false;

  while (i < argv.length) {
    const arg = argv[i];

    // Everything after `--` is a positional
    if (endOfFlags) {
      args.push(arg);
      i++;
      continue;
    }

    if (arg === '--') {
      endOfFlags = true;
      i++;
      continue;
    }

    // Long flag: --flag, --flag=value, --no-flag
    if (arg.startsWith('--')) {
      const rest = arg.slice(2);

      // --flag=value
      const eqIdx = rest.indexOf('=');
      if (eqIdx !== -1) {
        setFlag(flags, rest.slice(0, eqIdx), rest.slice(eqIdx + 1));
        i++;
        continue;
      }

      // --no-flag → { flag: false }
      if (rest.startsWith('no-')) {
        flags[rest.slice(3)] = false;
        i++;
        continue;
      }

      // --flag value  OR  --flag (boolean)
      const next = argv[i + 1];
      if (next !== undefined && !isFlag(next)) {
        setFlag(flags, rest, next);
        i += 2;
      } else {
        setFlag(flags, rest, true);
        i++;
      }
      continue;
    }

    // Short flag: -f, -f value (isFlag guards against negative numbers like -1)
    if (isFlag(arg) && arg.length === 2) {
      const key = arg.slice(1);
      const next = argv[i + 1];
      if (next !== undefined && !isFlag(next)) {
        setFlag(flags, key, next);
        i += 2;
      } else {
        setFlag(flags, key, true);
        i++;
      }
      continue;
    }

    // Positional
    args.push(arg);
    i++;
  }

  return { args, flags };
}

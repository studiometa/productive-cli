/**
 * `productive run --list` — discover and list scripts in a directory.
 *
 * Lists all `.ts`, `.mts`, `.js`, `.mjs` files found in the target directory
 * (defaults to `./scripts`). If a script exports a `meta` object, its
 * `name`, `description`, and `usage` fields are shown alongside the path.
 *
 * Meta is extracted via a lightweight regex scan of the file source — no
 * module loading or TypeScript execution is required, so the command is fast
 * even for large script collections.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import type { ScriptMeta } from '../../script/meta.js';

import { colors } from '../../utils/colors.js';

/** A discovered script file with optional metadata. */
export interface DiscoveredScript {
  /** Absolute path to the script file. */
  path: string;
  /** Path relative to the base directory (for display). */
  relativePath: string;
  /** Metadata extracted from `export const meta = { ... }`, if present. */
  meta: ScriptMeta;
}

const SCRIPT_EXTENSIONS = new Set(['.ts', '.mts', '.js', '.mjs']);

/**
 * Extract a `meta` value from a raw file source using regex.
 *
 * Only handles simple object literals — nested expressions, variables, or
 * computed keys are not supported intentionally (keep it fast and dependency-
 * free).
 */
export function extractMetaFromSource(source: string): ScriptMeta {
  const meta: ScriptMeta = {};

  // Match: export const meta = { ... } or export const meta: ScriptMeta = { ... }
  const blockMatch = /export\s+const\s+meta\s*(?::\s*\w+)?\s*=\s*\{([^}]*)\}/.exec(source);
  if (!blockMatch) return meta;

  const block = blockMatch[1];

  // Extract string values for known keys
  for (const key of ['name', 'description', 'usage'] as const) {
    const match = new RegExp(`${key}\\s*:\\s*['"\`]([^'"\`\\n]+)['"\`]`).exec(block);
    if (match) {
      meta[key] = match[1];
    }
  }

  return meta;
}

/**
 * Discover all script files in a directory (non-recursive).
 */
export async function discoverScripts(dir: string): Promise<DiscoveredScript[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const scripts: DiscoveredScript[] = [];

  for (const entry of entries.toSorted()) {
    const ext = entry.slice(entry.lastIndexOf('.'));
    if (!SCRIPT_EXTENSIONS.has(ext)) continue;

    const filePath = join(dir, entry);
    let source = '';
    try {
      source = await readFile(filePath, 'utf-8');
    } catch {
      // skip unreadable files
    }

    scripts.push({
      path: filePath,
      relativePath: relative(process.cwd(), filePath),
      meta: extractMetaFromSource(source),
    });
  }

  return scripts;
}

/**
 * Print a formatted list of discovered scripts to stdout.
 */
export function printScriptList(scripts: DiscoveredScript[], dir: string): void {
  const relDir = relative(process.cwd(), dir) || '.';

  if (scripts.length === 0) {
    console.log(colors.yellow(`No scripts found in ${relDir}/`));
    console.log(
      `  Create a .ts or .js file there and run ${colors.cyan('productive run <script>')}`,
    );
    return;
  }

  console.log(colors.bold(`Scripts in ${relDir}/`) + ` (${scripts.length} found)\n`);

  for (const script of scripts) {
    const name = script.meta.name
      ? colors.bold(script.meta.name)
      : colors.cyan(script.relativePath);

    const pathLine = script.meta.name ? `  ${colors.cyan(script.relativePath)}` : '';

    console.log(`  ${name}`);
    if (pathLine) console.log(pathLine);
    if (script.meta.description) console.log(`  ${script.meta.description}`);
    if (script.meta.usage) {
      console.log(
        `  ${colors.dim('Usage:')} productive run ${script.relativePath} ${script.meta.usage}`,
      );
    } else {
      console.log(`  ${colors.dim('Usage:')} productive run ${script.relativePath}`);
    }
    console.log();
  }
}

/**
 * Run `productive run --list [dir]`.
 *
 * @param dir - Directory to scan (defaults to `./scripts`).
 */
export async function scriptList(dir?: string): Promise<void> {
  const targetDir = resolve(process.cwd(), dir ?? 'scripts');
  const scripts = await discoverScripts(targetDir);
  printScriptList(scripts, targetDir);
}

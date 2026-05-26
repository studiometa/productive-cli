/**
 * Script metadata convention for `productive run`.
 *
 * Scripts can export a `meta` object to declare their name, description,
 * and usage. This information is used by `productive run --list` to
 * display an annotated list of scripts in the configured scripts directory.
 *
 * @example
 * ```ts
 * import type { ScriptMeta } from '@studiometa/productive-cli/script';
 *
 * export const meta: ScriptMeta = {
 *   name: 'Weekly Report',
 *   description: 'Summarise time entries for the past week by project.',
 *   usage: '--from <date> --to <date> [--mine]',
 * };
 *
 * export default async function ({ client, output, args, flags }) { ... }
 * ```
 */
export interface ScriptMeta {
  /** Human-readable script name shown by `productive run --list`. */
  name?: string;
  /** Short description of what the script does. */
  description?: string;
  /**
   * Usage string (flags and positional args) shown by `productive run --list`.
   *
   * @example '--from <date> --to <date> [--mine]'
   */
  usage?: string;
}

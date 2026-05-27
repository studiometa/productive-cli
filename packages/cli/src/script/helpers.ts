/**
 * Authoring helpers for `productive run` scripts.
 *
 * These are identity functions whose sole purpose is to make TypeScript infer
 * the right types without requiring explicit annotations on every script.
 *
 * @example
 * ```ts
 * import { defineMeta, createScript } from '@studiometa/productive-cli/script';
 *
 * export const meta = defineMeta({
 *   name: 'My Report',
 *   description: 'Generates a weekly summary.',
 *   usage: '--from <date> --to <date>',
 * });
 *
 * export default createScript(async ({ client, output, flags }) => {
 *   const projects = await client.projects.all().toArray();
 *   output.table(projects.map((p) => ({ id: p.id, name: p.name })));
 * });
 * ```
 */

import type { ScriptMeta } from './meta.js';
import type { ScriptContext } from './types.js';

/**
 * Type-safe identity helper for script metadata.
 *
 * Returns the `meta` object unchanged. The only effect is that TypeScript
 * validates the object against `ScriptMeta` and the editor autocompletes
 * the available fields.
 *
 * @example
 * ```ts
 * export const meta = defineMeta({
 *   name: 'Audit',
 *   description: 'Runs a project audit.',
 * });
 * ```
 */
export function defineMeta(meta: ScriptMeta): ScriptMeta {
  return meta;
}

/**
 * Type-safe identity helper for a script's default-export function.
 *
 * Returns `fn` unchanged. The only effect is that TypeScript infers the full
 * `ScriptContext` type on the destructured parameter so you get editor
 * autocomplete without writing `async function ({ client }: ScriptContext)`.
 *
 * @example
 * ```ts
 * export default createScript(async ({ client, output, flags }) => {
 *   const limit = flags.limit ? Number(flags.limit) : 20;
 *   const tasks = await client.tasks.all().toArray();
 *   output.table(tasks.slice(0, limit).map((t) => ({ id: t.id, title: t.title })));
 * });
 * ```
 */
export function createScript(
  fn: (ctx: ScriptContext) => Promise<void>,
): (ctx: ScriptContext) => Promise<void> {
  return fn;
}

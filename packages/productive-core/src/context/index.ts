/**
 * ExecutorContext module — dependency injection for executors.
 */

export type {
  ExecutorConfig,
  ExecutorContext,
  ResolvableResourceType,
  ResolvedInfo,
  ResourceResolver,
} from './types.js';

export { createTestExecutorContext, defaultTestConfig, noopResolver } from './test-utils.js';

export { fromCommandContext, type CommandContextLike } from './from-command-context.js';

export {
  fromHandlerContext,
  type HandlerContextLike,
  type McpResolveFunctions,
} from './from-handler-context.js';

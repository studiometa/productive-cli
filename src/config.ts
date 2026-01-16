import { ConfigStore } from './utils/config-store.js';
import type { ProductiveConfig } from './types.js';

const config = new ConfigStore<ProductiveConfig>('productive-cli');

export function getConfig(): ProductiveConfig {
  return {
    apiToken: config.get('apiToken') || process.env.PRODUCTIVE_API_TOKEN,
    organizationId: config.get('organizationId') || process.env.PRODUCTIVE_ORG_ID,
    userId: config.get('userId') || process.env.PRODUCTIVE_USER_ID,
    baseUrl: config.get('baseUrl') || process.env.PRODUCTIVE_BASE_URL || 'https://api.productive.io/api/v2',
  };
}

export function setConfig(key: keyof ProductiveConfig, value: string): void {
  config.set(key, value);
}

export function clearConfig(): void {
  config.clear();
}

export function showConfig(): ProductiveConfig {
  return config.store;
}

export function validateConfig(): { valid: boolean; missing: string[] } {
  const cfg = getConfig();
  const missing: string[] = [];

  if (!cfg.apiToken) missing.push('apiToken');
  if (!cfg.organizationId) missing.push('organizationId');
  if (!cfg.userId) missing.push('userId');

  return {
    valid: missing.length === 0,
    missing,
  };
}

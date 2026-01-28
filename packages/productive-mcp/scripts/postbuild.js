#!/usr/bin/env node
import { chmodSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distFile = resolve(__dirname, '../dist/index.js');

try {
  chmodSync(distFile, 0o755);
  console.log('✓ Made dist/index.js executable');
} catch (error) {
  console.error('Failed to make dist/index.js executable:', error.message);
  process.exit(1);
}

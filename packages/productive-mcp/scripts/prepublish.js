#!/usr/bin/env node
/**
 * Pre-publish script to sync CLI dependency version
 *
 * This script updates the @studiometa/productive-cli dependency
 * to match the current package version before publishing.
 * This ensures both packages are always released together with matching versions.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packagePath = resolve(__dirname, '../package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));

const currentVersion = pkg.version;
const cliDependency = pkg.dependencies['@studiometa/productive-cli'];

// Update CLI dependency to exact current version
const newCliDependency = currentVersion;

if (cliDependency !== newCliDependency) {
  pkg.dependencies['@studiometa/productive-cli'] = newCliDependency;
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(
    `✓ Updated @studiometa/productive-cli dependency: ${cliDependency} → ${newCliDependency}`,
  );
} else {
  console.log(`✓ @studiometa/productive-cli dependency already at ${newCliDependency}`);
}

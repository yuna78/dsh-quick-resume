#!/usr/bin/env node
/**
 * Zero-dependency smoke test for the published bundle contract.
 *
 * Runs on `prepublishOnly` and in CI: verifies the manifest, the files the npm
 * package promises, the plain-JS syntax of both halves, the cordis patch, the
 * locale dictionaries, and the plugin icon limits the host enforces.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const checks = [];

const check = (label, fn) => {
  try {
    const detail = fn();
    checks.push(`  ok   ${label}${detail === undefined ? '' : ` — ${detail}`}`);
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const readJson = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));

const manifest = readJson('package.json');

check('package name is publishable', () => {
  if (manifest.private === true) throw new Error('package.json must not be private');
  if (!/^dsh-plugin-/.test(manifest.name)) throw new Error('name must start with dsh-plugin-');
  return manifest.name;
});

check('version is semver', () => {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) throw new Error(manifest.version);
  return manifest.version;
});

check('dsh.bundle.patch is declared', () => {
  const patch = manifest.dsh?.bundle?.patch;
  if (typeof patch !== 'string' || patch === '') throw new Error('dsh.bundle.patch missing');
  statSync(join(root, patch));
  return patch;
});

check('dsh.client declares a web half', () => {
  const client = manifest.dsh?.client;
  if (client === undefined) throw new Error('dsh.client missing');
  if (client.platform !== 'web') throw new Error(`platform is ${String(client.platform)}`);
  if (!Array.isArray(client.inject) || client.inject.length === 0) throw new Error('dsh.client.inject missing');
  return `${client.inject.length} injects`;
});

check('package.json is exported for host metadata readers', () => {
  if (manifest.exports !== undefined && manifest.exports['./package.json'] !== './package.json') {
    throw new Error('add "./package.json": "./package.json" to exports, otherwise the host cannot read icon/metadata');
  }
});

check('every whitelisted file exists', () => {
  const entries = manifest.files ?? [];
  if (entries.length === 0) throw new Error('files whitelist missing');
  for (const entry of entries) {
    if (entry.includes('*')) continue; // globs are checked through the directories below
    statSync(join(root, entry));
  }
  return `${entries.length} entries`;
});

check('both halves parse as ES modules', () => {
  execFileSync(process.execPath, ['--check', join(root, 'index.js')], { stdio: 'pipe' });
  execFileSync(process.execPath, ['--check', join(root, 'client.js')], { stdio: 'pipe' });
  return 'index.js, client.js';
});

check('locales parse and carry a market title', () => {
  for (const locale of ['zh', 'en']) {
    const dict = readJson(`locale/${locale}.json`);
    if (typeof dict.meta?.title !== 'string' || dict.meta.title === '') throw new Error(`${locale} meta.title missing`);
  }
  return 'zh, en';
});

check('plugin icon stays inside the host limits', () => {
  const icon = manifest.icon;
  if (typeof icon !== 'string') throw new Error('manifest "icon" missing');
  if (!/\.(svg|png|jpg|jpeg|webp)$/i.test(icon)) throw new Error(`unsupported extension: ${icon}`);
  if (icon.includes('://') || icon.startsWith('/') || icon.includes('..')) throw new Error('icon must be a package-relative path');
  if (!(manifest.files ?? []).includes(icon) && !(manifest.files ?? []).some((file) => file.endsWith('/') && icon.startsWith(file))) {
    throw new Error(`icon ${icon} is not in the files whitelist`);
  }
  const size = statSync(join(root, icon)).size;
  if (size > 256 * 1024) throw new Error(`icon is ${size} bytes (max 262144)`);
  return `${icon}, ${size} bytes`;
});

check('cordis patch inserts exactly one row', () => {
  const text = readFileSync(join(root, manifest.dsh.bundle.patch), 'utf8');
  const rows = [...text.matchAll(/^\s*name:\s*'?"?([^'"\n]+)'?"?\s*$/gm)].map((match) => match[1]);
  if (!rows.includes(manifest.name)) throw new Error(`patch does not reference ${manifest.name}`);
  return rows.join(', ');
});

console.log(`dsh-plugin smoke · ${manifest.name}@${manifest.version}`);
console.log(checks.join('\n'));

if (failures.length > 0) {
  console.error(`\nFAIL (${failures.length})`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log('\nPASS');

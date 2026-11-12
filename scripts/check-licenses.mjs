#!/usr/bin/env node
/**
 * Automated Open-Source License Compliance Audit
 * Scans root, server, and client node_modules for restrictive/unknown licenses.
 */
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_TOKENS = new Set([
  'MIT',
  'ISC',
  'BSD-2-CLAUSE',
  'BSD-3-CLAUSE',
  'BSD',
  'APACHE-2.0',
  '0BSD',
  'CC0-1.0',
  'CC-BY-4.0',
  'UNLICENSE',
  'BLUEOAK-1.0.0',
  'PYTHON-2.0',
  'MPL-2.0',
  'WTFPL',
  'ARTISTIC-2.0',
  'ZLIB',
]);

function normalizeLicense(raw) {
  if (!raw) return 'UNKNOWN';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw.type) return String(raw.type).trim();
  if (Array.isArray(raw)) return raw.map((x) => normalizeLicense(x)).join(' OR ');
  return 'UNKNOWN';
}

function isPermissive(expr) {
  const cleaned = expr.replace(/[()]/g, ' ').trim();
  if (cleaned === 'UNKNOWN') return false;
  // Handle SPDX "A OR B" (passes if at least one branch is allowed)
  if (/\s+OR\s+/i.test(cleaned)) {
    return cleaned.split(/\s+OR\s+/i).some((part) => isPermissive(part));
  }
  // Handle SPDX "A AND B" (passes only if all branches are allowed)
  if (/\s+AND\s+/i.test(cleaned)) {
    return cleaned.split(/\s+AND\s+/i).every((part) => isPermissive(part));
  }
  return ALLOWED_TOKENS.has(cleaned.toUpperCase());
}

function scanNodeModules(nmDir, results) {
  if (!fs.existsSync(nmDir)) return;
  for (const entry of fs.readdirSync(nmDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const full = path.join(nmDir, entry.name);
    if (entry.name.startsWith('@')) {
      for (const scoped of fs.readdirSync(full, { withFileTypes: true })) {
        if (!scoped.isDirectory()) continue;
        inspectPkg(path.join(full, scoped.name), results);
      }
    } else {
      inspectPkg(full, results);
    }
  }
}

function inspectPkg(pkgDir, results) {
  const pkgFile = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgFile)) return;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
    const license = normalizeLicense(pkg.license || pkg.licenses);
    results.push({
      name: `${pkg.name}@${pkg.version}`,
      license,
      ok: isPermissive(license),
    });
  } catch {
    // Ignore malformed package.json
  }
  const nested = path.join(pkgDir, 'node_modules');
  if (fs.existsSync(nested)) scanNodeModules(nested, results);
}

const roots = [
  path.resolve('node_modules'),
  path.resolve('server/node_modules'),
  path.resolve('client/node_modules'),
];

const found = [];
for (const r of roots) scanNodeModules(r, found);

const unique = new Map();
for (const item of found) unique.set(item.name, item);

const summary = new Map();
const flagged = [];
for (const item of unique.values()) {
  summary.set(item.license, (summary.get(item.license) || 0) + 1);
  if (!item.ok) flagged.push(item);
}

console.log(`Scanned ${unique.size} unique installed packages across workspace.`);
for (const [lic, count] of [...summary.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${lic}: ${count}`);
}

if (flagged.length > 0) {
  console.error('\nDisallowed or unknown licenses detected:');
  for (const item of flagged) {
    console.error(`  - ${item.name} (${item.license})`);
  }
  process.exit(1);
}

console.log('\nLicense audit PASSED: all dependencies use permissive/approved OSS licenses.');

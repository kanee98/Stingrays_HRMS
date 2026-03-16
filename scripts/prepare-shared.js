#!/usr/bin/env node
/**
 * Copies the shared folder from hrms-ui/shared into the microservice frontends
 * so that @shared/* resolves during local development, linting, and local builds.
 * Run from repo root: node scripts/prepare-shared.js
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sharedSrc = path.join(repoRoot, 'hrms-ui', 'shared');
const targets = [
  path.join(repoRoot, 'portal-ui', 'shared'),
  path.join(repoRoot, 'employee-onboarding', 'frontend', 'shared'),
  path.join(repoRoot, 'payroll', 'frontend', 'shared'),
];

if (!fs.existsSync(sharedSrc)) {
  console.error('hrms-ui/shared folder not found');
  process.exit(1);
}

function emptyDirectory(dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    return;
  }

  for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
    const entryPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(entryPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(entryPath);
    }
  }
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

for (const dest of targets) {
  emptyDirectory(dest);
  copyRecursive(sharedSrc, dest);
  console.log('Copied shared ->', path.relative(repoRoot, dest));
}

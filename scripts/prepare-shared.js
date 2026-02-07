#!/usr/bin/env node
/**
 * Copies the shared folder into hrms-ui and employee-onboarding/frontend
 * so that @shared/* resolves during local development and Docker build.
 * Run from repo root: node scripts/prepare-shared.js
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sharedSrc = path.join(repoRoot, 'shared');
const targets = [
  path.join(repoRoot, 'hrms-ui', 'shared'),
  path.join(repoRoot, 'employee-onboarding', 'frontend', 'shared'),
  path.join(repoRoot, 'payroll', 'frontend', 'shared'),
];

if (!fs.existsSync(sharedSrc)) {
  console.error('shared/ folder not found at repo root');
  process.exit(1);
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
  copyRecursive(sharedSrc, dest);
  console.log('Copied shared ->', path.relative(repoRoot, dest));
}

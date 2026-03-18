#!/usr/bin/env node
/**
 * Synchronizes the canonical shared frontend layer from hrms-ui/shared into any
 * frontend package that declares the @shared/* alias in tsconfig/jsconfig.
 *
 * Run from repo root: node scripts/prepare-shared.js
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const canonicalPackageRoot = path.join(repoRoot, 'hrms-ui');
const sharedSrc = path.join(canonicalPackageRoot, 'shared');
const lockDirectory = path.join(repoRoot, '.prepare-shared.lock');
const ignoredDirectories = new Set(['.git', '.next', 'coverage', 'dist', 'build', 'node_modules']);
const configFileNames = ['tsconfig.json', 'jsconfig.json'];
const sleepBuffer = new Int32Array(new SharedArrayBuffer(4));

if (!fs.existsSync(sharedSrc)) {
  console.error('hrms-ui/shared folder not found');
  process.exit(1);
}

function sleep(ms) {
  Atomics.wait(sleepBuffer, 0, 0, ms);
}

function acquireLock() {
  const deadline = Date.now() + 30000;
  const staleAfterMs = 120000;

  while (true) {
    try {
      fs.mkdirSync(lockDirectory);
      fs.writeFileSync(path.join(lockDirectory, 'owner.txt'), `${process.pid}\n`, 'utf8');
      return;
    } catch (error) {
      if (error && error.code !== 'EEXIST') {
        throw error;
      }

      try {
        const stats = fs.statSync(lockDirectory);
        if (Date.now() - stats.mtimeMs > staleAfterMs) {
          fs.rmSync(lockDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
          continue;
        }
      } catch {
        continue;
      }

      if (Date.now() > deadline) {
        throw new Error('Timed out waiting for prepare-shared lock');
      }

      sleep(150);
    }
  }
}

function releaseLock() {
  try {
    fs.rmSync(lockDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  } catch {
    // Ignore cleanup failures to avoid masking the real build error.
  }
}

function emptyDirectory(dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    return;
  }

  for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
    const entryPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(entryPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    } else {
      fs.rmSync(entryPath, { force: true, maxRetries: 5, retryDelay: 50 });
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

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function packageUsesSharedAlias(packageRoot) {
  for (const fileName of configFileNames) {
    const configPath = path.join(packageRoot, fileName);
    if (!fs.existsSync(configPath)) {
      continue;
    }

    const config = readJson(configPath);
    const paths = config?.compilerOptions?.paths;
    if (paths && Object.prototype.hasOwnProperty.call(paths, '@shared/*')) {
      return true;
    }
  }

  return false;
}

function walkForPackageRoots(currentDir, targets) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(currentDir, entry.name);
    const packageJsonPath = path.join(entryPath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      if (path.resolve(entryPath) !== path.resolve(canonicalPackageRoot) && packageUsesSharedAlias(entryPath)) {
        targets.push(entryPath);
      }
      continue;
    }

    walkForPackageRoots(entryPath, targets);
  }
}

const packageRoots = [];
walkForPackageRoots(repoRoot, packageRoots);

const targets = packageRoots
  .map((packageRoot) => path.join(packageRoot, 'shared'))
  .filter((target, index, list) => list.indexOf(target) === index)
  .sort((left, right) => left.localeCompare(right));

if (targets.length === 0) {
  console.log('No shared frontend targets discovered.');
  process.exit(0);
}

acquireLock();

try {
  for (const dest of targets) {
    emptyDirectory(dest);
    copyRecursive(sharedSrc, dest);
    console.log('Copied shared ->', path.relative(repoRoot, dest));
  }
} finally {
  releaseLock();
}
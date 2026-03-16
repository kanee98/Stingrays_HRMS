#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const repoScript = path.resolve(appRoot, '../scripts/prepare-shared.js');
const localShared = path.join(appRoot, 'shared');

function hasLocalShared() {
  return fs.existsSync(localShared) && fs.readdirSync(localShared).length > 0;
}

if (fs.existsSync(repoScript)) {
  require(repoScript);
  process.exit(0);
}

if (hasLocalShared()) {
  console.log('Shared directory already present, skipping repo sync');
  process.exit(0);
}

console.error(`Unable to prepare shared directory. Missing ${repoScript} and ${localShared} is empty.`);
process.exit(1);

const { readdirSync, statSync } = require('fs');
const { join, resolve } = require('path');
const { spawnSync } = require('child_process');

process.env.TS_NODE_PROJECT = resolve(__dirname, '../tsconfig.json');

function getTestFiles(dir) {
  let results = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getTestFiles(fullPath));
    } else if (file.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const testFiles = getTestFiles(__dirname);
if (testFiles.length === 0) {
  console.log('No test files found.');
  process.exit(0);
}

const args = ['-r', 'ts-node/register', '--test', ...testFiles];
const result = spawnSync('node', args, {
  stdio: 'inherit',
  env: process.env
});

process.exit(result.status ?? 0);

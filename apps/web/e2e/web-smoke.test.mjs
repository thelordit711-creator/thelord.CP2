import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, '..');

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForReady(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for Next.js server at ${url}`);
}

describe('Next.js Web App E2E Smoke Suite', () => {
  let child;
  let baseUrl;

  before(async () => {
    const port = await findFreePort();
    baseUrl = `http://127.0.0.1:${port}`;
    const nextBin = path.resolve(webDir, '../../node_modules/next/dist/bin/next');

    child = spawn(process.execPath, [nextBin, 'start', '-H', '127.0.0.1', '-p', String(port)], {
      cwd: webDir,
      env: { ...process.env, KINDE_ISSUER_URL: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    await waitForReady(`${baseUrl}/ar/login`);
  });

  after(async () => {
    if (child && !child.killed) {
      child.kill();
      await new Promise((resolve) => child.once('exit', resolve));
    }
  });

  it('redirects root / to default Arabic locale /ar via proxy.ts', async () => {
    const res = await fetch(`${baseUrl}/`, { redirect: 'manual' });
    assert.ok(res.status >= 300 && res.status < 400);
    const loc = res.headers.get('location') || '';
    assert.ok(loc.includes('/ar'), `Expected redirect location to include /ar, got ${loc}`);
  });

  it('renders Arabic and English login pages with 200 OK', async () => {
    const arRes = await fetch(`${baseUrl}/ar/login`);
    assert.strictEqual(arRes.status, 200);
    const arHtml = await arRes.text();
    assert.ok(arHtml.includes('<html') && arHtml.includes('dir="rtl"'));

    const enRes = await fetch(`${baseUrl}/en/login`);
    assert.strictEqual(enRes.status, 200);
    const enHtml = await enRes.text();
    assert.ok(enHtml.includes('<html'));
  });

  it('renders /ar/projects and /ar/tasks routes cleanly without 500 errors', async () => {
    const projRes = await fetch(`${baseUrl}/ar/projects`);
    assert.strictEqual(projRes.status, 200);

    const tasksRes = await fetch(`${baseUrl}/ar/tasks`);
    assert.strictEqual(tasksRes.status, 200);
  });
});


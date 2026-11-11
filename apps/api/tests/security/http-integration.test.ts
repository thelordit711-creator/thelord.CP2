import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const TEST_JWT_SECRET = 'integration-test-jwt-secret-minimum-32-chars!!';

describe('Express HTTP Security, CSRF & Treasury Isolation Integration Tests', () => {
  let serverInstance: http.Server;
  let baseUrl = '';
  let UserModel: any;
  let originalFindById: any;
  let socketServiceRef: any;
  let prevNodeEnv: string | undefined;
  let prevJwtSecret: string | undefined;
  let prevMongoUri: string | undefined;

  before(async () => {
    prevNodeEnv = process.env.NODE_ENV;
    prevJwtSecret = process.env.JWT_SECRET;
    prevMongoUri = process.env.MONGODB_URI;

    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/thelord_integration_test';

    // Dynamically load server after test env vars are set so validateEnvironment() passes cleanly
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { server } = require('../../src/server');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    UserModel = require('../../src/models/User.model').User;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    socketServiceRef = require('../../src/services/socket.service').SocketService;

    originalFindById = UserModel.findById;
    serverInstance = server;

    await new Promise<void>((resolve) => {
      serverInstance.listen(0, '127.0.0.1', () => {
        const addr = serverInstance.address();
        if (addr && typeof addr !== 'string') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(() => {
    if (UserModel && originalFindById) {
      UserModel.findById = originalFindById;
    }
  });

  after(async () => {
    if (socketServiceRef?.getIO()) {
      socketServiceRef.getIO().close();
    }
    if (serverInstance && serverInstance.listening) {
      await new Promise<void>((resolve) => serverInstance.close(() => resolve()));
    }
    process.env.NODE_ENV = prevNodeEnv;
    if (prevJwtSecret !== undefined) process.env.JWT_SECRET = prevJwtSecret;
    else delete process.env.JWT_SECRET;
    if (prevMongoUri !== undefined) process.env.MONGODB_URI = prevMongoUri;
    else delete process.env.MONGODB_URI;
  });

  it('GET /health returns 200 and attaches X-Request-Id correlation header', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('x-request-id'), 'Expected X-Request-Id header on response');
    const body = await res.json();
    assert.strictEqual(body.status, 'online');
  });

  it('GET /ready returns 503 when MongoDB is disconnected', async () => {
    assert.notStrictEqual(mongoose.connection.readyState, 1);
    const res = await fetch(`${baseUrl}/ready`);
    assert.strictEqual(res.status, 503);
    const body = await res.json();
    assert.strictEqual(body.status, 'not_ready');
    assert.strictEqual(body.database, 'disconnected');
  });

  it('rejects unauthenticated access to protected API endpoints with 401', async () => {
    const endpoints = ['/api/v1/tasks', '/api/v1/treasury/orders', '/api/v1/users/me'];
    for (const path of endpoints) {
      const res = await fetch(`${baseUrl}${path}`);
      assert.strictEqual(res.status, 401, `Expected 401 on ${path}`);
    }
  });

  it('csrfGuard blocks untrusted cross-site POST and form-encoded CSRF when auth cookie is present', async () => {
    const treasuryToken = jwt.sign(
      { userId: '507f1f77bcf86cd799439011', email: 'treasury@test.local', accessRole: 'TREASURY' },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 1. Untrusted Origin
    const evilOriginRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: `auth_token=${treasuryToken}`,
        Origin: 'https://evil-attacker.example',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    assert.strictEqual(evilOriginRes.status, 403);
    const evilBody = await evilOriginRes.json();
    assert.match(evilBody.error || '', /CORS|CSRF/i);

    // 2. Simple HTML form submission without X-Requested-With or application/json
    const formCsrfRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: `auth_token=${treasuryToken}`,
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'confirm=1'
    });
    assert.strictEqual(formCsrfRes.status, 403);
    const formBody = await formCsrfRes.json();
    assert.match(formBody.error || '', /CSRF/i);
  });

  it('strictly enforces Zero-Access Isolation for TREASURY accounts across real Express routes', async () => {
    const treasuryUser: any = {
      _id: '507f1f77bcf86cd799439011',
      email: 'treasury@test.local',
      fullName: 'Treasury Officer',
      accessRole: 'TREASURY',
      isSuspended: false
    };
    treasuryUser.toObject = () => ({ ...treasuryUser });

    UserModel.findById = async () => treasuryUser;

    const treasuryToken = jwt.sign(
      { userId: treasuryUser._id, email: treasuryUser.email, accessRole: 'TREASURY' },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Treasury MUST be blocked with 403 on operational/internal routes
    const forbiddenForTreasury = [
      '/api/v1/tasks',
      '/api/v1/chat/rooms',
      '/api/v1/meetings',
      '/api/v1/ai/cashflow-forecast',
      '/api/v1/projects',
      '/api/v1/users/admin/all'
    ];

    for (const path of forbiddenForTreasury) {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: {
          Cookie: `auth_token=${treasuryToken}`
        }
      });
      assert.strictEqual(res.status, 403, `Expected 403 Zero-Access Isolation for TREASURY on ${path}`);
    }

    // Treasury CAN access /api/v1/auth/me and receives 200 OK
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: {
        Cookie: `auth_token=${treasuryToken}`
      }
    });
    assert.strictEqual(meRes.status, 200);
    const meBody = await meRes.json();
    assert.strictEqual(meBody.success, true);
    assert.strictEqual(meBody.user.accessRole, 'TREASURY');

    // Employee MUST be blocked with 403 on Treasury endpoints
    const employeeUser: any = {
      _id: '507f1f77bcf86cd799439022',
      email: 'employee@test.local',
      fullName: 'Staff Employee',
      accessRole: 'EMPLOYEE',
      isSuspended: false
    };
    employeeUser.toObject = () => ({ ...employeeUser });
    UserModel.findById = async () => employeeUser;
    const employeeToken = jwt.sign(
      { userId: employeeUser._id, email: employeeUser.email, accessRole: 'EMPLOYEE' },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );
    const empTreasuryRes = await fetch(`${baseUrl}/api/v1/treasury/orders`, {
      headers: {
        Cookie: `auth_token=${employeeToken}`
      }
    });
    assert.strictEqual(empTreasuryRes.status, 403);
  });

  it('rejects unauthenticated Socket.io namespace CONNECT handshake with Authentication error', async () => {
    // 1. Open Engine.IO v4 polling session
    const openRes = await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling`);
    assert.strictEqual(openRes.status, 200);
    const openText = await openRes.text();
    const sidMatch = openText.match(/"sid":"([^"]+)"/);
    assert.ok(sidMatch && sidMatch[1], `Expected Engine.IO sid in: ${openText}`);
    const sid = sidMatch[1];

    // 2. Send Socket.io CONNECT packet ("40") without JWT cookie/auth
    const connectRes = await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling&sid=${sid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: '40'
    });
    assert.strictEqual(connectRes.status, 200);

    // 3. Poll for Socket.io middleware error packet ("44" = CONNECT_ERROR)
    const pollRes = await fetch(`${baseUrl}/socket.io/?EIO=4&transport=polling&sid=${sid}`);
    const pollText = await pollRes.text();
    assert.ok(
      pollText.startsWith('44') && pollText.includes('Authentication error'),
      `Expected Socket.io CONNECT_ERROR (44) with Authentication error, got: ${pollText}`
    );
  });
});

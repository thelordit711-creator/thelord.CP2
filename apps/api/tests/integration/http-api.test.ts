import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import { getSwaggerUiHtml, openApiSpec } from '../../src/config/openapi';
import { validateBody, validateParams, validateQuery } from '../../src/middlewares/validateRequest';
import {
  createTaskSchema,
  idParamSchema,
  presignedUrlQuerySchema,
  uploadMetadataSchema
} from '../../src/schemas/api.schemas';

describe('HTTP Express Middleware & OpenAPI Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    const app = express();
    app.use(express.json());

    app.get('/api/docs.json', (_req, res) => {
      res.json(openApiSpec);
    });

    app.get('/api/docs', (_req, res) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https://unpkg.com;"
      );
      res.type('html').send(getSwaggerUiHtml());
    });

    app.get('/test/presigned-url', validateQuery(presignedUrlQuerySchema), (req, res) => {
      res.json({ success: true, key: req.query.key });
    });

    app.post('/test/upload-meta', validateBody(uploadMetadataSchema), (req, res) => {
      res.json({ success: true, body: req.body });
    });

    app.post('/test/tasks', validateBody(createTaskSchema), (req, res) => {
      res.status(201).json({ success: true, data: req.body });
    });

    app.get('/test/items/:id', validateParams(idParamSchema), (req, res) => {
      res.json({ success: true, id: req.params.id });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('GET /api/docs.json serves valid OpenAPI 3.0.3 schema with upload & tasks routes', async () => {
    const res = await fetch(`${baseUrl}/api/docs.json`);
    assert.strictEqual(res.status, 200);
    const json: any = await res.json();
    assert.strictEqual(json.openapi, '3.0.3');
    assert.ok(json.paths['/upload']);
    assert.ok(json.paths['/upload/presigned-url']);
    assert.ok(json.paths['/tasks']);
  });

  it('GET /api/docs serves interactive Swagger UI HTML with CSP allowance for Swagger CDN', async () => {
    const res = await fetch(`${baseUrl}/api/docs`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    assert.ok(res.headers.get('content-security-policy')?.includes('https://unpkg.com'));
    const html = await res.text();
    assert.ok(html.includes('SwaggerUIBundle'));
    assert.ok(html.includes('/api/docs.json'));
  });

  it('validateQuery rejects missing keys and path-traversal attempts on /presigned-url', async () => {
    const missingRes = await fetch(`${baseUrl}/test/presigned-url`);
    assert.strictEqual(missingRes.status, 400);

    const traversalRes = await fetch(`${baseUrl}/test/presigned-url?key=../secrets/env`);
    assert.strictEqual(traversalRes.status, 400);
    const body: any = await traversalRes.json();
    assert.strictEqual(body.success, false);

    const okRes = await fetch(`${baseUrl}/test/presigned-url?key=receipts/2026/inv-01.pdf`);
    assert.strictEqual(okRes.status, 200);
    const okBody: any = await okRes.json();
    assert.strictEqual(okBody.key, 'receipts/2026/inv-01.pdf');
  });

  it('validateBody enforces createTaskSchema and uploadMetadataSchema over HTTP POST', async () => {
    const badTask = await fetch(`${baseUrl}/test/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'X', description: '' })
    });
    assert.strictEqual(badTask.status, 400);
    const badJson: any = await badTask.json();
    assert.ok(Array.isArray(badJson.details) && badJson.details.length >= 1);

    const goodTask = await fetch(`${baseUrl}/test/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '  Deploy Production Vault  ',
        description: '  Verify BEP20 settlement flow  ',
        priority: 'HIGH'
      })
    });
    assert.strictEqual(goodTask.status, 201);
    const goodJson: any = await goodTask.json();
    assert.strictEqual(goodJson.data.title, 'Deploy Production Vault');

    const badUpload = await fetch(`${baseUrl}/test/upload-meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'root_system' })
    });
    assert.strictEqual(badUpload.status, 400);
  });

  it('validateParams rejects non-ObjectId path parameters with HTTP 400', async () => {
    const badRes = await fetch(`${baseUrl}/test/items/invalid-id-123`);
    assert.strictEqual(badRes.status, 400);

    const goodRes = await fetch(`${baseUrl}/test/items/507f1f77bcf86cd799439011`);
    assert.strictEqual(goodRes.status, 200);
    const json: any = await goodRes.json();
    assert.strictEqual(json.id, '507f1f77bcf86cd799439011');
  });
});


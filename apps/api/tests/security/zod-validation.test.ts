import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { validateBody, validateParams } from '../../src/middlewares/validateRequest';
import {
  idParamSchema,
  loginSchema,
  adjustVaultSchema,
  createProjectSchema,
  createTaskSchema,
  reviewStageSchema,
  aiVoiceToTaskSchema
} from '../../src/schemas/api.schemas';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

describe('Zod Request Validation & Vercel CORS Configuration', () => {
  it('validateBody should reject invalid login payload with 400 and structured Arabic details', () => {
    const req: any = { body: { email: 'not-an-email', password: '' } };
    const res = createMockRes();
    let nextCalled = false;

    validateBody(loginSchema)(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
    assert.ok(Array.isArray(res.body?.details) && res.body.details.length >= 1);
  });

  it('validateBody should reject negative vault adjustment amounts', () => {
    const req: any = { body: { amount: -100, actionType: 'FUND_TREASURY' } };
    const res = createMockRes();
    let nextCalled = false;

    validateBody(adjustVaultSchema)(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
  });

  it('validateBody should accept and coerce valid numeric vault adjustments & project creation DTOs', () => {
    const reqVault: any = { body: { amount: '250.5', actionType: 'DEPOSIT_GENERAL_BUDGET' } };
    const resVault = createMockRes();
    let vaultNext = false;
    validateBody(adjustVaultSchema)(reqVault, resVault, () => {
      vaultNext = true;
    });
    assert.strictEqual(vaultNext, true);
    assert.strictEqual(reqVault.body.amount, 250.5);

    const reqProj: any = {
      body: {
        title: 'تطوير منصة التداول',
        description: 'مشروع متكامل لرفع كفاءة التداول',
        allocatedBudget: '5000',
        targetEndDate: '2026-12-31'
      }
    };
    const resProj = createMockRes();
    let projNext = false;
    validateBody(createProjectSchema)(reqProj, resProj, () => {
      projNext = true;
    });
    assert.strictEqual(projNext, true);
    assert.strictEqual(reqProj.body.allocatedBudget, 5000);
  });

  it('validateParams should reject invalid Mongo ObjectIds with 400', () => {
    const req: any = { params: { id: 'not-a-valid-object-id' } };
    const res = createMockRes();
    let nextCalled = false;

    validateParams(idParamSchema)(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 400);
  });

  it('vercel.json must not declare wildcard Access-Control-Allow-Origin alongside credentials', () => {
    const vercelPath = path.resolve(__dirname, '../../../../vercel.json');
    const raw = fs.readFileSync(vercelPath, 'utf-8');
    const config = JSON.parse(raw);
    const allHeaders = (config.headers || []).flatMap((h: any) => h.headers || []);
    const wildcardOrigin = allHeaders.find(
      (h: any) =>
        String(h.key).toLowerCase() === 'access-control-allow-origin' &&
        String(h.value).trim() === '*'
    );
    assert.strictEqual(wildcardOrigin, undefined);
  });

  it('createTaskSchema enforces valid title, description, priority, and projectId', () => {
    const valid = createTaskSchema.safeParse({
      title: 'Implement OpenAPI docs',
      description: 'Expose /api/docs.json manifest',
      priority: 'HIGH',
      projectId: '507f1f77bcf86cd799439011',
      milestoneIndex: 0,
    });
    assert.strictEqual(valid.success, true);

    const invalid = createTaskSchema.safeParse({
      title: 'A',
      description: '',
      priority: 'INVALID_PRIORITY',
      projectId: 'not-an-object-id',
    });
    assert.strictEqual(invalid.success, false);
  });

  it('reviewStageSchema validates decision enum and optional adminFeedback', () => {
    const approve = reviewStageSchema.safeParse({ decision: 'APPROVED', adminFeedback: 'Looks good' });
    assert.strictEqual(approve.success, true);

    const badAction = reviewStageSchema.safeParse({ decision: 'DELETE' });
    assert.strictEqual(badAction.success, false);
  });

  it('aiVoiceToTaskSchema accepts non-empty transcript and optional assignees', () => {
    const valid = aiVoiceToTaskSchema.safeParse({ transcript: 'Create a backend monitoring task for Ali' });
    assert.strictEqual(valid.success, true);

    const empty = aiVoiceToTaskSchema.safeParse({ transcript: '   ' });
    assert.strictEqual(empty.success, false);
  });

  it('openApiSpec exposes OpenAPI 3.0.3 schema paths', async () => {
    const { openApiSpec } = await import('../../src/config/openapi');
    assert.strictEqual(openApiSpec.openapi, '3.0.3');
    assert.ok(openApiSpec.paths['/auth/login']);
    assert.ok(openApiSpec.paths['/tasks']);
    assert.ok(openApiSpec.paths['/projects']);
  });
});


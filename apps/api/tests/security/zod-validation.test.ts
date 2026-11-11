import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { validateBody, validateParams } from '../../src/middlewares/validateRequest';
import {
  idParamSchema,
  loginSchema,
  adjustVaultSchema,
  createProjectSchema
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
});


import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hasPermission, AppPermission, AccessRole } from '@lord/shared-types';

describe('RBAC & Permission Matrix Security Tests', () => {
  it('SUPER_ADMIN should have all operational and financial permissions', () => {
    const criticalPermissions: AppPermission[] = [
      'TREASURY:VIEW',
      'TREASURY:DISBURSE',
      'TREASURY:MANAGE_VAULTS',
      'TREASURY:ADJUST_BUDGET',
      'TREASURY:AUDIT_LEDGER',
      'TASKS:VIEW',
      'TASKS:CREATE',
      'TASKS:SUBMIT',
      'TASKS:APPROVE',
      'USERS:VIEW',
      'USERS:MANAGE',
      'USERS:SET_SALARY',
      'AUDIT:VIEW',
      'COMMUNICATIONS:ACCESS'
    ];

    for (const perm of criticalPermissions) {
      assert.strictEqual(hasPermission('SUPER_ADMIN', perm), true, `SUPER_ADMIN should have ${perm}`);
    }
  });

  it('TREASURY should be strictly isolated to disbursement and vault viewing', () => {
    // Treasury MUST have disbursement permissions
    assert.strictEqual(hasPermission('TREASURY', 'TREASURY:VIEW'), true);
    assert.strictEqual(hasPermission('TREASURY', 'TREASURY:DISBURSE'), true);

    // Treasury MUST NOT be allowed to alter structural vaults, create tasks, or edit staff salaries
    assert.strictEqual(hasPermission('TREASURY', 'TREASURY:MANAGE_VAULTS'), false);
    assert.strictEqual(hasPermission('TREASURY', 'TREASURY:ADJUST_BUDGET'), false);
    assert.strictEqual(hasPermission('TREASURY', 'TREASURY:AUDIT_LEDGER'), false);
    assert.strictEqual(hasPermission('TREASURY', 'TASKS:CREATE'), false);
    assert.strictEqual(hasPermission('TREASURY', 'TASKS:APPROVE'), false);
    assert.strictEqual(hasPermission('TREASURY', 'USERS:MANAGE'), false);
    assert.strictEqual(hasPermission('TREASURY', 'USERS:SET_SALARY'), false);
    assert.strictEqual(hasPermission('TREASURY', 'AUDIT:VIEW'), false);
  });

  it('EMPLOYEE should NOT have any access to Treasury or User management', () => {
    assert.strictEqual(hasPermission('EMPLOYEE', 'TREASURY:VIEW'), false);
    assert.strictEqual(hasPermission('EMPLOYEE', 'TREASURY:DISBURSE'), false);
    assert.strictEqual(hasPermission('EMPLOYEE', 'TREASURY:MANAGE_VAULTS'), false);
    assert.strictEqual(hasPermission('EMPLOYEE', 'USERS:MANAGE'), false);
    assert.strictEqual(hasPermission('EMPLOYEE', 'USERS:SET_SALARY'), false);

    // Employee CAN view tasks and submit deliverables
    assert.strictEqual(hasPermission('EMPLOYEE', 'TASKS:VIEW'), true);
    assert.strictEqual(hasPermission('EMPLOYEE', 'TASKS:SUBMIT'), true);
    assert.strictEqual(hasPermission('EMPLOYEE', 'COMMUNICATIONS:ACCESS'), true);
  });

  it('should reject non-existent or malicious roles gracefully', () => {
    assert.strictEqual(hasPermission('HACKER' as AccessRole, 'TREASURY:DISBURSE'), false);
    assert.strictEqual(hasPermission('' as AccessRole, 'TASKS:VIEW'), false);
  });
});

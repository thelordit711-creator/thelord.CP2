import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hasPermission, AppPermission, AccessRole } from '@lord/shared-types';
import { isTreasuryPathAllowed } from '../../src/middlewares/treasuryIsolationGuard';
import { validateCsrfRequest } from '../../src/middlewares/csrfGuard';
import { getLocalDateString, buildCronWindowKey } from '../../src/services/cron.service';
import { SocketService } from '../../src/services/socket.service';
import { AccountingService } from '../../src/services/accounting.service';
import type { Socket } from 'socket.io';

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

  it('isTreasuryPathAllowed should strictly isolate TREASURY endpoints', () => {
    const allowedPaths = [
      '/api/v1/treasury/orders',
      '/api/v1/finance/vault',
      '/api/v1/upload/presigned-url',
      '/api/v1/notifications',
      '/api/v1/auth/me',
      '/api/v1/users/me',
      '/api/v1/users/team',
      '/api/v1/users/profile'
    ];
    for (const path of allowedPaths) {
      assert.strictEqual(isTreasuryPathAllowed(path), true, `Expected TREASURY to be allowed on ${path}`);
    }

    const blockedPaths = [
      '/api/v1/tasks',
      '/api/v1/tasks/123',
      '/api/v1/chat/rooms',
      '/api/v1/meetings/create',
      '/api/v1/ai/cashflow-forecast',
      '/api/v1/projects',
      '/api/v1/users/admin/all'
    ];
    for (const path of blockedPaths) {
      assert.strictEqual(isTreasuryPathAllowed(path), false, `Expected TREASURY to be blocked on ${path}`);
    }
  });

  it('SocketService.extractTokenFromHandshake should extract tokens safely across handshake channels', () => {
    const fromAuth = SocketService.extractTokenFromHandshake({
      auth: { token: 'jwt-from-auth' },
      headers: {},
      query: {}
    } as unknown as Socket['handshake']);
    assert.strictEqual(fromAuth, 'jwt-from-auth');

    const fromHeader = SocketService.extractTokenFromHandshake({
      auth: {},
      headers: { authorization: 'Bearer jwt-from-header' },
      query: {}
    } as unknown as Socket['handshake']);
    assert.strictEqual(fromHeader, 'jwt-from-header');

    const fromCookie = SocketService.extractTokenFromHandshake({
      auth: {},
      headers: { cookie: 'other=1; lord_auth_token=jwt-from-cookie; foo=bar' },
      query: {}
    } as unknown as Socket['handshake']);
    assert.strictEqual(fromCookie, 'jwt-from-cookie');

    const missing = SocketService.extractTokenFromHandshake({
      auth: {},
      headers: {},
      query: {}
    } as unknown as Socket['handshake']);
    assert.strictEqual(missing, null);
  });

  it('AccountingService.roundCurrency should prevent IEEE 754 floating-point drift', () => {
    assert.strictEqual(AccountingService.roundCurrency(0.1 + 0.2), 0.3);
    assert.strictEqual(AccountingService.roundCurrency(100.125), 100.13);
    assert.strictEqual(AccountingService.roundCurrency(19.999), 20);
    assert.strictEqual(AccountingService.roundCurrency(0), 0);
  });

  it('validateCsrfRequest should block untrusted cross-site mutations while allowing safe XHR/Bearer requests', () => {
    assert.strictEqual(
      validateCsrfRequest({ method: 'GET', hasCookieToken: true, hasBearerToken: false }).valid,
      true
    );

    assert.strictEqual(
      validateCsrfRequest({
        method: 'POST',
        hasCookieToken: true,
        hasBearerToken: false,
        origin: 'https://evil-attacker.example',
        xRequestedWith: 'XMLHttpRequest'
      }).valid,
      false
    );

    assert.strictEqual(
      validateCsrfRequest({
        method: 'POST',
        hasCookieToken: true,
        hasBearerToken: false,
        origin: 'http://localhost:3000',
        contentType: 'application/x-www-form-urlencoded'
      }).valid,
      false
    );

    assert.strictEqual(
      validateCsrfRequest({
        method: 'POST',
        hasCookieToken: true,
        hasBearerToken: false,
        origin: 'http://localhost:3000',
        xRequestedWith: 'XMLHttpRequest',
        contentType: 'multipart/form-data'
      }).valid,
      true
    );

    assert.strictEqual(
      validateCsrfRequest({
        method: 'POST',
        hasCookieToken: true,
        hasBearerToken: true
      }).valid,
      true
    );
  });

  it('CronService date/window helpers should compute deterministic Asia/Riyadh lock keys', () => {
    // 22:30 UTC on 2026-11-11 is already 01:30 on 2026-11-12 in Asia/Riyadh (UTC+3)
    const utcNight = new Date('2026-11-11T22:30:00.000Z');
    assert.strictEqual(getLocalDateString(utcNight, 'Asia/Riyadh'), '2026-11-12');
    assert.strictEqual(buildCronWindowKey('daily-report', utcNight, 1440), 'daily-report:2026-11-12');
    assert.strictEqual(buildCronWindowKey('escalation', utcNight, 60), 'escalation:2026-11-12:b22');
  });
});

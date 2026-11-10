import { describe, it } from 'node:test';
import assert from 'node:assert';
import { canTransitionPayoutStatus, PayoutExecutionStatus } from '@lord/shared-types';

describe('Payout State Machine & Accounting Invariants', () => {
  it('should allow valid legal forward state transitions', () => {
    // Normal lifecycle
    assert.strictEqual(canTransitionPayoutStatus('DRAFT', 'PENDING_APPROVAL'), true);
    assert.strictEqual(canTransitionPayoutStatus('PENDING_APPROVAL', 'WAITING_TREASURY'), true);
    assert.strictEqual(canTransitionPayoutStatus('WAITING_TREASURY', 'IN_PROGRESS'), true);
    assert.strictEqual(canTransitionPayoutStatus('IN_PROGRESS', 'AWAITING_VERIFICATION'), true);
    assert.strictEqual(canTransitionPayoutStatus('AWAITING_VERIFICATION', 'DISBURSED'), true);

    // Direct disbursement from WAITING_TREASURY or IN_PROGRESS
    assert.strictEqual(canTransitionPayoutStatus('WAITING_TREASURY', 'DISBURSED'), true);
    assert.strictEqual(canTransitionPayoutStatus('IN_PROGRESS', 'DISBURSED'), true);
  });

  it('should strictly reject illegal jumps and backwards transitions from DISBURSED', () => {
    // DISBURSED is a terminal financial state - no rollback or state jump allowed
    const targets: PayoutExecutionStatus[] = [
      'DRAFT',
      'PENDING_APPROVAL',
      'WAITING_TREASURY',
      'IN_PROGRESS',
      'AWAITING_VERIFICATION',
      'REJECTED',
      'CANCELLED'
    ];

    for (const target of targets) {
      assert.strictEqual(canTransitionPayoutStatus('DISBURSED', target), false, `Cannot transit from DISBURSED to ${target}`);
    }
  });

  it('should strictly reject illegal jumps and backwards transitions from CANCELLED and REJECTED', () => {
    assert.strictEqual(canTransitionPayoutStatus('CANCELLED', 'DISBURSED'), false);
    assert.strictEqual(canTransitionPayoutStatus('CANCELLED', 'WAITING_TREASURY'), false);
    assert.strictEqual(canTransitionPayoutStatus('REJECTED', 'DISBURSED'), false);
    assert.strictEqual(canTransitionPayoutStatus('REJECTED', 'IN_PROGRESS'), false);
  });

  it('should prevent jumping directly from DRAFT to DISBURSED', () => {
    assert.strictEqual(canTransitionPayoutStatus('DRAFT', 'DISBURSED'), false);
    assert.strictEqual(canTransitionPayoutStatus('DRAFT', 'IN_PROGRESS'), false);
  });
});

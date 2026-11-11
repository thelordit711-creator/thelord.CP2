import { describe, it } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { canTransitionPayoutStatus, PayoutExecutionStatus } from '@lord/shared-types';
import { FinancialMath, fromDecimal128, toDecimal128 } from '../../src/utils/financialMath';
import { CompanyVault } from '../../src/models/CompanyVault.model';
import { PayoutOrder } from '../../src/models/PayoutOrder.model';
import { EmployeeLedger } from '../../src/models/EmployeeLedger.model';
import { RecurringExpense } from '../../src/models/RecurringExpense.model';

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

  it('FinancialMath should compute exact BigInt arithmetic without IEEE 754 drift', () => {
    assert.strictEqual(FinancialMath.add(0.1, 0.2), 0.3);
    assert.strictEqual(FinancialMath.subtract(100.3, 0.1), 100.2);
    assert.strictEqual(FinancialMath.roundCurrency(100.125), 100.13);
    assert.strictEqual(FinancialMath.formatDecimalString('19.999000'), '19.999');

    // Repeated 0.1 accumulation 1000 times must stay exactly 100
    let acc = 0;
    for (let i = 0; i < 1000; i++) {
      acc = FinancialMath.add(acc, 0.1);
    }
    assert.strictEqual(acc, 100);

    assert.throws(() => FinancialMath.assertNonNegative(-0.01, 'treasuryBalance'), /cannot be negative/);
    assert.strictEqual(FinancialMath.assertNonNegative(0, 'treasuryBalance'), 0);
  });

  it('MongoDB financial models should store true BSON Decimal128 internally and serialize cleanly as numbers', () => {
    const oid = new mongoose.Types.ObjectId();

    const vault = new CompanyVault({
      generalBudget: 50000.12,
      treasuryBalance: 1234.56
    });
    assert.ok((vault as any)._doc.generalBudget instanceof mongoose.Types.Decimal128);
    assert.ok((vault as any)._doc.treasuryBalance instanceof mongoose.Types.Decimal128);
    assert.strictEqual(vault.generalBudget, 50000.12);
    assert.strictEqual(vault.toJSON().treasuryBalance, 1234.56);

    const order = new PayoutOrder({
      beneficiaryId: oid,
      amount: 250.75,
      payoutMethod: 'BEP20_USDT',
      category: 'SALARY',
      summaryForTreasury: 'Test Decimal128 payout'
    });
    assert.ok((order as any)._doc.amount instanceof mongoose.Types.Decimal128);
    assert.strictEqual(order.amount, 250.75);
    assert.strictEqual(order.toJSON().amount, 250.75);

    const ledger = new EmployeeLedger({
      employeeId: oid,
      entryType: 'BONUS',
      amount: 99.99,
      reason: 'Q4 performance bonus',
      recordedBy: oid
    });
    assert.ok((ledger as any)._doc.amount instanceof mongoose.Types.Decimal128);
    assert.strictEqual(ledger.toJSON().amount, 99.99);

    const recurring = new RecurringExpense({
      title: 'Cloud Server',
      amount: 45.5,
      beneficiaryName: 'AWS'
    });
    assert.ok((recurring as any)._doc.amount instanceof mongoose.Types.Decimal128);
    assert.strictEqual(recurring.toJSON().amount, 45.5);

    // Backward-compatible reads of legacy Number or $numberDecimal JSON objects
    assert.strictEqual(fromDecimal128(42.5), 42.5);
    assert.strictEqual(fromDecimal128({ $numberDecimal: '123.45' }), 123.45);
    assert.strictEqual(toDecimal128(undefined), undefined);
  });
});

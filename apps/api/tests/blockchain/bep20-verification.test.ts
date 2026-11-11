import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Bep20VerificationService,
  BSC_USDT_CONTRACT,
  TRANSFER_EVENT_TOPIC,
  MIN_BSC_CONFIRMATIONS
} from '../../src/services/bep20Verification.service';

const SAMPLE_TX_HASH = '0x' + 'a'.repeat(64);
const SENDER_HEX = '0000000000000000000000001111111111111111111111111111111111111111';
const RECIPIENT_ADDR = '0x2222222222222222222222222222222222222222';
const RECIPIENT_TOPIC = '0x0000000000000000000000002222222222222222222222222222222222222222';
const SENDER_TOPIC = '0x' + SENDER_HEX;
// 250.5 USDT in 18 decimals (250.5 * 10^18)
const AMOUNT_250_5_HEX = '0x' + (BigInt('250500000000000000000')).toString(16).padStart(64, '0');

describe('Blockchain BEP20 USDT Verification Unit Tests', () => {
  it('should reject malformed or non-hexadecimal TxHash values', async () => {
    const invalidHashes = [
      '',
      'invalid-hash',
      '0x1234', // too short
      '0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ', // invalid hex
      '1234567890123456789012345678901234567890123456789012345678901234' // missing 0x prefix
    ];

    for (const hash of invalidHashes) {
      const result = await Bep20VerificationService.verifyTransaction(hash);
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.status, 'INVALID_DETAILS');
      assert.match(result.errorMessage || '', /صيغة TxHash غير صالحة/);
    }
  });

  it('should correctly configure the official BSC USDT contract address', () => {
    // Official BSC Tether USDT Contract is 0x55d398326f99059fF775485246999027B3197955
    assert.strictEqual(BSC_USDT_CONTRACT, '0x55d398326f99059ff775485246999027b3197955');
  });

  it('should reject fake or non-official contract Transfer logs even when tx receipt status is 0x1', () => {
    const fakeContract = '0x9999999999999999999999999999999999999999';
    const result = Bep20VerificationService.evaluateTransactionReceipt({
      txHash: SAMPLE_TX_HASH,
      tx: { to: fakeContract },
      receipt: {
        status: '0x1',
        blockNumber: '0x64', // 100
        logs: [
          {
            address: fakeContract,
            topics: [TRANSFER_EVENT_TOPIC, SENDER_TOPIC, RECIPIENT_TOPIC],
            data: AMOUNT_250_5_HEX
          }
        ]
      },
      currentBlock: 110,
      expectedRecipient: RECIPIENT_ADDR,
      expectedAmount: 250.5
    });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.status, 'INVALID_DETAILS');
    assert.match(result.errorMessage || '', /لا تحتوي على حدث Transfer حقيقي/);
  });

  it('should accept genuine BSC_USDT_CONTRACT Transfer logs with exact recipient, BigInt amount, and sufficient confirmations', () => {
    const result = Bep20VerificationService.evaluateTransactionReceipt({
      txHash: SAMPLE_TX_HASH,
      tx: { to: BSC_USDT_CONTRACT },
      receipt: {
        status: '0x1',
        blockNumber: '0x64', // 100
        logs: [
          {
            address: BSC_USDT_CONTRACT,
            topics: [TRANSFER_EVENT_TOPIC, SENDER_TOPIC, RECIPIENT_TOPIC],
            data: AMOUNT_250_5_HEX
          }
        ]
      },
      currentBlock: 100 + MIN_BSC_CONFIRMATIONS,
      expectedRecipient: RECIPIENT_ADDR,
      expectedAmount: 250.5
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.isConfirmed, true);
    assert.strictEqual(result.status, 'CONFIRMED');
    assert.strictEqual(result.recipient, RECIPIENT_ADDR.toLowerCase());
    assert.strictEqual(result.amount, 250.5);
    assert.strictEqual(result.confirmations, MIN_BSC_CONFIRMATIONS);
  });

  it('should reject mismatched recipient or amount and return PENDING_CHAIN_CONFIRMATION when confirmations < MIN_BSC_CONFIRMATIONS', () => {
    const wrongRecipient = Bep20VerificationService.evaluateTransactionReceipt({
      txHash: SAMPLE_TX_HASH,
      tx: { to: BSC_USDT_CONTRACT },
      receipt: {
        status: '0x1',
        blockNumber: '0x64',
        logs: [
          {
            address: BSC_USDT_CONTRACT,
            topics: [TRANSFER_EVENT_TOPIC, SENDER_TOPIC, RECIPIENT_TOPIC],
            data: AMOUNT_250_5_HEX
          }
        ]
      },
      currentBlock: 105,
      expectedRecipient: '0x3333333333333333333333333333333333333333',
      expectedAmount: 250.5
    });
    assert.strictEqual(wrongRecipient.isValid, false);
    assert.strictEqual(wrongRecipient.status, 'INVALID_DETAILS');

    const wrongAmount = Bep20VerificationService.evaluateTransactionReceipt({
      txHash: SAMPLE_TX_HASH,
      tx: { to: BSC_USDT_CONTRACT },
      receipt: {
        status: '0x1',
        blockNumber: '0x64',
        logs: [
          {
            address: BSC_USDT_CONTRACT,
            topics: [TRANSFER_EVENT_TOPIC, SENDER_TOPIC, RECIPIENT_TOPIC],
            data: AMOUNT_250_5_HEX
          }
        ]
      },
      currentBlock: 105,
      expectedRecipient: RECIPIENT_ADDR,
      expectedAmount: 500
    });
    assert.strictEqual(wrongAmount.isValid, false);
    assert.strictEqual(wrongAmount.status, 'INVALID_DETAILS');

    const lowConfirmations = Bep20VerificationService.evaluateTransactionReceipt({
      txHash: SAMPLE_TX_HASH,
      tx: { to: BSC_USDT_CONTRACT },
      receipt: {
        status: '0x1',
        blockNumber: '0x64', // 100
        logs: [
          {
            address: BSC_USDT_CONTRACT,
            topics: [TRANSFER_EVENT_TOPIC, SENDER_TOPIC, RECIPIENT_TOPIC],
            data: AMOUNT_250_5_HEX
          }
        ]
      },
      currentBlock: 101, // 1 confirmation (< 3)
      expectedRecipient: RECIPIENT_ADDR,
      expectedAmount: 250.5
    });
    assert.strictEqual(lowConfirmations.isValid, true);
    assert.strictEqual(lowConfirmations.isConfirmed, false);
    assert.strictEqual(lowConfirmations.status, 'PENDING_CHAIN_CONFIRMATION');
    assert.strictEqual(lowConfirmations.confirmations, 1);
  });
});

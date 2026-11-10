import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Bep20VerificationService, BSC_USDT_CONTRACT } from '../../src/services/bep20Verification.service';

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
});

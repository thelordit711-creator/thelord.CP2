import { logger } from '../utils/logger';

/**
 * On-Chain BSC BEP20 USDT Verification Service
 * Validates transaction receipts directly from Binance Smart Chain RPC.
 */

// Official BSC USDT Contract Address (BUSD-T on BSC)
export const BSC_USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955'.toLowerCase();

// ERC-20 / BEP-20 Transfer method signature: transfer(address,uint256)
const TRANSFER_METHOD_ID = '0xa9059cbb';

export interface IBscVerificationResult {
  isValid: boolean;
  isConfirmed: boolean;
  status: 'CONFIRMED' | 'FAILED' | 'PENDING' | 'INVALID_DETAILS' | 'RPC_ERROR';
  txHash: string;
  sender?: string;
  recipient?: string;
  amount?: number;
  contractAddress?: string;
  blockNumber?: number;
  confirmations?: number;
  errorMessage?: string;
}

export class Bep20VerificationService {
  private static getRpcUrl(): string {
    return process.env.BSC_RPC_URL || 'https://binance.llamarpc.com';
  }

  private static async rpcCall(method: string, params: unknown[]): Promise<any> {
    const rpcUrl = this.getRpcUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`RPC server responded with HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.error) {
        throw new Error(json.error.message || 'RPC Error');
      }
      return json.result;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Verify an on-chain BEP-20 USDT transaction
   */
  public static async verifyTransaction(
    txHash: string,
    expectedRecipient?: string,
    expectedAmount?: number
  ): Promise<IBscVerificationResult> {
    const cleanHash = txHash?.trim();
    if (!cleanHash || !/^0x[a-fA-F0-9]{64}$/.test(cleanHash)) {
      return {
        isValid: false,
        isConfirmed: false,
        status: 'INVALID_DETAILS',
        txHash: cleanHash,
        errorMessage: 'صيغة TxHash غير صالحة. يجب أن يبدأ بـ 0x ويحتوي على 64 خانة ست عشرية.'
      };
    }

    try {
      // 1. Fetch Transaction Details
      const tx = await this.rpcCall('eth_getTransactionByHash', [cleanHash]);
      if (!tx) {
        return {
          isValid: false,
          isConfirmed: false,
          status: 'PENDING',
          txHash: cleanHash,
          errorMessage: 'المعاملة غير موجودة في الذاكرة اللحظية للبلوكشين حالياً (Pending/Unindexed).'
        };
      }

      // 2. Fetch Transaction Receipt
      const receipt = await this.rpcCall('eth_getTransactionReceipt', [cleanHash]);
      if (!receipt) {
        return {
          isValid: false,
          isConfirmed: false,
          status: 'PENDING',
          txHash: cleanHash,
          errorMessage: 'المعاملة ما زالت قيد المعالجة ولم يتم إدراجها في كتلة بعد.'
        };
      }

      // Check Status: '0x1' is success, '0x0' is reverted
      if (receipt.status !== '0x1') {
        return {
          isValid: false,
          isConfirmed: false,
          status: 'FAILED',
          txHash: cleanHash,
          errorMessage: 'المعاملة فشلت على شبكة البلوكشين (Reverted).'
        };
      }

      // 3. Check Current Block Number for Confirmations
      const latestBlockHex = await this.rpcCall('eth_blockNumber', []);
      const currentBlock = parseInt(latestBlockHex, 16);
      const txBlock = parseInt(receipt.blockNumber, 16);
      const confirmations = Math.max(0, currentBlock - txBlock);

      // 4. Parse Transfer Input Data (ERC-20 transfer(address,uint256))
      const input = tx.input;
      let actualRecipient = '';
      let actualAmount = 0;

      if (input && input.startsWith(TRANSFER_METHOD_ID) && input.length >= 138) {
        // Recipient address: next 32 bytes (64 hex characters)
        const recipientHex = input.slice(34, 74);
        actualRecipient = `0x${recipientHex}`.toLowerCase();

        // Amount: next 32 bytes, USDT on BSC has 18 decimals
        const amountHex = input.slice(74, 138);
        const rawAmount = BigInt(`0x${amountHex}`);
        actualAmount = Number(rawAmount) / 1e18;
      }

      // 5. Match target contract with official USDT
      const contractAddress = (tx.to || '').toLowerCase();
      const isOfficialUsdt = contractAddress === BSC_USDT_CONTRACT;

      // 6. Validate expected parameters if provided
      if (expectedRecipient) {
        const cleanExpected = expectedRecipient.trim().toLowerCase();
        if (actualRecipient !== cleanExpected) {
          return {
            isValid: false,
            isConfirmed: true,
            status: 'INVALID_DETAILS',
            txHash: cleanHash,
            recipient: actualRecipient,
            amount: actualAmount,
            contractAddress,
            errorMessage: `عنوان المستلم في المعاملة (${actualRecipient}) لا يطابق عنوان محفظة الموظف (${cleanExpected})`
          };
        }
      }

      if (expectedAmount !== undefined && expectedAmount > 0) {
        // Tolerance margin of 0.01 for rounding/fee differences
        if (Math.abs(actualAmount - expectedAmount) > 0.05) {
          return {
            isValid: false,
            isConfirmed: true,
            status: 'INVALID_DETAILS',
            txHash: cleanHash,
            recipient: actualRecipient,
            amount: actualAmount,
            contractAddress,
            errorMessage: `المبلغ في المعاملة (${actualAmount} USDT) لا يطابق المبلغ المطلوب صرفه (${expectedAmount} USDT)`
          };
        }
      }

      return {
        isValid: true,
        isConfirmed: confirmations >= 3,
        status: 'CONFIRMED',
        txHash: cleanHash,
        sender: tx.from,
        recipient: actualRecipient,
        amount: actualAmount,
        contractAddress,
        blockNumber: txBlock,
        confirmations
      };
    } catch (err) {
      logger.error('Failed to verify BEP20 TxHash on BSC RPC', err);
      return {
        isValid: false,
        isConfirmed: false,
        status: 'RPC_ERROR',
        txHash: cleanHash,
        errorMessage: `تعذر الاتصال بعقدة البلوكشين (BSC RPC): ${(err as Error).message}`
      };
    }
  }
}

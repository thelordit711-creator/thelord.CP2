import { logger } from '../utils/logger';

/**
 * On-Chain BSC BEP20 USDT Verification Service
 * Validates transaction receipts and ERC-20/BEP-20 Transfer event logs directly from Binance Smart Chain RPC.
 */

// Official BSC USDT Contract Address (BUSD-T on BSC)
export const BSC_USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955'.toLowerCase();

// Keccak-256 hash of Transfer(address,address,uint256)
export const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Minimum block confirmations required for finality
export const MIN_BSC_CONFIRMATIONS = 3;

export interface IBscVerificationResult {
  isValid: boolean;
  isConfirmed: boolean;
  status: 'CONFIRMED' | 'PENDING_CHAIN_CONFIRMATION' | 'FAILED' | 'PENDING' | 'INVALID_DETAILS' | 'RPC_ERROR';
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
   * Pure deterministic evaluator for BSC Transaction + Receipt + Logs.
   * Ensures only genuine official BEP-20 USDT Transfer events pass validation.
   */
  public static evaluateTransactionReceipt(params: {
    txHash: string;
    tx: any;
    receipt: any;
    currentBlock: number;
    expectedRecipient?: string;
    expectedAmount?: number;
  }): IBscVerificationResult {
    const { txHash, tx, receipt, currentBlock, expectedRecipient, expectedAmount } = params;

    // 1. Receipt status check: '0x1' = Success, '0x0' = Reverted
    if (receipt.status !== '0x1') {
      return {
        isValid: false,
        isConfirmed: false,
        status: 'FAILED',
        txHash,
        errorMessage: 'المعاملة فشلت على شبكة البلوكشين (Reverted).'
      };
    }

    const txBlock = parseInt(receipt.blockNumber || '0x0', 16);
    const confirmations = Math.max(0, currentBlock - txBlock);
    const isConfirmed = confirmations >= MIN_BSC_CONFIRMATIONS;

    // 2. Parse genuine BEP-20 USDT Transfer logs from receipt.logs
    const logs: any[] = Array.isArray(receipt.logs) ? receipt.logs : [];
    const usdtTransferLogs = logs.filter(
      (log) =>
        typeof log.address === 'string' &&
        log.address.toLowerCase() === BSC_USDT_CONTRACT &&
        Array.isArray(log.topics) &&
        log.topics.length >= 3 &&
        typeof log.topics[0] === 'string' &&
        log.topics[0].toLowerCase() === TRANSFER_EVENT_TOPIC
    );

    if (usdtTransferLogs.length === 0) {
      const targetContract = (tx?.to || 'unknown').toLowerCase();
      return {
        isValid: false,
        isConfirmed,
        status: 'INVALID_DETAILS',
        txHash,
        contractAddress: targetContract,
        blockNumber: txBlock,
        confirmations,
        errorMessage: `رفض أمني: هذه المعاملة لا تحتوي على حدث Transfer حقيقي لعقد USDT الرسمي على BSC (${BSC_USDT_CONTRACT}). العقد المستهدف كان: ${targetContract}`
      };
    }

    // Extract transfers from USDT logs
    const parsedTransfers = usdtTransferLogs.map((log) => {
      const fromTopic = log.topics[1] || '';
      const toTopic = log.topics[2] || '';
      const sender = `0x${fromTopic.slice(-40)}`.toLowerCase();
      const recipient = `0x${toTopic.slice(-40)}`.toLowerCase();
      const rawAmountBigInt = BigInt(log.data && log.data !== '0x' ? log.data : '0x0');
      // USDT on BSC uses 18 decimals; convert safely to 4 decimal places using BigInt integer division
      const amountScaled = Number(rawAmountBigInt / BigInt(1e14)) / 10000;
      return { sender, recipient, amount: amountScaled };
    });

    // Select matching transfer log if expectedRecipient is given, otherwise take the primary transfer
    let matchedTransfer = parsedTransfers[0];
    if (expectedRecipient) {
      const cleanExpected = expectedRecipient.trim().toLowerCase();
      const matchingLog = parsedTransfers.find((t) => t.recipient === cleanExpected);
      if (!matchingLog) {
        return {
          isValid: false,
          isConfirmed,
          status: 'INVALID_DETAILS',
          txHash,
          sender: matchedTransfer.sender,
          recipient: matchedTransfer.recipient,
          amount: matchedTransfer.amount,
          contractAddress: BSC_USDT_CONTRACT,
          blockNumber: txBlock,
          confirmations,
          errorMessage: `عنوان المستلم في سجلات التحويل (${matchedTransfer.recipient}) لا يطابق عنوان محفظة الموظف (${cleanExpected})`
        };
      }
      matchedTransfer = matchingLog;
    }

    // 3. Validate expected amount (with safe 0.05 USDT tolerance for fee/precision)
    if (expectedAmount !== undefined && expectedAmount > 0) {
      if (Math.abs(matchedTransfer.amount - expectedAmount) > 0.05) {
        return {
          isValid: false,
          isConfirmed,
          status: 'INVALID_DETAILS',
          txHash,
          sender: matchedTransfer.sender,
          recipient: matchedTransfer.recipient,
          amount: matchedTransfer.amount,
          contractAddress: BSC_USDT_CONTRACT,
          blockNumber: txBlock,
          confirmations,
          errorMessage: `المبلغ الفعلي المحوّل (${matchedTransfer.amount} USDT) لا يطابق المبلغ المطلوب (${expectedAmount} USDT)`
        };
      }
    }

    return {
      isValid: true,
      isConfirmed,
      status: isConfirmed ? 'CONFIRMED' : 'PENDING_CHAIN_CONFIRMATION',
      txHash,
      sender: matchedTransfer.sender,
      recipient: matchedTransfer.recipient,
      amount: matchedTransfer.amount,
      contractAddress: BSC_USDT_CONTRACT,
      blockNumber: txBlock,
      confirmations
    };
  }

  /**
   * Verify an on-chain BEP-20 USDT transaction via live BSC RPC
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

      const latestBlockHex = await this.rpcCall('eth_blockNumber', []);
      const currentBlock = parseInt(latestBlockHex || '0x0', 16);

      return this.evaluateTransactionReceipt({
        txHash: cleanHash,
        tx,
        receipt,
        currentBlock,
        expectedRecipient,
        expectedAmount
      });
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

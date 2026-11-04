export class ValidationService {
  /**
   * Validates Ethereum / BSC BEP20 address format
   * Must start with 0x and have 40 hexadecimal characters
   */
  static isValidBEP20Address(address?: string): boolean {
    if (!address) return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
  }

  /**
   * Validates Yemeni mobile numbers for Jeeb & Jawali Wallets
   * e.g., 77XXXXXXX, 78XXXXXXX, 73XXXXXXX, 71XXXXXXX, 70XXXXXXX
   * Can also accept +967 or 00967 prefix
   */
  static isValidLocalWalletPhone(phone?: string): boolean {
    if (!phone) return false;
    const clean = phone.replace(/[\s\-()]/g, '');
    // Standard format: optional +967 or 00967 or 0, followed by 7[0-8] and 7 digits
    const regex = /^(?:\+?967|00967|0)?(7[01378][0-9]{7})$/;
    return regex.test(clean);
  }

  /**
   * Sanitizes phone number to standard local format: 7XXXXXXXX
   */
  static sanitizeLocalPhone(phone: string): string {
    const clean = phone.replace(/[\s\-()]/g, '');
    const match = clean.match(/(7[01378][0-9]{7})$/);
    return match ? match[1] : clean;
  }
}


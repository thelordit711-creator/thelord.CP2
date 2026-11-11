import mongoose, { Schema } from 'mongoose';

const MICRO_DECIMALS = 6;
const MICRO_SCALE = BigInt(10 ** MICRO_DECIMALS); // 1,000,000 micro-units per 1.0 unit

/**
 * Parses a numeric/string/Decimal128 value into exact BigInt micro-units (10^-6 scale),
 * preventing IEEE 754 binary floating-point precision drift.
 */
export function toMicroUnits(value: unknown): bigint {
  if (value === null || value === undefined || value === '') return 0n;

  let rawStr: string;
  if (typeof value === 'object' && value !== null && '$numberDecimal' in (value as any)) {
    rawStr = String((value as any).$numberDecimal);
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0n;
    // Normalize float precision artifacts (e.g., 0.1 + 0.2 = 0.30000000000000004)
    rawStr = Number(value).toFixed(MICRO_DECIMALS + 2);
  } else {
    rawStr = String(value).trim();
  }

  if (!rawStr) return 0n;

  const isNegative = rawStr.startsWith('-');
  const unsigned = rawStr.replace(/^[+-]/, '');
  if (!/^\d+(\.\d+)?$/.test(unsigned)) {
    const parsed = Number(rawStr);
    if (!Number.isFinite(parsed)) return 0n;
    return toMicroUnits(parsed);
  }

  const [wholePart, fracPart = ''] = unsigned.split('.');
  const paddedFrac = (fracPart + '0000000').slice(0, MICRO_DECIMALS);
  const roundDigit = Number((fracPart + '0000000')[MICRO_DECIMALS] || '0');

  let micro = BigInt(wholePart || '0') * MICRO_SCALE + BigInt(paddedFrac);
  if (roundDigit >= 5) {
    micro += 1n;
  }

  return isNegative ? -micro : micro;
}

/**
 * Converts BigInt micro-units back into a clean decimal JS number rounded to `decimals` places.
 */
export function fromMicroUnits(micro: bigint, decimals: number = MICRO_DECIMALS): number {
  const clampedDecimals = Math.max(0, Math.min(MICRO_DECIMALS, decimals));
  const step = BigInt(10 ** (MICRO_DECIMALS - clampedDecimals));
  const halfStep = step / 2n;

  const isNegative = micro < 0n;
  const absMicro = isNegative ? -micro : micro;
  const roundedUnits = step > 1n ? (absMicro + halfStep) / step : absMicro;
  const result = Number(roundedUnits) / 10 ** clampedDecimals;
  return isNegative ? -result : result;
}

/**
 * Exact BigInt-backed financial arithmetic helpers.
 */
export class FinancialMath {
  public static add(a: unknown, b: unknown, decimals = 6): number {
    return fromMicroUnits(toMicroUnits(a) + toMicroUnits(b), decimals);
  }

  public static subtract(a: unknown, b: unknown, decimals = 6): number {
    return fromMicroUnits(toMicroUnits(a) - toMicroUnits(b), decimals);
  }

  public static roundCurrency(value: unknown, decimals = 2): number {
    return fromMicroUnits(toMicroUnits(value), decimals);
  }

  public static formatDecimalString(value: unknown, maxDecimals = MICRO_DECIMALS): string {
    const micro = toMicroUnits(value);
    const isNegative = micro < 0n;
    const abs = isNegative ? -micro : micro;
    const whole = abs / MICRO_SCALE;
    const frac = (abs % MICRO_SCALE).toString().padStart(MICRO_DECIMALS, '0').slice(0, maxDecimals);
    const trimmedFrac = frac.replace(/0+$/, '');
    const sign = isNegative && (whole > 0n || trimmedFrac.length > 0) ? '-' : '';
    return trimmedFrac.length > 0 ? `${sign}${whole}.${trimmedFrac}` : `${sign}${whole}`;
  }

  public static assertNonNegative(value: unknown, label: string): number {
    const micro = toMicroUnits(value);
    if (micro < 0n) {
      throw new Error(`Financial invariant violation: ${label} cannot be negative`);
    }
    return fromMicroUnits(micro, 2);
  }
}

/**
 * Mongoose Decimal128 setter: stores exact decimal string in MongoDB BSON Decimal128.
 */
export function toDecimal128(value: unknown): mongoose.Types.Decimal128 | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (value instanceof mongoose.Types.Decimal128) return value;
  const str = FinancialMath.formatDecimalString(value);
  return mongoose.Types.Decimal128.fromString(str);
}

/**
 * Mongoose Decimal128 getter: reads Decimal128, { $numberDecimal }, or legacy Number seamlessly as JS number.
 */
export function fromDecimal128(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'object' && '$numberDecimal' in (value as any)) {
    const parsed = parseFloat(String((value as any).$numberDecimal));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Reusable Mongoose Decimal128 schema field definition with backward-compatible numeric getters.
 */
export function decimal128Field(options: { default?: number; required?: boolean } = {}) {
  const field: Record<string, any> = {
    type: Schema.Types.Decimal128,
    set: toDecimal128,
    get: fromDecimal128
  };

  if (options.required !== undefined) {
    field.required = options.required;
  }
  if (options.default !== undefined) {
    field.default = () => toDecimal128(options.default);
  }
  return field;
}


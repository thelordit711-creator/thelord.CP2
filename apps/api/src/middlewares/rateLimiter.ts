import rateLimit from 'express-rate-limit';

/**
 * Strict Rate Limiter for Authentication & Sensitive Operations
 * Mitigates credential stuffing, brute force, and token enumeration.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'تم تجاوز الحد المسموح به لمحاولات الدخول من هذا العنوان. يرجى الانتظار 15 دقيقة.'
  }
});

/**
 * General API Rate Limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'تم تجاوز الحد الأقصى للطلبات العامة. يرجى المحاولة لاحقاً.'
  }
});

/**
 * High-sensitivity Rate Limiter for Treasury and Disbursement
 */
export const treasuryRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'تم تجاوز الحد المسموح به لعمليات الخزينة. يرجى الانتظار قليلاً.'
  }
});


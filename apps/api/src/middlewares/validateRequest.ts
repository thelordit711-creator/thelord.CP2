import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';

interface ValidationErrorDetail {
  field: string;
  message: string;
}

type RequestPart = 'body' | 'params' | 'query';

function formatZodIssues(err: ZodError, fallbackField: string): ValidationErrorDetail[] {
  return err.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : fallbackField,
    message: issue.message
  }));
}

function createValidator(source: RequestPart, defaultMessage: string, schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source] ?? {});
    if (!parsed.success) {
      const details = formatZodIssues(parsed.error, source);
      res.status(400).json({
        success: false,
        error: details[0]?.message || defaultMessage,
        details
      });
      return;
    }

    (req as any)[source] = parsed.data;
    next();
  };
}

/**
 * Express middleware validating `req.body` against a Zod schema before executing the controller.
 */
export function validateBody(schema: ZodType) {
  return createValidator('body', 'بيانات الطلب غير صالحة', schema);
}

/**
 * Express middleware validating `req.params` against a Zod schema (e.g., MongoDB ObjectId checks).
 */
export function validateParams(schema: ZodType) {
  return createValidator('params', 'معرّف المسار غير صالح', schema);
}

/**
 * Express middleware validating `req.query` against a Zod schema.
 */
export function validateQuery(schema: ZodType) {
  return createValidator('query', 'معاملات الاستعلام غير صالحة', schema);
}

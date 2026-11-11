import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';

interface ValidationErrorDetail {
  field: string;
  message: string;
}

function formatZodIssues(err: ZodError): ValidationErrorDetail[] {
  return err.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'body',
    message: issue.message
  }));
}

/**
 * Express middleware validating `req.body` against a Zod schema before executing the controller.
 */
export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const details = formatZodIssues(parsed.error);
      res.status(400).json({
        success: false,
        error: details[0]?.message || 'بيانات الطلب غير صالحة',
        details
      });
      return;
    }

    req.body = parsed.data;
    next();
  };
}

/**
 * Express middleware validating `req.params` against a Zod schema (e.g., MongoDB ObjectId checks).
 */
export function validateParams(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.params ?? {});
    if (!parsed.success) {
      const details = formatZodIssues(parsed.error);
      res.status(400).json({
        success: false,
        error: details[0]?.message || 'معرّف المسار غير صالح',
        details
      });
      return;
    }

    req.params = parsed.data as Request['params'];
    next();
  };
}

import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

export const objectIdSchema = z
  .string({ message: 'المعرّف مطلوب' })
  .trim()
  .regex(objectIdRegex, 'صيغة المعرّف غير صالحة');

export const idParamSchema = z.object({
  id: objectIdSchema
});

export const orderIdParamSchema = z.object({
  orderId: objectIdSchema
});

export const employeeIdParamSchema = z.object({
  employeeId: objectIdSchema
});

// ==========================================
// AUTHENTICATION & INVITATION SCHEMAS
// ==========================================

export const loginSchema = z
  .object({
    email: z.string({ message: 'البريد الإلكتروني مطلوب' }).trim().email('صيغة البريد الإلكتروني غير صالحة'),
    password: z.string({ message: 'كلمة المرور مطلوبة' }).min(1, 'كلمة المرور مطلوبة'),
    twoFactorCode: z.string().trim().optional()
  })
  .passthrough();

export const createInvitationSchema = z
  .object({
    email: z.string({ message: 'البريد الإلكتروني مطلوب' }).trim().email('صيغة البريد الإلكتروني غير صالحة'),
    role: z.enum(['SUPER_ADMIN', 'EMPLOYEE', 'TREASURY'], {
      message: 'الدور الوظيفي غير صالح'
    })
  })
  .passthrough();

export const acceptInvitationSchema = z
  .object({
    token: z.string({ message: 'رمز الدعوة مطلوب' }).trim().min(6, 'رمز الدعوة غير صالح'),
    fullName: z.string({ message: 'الاسم الكامل مطلوب' }).trim().min(2, 'الاسم الكامل قصير جداً'),
    password: z.string({ message: 'كلمة المرور مطلوبة' }).min(6, 'كلمة المرور يجب أن لا تقل عن 6 أحرف'),
    phoneNumber: z.string().trim().optional()
  })
  .passthrough();

export const updateWorkStatusSchema = z
  .object({
    workStatus: z.enum(['LOGGED_IN', 'WORKING', 'ON_BREAK', 'LOGGED_OUT'], {
      message: 'حالة العمل غير صالحة'
    })
  })
  .passthrough();

export const twoFactorCodeSchema = z
  .object({
    code: z.string({ message: 'رمز التحقق مطلوب' }).trim().min(6, 'رمز التحقق غير صالح')
  })
  .passthrough();

// ==========================================
// FINANCE & TREASURY SCHEMAS
// ==========================================

export const adjustVaultSchema = z
  .object({
    amount: z.coerce.number({ message: 'المبلغ يجب أن يكون رقماً' }).positive('المبلغ يجب أن يكون أكبر من الصفر'),
    reason: z.string().trim().max(500).optional(),
    actionType: z
      .enum(['FUND_TREASURY', 'RETURN_TO_BUDGET', 'DEPOSIT_GENERAL_BUDGET'])
      .optional(),
    targetBalance: z.enum(['GENERAL_BUDGET', 'TREASURY_BALANCE']).optional(),
    operation: z.enum(['INCREASE', 'DECREASE']).optional(),
    targetSegment: z.enum(['salaries', 'marketing', 'operationalReserve']).optional()
  })
  .passthrough();

export const decideFinancialRequestSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED'], {
      message: 'القرار المالي يجب أن يكون APPROVED أو REJECTED'
    }),
    adminNotes: z.string().trim().max(1000).optional(),
    targetVaultSegment: z.enum(['salaries', 'marketing', 'operationalReserve']).optional()
  })
  .passthrough();

export const manageEmployeeLedgerSchema = z
  .object({
    entryType: z.enum([
      'SALARY',
      'BONUS',
      'ADVANCE',
      'PENALTY_DEDUCTION',
      'TASK_REWARD',
      'ADJUSTMENT_CREDIT',
      'ADJUSTMENT_REVERSAL'
    ]),
    amount: z.coerce.number({ message: 'المبلغ يجب أن يكون رقماً' }).positive('المبلغ يجب أن يكون أكبر من الصفر'),
    reason: z.string({ message: 'سبب القيد مطلوب' }).trim().min(2, 'يرجى توضيح سبب القيد'),
    warningLevel: z.enum(['NONE', 'FIRST', 'SECOND', 'FINAL']).optional()
  })
  .passthrough();

export const generateTrancheSchema = z
  .object({
    trancheType: z.enum(['TRANCHE_1', 'TRANCHE_2', 'TRANCHE_3'], {
      message: 'نوع الشريحة غير صالح'
    }),
    employeeIds: z.array(objectIdSchema).optional()
  })
  .passthrough();

export const confirmDisbursedSchema = z
  .object({
    txHashOrReferenceNumber: z.string().trim().max(250).optional(),
    transferReceiptImageUrl: z.string().trim().max(1000).optional(),
    treasuryExecutionNote: z.string().trim().max(1000).optional()
  })
  .passthrough();

export const createSubVaultSchema = z
  .object({
    name: z.string({ message: 'اسم الخزينة الفرعية مطلوب' }).trim().min(2),
    code: z.string({ message: 'رمز الخزينة مطلوب' }).trim().min(2).max(32),
    parentVault: z.enum(['generalBudget', 'treasuryBalance', 'salaries', 'marketing', 'operationalReserve']).optional(),
    monthlyAllocated: z.coerce.number().min(0).default(0),
    alertThresholdPercent: z.coerce.number().min(0).max(100).optional()
  })
  .passthrough();

export const transferSubVaultSchema = z
  .object({
    subVaultCode: z.string({ message: 'رمز الخزينة الفرعية مطلوب' }).trim().min(2),
    amount: z.coerce.number({ message: 'المبلغ يجب أن يكون رقماً' }).positive('المبلغ يجب أن يكون أكبر من الصفر'),
    reason: z.string().trim().max(500).optional()
  })
  .passthrough();

export const updateEmployeeSalarySchema = z
  .object({
    baseSalary: z.coerce.number({ message: 'الراتب يجب أن يكون رقماً' }).min(0, 'الراتب لا يمكن أن يكون سالباً'),
    salaryCurrency: z.string().trim().max(16).optional(),
    payoutDayOfMonth: z.coerce.number().int().min(1).max(31).optional()
  })
  .passthrough();

export const createRecurringExpenseSchema = z
  .object({
    title: z.string({ message: 'عنوان المصروف مطلوب' }).trim().min(2),
    amount: z.coerce.number({ message: 'المبلغ يجب أن يكون رقماً' }).positive('المبلغ يجب أن يكون أكبر من الصفر'),
    category: z.string({ message: 'التصنيف مطلوب' }).trim().min(2),
    beneficiaryName: z.string({ message: 'اسم المستفيد مطلوب' }).trim().min(2),
    payoutMethod: z.enum(['BEP20_USDT', 'JEEB_WALLET', 'JAWALI_WALLET']).optional(),
    dayOfMonth: z.coerce.number().int().min(1).max(31).optional()
  })
  .passthrough();

// ==========================================
// PROJECT WBS SCHEMAS
// ==========================================

export const aiGenerateProjectPlanSchema = z
  .object({
    title: z.string({ message: 'عنوان المشروع مطلوب' }).trim().min(2, 'عنوان المشروع قصير جداً'),
    description: z.string({ message: 'وصف المشروع مطلوب' }).trim().min(5, 'يرجى كتابة وصف واضح للمشروع'),
    allocatedBudget: z.coerce.number().min(0).optional(),
    budget: z.coerce.number().min(0).optional(),
    targetDays: z.coerce.number().int().min(1).max(1095).optional()
  })
  .passthrough();

export const createProjectSchema = z
  .object({
    title: z.string({ message: 'عنوان المشروع مطلوب' }).trim().min(2),
    description: z.string({ message: 'وصف المشروع مطلوب' }).trim().min(2),
    allocatedBudget: z.coerce.number().min(0).optional(),
    targetEndDate: z.union([z.string().min(1), z.date()]),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
    teamMembers: z.array(objectIdSchema).optional()
  })
  .passthrough();

export const updateProjectSchema = z
  .object({
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().min(2).optional(),
    allocatedBudget: z.coerce.number().min(0).optional(),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
    teamMembers: z.array(objectIdSchema).optional()
  })
  .passthrough();

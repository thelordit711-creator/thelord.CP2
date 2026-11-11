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

// ==========================================
// TASKS & STAGES SCHEMAS
// ==========================================

export const stageOrderParamSchema = z.object({
  id: objectIdSchema,
  order: z.coerce.number().int().min(1)
});

export const createTaskSchema = z
  .object({
    title: z.string({ message: 'عنوان المهمة مطلوب' }).trim().min(2, 'عنوان المهمة قصير جداً'),
    description: z.string({ message: 'وصف المهمة مطلوب' }).trim().min(2, 'وصف المهمة مطلوب'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT']).optional(),
    projectId: objectIdSchema.optional(),
    milestoneIndex: z.coerce.number().int().min(0).optional()
  })
  .passthrough();

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().min(2).optional(),
    status: z.string().trim().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT']).optional(),
    projectId: objectIdSchema.nullable().optional(),
    milestoneIndex: z.coerce.number().int().min(0).optional()
  })
  .passthrough();

export const submitStageSchema = z
  .object({
    submissionText: z.string().trim().optional(),
    attachments: z.array(z.any()).optional()
  })
  .passthrough();

export const reviewStageSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED', 'NEEDS_CHANGES'], {
      message: 'قرار المراجعة غير صالح'
    }),
    adminFeedback: z.string().trim().max(2000).optional()
  })
  .passthrough();

export const addDirectReportSchema = z
  .object({
    textContent: z.string({ message: 'محتوى التقرير مطلوب' }).trim().min(1, 'يرجى كتابة نص التقرير'),
    attachments: z.array(z.any()).optional()
  })
  .passthrough();

export const settleTaskBudgetSchema = z
  .object({
    spentAmount: z.coerce.number({ message: 'المبلغ المصروف يجب أن يكون رقماً' }).min(0),
    breakdownDetails: z.string().trim().max(2000).optional(),
    invoicesAndReceipts: z.array(z.any()).optional()
  })
  .passthrough();

// ==========================================
// USERS, CHAT, MEETING & AI SCHEMAS
// ==========================================

export const completeOnboardingSchema = z
  .object({
    primaryDepartment: z.string({ message: 'القسم الرئيسي مطلوب' }).trim().min(2)
  })
  .passthrough();

export const changeUserPasswordSchema = z
  .object({
    newPassword: z.string({ message: 'كلمة المرور الجديدة مطلوبة' }).min(6, 'كلمة المرور يجب أن لا تقل عن 6 أحرف')
  })
  .passthrough();

export const toggleUserSuspensionSchema = z
  .object({
    isSuspended: z.boolean({ message: 'حالة الإيقاف مطلوبة' }),
    reason: z.string().trim().max(500).optional()
  })
  .passthrough();

export const createChannelSchema = z
  .object({
    name: z.string({ message: 'اسم القناة مطلوب' }).trim().min(2, 'اسم القناة قصير جداً').max(80),
    description: z.string().trim().max(500).optional(),
    isPublic: z.boolean().optional(),
    members: z.array(objectIdSchema).optional()
  })
  .passthrough();

export const addChannelMemberSchema = z
  .object({
    userIds: z.array(objectIdSchema).min(1, 'يرجى تحديد عضو واحد على الأقل')
  })
  .passthrough();

export const channelUserParamSchema = z.object({
  channelId: z.string().trim().min(1),
  userId: objectIdSchema
});

export const sendMessageSchema = z
  .object({
    chatRoomId: z.string({ message: 'معرّف غرفة الدردشة مطلوب' }).trim().min(1),
    content: z.string().optional(),
    attachments: z.array(z.any()).optional()
  })
  .passthrough();

export const editMessageSchema = z
  .object({
    content: z.string({ message: 'محتوى الرسالة مطلوب' }).trim().min(1, 'محتوى الرسالة لا يمكن أن يكون فارغاً')
  })
  .passthrough();

export const inviteMemberSchema = z
  .object({
    targetUserId: objectIdSchema
  })
  .passthrough();

export const startMeetingSchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    agenda: z.string().trim().max(1000).optional()
  })
  .passthrough();

export const updateMeetingNotesSchema = z
  .object({
    meetingNotes: z.string().optional(),
    agenda: z.string().optional()
  })
  .passthrough();

export const convertMeetingTasksSchema = z
  .object({
    notes: z.string().trim().optional(),
    projectId: objectIdSchema.optional()
  })
  .passthrough();

export const aiChatSchema = z
  .object({
    message: z.string({ message: 'نص الرسالة مطلوب' }).trim().min(1, 'نص الرسالة مطلوب'),
    history: z.array(z.any()).optional()
  })
  .passthrough();

export const aiVoiceToTaskSchema = z
  .object({
    transcript: z.string().trim().optional(),
    audioText: z.string().trim().optional()
  })
  .refine((data) => Boolean((data.transcript && data.transcript.trim()) || (data.audioText && data.audioText.trim())), {
    message: 'النص الصوتي مطلوب لتحليله عبر الذكاء الاصطناعي'
  });

export const aiQualityReviewSchema = z
  .object({
    submissionText: z.string({ message: 'نص التسليم مطلوب' }).trim().min(1, 'نص التسليم مطلوب لإجراء فحص الجودة'),
    taskTitle: z.string().trim().optional(),
    stageTitle: z.string().trim().optional(),
    attachmentsCount: z.coerce.number().int().min(0).optional()
  })
  .passthrough();

export const aiSummarizeMeetingSchema = z
  .object({
    notesOrTranscript: z.string({ message: 'محضر الاجتماع مطلوب' }).trim().min(1, 'محضر الاجتماع أو التسجيل مطلوب'),
    meetingTitle: z.string().trim().optional()
  })
  .passthrough();

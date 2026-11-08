// ==========================================
// THE LORD OF CRYPTO — Master Shared Types
// ==========================================

export type AccessRole = 'SUPER_ADMIN' | 'EMPLOYEE' | 'TREASURY';

export type PrimaryDepartment = 
  | 'TRADING' 
  | 'MARKETING' 
  | 'CONTENT_MEDIA' 
  | 'DEVELOPMENT' 
  | 'SUPPORT' 
  | 'MANAGEMENT';

export type JobTitle =
  | 'DEAL_ANALYST'
  | 'TG_CONTENT_MANAGER'
  | 'SUPPORT_AGENT'
  | 'WEB_BOT_DEVELOPER'
  | 'TG_ADS_MANAGER'
  | 'TG_CHANNEL_PROMO_MANAGER'
  | 'GRAPHIC_VIDEO_EDITOR'
  | 'YOUTUBE_MANAGER'
  | 'X_PLATFORM_MANAGER'
  | 'FB_IG_MANAGER'
  | 'MARKETING_DEV_LEAD';

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type PayoutMethod = 'BEP20_USDT' | 'JEEB_WALLET' | 'JAWALI_WALLET';

export type Currency = 'USDT' | 'USD' | 'SAR' | 'YER';

export type PresenceStatus = 'ONLINE' | 'OFFLINE' | 'IN_MEETING';

export type WorkStatus = 'LOGGED_IN' | 'WORKING' | 'ON_BREAK' | 'LOGGED_OUT';

export interface IInvitation {
  _id?: string;
  email: string;
  role: AccessRole;
  token: string;
  status: 'PENDING' | 'ACCEPTED';
  invitedBy: string | Partial<IUser>;
  expiresAt: Date | string;
  createdAt?: Date | string;
}

export type MediaFileType = 
  | 'IMAGE' 
  | 'VOICE_NOTE' 
  | 'AUDIO_FILE' 
  | 'VIDEO' 
  | 'DOCUMENT' 
  | 'ARCHIVE' 
  | 'URL';

export type TargetPlatform =
  | 'TG_MAIN'
  | 'TG_SECOND'
  | 'TG_VIP'
  | 'X_1'
  | 'X_2'
  | 'YOUTUBE'
  | 'FB'
  | 'IG'
  | 'GENERAL_SYSTEM'
  | (string & {});

export type ServiceCategory =
  | 'FREE_SIGNALS'
  | 'ACCOUNT_MANAGEMENT'
  | 'VIP_CHANNEL'
  | 'COPY_TRADING'
  | 'FUNDED_ACCOUNTS'
  | 'INTERNAL_DEV'
  | (string & {});

export type ExecutionType = 'ADMIN_ASSIGNED' | 'SELF' | 'DELEGATED_TO_COLLEAGUE';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStatus = 
  | 'PENDING_ADMIN_REVIEW' 
  | 'TODO' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'REJECTED';

export type StageStatus = 
  | 'LOCKED' 
  | 'IN_PROGRESS' 
  | 'SUBMITTED_FOR_REVIEW' 
  | 'APPROVED' 
  | 'NEEDS_REVISION';

export type RequiredFieldType = 
  | 'TEXT' 
  | 'NUMBER' 
  | 'URL' 
  | 'IMAGE' 
  | 'VIDEO' 
  | 'VOICE_NOTE' 
  | 'DOCUMENT'
  | 'CODE_SNIPPET'
  | 'ANY_FILE';

export type ExpenseCategory =
  | 'TG_ADS'
  | 'TG_CHANNEL_PROMO'
  | 'SOFTWARE_SUBSCRIPTION'
  | 'OPERATIONAL'
  | 'OTHER';

export type AdminApprovalStatus = 
  | 'NOT_REQUIRED' 
  | 'PENDING_ADMIN' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'NEEDS_CHANGES';

export type PayoutCategory =
  | 'SALARY'
  | 'BONUS'
  | 'ADVANCE'
  | 'TG_ADS'
  | 'TG_CHANNEL_PROMO'
  | 'SOFTWARE_SUBSCRIPTION'
  | 'GENERAL';

export type PayoutExecutionStatus = 'WAITING_TREASURY' | 'IN_PROGRESS' | 'DISBURSED';

export type WarningLevel = 'NONE' | 'FIRST' | 'SECOND' | 'FINAL';

export type LedgerEntryType = 
  | 'BASE_SALARY' 
  | 'BONUS' 
  | 'DEDUCTION' 
  | 'ADVANCE_REQUEST' 
  | 'WARNING';

// ------------------------------------------
// Interfaces
// ------------------------------------------

export interface IVideoTimestampNote {
  second: number;
  note: string;
}

export interface IMediaAttachment {
  _id?: string;
  fileType: MediaFileType;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  fileSizeInBytes?: number;
  durationInSeconds?: number;
  videoTimestampNotes?: IVideoTimestampNote[];
  uploadedBy?: string;
  uploadedAt?: Date | string;
}

export interface IUserSkill {
  name: string;
  level: SkillLevel;
}

export interface IJeebWalletDetails {
  isEnabled: boolean;
  registeredPhone?: string;
  accountHolderName?: string;
}

export interface IJawaliWalletDetails {
  isEnabled: boolean;
  registeredPhone?: string;
  accountHolderName?: string;
}

export interface IUserPayoutMethods {
  preferredMethod: PayoutMethod;
  bep20Address?: string;
  jeebWallet: IJeebWalletDetails;
  jawaliWallet: IJawaliWalletDetails;
}

export interface IUserCompensation {
  baseSalary: number;
  salaryCurrency: Currency;
  payoutDayOfMonth: number;
  activeBonuses: number;
  activeDeductions: number;
  activeAdvances: number;
  warningsCount: number;
}

export interface IUser {
  _id: string;
  kindeId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl?: string;
  accessRole: AccessRole;
  isOnboarded: boolean;
  primaryDepartment?: PrimaryDepartment;
  jobTitles: JobTitle[];
  skills: IUserSkill[];
  toolsUsed: string[];
  capableTaskTypes: string[];
  payoutMethods: IUserPayoutMethods;
  compensation: IUserCompensation;
  presenceStatus: PresenceStatus;
  isTwoFactorEnabled?: boolean;
  isSuspended?: boolean;
  suspendedAt?: Date | string;
  suspensionReason?: string;
  lastActiveAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IRequiredFieldSubmission {
  textOrUrlValue?: string;
  numberValue?: number;
  mediaAttachment?: IMediaAttachment;
  submittedAt?: Date | string;
}

export interface IRequiredField {
  _id?: string;
  fieldLabel: string;
  expectedType: RequiredFieldType;
  isMandatory: boolean;
  employeeSubmission?: IRequiredFieldSubmission;
}

export interface IAdminFeedback {
  note?: string;
  voiceFeedback?: IMediaAttachment;
  reviewedAt?: Date | string;
}

export interface ITaskStage {
  _id?: string;
  stageOrder: number;
  stageTitle: string;
  instructions?: string;
  status: StageStatus;
  requiredInputs: IRequiredField[];
  additionalAttachments: IMediaAttachment[];
  employeeVoiceNote?: IMediaAttachment;
  adminFeedback?: IAdminFeedback;
}

export interface IFinancialRequirement {
  requiresBudget: boolean;
  amount: number;
  currency: Currency;
  payoutMethodRequested: PayoutMethod;
  expenseCategory?: ExpenseCategory;
  justification?: string;
  adminApprovalStatus: AdminApprovalStatus;
  adminNotes?: string;
  approvedAt?: Date | string;
  payoutOrderId?: string | IPayoutOrder;
}

export interface IDirectReport {
  _id?: string;
  submittedBy: string | Partial<IUser>;
  textContent?: string;
  attachments: IMediaAttachment[];
  createdAt: Date | string;
}

export interface ITask {
  _id: string;
  title: string;
  description: string;
  targetPlatform: TargetPlatform;
  serviceCategory?: ServiceCategory;
  targetDepartment?: PrimaryDepartment | 'ALL_DEPARTMENTS';
  isDailyRecurring?: boolean;
  dailyRecurrenceTime?: string;
  createdBy: string | Partial<IUser>;
  isProposedByEmployee: boolean;
  executionType: ExecutionType;
  assignedTo: Array<string | Partial<IUser>>;
  priority: PriorityLevel;
  dueDate?: Date | string;
  adminBriefAttachments: IMediaAttachment[];
  stages: ITaskStage[];
  currentStageIndex: number;
  overallProgressPercent: number;
  financialRequirement: IFinancialRequirement;
  directReports: IDirectReport[];
  isBountyTask?: boolean;
  bountyRewardAmount?: number;
  bountyClaimType?: 'OPEN_COMPETITIVE' | 'DEDICATED';
  claimedBy?: string | Partial<IUser>;
  claimedAt?: Date | string;
  bountyPayoutStatus?: 'UNCLAIMED' | 'IN_PROGRESS' | 'SUBMITTED_FOR_PAYOUT' | 'DISBURSED';
  status: TaskStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IPayoutDestinationDetails {
  bep20Address?: string;
  walletPhoneNumber?: string;
  accountHolderName?: string;
}

export interface ITransferProof {
  txHashOrReferenceNumber?: string;
  receiptScreenshot?: IMediaAttachment;
  executedByTreasuryId?: string | Partial<IUser>;
}

export interface IPayoutOrder {
  _id: string;
  relatedTaskId?: string | Partial<ITask>;
  beneficiaryId: string | Partial<IUser>;
  amount: number;
  currency: Currency;
  payoutMethod: PayoutMethod;
  destinationDetails: IPayoutDestinationDetails;
  category: PayoutCategory;
  payrollTranche?: 'TRANCHE_1' | 'TRANCHE_2' | 'TRANCHE_3' | 'FULL_MONTH' | 'MONTHLY_ALLOWANCE' | 'NONE';
  summaryForTreasury: string;
  executionStatus: PayoutExecutionStatus;
  inProgressClickedAt?: Date | string;
  disbursedClickedAt?: Date | string;
  transferProof?: ITransferProof;
  requireConfirmation?: boolean;
  sendProofToEmployee?: boolean;
  employeeConfirmation?: {
    isConfirmed: boolean;
    confirmedAt?: Date | string;
    confirmationNote?: string;
  };
  taskExpenseSettlement?: {
    isSettled: boolean;
    settledAmount?: number;
    expenseDetails?: string;
    invoicesOrProofs?: any[];
    settledAt?: Date | string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IManualAdjustmentLog {
  _id?: string;
  adjustedBy: string | Partial<IUser>;
  targetBalance: 'GENERAL_BUDGET' | 'TREASURY_BALANCE' | 'TRANSFER_BETWEEN_BUDGETS';
  operation: 'INCREASE' | 'DECREASE' | 'SET' | 'FUND_TREASURY' | 'RETURN_TO_BUDGET' | 'DEPOSIT';
  amount: number;
  reason: string;
  createdAt: Date | string;
}

export interface IVaultSegment {
  name: string;
  balance: number;
  monthlyAllocated: number;
  totalSpent: number;
  alertThresholdPercent: number;
}

export interface ICompanyVault {
  _id: string;
  generalBudget: number;
  treasuryBalance: number;
  segmentedVaults?: {
    salaries: IVaultSegment;
    marketing: IVaultSegment;
    operationalReserve: IVaultSegment;
  };
  totalSpentByCategory: {
    salaries: number;
    bonuses: number;
    advances: number;
    telegramOfficialAds: number;
    telegramChannelPromos: number;
    softwareSubscriptions: number;
    otherExpenses: number;
  };
  totalDeductionsApplied: number;
  manualAdjustmentsLog: IManualAdjustmentLog[];
  updatedAt: Date | string;
}

export interface IEmployeeLedger {
  _id: string;
  employeeId: string | Partial<IUser>;
  entryType: LedgerEntryType;
  amount: number;
  payoutMethodUsed: PayoutMethod | 'NONE';
  reason: string;
  warningLevel: WarningLevel;
  relatedPayoutOrderId?: string | Partial<IPayoutOrder>;
  recordedBy: string | Partial<IUser>;
  createdAt: Date | string;
}

export interface IChatMessage {
  _id: string;
  chatRoomId: string;
  senderId: string | Partial<IUser>;
  content?: string;
  attachments: IMediaAttachment[];
  readBy: string[];
  replyTo?: {
    _id: string;
    content?: string;
    senderName?: string;
  } | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface IMeetingParticipant {
  userId: string | Partial<IUser>;
  fullName?: string;
  accessRole?: string;
  avatarUrl?: string;
  joinedAt: Date | string;
  isSpeaking: boolean;
  isCameraOn: boolean;
  isMuted: boolean;
}

export interface IMeetingRoom {
  _id: string;
  title: string;
  hostId: string | Partial<IUser>;
  status: 'ACTIVE' | 'ENDED';
  agenda?: string;
  meetingNotes?: string;
  participants: IMeetingParticipant[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ------------------------------------------
// API Payload & Response Types
// ------------------------------------------

export interface IApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ICompleteOnboardingDto {
  primaryDepartment: PrimaryDepartment;
  jobTitles: JobTitle[];
  skills: IUserSkill[];
  toolsUsed: string[];
  capableTaskTypes: string[];
  payoutMethods: IUserPayoutMethods;
}

export interface ICreateTaskDto {
  title: string;
  description: string;
  targetPlatform: TargetPlatform;
  serviceCategory?: ServiceCategory;
  targetDepartment?: PrimaryDepartment | 'ALL_DEPARTMENTS';
  isDailyRecurring?: boolean;
  dailyRecurrenceTime?: string;
  isBountyTask?: boolean;
  bountyRewardAmount?: number;
  bountyClaimType?: 'OPEN_COMPETITIVE' | 'DEDICATED';
  assignedTo: string[];
  priority: PriorityLevel;
  dueDate?: string;
  executionType?: ExecutionType;
  isProposedByEmployee?: boolean;
  stages?: Array<{
    stageOrder: number;
    stageTitle: string;
    instructions?: string;
    requiredInputs: Array<{
      fieldLabel: string;
      expectedType: RequiredFieldType;
      isMandatory: boolean;
    }>;
  }>;
  financialRequirement?: {
    requiresBudget: boolean;
    amount: number;
    currency: Currency;
    payoutMethodRequested: PayoutMethod;
    expenseCategory?: ExpenseCategory;
    justification?: string;
  };
  adminBriefAttachments?: IMediaAttachment[];
}

export interface ISubmitStageDto {
  requiredInputs: Array<{
    fieldLabel: string;
    textOrUrlValue?: string;
    numberValue?: number;
    mediaAttachment?: IMediaAttachment;
  }>;
  additionalAttachments?: IMediaAttachment[];
  employeeVoiceNote?: IMediaAttachment;
}

export interface IReviewStageDto {
  action: 'APPROVE' | 'REQUEST_REVISION';
  note?: string;
  voiceFeedback?: IMediaAttachment;
}

export interface IFinancialDecisionDto {
  decision: 'APPROVE' | 'REJECT' | 'NOTE';
  adminNotes?: string;
}

export interface IConfirmDisbursedDto {
  txHashOrReferenceNumber: string;
  receiptScreenshot?: IMediaAttachment;
}

export interface IAdjustVaultBalanceDto {
  targetBalance?: 'GENERAL_BUDGET' | 'TREASURY_BALANCE' | 'TRANSFER_BETWEEN_BUDGETS';
  operation?: 'INCREASE' | 'DECREASE' | 'SET' | 'FUND_TREASURY' | 'RETURN_TO_BUDGET' | 'DEPOSIT';
  actionType?: 'DEPOSIT_GENERAL_BUDGET' | 'FUND_TREASURY' | 'RETURN_TO_BUDGET' | 'MANUAL_ADJUST';
  targetSegment?: 'salaries' | 'marketing' | 'operationalReserve';
  amount: number;
  reason: string;
}

export interface IManageLedgerDto {
  entryType: LedgerEntryType;
  amount: number;
  payoutMethodUsed?: PayoutMethod | 'NONE';
  reason: string;
  warningLevel?: WarningLevel;
  baseSalary?: number;
  payoutDayOfMonth?: number;
}

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'STAGE_SUBMITTED'
  | 'STAGE_APPROVED'
  | 'STAGE_REVISION'
  | 'CHAT_MESSAGE'
  | 'PROJECT_UPDATE'
  | 'FINANCIAL_UPDATE'
  | 'DAILY_REPORT_REMINDER'
  | 'OVERDUE_TASK'
  | 'LIVE_MEETING_INVITE'
  | 'GENERAL_ANNOUNCEMENT';

export interface INotification {
  _id: string;
  recipientId: string | Partial<IUser>;
  senderId?: string | Partial<IUser>;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string;
  relatedUrl?: string;
  readStatus: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IChannel {
  _id: string;
  channelId: string;
  name: string;
  description?: string;
  isOfficial: boolean;
  createdBy: string | Partial<IUser>;
  members?: string[];
  isPublic: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateChannelDto {
  name: string;
  description?: string;
  members?: string[];
  isPublic?: boolean;
}

export interface IProject {
  _id: string;
  title: string;
  code: string;
  description: string;
  objectives: string[];
  requirements: string[];
  toolsAndResources: string[];
  allocatedBudget: number;
  spentBudget: number;
  startDate: Date | string;
  targetEndDate: Date | string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  createdBy: string | Partial<IUser>;
  teamMembers: string[];
  wbsMilestones: Array<{
    title: string;
    description?: string;
    dueDate?: Date | string;
    isCompleted: boolean;
    assignedTasks: string[];
  }>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IDailyReport {
  _id: string;
  employeeId: string | Partial<IUser>;
  reportDate: string;
  summary: string;
  completedTasks: string[];
  ongoingTasks: string[];
  blockersAndChallenges?: string;
  workHoursLogged: number;
  aiAuditAnalysis?: string;
  status: 'SUBMITTED' | 'REVIEWED_BY_AI' | 'ACKNOWLEDGED_BY_ADMIN';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IAttendanceSession {
  _id: string;
  employeeId: string | Partial<IUser>;
  checkInTime: Date | string;
  checkOutTime?: Date | string;
  totalDurationMinutes?: number;
  status: 'ACTIVE' | 'CLOSED';
  dateStr: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==========================================
// AUDIT TRAILS & ZERO-TRUST SECURITY
// ==========================================

export type AuditActionType =
  | 'BLOCK_USER'
  | 'UNBLOCK_USER'
  | 'DELETE_USER'
  | 'CHANGE_PASSWORD'
  | 'UPDATE_USER_ROLE_SALARY'
  | 'DISBURSE_PAYOUT'
  | 'CONFIRM_PAYOUT_RECEIPT'
  | 'TASK_BUDGET_SETTLED'
  | 'DELETE_TASK'
  | 'SYSTEM_SECURITY_CONFIG';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface IAuditLog {
  _id: string;
  userId: string | Partial<IUser>;
  userName: string;
  userEmail: string;
  userRole: AccessRole;
  actionType: AuditActionType;
  targetId?: string;
  targetName?: string;
  targetType?: 'USER' | 'TASK' | 'PAYOUT' | 'SYSTEM' | 'SECURITY';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity: AuditSeverity;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==========================================
// ADVANCED PAYROLL & 10-DAY TRANCHES
// ==========================================

export type PayoutCycleType = 'EVERY_10_DAYS' | 'MONTHLY_FULL';

export interface IEmployeeAllowance {
  _id?: string;
  title: string;
  amount: number;
  currency: Currency;
  category: 'INTERNET' | 'COMMUNICATION' | 'SOFTWARE_TOOLS' | 'HOUSING' | 'TRANSPORT' | 'OTHER';
  disbursementDayOfMonth: number;
  isActive: boolean;
  notes?: string;
}

export interface IPayrollSchedule {
  _id: string;
  employeeId: string | Partial<IUser>;
  baseMonthlySalary: number;
  cycleType: PayoutCycleType;
  tranche1Day: number; // Default: 10
  tranche2Day: number; // Default: 20
  tranche3Day: number; // Default: 30
  allowances: IEmployeeAllowance[];
  autoGeneratePayoutOrders: boolean;
  requireEmployeeReceiptConfirmation: boolean;
  sendProofAttachmentToEmployee: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ITaskExpenseSettlement {
  spentAmount: number;
  currency: Currency;
  expenseDetails: string;
  invoicesOrProofs?: Array<{
    title: string;
    url: string;
    amount?: number;
  }>;
  submittedAt: Date | string;
  confirmedByAdmin?: boolean;
}





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
  payoutOrderId?: string;
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
  summaryForTreasury: string;
  executionStatus: PayoutExecutionStatus;
  inProgressClickedAt?: Date | string;
  disbursedClickedAt?: Date | string;
  transferProof?: ITransferProof;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IManualAdjustmentLog {
  _id?: string;
  adjustedBy: string | Partial<IUser>;
  targetBalance: 'GENERAL_BUDGET' | 'TREASURY_BALANCE';
  operation: 'INCREASE' | 'DECREASE' | 'SET';
  amount: number;
  reason: string;
  createdAt: Date | string;
}

export interface ICompanyVault {
  _id: string;
  generalBudget: number;
  treasuryBalance: number;
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
  createdAt: Date | string;
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
  targetBalance: 'GENERAL_BUDGET' | 'TREASURY_BALANCE';
  operation: 'INCREASE' | 'DECREASE' | 'SET';
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


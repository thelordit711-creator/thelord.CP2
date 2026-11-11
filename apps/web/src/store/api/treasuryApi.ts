import { baseApi } from './baseApi';
import { IPayoutOrder, IConfirmDisbursedDto, IApiResponse } from '@lord/shared-types';

export const treasuryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTreasuryOrders: builder.query<IApiResponse<IPayoutOrder[]>, { status?: string }>({
      query: (params) => ({
        url: '/treasury/orders',
        params
      }),
      providesTags: ['PayoutOrder']
    }),
    startPayoutProcessing: builder.mutation<IApiResponse<IPayoutOrder>, string>({
      query: (id) => ({
        url: `/treasury/orders/${id}/processing`,
        method: 'PATCH'
      }),
      invalidatesTags: ['PayoutOrder']
    }),
    confirmPayoutDisbursed: builder.mutation<IApiResponse<any>, { id: string; data: IConfirmDisbursedDto }>({
      query: ({ id, data }) => ({
        url: `/treasury/orders/${id}/disbursed`,
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: ['PayoutOrder', 'CompanyVault', 'EmployeeLedger', 'Project']
    }),
    auditReceiptImage: builder.mutation<
      IApiResponse<{
        isMatch: boolean;
        matchScore: number;
        extractedReference?: string;
        extractedAmount?: number;
        extractedCurrency?: string;
        extractedRecipient?: string;
        extractedDate?: string;
        confidenceScore: number;
        remarks: string;
      }>,
      { imageBase64: string; mimeType?: string; orderId?: string }
    >({
      query: (body) => ({
        url: '/treasury/audit-receipt',
        method: 'POST',
        body
      })
    }),

    // Custom Sub-vaults
    createCustomSubVault: builder.mutation<
      IApiResponse<any>,
      { name: string; code: string; parentVault: string; monthlyAllocated: number; alertThresholdPercent: number }
    >({
      query: (body) => ({
        url: '/treasury/sub-vaults',
        method: 'POST',
        body
      }),
      invalidatesTags: ['CompanyVault']
    }),

    transferToSubVault: builder.mutation<
      IApiResponse<any>,
      { subVaultCode: string; amount: number; reason: string }
    >({
      query: (body) => ({
        url: '/treasury/sub-vaults/transfer',
        method: 'POST',
        body
      }),
      invalidatesTags: ['CompanyVault']
    }),

    // Transaction modification/cancellation requests
    requestOrderModification: builder.mutation<
      IApiResponse<any>,
      { id: string; requestedAction: 'CANCEL' | 'EDIT_DETAILS'; reason: string; proposedNote?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/treasury/orders/${id}/request-modification`,
        method: 'POST',
        body
      }),
      invalidatesTags: ['PayoutOrder']
    }),

    decideOrderModification: builder.mutation<
      IApiResponse<any>,
      { id: string; decision: 'APPROVED' | 'REJECTED'; adminDecisionNote?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/treasury/orders/${id}/decide-modification`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: ['PayoutOrder', 'CompanyVault', 'Project']
    }),

    // Employee salary update
    updateEmployeeSalary: builder.mutation<
      IApiResponse<any>,
      { id: string; baseSalary: number; salaryCurrency?: string; payoutDayOfMonth?: number }
    >({
      query: ({ id, ...body }) => ({
        url: `/treasury/employees/${id}/salary`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: ['User']
    }),

    // Recurring monthly expenses
    getRecurringExpenses: builder.query<IApiResponse<any[]>, void>({
      query: () => ({
        url: '/treasury/recurring-expenses'
      }),
      providesTags: ['PayoutOrder']
    }),

    createRecurringExpense: builder.mutation<IApiResponse<any>, any>({
      query: (body) => ({
        url: '/treasury/recurring-expenses',
        method: 'POST',
        body
      }),
      invalidatesTags: ['PayoutOrder']
    }),

    deleteRecurringExpense: builder.mutation<IApiResponse<any>, string>({
      query: (id) => ({
        url: `/treasury/recurring-expenses/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['PayoutOrder']
    }),

    executeRecurringExpense: builder.mutation<IApiResponse<any>, string>({
      query: (id) => ({
        url: `/treasury/recurring-expenses/${id}/execute`,
        method: 'POST'
      }),
      invalidatesTags: ['PayoutOrder', 'CompanyVault', 'Project']
    }),

    // Reports
    getAccountingReports: builder.query<IApiResponse<any>, void>({
      query: () => ({
        url: '/treasury/reports'
      }),
      providesTags: ['CompanyVault', 'PayoutOrder']
    }),

    // Master Transactions Ledger & Cascading Management
    getAllTransactions: builder.query<
      IApiResponse<any[]>,
      { type?: string; category?: string; search?: string } | void
    >({
      query: (params) => ({
        url: '/treasury/transactions',
        params: params || undefined
      }),
      providesTags: ['PayoutOrder', 'CompanyVault']
    }),

    adminUpdateTransaction: builder.mutation<
      IApiResponse<any>,
      { id: string; type: string; amount?: number; category?: string; summary?: string; targetVault?: string; reason?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/treasury/transactions/${id}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: ['PayoutOrder', 'CompanyVault', 'EmployeeLedger', 'Project']
    }),

    adminDeleteTransaction: builder.mutation<
      IApiResponse<any>,
      { id: string; type: string; reason?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/treasury/transactions/${id}`,
        method: 'DELETE',
        body
      }),
      invalidatesTags: ['PayoutOrder', 'CompanyVault', 'EmployeeLedger', 'Project']
    }),

    recalculateVault: builder.mutation<IApiResponse<any>, void>({
      query: () => ({
        url: '/treasury/recalculate',
        method: 'POST'
      }),
      invalidatesTags: ['CompanyVault', 'PayoutOrder']
    })
  })
});

export const {
  useGetTreasuryOrdersQuery,
  useStartPayoutProcessingMutation,
  useConfirmPayoutDisbursedMutation,
  useAuditReceiptImageMutation,
  useCreateCustomSubVaultMutation,
  useTransferToSubVaultMutation,
  useRequestOrderModificationMutation,
  useDecideOrderModificationMutation,
  useUpdateEmployeeSalaryMutation,
  useGetRecurringExpensesQuery,
  useCreateRecurringExpenseMutation,
  useDeleteRecurringExpenseMutation,
  useExecuteRecurringExpenseMutation,
  useGetAccountingReportsQuery,
  useGetAllTransactionsQuery,
  useAdminUpdateTransactionMutation,
  useAdminDeleteTransactionMutation,
  useRecalculateVaultMutation
} = treasuryApi;


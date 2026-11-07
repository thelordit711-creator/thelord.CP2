import { baseApi } from './baseApi';
import { ICompanyVault, IEmployeeLedger, IFinancialDecisionDto, IAdjustVaultBalanceDto, IManageLedgerDto, IApiResponse } from '@lord/shared-types';

export const financeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFinancialRequests: builder.query<IApiResponse<any[]>, void>({
      query: () => '/finance/requests',
      providesTags: ['Task', 'PayoutOrder']
    }),
    decideFinancialRequest: builder.mutation<IApiResponse<any>, { id: string; data: IFinancialDecisionDto }>({
      query: ({ id, data }) => ({
        url: `/finance/requests/${id}`,
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: ['Task', 'PayoutOrder', 'CompanyVault']
    }),
    getVault: builder.query<IApiResponse<ICompanyVault>, void>({
      query: () => '/finance/vault',
      providesTags: ['CompanyVault']
    }),
    adjustVault: builder.mutation<IApiResponse<ICompanyVault>, IAdjustVaultBalanceDto>({
      query: (data) => ({
        url: '/finance/vault',
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: ['CompanyVault']
    }),
    manageEmployeeLedger: builder.mutation<IApiResponse<any>, { employeeId: string; data: IManageLedgerDto }>({
      query: ({ employeeId, data }) => ({
        url: `/finance/ledger/${employeeId}`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['EmployeeLedger', 'User']
    }),
    getMyStatement: builder.query<IApiResponse<IEmployeeLedger[]>, void>({
      query: () => '/finance/my-statement',
      providesTags: ['EmployeeLedger']
    }),
    confirmPayoutReceipt: builder.mutation<IApiResponse<any>, { orderId: string; note?: string }>({
      query: ({ orderId, note }) => ({
        url: `/finance/payouts/${orderId}/confirm-receipt`,
        method: 'POST',
        body: { note }
      }),
      invalidatesTags: ['PayoutOrder', 'EmployeeLedger']
    }),
    getPayrollSchedules: builder.query<IApiResponse<any[]>, void>({
      query: () => '/finance/payroll-schedules',
      providesTags: ['User']
    }),
    updatePayrollSchedule: builder.mutation<IApiResponse<any>, { employeeId: string; data: any }>({
      query: ({ employeeId, data }) => ({
        url: `/finance/payroll-schedules/${employeeId}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: ['User']
    }),
    generateTranchePayouts: builder.mutation<IApiResponse<any>, { trancheType: string; employeeIds?: string[] }>({
      query: (data) => ({
        url: '/finance/payroll/generate-tranche',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['PayoutOrder', 'CompanyVault', 'User']
    }),
    getMonthlyReport: builder.query<IApiResponse<any>, { employeeId: string; year?: number; month?: number }>({
      query: ({ employeeId, year, month }) => ({
        url: `/finance/monthly-report/${employeeId}`,
        params: { year, month }
      }),
      providesTags: ['EmployeeLedger', 'PayoutOrder']
    })
  })
});

export const {
  useGetFinancialRequestsQuery,
  useDecideFinancialRequestMutation,
  useGetVaultQuery,
  useAdjustVaultMutation,
  useManageEmployeeLedgerMutation,
  useGetMyStatementQuery,
  useConfirmPayoutReceiptMutation,
  useGetPayrollSchedulesQuery,
  useUpdatePayrollScheduleMutation,
  useGenerateTranchePayoutsMutation,
  useGetMonthlyReportQuery
} = financeApi;


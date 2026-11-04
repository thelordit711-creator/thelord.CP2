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
    })
  })
});

export const {
  useGetFinancialRequestsQuery,
  useDecideFinancialRequestMutation,
  useGetVaultQuery,
  useAdjustVaultMutation,
  useManageEmployeeLedgerMutation,
  useGetMyStatementQuery
} = financeApi;


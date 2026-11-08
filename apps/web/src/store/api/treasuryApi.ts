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
      invalidatesTags: ['PayoutOrder', 'CompanyVault', 'EmployeeLedger']
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
    })
  })
});

export const {
  useGetTreasuryOrdersQuery,
  useStartPayoutProcessingMutation,
  useConfirmPayoutDisbursedMutation,
  useAuditReceiptImageMutation
} = treasuryApi;


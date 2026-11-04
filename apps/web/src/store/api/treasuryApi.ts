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
    })
  })
});

export const {
  useGetTreasuryOrdersQuery,
  useStartPayoutProcessingMutation,
  useConfirmPayoutDisbursedMutation
} = treasuryApi;


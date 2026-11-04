import { baseApi } from './baseApi';
import { IApiResponse } from '@lord/shared-types';

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    askTheLordAI: builder.mutation<IApiResponse<{ reply: string }>, { message: string; history?: any[] }>({
      query: (data) => ({
        url: '/ai/chat',
        method: 'POST',
        body: data
      })
    })
  })
});

export const { useAskTheLordAIMutation } = aiApi;


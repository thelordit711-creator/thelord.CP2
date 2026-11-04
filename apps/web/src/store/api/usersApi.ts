import { baseApi } from './baseApi';
import { IUser, ICompleteOnboardingDto, IApiResponse } from '@lord/shared-types';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<IApiResponse<IUser>, void>({
      query: () => '/users/me',
      providesTags: ['User']
    }),
    completeOnboarding: builder.mutation<IApiResponse<IUser>, ICompleteOnboardingDto>({
      query: (data) => ({
        url: '/users/onboarding',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['User']
    }),
    getAllEmployees: builder.query<IApiResponse<IUser[]>, void>({
      query: () => '/users/admin/all',
      providesTags: ['User']
    }),
    getEmployeeById: builder.query<IApiResponse<IUser>, string>({
      query: (id) => `/users/admin/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }]
    })
  })
});

export const {
  useGetMeQuery,
  useCompleteOnboardingMutation,
  useGetAllEmployeesQuery,
  useGetEmployeeByIdQuery
} = usersApi;


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
    }),
    updateProfile: builder.mutation<IApiResponse<IUser>, Partial<IUser>>({
      query: (data) => ({
        url: '/users/profile',
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: ['User']
    }),
    getLeaderboard: builder.query<IApiResponse<any[]>, void>({
      query: () => '/users/leaderboard',
      providesTags: ['User', 'Task']
    }),
    getSystemSettings: builder.query<IApiResponse<any>, void>({
      query: () => '/users/system-settings',
      providesTags: ['User']
    }),
    updateSystemSettings: builder.mutation<IApiResponse<any>, any>({
      query: (data) => ({
        url: '/users/system-settings',
        method: 'PUT',
        body: data
      }),
      invalidatesTags: ['User']
    })
  })
});

export const {
  useGetMeQuery,
  useCompleteOnboardingMutation,
  useGetAllEmployeesQuery,
  useGetEmployeeByIdQuery,
  useUpdateProfileMutation,
  useGetLeaderboardQuery,
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation
} = usersApi;


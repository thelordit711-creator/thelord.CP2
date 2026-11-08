import { baseApi } from './baseApi';
import { IUser, ICompleteOnboardingDto, IApiResponse, IAuditLog } from '@lord/shared-types';

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
      query: () => '/users/team',
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
    }),
    deleteUser: builder.mutation<IApiResponse<void>, string>({
      query: (id) => ({
        url: `/users/admin/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['User']
    }),
    changeUserPassword: builder.mutation<IApiResponse<void>, { id: string; newPassword: string }>({
      query: ({ id, newPassword }) => ({
        url: `/users/admin/${id}/password`,
        method: 'PATCH',
        body: { newPassword }
      }),
      invalidatesTags: ['User']
    }),
    toggleUserSuspension: builder.mutation<IApiResponse<IUser>, { id: string; isSuspended: boolean; reason?: string }>({
      query: ({ id, isSuspended, reason }) => ({
        url: `/users/admin/${id}/suspend`,
        method: 'PATCH',
        body: { isSuspended, reason }
      }),
      invalidatesTags: ['User']
    }),
    getAuditLogs: builder.query<
      IApiResponse<IAuditLog[]>,
      { page?: number; limit?: number; actionType?: string; severity?: string; search?: string } | void
    >({
      query: (params) => ({
        url: '/users/admin/audit-logs',
        params: params || {}
      }),
      providesTags: ['User']
    }),
    get2FAStatus: builder.query<IApiResponse<{ isTwoFactorEnabled: boolean; hasRecoveryCodes: boolean }>, void>({
      query: () => '/auth/2fa/status',
      providesTags: ['User']
    }),
    generate2FASetup: builder.mutation<IApiResponse<{ secret: string; qrCodeDataUrl: string; otpauth: string }>, void>({
      query: () => ({
        url: '/auth/2fa/generate',
        method: 'POST'
      })
    }),
    enable2FA: builder.mutation<IApiResponse<{ recoveryCodes: string[] }>, { code: string }>({
      query: (body) => ({
        url: '/auth/2fa/enable',
        method: 'POST',
        body
      }),
      invalidatesTags: ['User']
    }),
    disable2FA: builder.mutation<IApiResponse<void>, { code?: string; password?: string }>({
      query: (body) => ({
        url: '/auth/2fa/disable',
        method: 'POST',
        body
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
  useUpdateSystemSettingsMutation,
  useDeleteUserMutation,
  useChangeUserPasswordMutation,
  useToggleUserSuspensionMutation,
  useGetAuditLogsQuery,
  useGet2FAStatusQuery,
  useGenerate2FASetupMutation,
  useEnable2FAMutation,
  useDisable2FAMutation
} = usersApi;


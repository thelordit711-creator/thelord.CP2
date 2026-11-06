import { baseApi } from './baseApi';
import { INotification, IApiResponse } from '@lord/shared-types';

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyNotifications: builder.query<
      { success: boolean; data: INotification[]; meta: { total: number; unreadCount: number; page: number; pages: number } },
      { page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/notifications',
        params: params || { page: 1, limit: 30 }
      }),
      providesTags: ['Notification']
    }),

    markAsRead: builder.mutation<IApiResponse<INotification>, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: ['Notification']
    }),

    markAllAsRead: builder.mutation<IApiResponse<{ message: string }>, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH'
      }),
      invalidatesTags: ['Notification']
    }),

    deleteNotification: builder.mutation<IApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Notification']
    })
  })
});

export const {
  useGetMyNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation
} = notificationsApi;


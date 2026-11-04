import { baseApi } from './baseApi';
import { IMeetingRoom, IApiResponse } from '@lord/shared-types';

export const meetingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActiveMeeting: builder.query<IMeetingRoom, void>({
      query: () => '/meetings/active',
      transformResponse: (response: any) => response.data,
      providesTags: ['MeetingRoom']
    }),
    joinMeeting: builder.mutation<IMeetingRoom, void>({
      query: () => ({
        url: '/meetings/join',
        method: 'POST'
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['MeetingRoom']
    }),
    leaveMeeting: builder.mutation<any, void>({
      query: () => ({
        url: '/meetings/leave',
        method: 'POST'
      }),
      invalidatesTags: ['MeetingRoom']
    }),
    updateMeetingNotes: builder.mutation<IMeetingRoom, { meetingNotes?: string; agenda?: string }>({
      query: (data) => ({
        url: '/meetings/notes',
        method: 'POST',
        body: data
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['MeetingRoom']
    }),
    convertMeetingToTasks: builder.mutation<{ success: boolean; message: string; tasksCount: number; tasks: any[] }, { notes?: string }>({
      query: (data) => ({
        url: '/meetings/convert-to-tasks',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Task', 'MeetingRoom']
    }),
    inviteMember: builder.mutation<IApiResponse<any>, { targetUserId: string }>({
      query: (data) => ({
        url: '/meetings/invite',
        method: 'POST',
        body: data
      })
    }),
    startMeeting: builder.mutation<IApiResponse<any>, void>({
      query: () => ({
        url: '/meetings/start',
        method: 'POST'
      }),
      invalidatesTags: ['MeetingRoom']
    })
  })
});

export const {
  useGetActiveMeetingQuery,
  useJoinMeetingMutation,
  useLeaveMeetingMutation,
  useUpdateMeetingNotesMutation,
  useConvertMeetingToTasksMutation,
  useInviteMemberMutation,
  useStartMeetingMutation
} = meetingApi;

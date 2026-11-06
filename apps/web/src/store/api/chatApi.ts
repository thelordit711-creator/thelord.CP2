import { baseApi } from './baseApi';
import { IChatMessage, IApiResponse, IUser } from '@lord/shared-types';

export interface IChatRoomChannel {
  id: string;
  name: string;
  desc: string;
}

export interface IRoomsAndMembersResponse {
  channels: IChatRoomChannel[];
  members: IUser[];
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRoomsAndMembers: builder.query<IRoomsAndMembersResponse, void>({
      query: () => '/chat/rooms-and-members',
      transformResponse: (response: any) => ({
        channels: response.channels || response.data?.channels || [],
        members: response.members || response.data?.members || []
      }),
      providesTags: ['ChatMessage', 'User']
    }),
    getMessages: builder.query<IChatMessage[], string>({
      query: (roomId) => `/chat/messages/${roomId}`,
      transformResponse: (response: any) => response.data || [],
      providesTags: (result, error, roomId) => [{ type: 'ChatMessage', id: roomId }]
    }),
    sendMessage: builder.mutation<IApiResponse<IChatMessage>, { chatRoomId: string; content?: string; attachments?: any[]; replyToId?: string }>({
      query: (data) => ({
        url: '/chat/messages',
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result, error, { chatRoomId }) => [{ type: 'ChatMessage', id: chatRoomId }]
    }),
    editMessage: builder.mutation<IApiResponse<IChatMessage>, { id: string; content: string; chatRoomId: string }>({
      query: ({ id, content }) => ({
        url: `/chat/messages/${id}`,
        method: 'PATCH',
        body: { content }
      }),
      invalidatesTags: (result, error, { chatRoomId }) => [{ type: 'ChatMessage', id: chatRoomId }]
    }),
    deleteMessage: builder.mutation<IApiResponse<any>, { id: string; chatRoomId: string }>({
      query: ({ id }) => ({
        url: `/chat/messages/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result, error, { chatRoomId }) => [{ type: 'ChatMessage', id: chatRoomId }]
    }),
    markRoomAsRead: builder.mutation<IApiResponse<any>, string>({
      query: (roomId) => ({
        url: `/chat/rooms/${roomId}/read`,
        method: 'POST'
      }),
      invalidatesTags: (result, error, roomId) => [{ type: 'ChatMessage', id: roomId }]
    }),
    createChannel: builder.mutation<IApiResponse<any>, { name: string; description?: string; isPublic?: boolean; members?: string[] }>({
      query: (data) => ({
        url: '/chat/channels',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['ChatMessage']
    })
  })
});

export const {
  useGetRoomsAndMembersQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useMarkRoomAsReadMutation,
  useCreateChannelMutation
} = chatApi;

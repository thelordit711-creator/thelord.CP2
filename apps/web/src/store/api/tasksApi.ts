import { baseApi } from './baseApi';
import { ITask, ICreateTaskDto, ISubmitStageDto, IReviewStageDto, IApiResponse } from '@lord/shared-types';

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<IApiResponse<ITask[]>, void>({
      query: () => '/tasks',
      providesTags: (result) =>
        result?.data
          ? [...result.data.map((t: any) => ({ type: 'Task' as const, id: t._id })), 'Task']
          : ['Task']
    }),
    getTaskById: builder.query<IApiResponse<ITask>, string>({
      query: (id) => `/tasks/${id}`,
      providesTags: (result, error, id) => [{ type: 'Task', id }]
    }),
    createOrProposeTask: builder.mutation<IApiResponse<ITask>, ICreateTaskDto>({
      query: (data) => ({
        url: '/tasks',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Task']
    }),
    updateTask: builder.mutation<IApiResponse<ITask>, { id: string; data: Partial<ICreateTaskDto> }>({
      query: ({ id, data }) => ({
        url: `/tasks/${id}`,
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: (result, error, { id }) => ['Task', { type: 'Task', id }]
    }),
    deleteTask: builder.mutation<IApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Task']
    }),
    submitTaskStage: builder.mutation<IApiResponse<ITask>, { taskId: string; stageOrder: number; data: ISubmitStageDto }>({
      query: ({ taskId, stageOrder, data }) => ({
        url: `/tasks/${taskId}/stages/${stageOrder}`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result, error, { taskId }) => ['Task', { type: 'Task', id: taskId }]
    }),
    reviewTaskStage: builder.mutation<IApiResponse<ITask>, { taskId: string; stageOrder: number; data: IReviewStageDto }>({
      query: ({ taskId, stageOrder, data }) => ({
        url: `/tasks/${taskId}/stages/${stageOrder}/review`,
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: (result, error, { taskId }) => ['Task', { type: 'Task', id: taskId }]
    }),
    addDirectReport: builder.mutation<IApiResponse<any>, { taskId: string; textContent?: string; attachments?: any[] }>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/reports`,
        method: 'POST',
        body
      }),
      invalidatesTags: (result, error, { taskId }) => ['Task', { type: 'Task', id: taskId }]
    }),
    claimBountyTask: builder.mutation<IApiResponse<ITask>, string>({
      query: (taskId) => ({
        url: `/tasks/${taskId}/claim-bounty`,
        method: 'POST'
      }),
      invalidatesTags: (result, error, taskId) => ['Task', { type: 'Task', id: taskId }]
    })
  })
});

export const {
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useCreateOrProposeTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useSubmitTaskStageMutation,
  useReviewTaskStageMutation,
  useAddDirectReportMutation,
  useClaimBountyTaskMutation
} = tasksApi;


import { baseApi } from './baseApi';
import { ITask, ICreateTaskDto, ISubmitStageDto, IReviewStageDto, IApiResponse } from '@lord/shared-types';

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<IApiResponse<ITask[]>, void>({
      query: () => '/tasks',
      providesTags: ['Task']
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
    submitTaskStage: builder.mutation<IApiResponse<ITask>, { taskId: string; stageOrder: number; data: ISubmitStageDto }>({
      query: ({ taskId, stageOrder, data }) => ({
        url: `/tasks/${taskId}/stages/${stageOrder}`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'Task', id: taskId }]
    }),
    reviewTaskStage: builder.mutation<IApiResponse<ITask>, { taskId: string; stageOrder: number; data: IReviewStageDto }>({
      query: ({ taskId, stageOrder, data }) => ({
        url: `/tasks/${taskId}/stages/${stageOrder}/review`,
        method: 'PATCH',
        body: data
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'Task', id: taskId }]
    }),
    addDirectReport: builder.mutation<IApiResponse<any>, { taskId: string; textContent?: string; attachments?: any[] }>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/reports`,
        method: 'POST',
        body
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'Task', id: taskId }]
    })
  })
});

export const {
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useCreateOrProposeTaskMutation,
  useSubmitTaskStageMutation,
  useReviewTaskStageMutation,
  useAddDirectReportMutation
} = tasksApi;


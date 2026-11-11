import { baseApi } from './baseApi';
import {
  IProject,
  ICreateProjectDto,
  IUpdateProjectDto,
  IApiResponse,
  IPayoutOrder
} from '@lord/shared-types';

export interface IGeneratedProjectPlan {
  code: string;
  objectives: string[];
  requirements: string[];
  toolsAndResources: string[];
  milestones: Array<{
    title: string;
    description?: string;
    daysFromStart?: number;
    tasks?: Array<{
      title: string;
      description?: string;
      suggestedAssigneeId?: string | null;
      priority?: string;
    }>;
  }>;
}

export interface IProjectFinancialsResponse {
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  vaultLiquidity: {
    generalBudget: number;
    treasuryBalance: number;
  };
  transactions: IPayoutOrder[];
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<IApiResponse<IProject[]>, void>({
      query: () => '/projects',
      providesTags: (result) =>
        result?.data
          ? [...result.data.map((p) => ({ type: 'Project' as const, id: p._id })), 'Project']
          : ['Project']
    }),
    getProjectById: builder.query<IApiResponse<IProject>, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }]
    }),
    getProjectFinancials: builder.query<IApiResponse<IProjectFinancialsResponse>, string>({
      query: (id) => `/projects/${id}/financials`,
      providesTags: (_result, _error, id) => [{ type: 'Project', id }, 'PayoutOrder', 'CompanyVault']
    }),
    aiGenerateProjectPlan: builder.mutation<
      IApiResponse<IGeneratedProjectPlan>,
      { title: string; description: string; allocatedBudget: number; targetDays: number }
    >({
      query: (body) => ({
        url: '/projects/ai-generate-plan',
        method: 'POST',
        body
      })
    }),
    createProject: builder.mutation<IApiResponse<IProject>, ICreateProjectDto>({
      query: (body) => ({
        url: '/projects',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Project']
    }),
    updateProject: builder.mutation<IApiResponse<IProject>, { id: string; data: IUpdateProjectDto }>({
      query: ({ id, data }) => ({
        url: `/projects/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (_result, _error, { id }) => ['Project', { type: 'Project', id }]
    }),
    deleteProject: builder.mutation<IApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Project', 'Task']
    }),
    decomposeMilestone: builder.mutation<
      IApiResponse<{ task: any; project: IProject }>,
      { projectId: string; milestoneIndex: number }
    >({
      query: ({ projectId, milestoneIndex }) => ({
        url: `/projects/${projectId}/decompose-milestone`,
        method: 'POST',
        body: { milestoneIndex }
      }),
      invalidatesTags: (_result, _error, { projectId }) => ['Project', { type: 'Project', id: projectId }, 'Task']
    }),
    decomposeAllMilestones: builder.mutation<
      IApiResponse<{ createdTasksCount: number; project: IProject }>,
      string
    >({
      query: (projectId) => ({
        url: `/projects/${projectId}/decompose-all`,
        method: 'POST'
      }),
      invalidatesTags: (_result, _error, projectId) => ['Project', { type: 'Project', id: projectId }, 'Task']
    }),
    openProjectChannel: builder.mutation<IApiResponse<{ channelId: string; name: string }>, string>({
      query: (projectId) => ({
        url: `/projects/${projectId}/chat-channel`,
        method: 'POST'
      }),
      invalidatesTags: (_result, _error, projectId) => ['Project', { type: 'Project', id: projectId }, 'ChatMessage']
    })
  })
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useGetProjectFinancialsQuery,
  useAiGenerateProjectPlanMutation,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useDecomposeMilestoneMutation,
  useDecomposeAllMilestonesMutation,
  useOpenProjectChannelMutation
} = projectsApi;


import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../lib/apiClient';

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('X-Requested-With', 'XMLHttpRequest');
      return headers;
    }
  }),
  tagTypes: ['User', 'Task', 'Project', 'PayoutOrder', 'CompanyVault', 'EmployeeLedger', 'ChatMessage', 'MeetingRoom', 'Notification'],
  endpoints: () => ({})
});


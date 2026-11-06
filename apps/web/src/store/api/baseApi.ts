import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      // Prioritize official system session token, then fallback
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('lord_auth_token') || localStorage.getItem('auth_token')
        : null;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    }
  }),
  tagTypes: ['User', 'Task', 'PayoutOrder', 'CompanyVault', 'EmployeeLedger', 'ChatMessage', 'MeetingRoom', 'Notification'],
  endpoints: () => ({})
});


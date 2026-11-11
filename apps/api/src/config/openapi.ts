/**
 * OpenAPI 3.0 Specification for THE LORD OF CRYPTO Control Panel API
 * Served dynamically at GET /api/docs.json
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'THE LORD OF CRYPTO — Control Panel ERP API',
    version: '1.0.0',
    description:
      'Enterprise ERP API covering HttpOnly Auth/2FA, RBAC, Tasks & Stages, Projects WBS, Isolated Treasury & BEP20 Verification, Telegram-style Chat, WebRTC Meetings, and Gemini AI.'
  },
  servers: [
    { url: '/api/v1', description: 'API v1 Base Path' }
  ],
  tags: [
    { name: 'Auth', description: 'Authentication, 2FA, Invitations & Work Status' },
    { name: 'Users', description: 'Team Directory, Onboarding & Audit Logs' },
    { name: 'Projects', description: 'Strategic Projects WBS, Gantt, Financials & Team Channel' },
    { name: 'Tasks', description: 'Tasks, Stages Review, Bounties & Budget Settlement' },
    { name: 'Finance', description: 'General Vault, Financial Requests & Payroll Tranches' },
    { name: 'Treasury', description: 'Isolated Payout Execution, Sub-Vaults & BEP20 Verification' },
    { name: 'Upload', description: 'Magic-Bytes Validated Uploads & Private S3/R2 Presigned URLs' },
    { name: 'Chat', description: 'Channels & Direct Messages' },
    { name: 'Meetings', description: 'WebRTC Meeting Rooms & AI Task Conversion' },
    { name: 'AI', description: 'TheLord Gemini 2.5 Assistant, WBS & Cashflow Forecast' }
  ],
  paths: {
    '/auth/login': { post: { tags: ['Auth'], summary: 'Authenticate via email/password (+ optional 2FA)' } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Get authenticated session profile' } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Clear HttpOnly session cookie' } },
    '/projects': {
      get: { tags: ['Projects'], summary: 'List role-scoped strategic projects' },
      post: { tags: ['Projects'], summary: 'Create strategic project (SUPER_ADMIN)' }
    },
    '/projects/ai-generate-plan': {
      post: { tags: ['Projects'], summary: 'Generate WBS milestones via Gemini AI (SUPER_ADMIN)' }
    },
    '/projects/{id}/financials': {
      get: { tags: ['Projects'], summary: 'Get project financial disbursement ledger' }
    },
    '/projects/{id}/chat-channel': {
      post: { tags: ['Projects'], summary: 'Open or create project team chat channel' }
    },
    '/tasks': {
      get: { tags: ['Tasks'], summary: 'List scoped tasks' },
      post: { tags: ['Tasks'], summary: 'Create or propose a task' }
    },
    '/finance/vault': {
      get: { tags: ['Finance'], summary: 'Get Company Vault balances (SUPER_ADMIN)' },
      patch: { tags: ['Finance'], summary: 'Deposit or transfer liquidity atomically (SUPER_ADMIN)' }
    },
    '/treasury/orders': {
      get: { tags: ['Treasury'], summary: 'List payout orders (TREASURY / SUPER_ADMIN)' }
    },
    '/treasury/orders/{id}/disbursed': {
      patch: { tags: ['Treasury'], summary: 'Execute payout disbursement inside MongoDB transaction' }
    },
    '/upload': {
      post: { tags: ['Upload'], summary: 'Inspect magic bytes and store file securely (S3/R2 or sandbox)' }
    },
    '/upload/presigned-url': {
      get: { tags: ['Upload'], summary: 'Generate short-lived presigned access URL for private receipts' }
    },
    '/users': {
      get: { tags: ['Users'], summary: 'List workspace directory users' }
    },
    '/chat/channels': {
      get: { tags: ['Chat'], summary: 'List user chat channels' },
      post: { tags: ['Chat'], summary: 'Create team chat channel' }
    },
    '/meetings': {
      get: { tags: ['Meetings'], summary: 'List active or recent WebRTC meetings' }
    },
    '/ai/cashflow-forecast': {
      get: { tags: ['AI'], summary: 'Generate AI liquidity forecast' }
    }
  }
} as const;

/**
 * Interactive Swagger UI HTML page powered by the runtime `/api/docs.json` manifest.
 */
export function getSwaggerUiHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>THE LORD ERP API — Swagger Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #0a0b10; color: #f8fafc; }
    .swagger-ui .topbar { background: #10131b; border-bottom: 1px solid rgba(212,175,55,0.28); }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/api/docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true
      });
    };
  </script>
</body>
</html>`;
}


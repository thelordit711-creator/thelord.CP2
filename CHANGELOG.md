# Changelog

All notable engineering changes to **THE LORD OF CRYPTO — Control Panel (C.P)** are documented in this file.

## [Unreleased] - 2026-11-11

### Added
- **Interactive Swagger UI & Expanded OpenAPI Spec:** Added `GET /api/docs` interactive Swagger UI alongside `GET /api/docs.json` (`OpenAPI 3.0.3`), documenting upload, auth, tasks, projects, finance, treasury, chat, meetings, and AI endpoints.
- **Upload Query & Metadata Validation:** Added `validateQuery` middleware helper and Zod schemas (`uploadMetadataSchema`, `presignedUrlQuerySchema`) on `apps/api/src/routes/upload.routes.ts`.
- **Modular Backend Architecture:** Extracted `AccountingCoreService` (`apps/api/src/services/accounting/accountingCore.service.ts`), `AccountingLedgerService` (`apps/api/src/services/accounting/accountingLedger.service.ts`), `authCookie.ts`, and `AuthTwoFactorController` from oversized services/controllers while keeping all public interfaces intact.
- **Reusable Task Modal Modules:** Extracted `taskStageTemplates.ts`, `TaskAssigneeSection.tsx`, and `TaskStagesBuilderSection.tsx` under `apps/web/src/components/tasks/modals/shared/` to eliminate duplication between `CreateTaskModal` and `EditTaskModal`.
- **Skeleton Loaders Expansion:** Added `LeaderboardSkeleton`, `ProfileSkeleton`, `SettingsSkeleton`, and `ParticipantsSkeleton` across `leaderboard`, `profile`, `settings`, and `meeting` views.
- **HTTP Integration Tests:** Added `apps/api/tests/integration/http-api.test.ts` testing Express HTTP validation middlewares and OpenAPI/Swagger endpoints end-to-end.
- **Project Documentation & Licensing:** Added `LICENSE` and `CHANGELOG.md`.

### Changed
- **Next.js 16 Routing Convention:** Migrated `apps/web/src/middleware.ts` to `apps/web/src/proxy.ts` (`proxy` export) to eliminate the Next.js 16 deprecation warning.

## [1.0.0-hardening] - 2026-11-11

### Added & Fixed
- **Bidirectional Projects WBS & Accounting Sync:** Implemented `ProjectSyncService` and unit tests (`apps/api/tests/projects/project-sync.test.ts`), RBAC permission enforcement on projects, budget settlement integration, and project team chat channel provisioning.
- **Security & Financial Integrity:** Enforced HttpOnly cookie auth, CSRF guard, `express-rate-limit`, strict `vercel.json` CORS policy, MongoDB multi-document transactions across finance/treasury operations, `Decimal128` precision with `FinancialMath` (`BigInt`), and `AppErrorBoundary`.
- **DevOps & Containerization:** Added `Dockerfile.api`, `Dockerfile.web`, `docker-compose.yml` (MongoDB `rs0` + Redis), and `.github/workflows/ci.yml`.


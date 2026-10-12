# Specs Changelog

All notable changes to the specs in this folder. Newest entries first.

Each entry: date, which spec file changed, and what/why. Full diffs are in git:
`git log --follow -p specs/<file>`

## 2026-10-12
- `FRONTEND.md`: filled in the full frontend spec — React + TypeScript + Vite + Tailwind + shadcn/ui, TanStack Query, React Hook Form + Zod; public pages (catalog, certificate detail) and admin pages (login, list, add/edit, settings); UX states, look & feel, mobile-first, accessibility, English UI; same-origin setup with the API; structure and tests.
- `BACKEND.md`: added account endpoints (display name, change password); frontend now served from the same Spring Boot image/domain (replaces CORS setup); `APP_FRONTEND_URL` → `APP_BASE_URL`.
- `BACKEND.md`: filled in the full backend spec — Java 21 + Spring Boot 3 + PostgreSQL + Flyway; data model (users, certificates, certificate_files, tags); REST API for auth, owner area and public catalog; local-then-S3 storage behind `StorageService` (PDF/PNG/JPEG/WEBP, 10 MB, thumbnails); email + password session auth; no background jobs in MVP; cheap PaaS hosting with persistent-volume note; security, backups, project structure and tests.
- `OVERVIEW.md`: added expiration reminder email to nice-to-haves.
- `BACKEND.md` §4: file storage is now two phases — local project folder first (git-ignored), S3 later — behind one storage layer so the move is easy. `OVERVIEW.md` §6 updated to match.
- `OVERVIEW.md`: replaced "Open questions" with "Decisions": catalog is link-only (not indexed by search engines), hidden certificates and their files stay fully private, expiration dates are not shown to visitors. Added "searchable on Google" to nice-to-haves.
- `BACKEND.md` §4: files are stored in a private AWS S3 bucket; hidden certificates' files are never served publicly.
- `OVERVIEW.md`: rewrote and filled in all sections — clearer goal with success criteria, owner/visitor roles table, MVP features split by role plus user stories, nice-to-haves tailored to the catalog, out-of-scope list, and a new "Open questions" section. Fixed spelling/grammar.
- Split the single spec into three files:
  - `OVERVIEW.md` (renamed from `SPEC.md`): shared goal, users, core features, nice-to-haves, out of scope.
  - `FRONTEND.md` (new): platform, UI tech, screens, UX, look & feel, responsiveness/accessibility/language.
  - `BACKEND.md` (new): backend tech, data model, API, file storage, auth, notifications, hosting, privacy/backup.
- `SPEC.md`: moved from the repo root into `specs/`.
- `CHANGELOG.md`: added to track spec changes.
- `SPEC.md`: initial template with sections 1–11 (problem, users, features, data, platform, hosting, tech, storage, auth, nice-to-haves, out of scope). All sections still to be filled in.

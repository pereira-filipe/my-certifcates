# Specs Changelog

All notable changes to the specs in this folder. Newest entries first.

Each entry: date, which spec file changed, and what/why. Full diffs are in git:
`git log --follow -p specs/<file>`

## 2026-10-12
- `BACKEND.md` §5: details settled while building login (B2): bootstrap rules (prod refuses to start without owner vars, dev warns; display name from the email), session cookie lasts 7 days, sessions are in memory (restart logs out), CSRF via `csrf.spa()`, error codes for the auth endpoints, `/api/auth/me` requires login.
- `BACKEND.md` §1: Spring Boot 3 → **Spring Boot 4** (4.1 is the current release; 3.x is out of open-source support and no longer offered by Spring Initializr). Found while setting up the backend (B1).
- `FRONTEND.md` §2, §8: React 18 → **React 19** (current version, what shadcn/ui now targets); Tailwind v4 keeps the theme in `src/index.css` instead of `tailwind.config.ts`. Found while setting up the frontend (F1).
- Resolved the gaps found while planning ([plans/ROADMAP.md](../plans/ROADMAP.md)):
  - `BACKEND.md` §3: added `GET /api/admin/files/{fileId}/thumbnail` (admin list shows thumbnails of hidden certificates) and `PATCH /api/admin/files/{fileId}/primary` (change the main file).
  - `BACKEND.md` §2: rules for the main file (first upload is main, deleting it promotes the oldest) and new certificates go to the top of the order.
  - `BACKEND.md` §5: CSRF setup for the SPA (`XSRF-TOKEN` cookie / `X-XSRF-TOKEN` header); login rate limit returns 429 and is kept in memory (single instance).
  - `BACKEND.md` §7 + `FRONTEND.md` §5: link previews are filled in by the backend for `/c/{shareToken}`, since a plain SPA can't give LinkedIn/WhatsApp a per-catalog title.
  - `FRONTEND.md` §3: upload progress via `XMLHttpRequest`; files for a new certificate are uploaded right after it's created; any file can be set as Main.
  - `FRONTEND.md` §7: CSRF cookie/header names.
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

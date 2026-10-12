# My Certificates — Implementation Roadmap

> How we build what's in [specs/](../specs/). The detailed tasks are in [BACKEND-PLAN.md](BACKEND-PLAN.md) and [FRONTEND-PLAN.md](FRONTEND-PLAN.md). Tick boxes as tasks get done, so this folder also shows progress.

## Approach

We build in **vertical slices**. Each milestone ends with something that works end to end (backend + frontend), instead of finishing the whole backend before starting the frontend. This way problems such as CORS, cookies or CSRF show up early.

Repository layout (monorepo, from [BACKEND.md §9](../specs/BACKEND.md)):

```
my-certifcates/
├── specs/            what to build
├── plans/            how to build it (this folder)
├── backend/          Spring Boot app
├── frontend/         React app
├── docker-compose.yml
├── Dockerfile
└── .gitignore        includes uploads/, node_modules/, target/, .env
```

## Milestones

| # | Milestone | Backend | Frontend | Done when |
|---|---|---|---|---|
| M0 | Repo foundation | — | — | Folder layout, `.gitignore`, README, CI running |
| M1 | Skeletons talk to each other | B1 | F1, F2 | `npm run dev` page shows data from Spring Boot through the Vite proxy |
| M2 | Login works | B2 | F3 | I can log in, reload and stay logged in, and log out; `/admin` redirects when logged out |
| M3 | Manage certificates (no files) | B3 | F4, F5 (without files) | Add, edit, delete, tag, reorder and hide/show certificates |
| M4 | Files | B4 | F5 (files) | Upload PDF/image, see thumbnail and preview, download, delete |
| M5 | Public catalog | B5 | F6, F7 | A recruiter can open my link on a phone and browse public certificates only |
| M6 | Ship it | B6 | F8 | Running on the PaaS with HTTPS, persistent uploads volume, backups; E2E tests green |
| — | Later | B7 | — | S3 storage, expiration reminders, nice-to-haves from [OVERVIEW.md §4](../specs/OVERVIEW.md) |

### M0 — Repo foundation
- [ ] Create `backend/`, `frontend/` and root `.gitignore` (`uploads/`, `.env`, `node_modules/`, `dist/`, `target/`, IDE files).
- [ ] Root `README.md`: what the project is, how to run it locally, link to `specs/` and `plans/`.
- [ ] `docker-compose.yml` with PostgreSQL 16 (dev only).
- [ ] GitHub Actions CI: backend `./mvnw verify` (Testcontainers works on GitHub runners) and frontend `npm ci && npm run lint && npm test && npm run build`.
- [ ] Dependabot for Maven, npm and GitHub Actions ([BACKEND.md §8](../specs/BACKEND.md)).

## Gaps found in the specs

Things the specs didn't cover, found while planning. **All resolved on 2026-10-12**: the fixes are now in the specs (see [specs/CHANGELOG.md](../specs/CHANGELOG.md)). Kept here for the reasoning.

1. **Admin can't load thumbnails of hidden certificates.** The only thumbnail endpoint is public, so it 404s for hidden certificates, but the admin list shows thumbnails for all of them.
   → add `GET /api/admin/files/{fileId}/thumbnail`.
2. **No way to change which file is "Main".** The form lets me mark one file as main, but there's no endpoint for an already-uploaded file.
   → add `PATCH /api/admin/files/{fileId}/primary`. The first uploaded file becomes main automatically, and deleting the main file promotes the oldest remaining one.
3. **Link previews (Open Graph) don't work in a plain SPA.** LinkedIn and WhatsApp don't run JavaScript, so they only see the static `index.html`.
   → Spring Boot serves `index.html` for `/c/{token}` with the owner's name injected into `<title>` and `og:` tags (simple string replace, no template engine). Unknown tokens get generic tags. Without this, all links show the same generic preview.
4. **Upload progress needs XHR.** `fetch` can't report upload progress.
   → The API client uses `XMLHttpRequest` (or axios) for the upload call only.
5. **New certificate + files is two steps.** Files are uploaded to `/certificates/{id}/files`, which needs an ID.
   → In the "Add" form, files are queued in the browser, then uploaded right after the certificate is created. If an upload fails, the certificate stays saved and the form switches to "Edit" with the error shown.
6. **CSRF with a SPA.** Spring Security 6 needs explicit setup for an SPA.
   → `CookieCsrfTokenRepository.withHttpOnlyFalse()` plus the SPA CSRF handler from the Spring docs; the frontend copies the `XSRF-TOKEN` cookie into the `X-XSRF-TOKEN` header.
7. **New certificate position.** The spec doesn't say where a new certificate goes in the order.
   → at the top (`display_order` = current min − 1), since the newest is usually the most relevant.
8. **Login rate limit storage.** In memory is enough for one app instance. Note it in the spec, since it resets on restart and doesn't work with several instances.

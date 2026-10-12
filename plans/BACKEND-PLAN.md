# Backend Implementation Plan

> Implements [specs/BACKEND.md](../specs/BACKEND.md). Milestones are in [ROADMAP.md](ROADMAP.md). Each phase ends with passing tests and a commit.

## B1 — Project skeleton (M1)
- [x] Generate with Spring Initializr: Maven, Java 21, Spring Boot 4, group `dev.filipe`, artifact `my-certificates`. Dependencies: Web, Data JPA, Security, Validation, Flyway, PostgreSQL, Actuator, Testcontainers.
- [x] Add springdoc-openapi, enabled only in the `dev` profile.
- [x] `application.yml` reading every setting from env vars ([BACKEND.md §7](../specs/BACKEND.md)), plus `application-dev.yml` and `application-prod.yml`.
- [x] Flyway `V1__init.sql` with the extension for UUIDs (`gen_random_uuid()` is built into Postgres 13+).
- [x] Global error handler (`@RestControllerAdvice`) producing the one error format: `{status, error, message, fields}`. Covers validation errors, 404, 401/403, 413 (file too big) and unexpected errors (no stack trace in the response).
- [x] Base `@MappedSuperclass` with `id`, `createdAt`, `updatedAt` (UTC).
- [x] Temporary `GET /api/public/ping` for the M1 check; remove later.
- [x] Integration test base class with a shared Testcontainers PostgreSQL.
- [x] Keep the Maven wrapper (`./mvnw`) committed — CI runs `./mvnw -B verify`.
- [x] Add the `maven` entry (`directory: /backend`) to `.github/dependabot.yml`.

## B2 — Authentication (M2)
- [ ] Migration `V2__users.sql`: `users` table.
- [ ] `User` entity + repository.
- [ ] Owner bootstrap: on startup, if no user exists, create one from `APP_OWNER_EMAIL` / `APP_OWNER_PASSWORD` (BCrypt) with a random `share_token` (32 chars, `SecureRandom`). Fail startup in `prod` if the vars are missing.
- [ ] Security config:
  - Session cookie: `HttpOnly`, `Secure` (prod), `SameSite=Lax`, 7-day timeout.
  - CSRF via `CookieCsrfTokenRepository.withHttpOnlyFalse()` + SPA handler (see ROADMAP gap 6).
  - `/api/admin/**` authenticated, `/api/public/**` and `/api/auth/login` open, static frontend files open.
  - Return 401 JSON (not a redirect or login page) for unauthenticated API calls. *(B1's minimal config returns 403 for now.)*
- [ ] `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- [ ] Login rate limit: in-memory counter by IP and by email; 5 failures → blocked for 15 minutes → `429` with a clear error code the frontend can show.
- [ ] Tests: login ok/bad, `/me` before and after, admin endpoint without login → 401, rate limit kicks in, CSRF required on POST.

## B3 — Certificates, tags and account (M3)
- [ ] Migration `V3__certificates_tags.sql`: `certificates`, `tags`, `certificate_tags` (unique `(owner_id, name)` on tags).
- [ ] Entities, repositories, services; every query scoped to the logged-in owner.
- [ ] Admin DTOs with Bean Validation (title/issuer ≤ 200, required issue date, URL format and ≤ 500 for verification URL, expiration not before issue date).
- [ ] Endpoints ([BACKEND.md §3](../specs/BACKEND.md)):
  - [ ] `GET /api/admin/certificates` with `q` (title/issuer, case-insensitive), `tag`, `public`; sorted by `display_order`.
  - [ ] `POST`, `GET {id}`, `PUT {id}`, `DELETE {id}`.
  - [ ] `PATCH {id}/visibility`.
  - [ ] `PUT /order` (ids must be exactly the owner's certificates, otherwise 400).
  - [ ] Tags: list, create, rename, delete (deleting a tag removes it from certificates).
  - [ ] Tags on save: the certificate DTO takes tag names; unknown names are created.
  - [ ] `PUT /api/admin/account` (display name), `PUT /api/admin/account/password` (check current, min 12 chars).
- [ ] Tests for each endpoint, including validation errors and "other owner's ID → 404" behavior.

## B4 — Files and thumbnails (M4)
- [ ] Migration `V4__certificate_files.sql`.
- [ ] `StorageService` interface + `LocalStorageService` (root from `APP_STORAGE_LOCAL_DIR`, defaults to `./uploads`); keys only, never full paths; reject keys with `..`.
- [ ] Bean selected by `APP_STORAGE_TYPE` (`local` now; `s3` in B7).
- [ ] Upload `POST /api/admin/certificates/{id}/files`:
  - [ ] Check real type by magic bytes (PDF `%PDF`, PNG, JPEG, WEBP `RIFF....WEBP`); reject everything else with 400.
  - [ ] 10 MB limit (`spring.servlet.multipart.max-file-size` / `max-request-size`) → 413 in the standard error format.
  - [ ] Save under `certificates/{certId}/{fileId}.{ext}`.
  - [ ] Thumbnail: PDFBox renders page 1; images are scaled down; save PNG as `certificates/{certId}/{fileId}-thumb.png`. A thumbnail failure doesn't fail the upload (`thumbnail_key` stays null).
  - [ ] Primary rules: first file becomes primary; `primary=true` moves the flag (ROADMAP gap 2).
- [ ] `GET /api/admin/files/{fileId}` streams the file with `Content-Type` and `Content-Disposition` (original name, safely encoded).
- [ ] `GET /api/admin/files/{fileId}/thumbnail` and `PATCH /api/admin/files/{fileId}/primary` (ROADMAP gaps 1 and 2).
- [ ] `DELETE /api/admin/files/{fileId}`; deleting the primary promotes another.
- [ ] Deleting a certificate also deletes its stored files (after the DB transaction commits).
- [ ] Tests: each allowed type, fake extension rejected, too big rejected, thumbnail created for PDF and image, delete removes from disk (use a temp dir).

## B5 — Public catalog (M5)
- [ ] `catalog` package with **separate public DTOs** (no `notes`, `expirationDate`, `ownerId`, `isPublic`).
- [ ] `GET /api/public/catalogs/{shareToken}` (display name + public certificates in order, with tags and thumbnail URL).
- [ ] `GET .../certificates/{id}`, `.../files/{fileId}`, `.../files/{fileId}/thumbnail`.
- [ ] One access-check method: token matches owner AND certificate is public AND file belongs to that certificate; any failure → 404.
- [ ] Filter adding `X-Robots-Tag: noindex, nofollow` to all `/api/public/**` responses.
- [ ] `GET /api/admin/catalog` (full link built from `APP_BASE_URL`) and `POST /api/admin/catalog/regenerate-link`.
- [ ] **Required security tests** ([BACKEND.md §10](../specs/BACKEND.md)): hidden cert and its files → 404; wrong token → 404; responses never contain `notes` / `expirationDate` (assert on raw JSON); old token → 404 after regenerate.

## B6 — Packaging and deploy (M6)
- [ ] Multi-stage `Dockerfile`: Node builds `frontend/dist` → Maven builds the jar with `dist` copied into `static/` → slim JRE 21 runtime, non-root user.
- [ ] SPA fallback controller: non-`/api`, non-file paths → `index.html`; for `/c/{token}` inject the owner's name into title/OG tags (ROADMAP gap 3).
- [ ] Production profile: Swagger off, secure cookies, forwarded headers on (PaaS proxy), actuator only `health`.
- [ ] Pick the PaaS (Railway / Render / Fly.io), create managed Postgres and a **persistent volume** at `APP_STORAGE_LOCAL_DIR`.
- [ ] Set env vars, deploy, check HTTPS, log in, change the bootstrap password.
- [ ] Turn on daily DB backups; write a small script to back up the uploads volume ([BACKEND.md §8](../specs/BACKEND.md)).
- [ ] Check logs contain no passwords, tokens or file contents.

## B7 — Later
- [ ] `S3StorageService` (AWS SDK v2), private bucket with versioning, optional pre-signed redirects (~5 min); one-off script that copies `uploads/` to S3 keeping the same keys.
- [ ] Expiration reminder email: daily `@Scheduled` job ([BACKEND.md §6](../specs/BACKEND.md)).

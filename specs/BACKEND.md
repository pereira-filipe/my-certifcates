# My Certificates — Backend Spec

> Data, API, storage and infrastructure. Product goals and features are in [OVERVIEW.md](OVERVIEW.md); the UI is in [FRONTEND.md](FRONTEND.md).

## 1. Tech stack

| Concern | Choice |
|---|---|
| Language | Java 21 (LTS) |
| Framework | Spring Boot 4 — Spring Web MVC, Spring Data JPA, Spring Security, Bean Validation |
| Database | PostgreSQL 16 |
| Migrations | Flyway (all schema changes are versioned SQL files) |
| Build | Maven |
| API docs | springdoc-openapi (Swagger UI at `/swagger-ui`, dev only) |
| PDF thumbnails | Apache PDFBox |
| Tests | JUnit 5, Spring Boot Test, Testcontainers (real PostgreSQL in tests) |
| Packaging | Docker image (for the PaaS deploy) |

Configuration comes from environment variables (`application.yml` + Spring profiles `dev` / `prod`). No secrets in the repo.

## 2. Data model

All IDs are UUIDs. All tables have `created_at` / `updated_at` (timestamps, UTC).

### `users`
The single owner account. There is no public sign-up.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| email | varchar, unique | login |
| password_hash | varchar | BCrypt |
| display_name | varchar | shown on the catalog header |
| share_token | varchar(32), unique | random, unguessable; forms the public link |

### `certificates`

| Field | Type | Required | Visible to visitors |
|---|---|---|---|
| id | UUID | yes | yes |
| owner_id | UUID → users | yes | no |
| title | varchar(200) | yes | yes |
| issuer | varchar(200) | yes | yes |
| issue_date | date | yes | yes |
| expiration_date | date | no | **no** (stored for future reminders) |
| credential_id | varchar(200) | no | yes |
| verification_url | varchar(500) | no | yes |
| notes | text (≤ 10,000 chars) | no | **no** (private to owner) |
| is_public | boolean, default `false` | yes | — |
| display_order | int | yes | used for sorting; a new certificate goes to the top (current minimum − 1) |

### `certificate_files`
A certificate can have one or more files. One file is the main one, which the catalog card uses for its thumbnail.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| certificate_id | UUID → certificates | cascade delete |
| storage_key | varchar | e.g. `certificates/{certId}/{fileId}.pdf` — never a full path or URL |
| thumbnail_key | varchar, nullable | generated PNG preview |
| original_name | varchar | as uploaded |
| content_type | varchar | `application/pdf`, `image/png`, `image/jpeg`, `image/webp` |
| size_bytes | bigint | |
| is_primary | boolean | exactly one per certificate: the first upload becomes primary; deleting the primary promotes the oldest remaining file |

### `tags` and `certificate_tags`
- `tags(id, owner_id, name)`: `name` (≤ 50 chars) unique per owner **ignoring case** ("Cloud" and "cloud" are the same tag). Extra spaces are trimmed.
- A certificate has at most 20 tags. `verification_url` must start with `http://` or `https://` (it becomes a link on the public page, so `javascript:` links are refused).
- `certificate_tags(certificate_id, tag_id)`: many-to-many.

## 3. API

REST + JSON, base path `/api`. Errors use one format:
`{ "status": 400, "error": "VALIDATION_ERROR", "message": "...", "fields": { "title": "must not be blank" } }`

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | email + password → starts session |
| POST | `/api/auth/logout` | ends session |
| GET | `/api/auth/me` | current owner, or 401 |

### Owner area (login required)
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/certificates` | list all (public + hidden); `?q=`, `?tag=`, `?public=true/false`, sorted by `display_order` |
| POST | `/api/admin/certificates` | create |
| GET | `/api/admin/certificates/{id}` | get one, including private fields |
| PUT | `/api/admin/certificates/{id}` | update |
| DELETE | `/api/admin/certificates/{id}` | delete certificate and its files |
| PATCH | `/api/admin/certificates/{id}/visibility` | `{ "isPublic": true }` |
| PUT | `/api/admin/certificates/order` | `[id1, id2, …]` → reorder |
| POST | `/api/admin/certificates/{id}/files` | multipart upload (`file`, `primary=true/false`) → 201 with the file; 400 wrong type / empty / more than 10 files; 413 over 10 MB |
| GET | `/api/admin/files/{fileId}` | view any file inline; `?download=true` makes it an attachment |
| GET | `/api/admin/files/{fileId}/thumbnail` | thumbnail of any file (public or hidden certificate) |
| PATCH | `/api/admin/files/{fileId}/primary` | make this file the main one |
| DELETE | `/api/admin/files/{fileId}` | delete a file |
| GET | `/api/admin/tags` | all tags with `certificateCount`, sorted by name |
| POST | `/api/admin/tags` | `{ name }` → create (400 if the name exists) |
| PUT | `/api/admin/tags/{id}` | `{ name }` → rename |
| DELETE | `/api/admin/tags/{id}` | delete; it's removed from every certificate |
| PUT | `/api/admin/account` | update display name |
| PUT | `/api/admin/account/password` | `{ currentPassword, newPassword }` |
| GET | `/api/admin/catalog` | current share link |
| POST | `/api/admin/catalog/regenerate-link` | new `share_token`; the old link stops working |

### Public catalog (no login)
| Method | Path | Description |
|---|---|---|
| GET | `/api/public/catalogs/{shareToken}` | owner display name + list of **public** certificates (public fields only) |
| GET | `/api/public/catalogs/{shareToken}/certificates/{id}` | one public certificate |
| GET | `/api/public/catalogs/{shareToken}/files/{fileId}` | file of a public certificate |
| GET | `/api/public/catalogs/{shareToken}/files/{fileId}/thumbnail` | thumbnail |

Public endpoint rules:
- They use separate response DTOs that physically don't contain `notes`, `expiration_date`, `owner_id` or `is_public`.
- A hidden certificate, an unknown ID or a wrong token all return **404**, never 403, so it isn't revealed that something exists.
- Every response includes the header `X-Robots-Tag: noindex, nofollow` (the catalog is link-only; see [OVERVIEW.md §6](OVERVIEW.md)).

## 4. File storage

Storage happens in two phases:

1. **Now — local project folder.** Files are saved under `uploads/` in the project (path set by `APP_STORAGE_LOCAL_DIR`). `uploads/` is in `.gitignore`, so certificate files never get committed.
2. **Later — AWS S3 bucket.** A private bucket; existing files are migrated by copying each `storage_key` as-is.

All file access goes through one interface, so the move to S3 is a config change:

```java
public interface StorageService {
    void save(String key, InputStream data, String contentType);
    Resource load(String key);
    void delete(String key);
}
// LocalStorageService now, S3StorageService later — selected by APP_STORAGE_TYPE=local|s3
```

Rules:
- **Allowed types:** PDF, PNG, JPEG, WEBP. Checked by the file's real content (magic bytes), not just the extension.
- **Max size:** 10 MB per file (`spring.servlet.multipart.max-file-size`); bigger uploads get `413 FILE_TOO_LARGE`.
- **Max files:** 10 per certificate.
- **Thumbnails:** generated on upload. Page 1 of a PDF is rendered with PDFBox, and images are scaled down (WEBP is read with the TwelveMonkeys plugin). At most 640 px wide, stored as PNG under the same key prefix. Images over 50 megapixels get no thumbnail (protects memory). If a thumbnail can't be made, the upload still succeeds without one.
- **Caching:** file and thumbnail responses are `Cache-Control: private, max-age=86400` (a file never changes under the same id).
- **Consistency:** stored bytes are deleted only after the database change commits, and freshly written bytes are deleted if it rolls back. Empty folders are removed.
- **Files are never publicly reachable directly.** The backend streams them after checking access (owner, or a public certificate behind a valid token). With S3, the backend may instead redirect to a short-lived pre-signed URL (≈5 minutes).
- File names on disk/S3 are generated IDs; the original name is only stored in the DB and sent in `Content-Disposition`.

## 5. Authentication

- **Email + password** for the single owner. No sign-up endpoint.
- The owner account is created on first startup from env vars `APP_OWNER_EMAIL` / `APP_OWNER_PASSWORD` if no user exists yet (password minimum 12 characters; the display name starts as the part of the email before `@`). In `prod` the app refuses to start without them; in `dev` it only logs a warning. Once the owner exists these vars are ignored. The password can be changed later in Settings (`PUT /api/admin/account/password`, minimum 12 characters).
- Passwords hashed with **BCrypt**.
- **Session-based auth** (Spring Security): `HttpOnly`, `Secure` (prod), `SameSite=Lax` session cookie that lasts 7 days (so the login survives a browser restart), CSRF protection on, session timeout 7 days. The session id changes on login. Sessions live in the app's memory, so a restart or redeploy logs the owner out.
- **CSRF for the SPA:** Spring Security's `csrf.spa()` sets an `XSRF-TOKEN` cookie (readable by JavaScript) on every response; the frontend sends it back in the `X-XSRF-TOKEN` header on POST/PUT/PATCH/DELETE, including login and logout.
- **Login rate limit:** after 5 failed attempts, block that IP/email for 15 minutes and return `429`. Counters are kept in memory: fine for a single app instance, but they reset on restart and would need shared storage if the app ever runs on several instances.
- `/api/admin/**` and `/api/auth/me` require login; `/api/public/**` and `/api/auth/login` are open.
- **Auth endpoints:** login returns the owner (`{ email, displayName }`) or `401 INVALID_CREDENTIALS` (same message for unknown email and wrong password) or `429 LOGIN_BLOCKED` with `Retry-After`. Logout returns `204`. Missing login → `401 UNAUTHORIZED`; missing/invalid CSRF token → `403 CSRF_TOKEN_INVALID`.

## 6. Background jobs & notifications

- **None in the MVP.**
- Later (nice-to-have): an expiration reminder email (e.g. 30 days before `expiration_date`), using a Spring `@Scheduled` daily job. The data is already stored for this.

## 7. Hosting

- **Development:** run locally. PostgreSQL via `docker compose`, and the app with `./mvnw spring-boot:run`.
- **Production:** **Fly.io** runs the Docker image (one always-on machine, 1 GB, region `gru`) with a 1 GB volume for uploads; the database is **Neon** (free tier, AWS `sa-east-1`). Steps in [DEPLOY.md](../DEPLOY.md). The app's health check doesn't touch the database and idle connections close, so Neon can sleep (free compute hours).
- ⚠️ **Disk on PaaS is usually wiped on every deploy/restart.** While storage is still local (phase 1), production needs a **persistent volume** mounted at `APP_STORAGE_LOCAL_DIR` (Railway volumes, Fly volumes, or a Render persistent disk). The alternative is to switch to S3 before the first production deploy.
- HTTPS is provided by the PaaS.
- **Frontend served by the backend:** the React build is copied into the Spring Boot app's static resources in the same Docker image, so frontend and API share one domain (no CORS or cross-site cookie issues). Non-`/api` paths that aren't files return `index.html` (SPA fallback). See [FRONTEND.md §7](FRONTEND.md).
- **Link previews:** for `/c/{shareToken}` the backend serves `index.html` with the owner's display name put into `<title>` and the Open Graph tags (plain string replace), because LinkedIn/WhatsApp don't run JavaScript. An unknown token gets generic tags.
- In dev, Vite proxies `/api` to Spring Boot, so CORS is not needed either.

### Environment variables
| Variable | Example |
|---|---|
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | managed Postgres |
| `APP_OWNER_EMAIL`, `APP_OWNER_PASSWORD` | first-run owner |
| `APP_STORAGE_TYPE` | `local` / `s3` |
| `APP_STORAGE_LOCAL_DIR` | `/data/uploads` |
| `APP_BASE_URL` | `https://my-certificates.example.com` (used to build the share link) |
| `AWS_REGION`, `APP_S3_BUCKET` (phase 2) | `sa-east-1`, `my-certificates-files` |

## 8. Privacy, backup & security

- **Security headers** on every response: `Content-Security-Policy` (only the site's own scripts — no inline scripts —, no framing, no plugins), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`; HSTS over HTTPS.

- **Private data never leaves via public endpoints:** this is enforced by separate DTOs and covered by tests (see §10).
- **Share link:** 32-character random token (`SecureRandom`). It can be regenerated if the link leaks.
- **Backups:** the database is dumped daily by a GitHub Action, **encrypted** (the repository is public) and kept 30 days; Neon's free tier only keeps 6 hours of history. The uploads volume has Fly's daily snapshots, kept 14 days. In phase 2, S3 versioning.
- **Logging:** no passwords, tokens or file contents in logs.
- Dependencies kept up to date (Dependabot or similar).

## 9. Project structure

```
backend/
  src/main/java/.../
    auth/          login, security config, owner bootstrap
    certificate/   entity, repository, service, admin controller
    file/          StorageService, Local/S3 implementations, thumbnails
    tag/
    catalog/       public controller + public DTOs
    common/        error handling, config
  src/main/resources/db/migration/   Flyway V1__init.sql, …
frontend/          see FRONTEND.md §8
docker-compose.yml   (PostgreSQL for dev)
Dockerfile           (multi-stage: build frontend → build backend → one runtime image)
```

## 10. Testing

- Service and controller tests for every endpoint.
- **Required security tests:**
  - Hidden certificates and their files return 404 on public endpoints.
  - Public responses never contain `notes` or `expiration_date`.
  - Admin endpoints return 401 without login.
- Integration tests run against a real PostgreSQL via Testcontainers.

## 11. Out of scope (backend)

- Sign-up and multiple users.
- Expiration reminders and email sending (later, see §6).
- OCR / auto-fill from certificate images.
- Search-engine indexing, sitemap, SEO.
- Export to CSV/PDF.
- Analytics / visit counter.

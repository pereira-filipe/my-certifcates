# My Certificates — Backend Spec

> Data, API, storage and infrastructure. Product goals and features are in [OVERVIEW.md](OVERVIEW.md); the UI is in [FRONTEND.md](FRONTEND.md).

## 1. Tech preferences
Language/framework/database (e.g., Node + PostgreSQL, Python + SQLite), or "no preference, you choose."

## 2. Data model
Fields per certificate:
- Title / name
- Issuing organization
- Issue date
- Expiration date (if any)
- Credential ID / verification URL
- File(s) attached
- Tags / category
- Notes

Other entities? (e.g., users, issuers, categories as their own tables)

## 3. API
Endpoints the frontend needs (REST, GraphQL, or "you choose"). Examples:
- List / search / filter certificates
- Get, create, update, delete a certificate
- Upload / download / delete files
- Export (CSV/PDF)

## 4. File storage
- Where should files live? (local folder, database, cloud storage like S3)
- Max file size, allowed types (PDF, PNG, JPG…)

## 5. Authentication
- Single user, no login needed?
- Or login required (password, OAuth/Google, etc.)?

## 6. Background jobs & notifications
- Expiration reminders: how (email, push, in-app) and when (e.g., 30 days before)?

## 7. Hosting / where it runs
- [ ] Just on my own computer (local only)
- [ ] Self-hosted on a server I control
- [ ] Cloud-hosted (needs a provider)

## 8. Privacy, backup & security
- Backups: how often, where?
- Any sensitive data concerns (encryption at rest, etc.)?

## 9. Out of scope (backend)

# Specs Changelog

All notable changes to the specs in this folder. Newest entries first.

Each entry: date, which spec file changed, and what/why. Full diffs are in git:
`git log --follow -p specs/<file>`

## 2026-10-12
- Split the single spec into three files:
  - `OVERVIEW.md` (renamed from `SPEC.md`): shared goal, users, core features, nice-to-haves, out of scope.
  - `FRONTEND.md` (new): platform, UI tech, screens, UX, look & feel, responsiveness/accessibility/language.
  - `BACKEND.md` (new): backend tech, data model, API, file storage, auth, notifications, hosting, privacy/backup.
- `SPEC.md`: moved from the repo root into `specs/`.
- `CHANGELOG.md`: added to track spec changes.
- `SPEC.md`: initial template with sections 1–11 (problem, users, features, data, platform, hosting, tech, storage, auth, nice-to-haves, out of scope). All sections still to be filled in.

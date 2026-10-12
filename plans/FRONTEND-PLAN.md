# Frontend Implementation Plan

> Implements [specs/FRONTEND.md](../specs/FRONTEND.md). Milestones are in [ROADMAP.md](ROADMAP.md). Each phase ends with lint + tests passing and a commit.

## F1 — Project setup (M1)
- [x] `npm create vite@latest frontend -- --template react-ts`.
- [x] Tailwind CSS + shadcn/ui init (Inter font, neutral greys, calm blue accent defined once in the theme).
- [x] Light/dark mode: follow system setting, with a toggle saved in `localStorage`.
- [x] React Router with the routes from [FRONTEND.md §3](../specs/FRONTEND.md) as empty placeholder pages.
- [x] TanStack Query provider, lucide-react, ESLint + Prettier, Vitest + React Testing Library.
- [x] `package.json` scripts used by CI: `lint`, `test` (= `vitest`), `build`; commit `package-lock.json`.
- [x] Add the `npm` entry (`directory: /frontend`) to `.github/dependabot.yml`.
- [x] `vite.config.ts`: proxy `/api` → `http://localhost:8080`.
- [x] `i18n/en.ts` with all UI texts from day one, and a tiny `t()` helper.
- [x] `index.html`: `<meta name="robots" content="noindex, nofollow">`, favicon, default title.

## F2 — API client (M1)
- [x] `api/client.ts`: `fetch` wrapper with `credentials: "include"`, JSON handling, CSRF header from the `XSRF-TOKEN` cookie on POST/PUT/PATCH/DELETE.
- [x] Turn the backend error format into an `ApiError` with `status`, `error`, `message`, `fields`.
- [x] On 401 in the admin area → redirect to `/login?expired=1` (shows "Your session expired…").
- [x] Hand-written types in `api/types.ts` matching the backend DTOs.
- [x] M1 check: a placeholder page calls `/api/public/ping` and shows the result. Verified 2026-10-12 in headless Chromium through the Vite proxy.

## F3 — Login and route guard (M2)
- [x] `useMe()` query on `/api/auth/me`.
- [x] `RequireAuth` wrapper for `/admin/*`: while loading show a skeleton; when logged out redirect to `/login?next=<path>`.
- [x] Login page: email + password (React Hook Form + Zod), generic "Invalid email or password", special message on 429 (blocked).
- [x] Log out button in the admin top bar.

## F4 — Admin certificate list (M3)
- [x] Top bar: app name, Settings, Log out.
- [ ] Top bar: "View public catalog" and "Copy link" — need the share link from B5, so built in M5.
- [x] List with skeleton loading and the empty state "No certificates yet" + "Add your first certificate".
- [x] Search box (debounced) and filters (tag, Public/Hidden) sent as `q`, `tag`, `public` query params.
- [x] Row/card: thumbnail placeholder (real thumbnail in M4), title, issuer, issue date ("Mar 2025"), expiration badge ("Expires Jun 2027" / "Expired"), Public/Hidden switch (optimistic update), edit, delete (confirm dialog).
- [x] Drag-and-drop reorder with `@dnd-kit/sortable` (keyboard support included), saved with `PUT /order`. Disabled while a search/filter is active, since reordering a partial list is confusing.
- [x] Toasts for success and errors.

## F5 — Add / edit form (M3 fields, M4 files)
- [x] Form with React Hook Form + Zod: title*, issuer*, issue date*, expiration date (not before issue date), credential ID, verification URL, tags, notes ("private — never shown publicly"), public toggle (off by default).
- [x] Tag picker: choose existing tags or type a new one (shadcn Command/Combobox).
- [x] Backend field errors shown under the matching field.
- [x] Unsaved changes: confirm before leaving (React Router `useBlocker` + `beforeunload`).
- [ ] **Files (M4):**
  - [ ] `FileDropzone`: drag-and-drop or click, several files, "PDF, PNG, JPG or WEBP · max 10 MB" shown up front, wrong type/size rejected before upload.
  - [ ] Upload with progress bar (XHR, see ROADMAP gap 4).
  - [ ] On "Add": queue files, create the certificate, then upload (ROADMAP gap 5).
  - [ ] File list with preview, "Main" marker (set main), delete with confirm.

## F6 — Settings (M5)
- [ ] Share link: full link + Copy; "Generate new link" with the warning "The old link will stop working — update your CV."
- [ ] Profile: display name.
- [ ] Password: current, new, confirm (min 12, must match).
- [ ] Tags: rename and delete.

## F7 — Public catalog (M5)
- [ ] `/c/:shareToken`: header with display name + "Certifications"; responsive grid (1 / 2 / 3–4 columns); card with lazy-loaded thumbnail (alt = title), title, issuer, date, tag badges; skeleton loading; empty state "No certificates to show yet."
- [ ] Detail as a modal over the catalog **and** as its own route `/c/:shareToken/:certificateId` (direct links work; closing goes back without reloading the grid).
- [ ] Detail content: image shown directly; PDF via `react-pdf` with previous/next page; credential ID with copy button; "Verify credential" (only when there's a URL, opens in new tab with `rel="noopener noreferrer"`); Download button.
- [ ] Not found page for bad token / unknown certificate.
- [ ] Never render expiration date or notes (the public types don't even have those fields).
- [ ] Check on a 360 px wide screen: no horizontal scroll.
- [ ] Lazy-load the admin routes (React Router `lazy`) so the public catalog doesn't download the admin code — the single bundle is already over 500 kB after F3.

## F8 — Testing and polish (M6)
- [ ] Component tests: form validation, dropzone type/size checks, `CertificateCard`.
- [ ] Playwright E2E against the real backend (docker compose + Spring Boot + Vite), the four flows in [FRONTEND.md §9](../specs/FRONTEND.md):
  1. Log in → add certificate with file → make public → appears in catalog.
  2. Hide it → disappears from catalog.
  3. Catalog shows no expiration date or notes.
  4. Regenerate link → old link shows "Not found".
- [ ] Accessibility pass: keyboard-only walkthrough, focus visible, contrast check (e.g. axe in Playwright).
- [ ] Production build served by Spring Boot (B6) and smoke-tested in the Docker image.

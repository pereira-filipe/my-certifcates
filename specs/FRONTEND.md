# My Certificates — Frontend Spec

> What the user sees and interacts with. Product goals and features are in [OVERVIEW.md](OVERVIEW.md); the API it talks to is in [BACKEND.md](BACKEND.md).

The frontend has two parts:
- **Public catalog**: what recruiters see through the shared link. It must look professional, load fast and work well on a phone.
- **Admin area**: where I log in and manage my certificates. It must be simple and practical.

## 1. Platform

- [x] **Web app** (browser, any device). It is a single-page app (SPA).
- [ ] Desktop app
- [ ] Mobile app
- [ ] CLI

## 2. Tech stack

Chosen to be beginner-friendly, very popular (lots of tutorials and help), and a good match for the Spring Boot API.

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript** | Like Java, it catches type mistakes before running |
| UI library | **React 19** | Most used frontend library; huge ecosystem |
| Build tool / dev server | **Vite** | Fast, zero-config setup (`npm create vite@latest`) |
| Routing | **React Router** | Maps URLs to pages |
| Styling | **Tailwind CSS** | Style with classes in the markup; no separate CSS files to manage |
| UI components | **shadcn/ui** | Ready-made, accessible buttons, dialogs, forms, toasts — copied into the project so they're fully editable |
| Icons | **lucide-react** | Clean icon set, works with shadcn/ui |
| Server data | **TanStack Query** | Fetching, caching, loading and error states for API calls |
| Forms + validation | **React Hook Form + Zod** | Form state plus rules like "title is required" |
| PDF preview | **react-pdf** | Shows PDFs inside the page |
| Tests | **Vitest + React Testing Library**, **Playwright** for end-to-end | |
| Code quality | ESLint + Prettier | |

## 3. Pages and routes

### Public (no login)

| Route | Page |
|---|---|
| `/c/:shareToken` | **Catalog**: the page recruiters open |
| `/c/:shareToken/:certificateId` | **Certificate detail** (also opens as a modal over the catalog) |
| anything else / bad token | **Not found** page |

**Catalog page**
- Header: my display name and a short line like "Certifications".
- Grid of certificate **cards** (1 column on phone, 2 on tablet, 3–4 on desktop). Each card shows:
  - Thumbnail (preview image of the main file)
  - Title
  - Issuer
  - Issue date (month + year, e.g. "Mar 2025")
  - Tags as small badges
- Order: as I arranged it in the admin area.
- Clicking a card opens the detail.

**Certificate detail**
- Large preview: images shown directly, PDFs shown with an inline viewer (page 1, with next/previous for multi-page).
- Fields: title, issuer, issue date, credential ID (with a copy button), tags.
- **"Verify credential"** button that opens `verification_url` in a new tab (only shown when there is one).
- "Download" button for the file.
- Close / back returns to the catalog without reloading it.
- Never shows: expiration date, notes, hidden certificates.

### Admin (login required)

| Route | Page |
|---|---|
| `/login` | **Login** |
| `/admin` | **My certificates** (list) |
| `/admin/certificates/new` | **Add certificate** |
| `/admin/certificates/:id` | **Edit certificate** |
| `/admin/settings` | **Settings** |

Any `/admin/*` route without a session redirects to `/login`, then back to the page I wanted after login.

**Login**
- Email, password, "Log in" button.
- Generic error on failure: "Invalid email or password". It never says which one is wrong.
- Shows a clear message when temporarily blocked after too many attempts.

**My certificates (list)**
- Top bar: app name, **"View public catalog"** (opens my link in a new tab), **"Copy link"**, Settings, Log out.
- **"+ Add certificate"** button.
- Search box (title / issuer) and filters: tag, Public / Hidden.
- List of rows or cards: thumbnail, title, issuer, issue date, **Public/Hidden toggle**, edit and delete actions.
- **Drag and drop to reorder**; the order is what visitors see.
- Expiration date shown here only, as an "Expires Jun 2027" / "Expired" badge for my own info.

**Add / Edit certificate form**
- Fields:
  - Title*
  - Issuer*
  - Issue date*
  - Expiration date
  - Credential ID
  - Verification URL
  - Tags (pick existing or type a new one)
  - Notes (marked "private — never shown publicly")
  - Public toggle (off by default)
- File upload area:
  - Drag-and-drop or click to choose. Several files are allowed, and one is marked "Main".
  - States the limits up front: "PDF, PNG, JPG or WEBP · max 10 MB".
  - Shows upload progress (the upload call uses `XMLHttpRequest`, since `fetch` can't report upload progress) and a preview after upload.
  - Any file can be set as "Main" later.
  - When adding a new certificate, chosen files wait in the browser; on Save the certificate is created first, then the files are uploaded. If an upload fails, the certificate stays saved and the page switches to Edit with the error shown.
  - Wrong type or too big → error shown before uploading.
- "Save" and "Cancel". Leaving with unsaved changes asks for confirmation.
- Field errors from the backend appear under the matching field.

**Settings**
- **Share link:** shows the full link with a "Copy" button, plus **"Generate new link"**. This asks for confirmation and warns: "The old link will stop working — update your CV."
- **Profile:** display name (shown on the catalog header).
- **Password:** current password, new password and confirm.
- **Tags:** rename / delete.

## 4. Behavior & UX

- **Loading:** skeleton placeholders (grey card shapes) instead of spinners on lists.
- **Empty states:**
  - Admin with no certificates: "No certificates yet" + "Add your first certificate" button.
  - Public catalog with nothing public: "No certificates to show yet."
- **Errors:**
  - Toast messages for failed actions (e.g. "Couldn't save. Try again.").
  - A friendly full-page error if the API is unreachable.
- **Success feedback:** short toasts ("Certificate saved", "Link copied").
- **Confirmations:** before deleting a certificate or file and before regenerating the share link. Toggling Public/Hidden doesn't need confirmation (it is easy to undo).
- **Session expired:** any 401 from the API sends me to `/login` with "Your session expired, please log in again."
- **Images:** thumbnails are lazy-loaded so the catalog opens fast.

## 5. Look & feel

- **Style:** clean and professional, like a portfolio. Lots of white space, rounded cards and subtle shadows. The certificates are the focus.
- **Colors:** neutral greys + one accent color (a calm blue by default). It's defined in one place (Tailwind theme) so it's easy to change.
- **Typography:** one modern sans-serif font (Inter), clear hierarchy (title > issuer > date).
- **Light and dark mode:** follows the visitor's system setting, with a manual toggle.
- **Favicon + page title:** e.g. "Filipe — Certifications".
- **Link preview:** when the link is pasted in LinkedIn/WhatsApp it shows a title and description (Open Graph tags). These are filled in by the backend, see [BACKEND.md §7](BACKEND.md).

## 6. Responsiveness, accessibility, language

- **Mobile-first:** recruiters often open links on their phone. Everything must work from 360 px wide up; there's no horizontal scrolling.
- **Accessibility:**
  - Full keyboard navigation and visible focus.
  - Alt text on thumbnails (the certificate title).
  - Enough color contrast.
  - Dialogs that trap focus (shadcn/ui does this).
- **Language:** **English** for the MVP, both the catalog and the admin area, since the catalog is aimed at recruiters (including international ones). All texts are kept in one file, so adding Portuguese later is easy (see [OVERVIEW.md §4](OVERVIEW.md)).
- **Dates:** formatted as "Mar 2025".
- **No search-engine indexing:** pages include `<meta name="robots" content="noindex, nofollow">` (the catalog is link-only, see [OVERVIEW.md §6](OVERVIEW.md)).

## 7. Talking to the backend

- All calls go to `/api/...` (see [BACKEND.md §3](BACKEND.md)), through one small API client that:
  - Sends cookies (`credentials: "include"`) and the CSRF token (from the `XSRF-TOKEN` cookie, in the `X-XSRF-TOKEN` header) on POST/PUT/PATCH/DELETE.
  - Turns the backend's error format into field errors and toasts.
  - Redirects to `/login` on 401 in the admin area.
- TypeScript types for API responses are written by hand to match the backend DTOs. They can be generated from the OpenAPI spec later.
- **Same origin:** the frontend and the API are served from the same domain, so the session cookie works without cross-site issues:
  - **Dev:** Vite runs on `localhost:5173` and proxies `/api` to Spring Boot on `localhost:8080`.
  - **Prod:** the built frontend (`npm run build` → static files) is served by Spring Boot from the same Docker image. One deploy, one domain. Unknown non-`/api` paths return `index.html` so React Router can handle them.

## 8. Project structure

```
frontend/
  src/
    api/            API client + types + TanStack Query hooks
    components/     shared UI (CertificateCard, FileDropzone, PdfViewer, …)
    components/ui/  shadcn/ui components
    pages/
      public/       CatalogPage, CertificateDetail, NotFound
      admin/        LoginPage, CertificateList, CertificateForm, SettingsPage
    i18n/           en.ts (all UI texts)
    lib/            utils (date formatting, etc.)
    App.tsx         routes
  index.html
  vite.config.ts    (dev proxy for /api)
  src/index.css     (Tailwind v4 theme: colors, font — no tailwind.config.ts)
```

## 9. Testing

- Component tests for the form validation, file upload checks and the card.
- **End-to-end tests (Playwright)** for the key flows:
  1. Log in → add a certificate with a file → make it public → it appears in the public catalog.
  2. Hide a certificate → it disappears from the public catalog.
  3. Public catalog shows no expiration date or notes.
  4. Regenerate link → old link shows "Not found".

## 10. Out of scope (frontend)

- Native mobile or desktop apps.
- Public search and filters in the catalog (nice-to-have, see [OVERVIEW.md §4](OVERVIEW.md)).
- Profile header with photo/bio/social links (nice-to-have).
- Portuguese translation (later; texts are ready for it).
- Analytics, visit counter.
- Offline support / PWA.

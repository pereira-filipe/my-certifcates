# My Certificates — Overview

> Shared spec: what the product is and who it's for. Details live in [FRONTEND.md](FRONTEND.md) and [BACKEND.md](BACKEND.md).

## 1. Problem / Goal

My certificates are scattered across emails, PDFs and course platforms, and there's no single place I can point a recruiter to.

**Goal:** a website where I store all my certificates in one place and publish them as a clean, public catalog. I put one link in my CV / LinkedIn, and recruiters open it to browse my certificates — no login needed on their side.

**Success looks like:**
- Every certificate I have is in the app, with its file and key details.
- I have one stable, shareable link that I can put in my CV.
- A recruiter opening that link understands my certifications in under a minute, on desktop or phone.

## 2. Users

| User | Who | What they do |
|------|-----|--------------|
| **Owner (admin)** | Me — the only account for now | Logs in, adds/edits/removes certificates, controls what's public |
| **Visitor** | Recruiters, hiring managers, anyone with the link | Views the public catalog; no account, read-only |

- Single owner in the first version; multi-user (other people creating their own catalogs) is **not** planned now.
- Web first: it must work in any modern browser, desktop and mobile.

## 3. Core features (MVP)

### Owner (logged in)
1. **Log in** to a private admin area.
2. **Add a certificate**: upload the file (PDF/image) and fill in its details (title, issuer, date, credential link — see [BACKEND.md §2](BACKEND.md)).
3. **Edit and delete** certificates.
4. **Choose what's public**: mark each certificate as visible or hidden in the catalog.

### Visitor (public link)
5. **Open the shared link** and see my certificates as a catalog (cards with title, issuer, date, thumbnail).
6. **Open a certificate** to see its details, view the file, and follow the verification link when there is one.

### User stories
- *As the owner*, I want to upload a certificate with its details, so that it appears in my catalog.
- *As the owner*, I want one fixed link to my catalog, so that I can put it in my CV once and never update it.
- *As a recruiter*, I want to quickly scan the certificates and verify one, so that I can trust the candidate's claims.

## 4. Nice-to-haves (later, not required now)

- Search and filters in the public catalog (by issuer, tag/category, year).
- Ordering / pinning favourite certificates to the top.
- Profile header on the catalog (name, photo, short bio, LinkedIn/GitHub links).
- Option to make the catalog searchable on Google.
- Custom slug for the link (e.g. `/filipe`) or a custom domain.
- OCR to auto-fill fields from the uploaded certificate.
- Email reminder before a certificate expires (owner only).
- Visit counter (how many times the catalog was opened).
- Download all public certificates as one PDF.
- Portuguese + English interface.

## 5. Out of scope (for now)

- Accounts for other people / multi-tenant SaaS.
- Visitors logging in, commenting or contacting me through the app.
- Native mobile or desktop apps.
- Issuing or verifying certificates myself (I only link to the issuer's verification page).
- Payments or subscriptions.

## 6. Decisions

- **Catalog visibility:** for now the catalog is reachable only by people who have the link. It is not listed by search engines (no indexing). Making it public on Google can come later.
- **Hidden certificates are fully private:** a hidden certificate and its files are never visible through the public link. Certificate files are stored in the project folder for now and will move to an S3 bucket later (see [BACKEND.md §4](BACKEND.md)).
- **No expiration info for visitors:** the public catalog does not show expiration dates or "expired" badges.

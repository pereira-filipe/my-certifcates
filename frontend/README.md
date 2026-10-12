# Frontend

React + TypeScript app (Vite, Tailwind CSS, shadcn/ui). Spec: [specs/FRONTEND.md](../specs/FRONTEND.md). Plan: [plans/FRONTEND-PLAN.md](../plans/FRONTEND-PLAN.md).

```bash
npm install
npm run dev          # http://localhost:5173 — /api is proxied to Spring Boot on :8080
npm test             # Vitest (watch mode; CI runs `npm test -- --run`)
npm run lint         # ESLint
npm run format       # Prettier
npm run build        # type-check + production build into dist/
npm run e2e          # Playwright end-to-end + accessibility tests (see below)
```

Add shadcn/ui components with `npx shadcn@latest add <component>`; they land in `src/components/ui/`.

## End-to-end tests

`e2e/` drives a running app with Playwright: the key flows, the catalog on a phone, and axe accessibility checks in light and dark mode. Start the production image first (`docker compose --profile app up -d --build` in the repo root), then:

```bash
npx playwright install chromium   # once
E2E_OWNER_EMAIL=… E2E_OWNER_PASSWORD=… npm run e2e
```

- `E2E_BASE_URL` defaults to `http://localhost:8080`.
- Test data is named `E2E…` and deleted afterwards.
- The "new link" test changes the owner's share link, so it only runs with `E2E_ALLOW_REGENERATE=true` (CI sets it, on a throwaway database).

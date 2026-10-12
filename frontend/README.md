# Frontend

React + TypeScript app (Vite, Tailwind CSS, shadcn/ui). Spec: [specs/FRONTEND.md](../specs/FRONTEND.md). Plan: [plans/FRONTEND-PLAN.md](../plans/FRONTEND-PLAN.md).

```bash
npm install
npm run dev          # http://localhost:5173 — /api is proxied to Spring Boot on :8080
npm test             # Vitest (watch mode; CI runs `npm test -- --run`)
npm run lint         # ESLint
npm run format       # Prettier
npm run build        # type-check + production build into dist/
```

Add shadcn/ui components with `npx shadcn@latest add <component>`; they land in `src/components/ui/`.

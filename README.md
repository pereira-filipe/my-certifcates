# My Certificates

A website to store all my certificates in one place and share them as a clean public catalog: one link in my CV, and recruiters browse my certificates without logging in.

- **What to build:** [specs/](specs/) — start with [OVERVIEW.md](specs/OVERVIEW.md). Changes are logged in [specs/CHANGELOG.md](specs/CHANGELOG.md).
- **How to build it:** [plans/](plans/) — milestones in [ROADMAP.md](plans/ROADMAP.md).
- **How to deploy it:** [DEPLOY.md](DEPLOY.md) — Fly.io + Neon.

## Stack

- **Backend:** Java 21, Spring Boot 4, PostgreSQL 16, Flyway, Maven
- **Frontend:** React + TypeScript, Vite, Tailwind CSS, shadcn/ui

## Repository layout

```
specs/               what to build
plans/               how to build it, with progress checkboxes
backend/             Spring Boot app
frontend/            React app
docker-compose.yml   PostgreSQL for development
.env.example         environment variables (copy to .env)
```

## Running locally

Prerequisites: **Java 21**, **Node.js 22**, **Docker** (with Compose).

```bash
cp .env.example .env              # then edit the values
docker compose up -d              # start PostgreSQL
```

**Frontend** (needs Node.js 22):

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

**Backend** (needs Java 21; Docker for the database):

```bash
cd backend
./mvnw spring-boot:run            # http://localhost:8080
```

More commands in [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md).

**Production image, locally** (what gets deployed: one Docker image with frontend and backend):

```bash
docker compose --profile app up -d --build   # http://localhost:8080
```

**End-to-end tests** (Playwright, against that image; CI runs them on every push):

```bash
cd frontend
E2E_OWNER_EMAIL=you@example.com E2E_OWNER_PASSWORD=… npm run e2e
```

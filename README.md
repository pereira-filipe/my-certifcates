# My Certificates

A website to store all my certificates in one place and share them as a clean public catalog: one link in my CV, and recruiters browse my certificates without logging in.

- **What to build:** [specs/](specs/) — start with [OVERVIEW.md](specs/OVERVIEW.md). Changes are logged in [specs/CHANGELOG.md](specs/CHANGELOG.md).
- **How to build it:** [plans/](plans/) — milestones in [ROADMAP.md](plans/ROADMAP.md).

## Stack

- **Backend:** Java 21, Spring Boot 3, PostgreSQL 16, Flyway, Maven
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

Backend and frontend run commands will be added here as those projects are created (milestone M1).

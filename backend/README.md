# Backend

Spring Boot 4 + Java 21 + PostgreSQL. Spec: [specs/BACKEND.md](../specs/BACKEND.md). Plan: [plans/BACKEND-PLAN.md](../plans/BACKEND-PLAN.md).

```bash
docker compose up -d        # from the repo root: PostgreSQL for dev
./mvnw spring-boot:run      # http://localhost:8080 (profile "dev" by default)
./mvnw verify               # build + all tests
```

- Settings come from environment variables, or from a `.env` file in the repo root (copy `.env.example`).
- Swagger UI (dev only): http://localhost:8080/swagger-ui
- Integration tests (`IntegrationTest` subclasses) start a real PostgreSQL with Testcontainers. They're **skipped when Docker isn't available**, and always run in CI.

## Owner account

On first startup the app creates the owner from `APP_OWNER_EMAIL` / `APP_OWNER_PASSWORD` (password: at least 12 characters). After that those values are ignored. To start over in **dev**, delete the user and restart:

```bash
docker compose exec postgres psql -U mycertificates -d mycertificates -c "DELETE FROM users"
```

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

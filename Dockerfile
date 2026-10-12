# syntax=docker/dockerfile:1
# One image for the whole app: the React build is served by Spring Boot (specs/BACKEND.md §7).

# 1. Frontend → static files
FROM node:22-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. Backend → jar, with the frontend inside as static resources
FROM eclipse-temurin:21-jdk AS backend
WORKDIR /build/backend
COPY backend/.mvn .mvn
COPY backend/mvnw backend/pom.xml ./
RUN ./mvnw -B -q dependency:go-offline
COPY backend/src src
COPY --from=frontend /build/frontend/dist src/main/resources/static
# Tests run in CI, not here.
RUN ./mvnw -B -q package -DskipTests && cp target/my-certificates-*.jar /build/app.jar

# 3. Runtime: Java only. Starts as root just to fix the uploads folder owner, then runs Java as "app".
FROM eclipse-temurin:21-jre
RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --no-create-home app \
    && mkdir -p /data/uploads && chown app:app /data/uploads
WORKDIR /app
COPY --from=backend /build/app.jar app.jar
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
ENV SPRING_PROFILES_ACTIVE=prod \
    APP_STORAGE_LOCAL_DIR=/data/uploads \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
# Uploaded files live in /data/uploads: mount a persistent volume there (specs/BACKEND.md §7).
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

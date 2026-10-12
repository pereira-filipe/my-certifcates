// Hand-written to match the backend DTOs (specs/BACKEND.md §3). Can be generated from OpenAPI later.

/** The backend's single error format. */
export type ApiErrorBody = {
  status: number
  error: string
  message: string
  fields?: Record<string, string>
}

/** Temporary M1 check: GET /api/public/ping. */
export type PingResponse = {
  status: string
}

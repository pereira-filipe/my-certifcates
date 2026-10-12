// Hand-written to match the backend DTOs (specs/BACKEND.md §3). Can be generated from OpenAPI later.

/** The backend's single error format. */
export type ApiErrorBody = {
  status: number
  error: string
  message: string
  fields?: Record<string, string>
}

/** GET /api/auth/me and POST /api/auth/login. */
export type Me = {
  email: string
  displayName: string
}

export type LoginRequest = {
  email: string
  password: string
}

/** A certificate as the owner sees it (GET /api/admin/certificates). Dates are "YYYY-MM-DD". */
export type Certificate = {
  id: string
  title: string
  issuer: string
  issueDate: string
  expirationDate?: string | null
  credentialId?: string | null
  verificationUrl?: string | null
  notes?: string | null
  isPublic: boolean
  displayOrder: number
  tags: string[]
  /** Main file first. */
  files: CertificateFile[]
  createdAt: string
  updatedAt: string
}

/** A file attached to a certificate. Served at /api/admin/files/{id}. */
export type CertificateFile = {
  id: string
  originalName: string
  contentType: string
  sizeBytes: number
  isPrimary: boolean
  hasThumbnail: boolean
  createdAt: string
}

/** Body of POST / PUT /api/admin/certificates. Tags are names; new names are created. */
export type CertificateInput = {
  title: string
  issuer: string
  issueDate: string
  expirationDate: string | null
  credentialId: string | null
  verificationUrl: string | null
  notes: string | null
  isPublic: boolean
  tags: string[]
}

/** Optional filters for the admin list. */
export type CertificateFilters = {
  q?: string
  tag?: string
  isPublic?: boolean
}

/** GET /api/admin/tags */
export type TagUsage = {
  id: string
  name: string
  certificateCount: number
}

/** GET /api/admin/catalog: the owner's share link. */
export type CatalogLink = {
  shareToken: string
  url: string
}

/** What visitors see (GET /api/public/catalogs/{token}). No notes or expiration date, on purpose. */
export type PublicCatalog = {
  displayName: string
  certificates: PublicCertificate[]
}

export type PublicCertificate = {
  id: string
  title: string
  issuer: string
  issueDate: string
  credentialId?: string | null
  verificationUrl?: string | null
  tags: string[]
  /** Main file first. */
  files: PublicFile[]
}

export type PublicFile = {
  id: string
  originalName: string
  contentType: string
  sizeBytes: number
  isPrimary: boolean
  hasThumbnail: boolean
}

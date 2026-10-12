-- Files attached to a certificate (specs/BACKEND.md §2). The bytes live in storage (local folder now, S3 later);
-- this table only keeps the storage keys.
CREATE TABLE certificate_files (
    id             UUID PRIMARY KEY,
    certificate_id UUID         NOT NULL REFERENCES certificates (id) ON DELETE CASCADE,
    storage_key    VARCHAR(200) NOT NULL,
    thumbnail_key  VARCHAR(200),
    original_name  VARCHAR(255) NOT NULL,
    content_type   VARCHAR(50)  NOT NULL,
    size_bytes     BIGINT       NOT NULL,
    is_primary     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL,
    updated_at     TIMESTAMPTZ  NOT NULL
);

CREATE INDEX ix_certificate_files_certificate ON certificate_files (certificate_id);

-- At most one main file per certificate.
CREATE UNIQUE INDEX uk_certificate_files_primary ON certificate_files (certificate_id) WHERE is_primary;

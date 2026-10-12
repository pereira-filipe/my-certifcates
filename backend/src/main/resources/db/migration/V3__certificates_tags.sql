-- Certificates and tags (specs/BACKEND.md §2).
CREATE TABLE certificates (
    id               UUID PRIMARY KEY,
    owner_id         UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    issuer           VARCHAR(200) NOT NULL,
    issue_date       DATE         NOT NULL,
    expiration_date  DATE,
    credential_id    VARCHAR(200),
    verification_url VARCHAR(500),
    notes            TEXT,
    is_public        BOOLEAN      NOT NULL DEFAULT FALSE,
    display_order    INTEGER      NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL
);

CREATE INDEX ix_certificates_owner_order ON certificates (owner_id, display_order);

CREATE TABLE tags (
    id         UUID PRIMARY KEY,
    owner_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name       VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- "Cloud" and "cloud" are the same tag.
CREATE UNIQUE INDEX uk_tags_owner_name ON tags (owner_id, LOWER(name));

CREATE TABLE certificate_tags (
    certificate_id UUID NOT NULL REFERENCES certificates (id) ON DELETE CASCADE,
    tag_id         UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (certificate_id, tag_id)
);

CREATE INDEX ix_certificate_tags_tag ON certificate_tags (tag_id);

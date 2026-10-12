package dev.filipe.mycertificates.file;

import java.time.Instant;
import java.util.UUID;

/** A file as the owner sees it. URLs are built by the client from the id (/api/admin/files/{id}). */
public record CertificateFileResponse(
        UUID id,
        String originalName,
        String contentType,
        long sizeBytes,
        boolean isPrimary,
        boolean hasThumbnail,
        Instant createdAt) {

    public static CertificateFileResponse of(CertificateFile file) {
        return new CertificateFileResponse(file.getId(), file.getOriginalName(), file.getContentType(),
                file.getSizeBytes(), file.isPrimary(), file.getThumbnailKey() != null, file.getCreatedAt());
    }
}

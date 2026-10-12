package dev.filipe.mycertificates.certificate;

import dev.filipe.mycertificates.file.CertificateFile;
import dev.filipe.mycertificates.file.CertificateFileResponse;
import dev.filipe.mycertificates.tag.Tag;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** A certificate as the owner sees it, including private fields (notes, expiration date). */
public record CertificateResponse(
        UUID id,
        String title,
        String issuer,
        LocalDate issueDate,
        LocalDate expirationDate,
        String credentialId,
        String verificationUrl,
        String notes,
        boolean isPublic,
        int displayOrder,
        List<String> tags,
        /** Main file first, then oldest first. */
        List<CertificateFileResponse> files,
        Instant createdAt,
        Instant updatedAt) {

    static CertificateResponse of(Certificate c) {
        List<String> tagNames = c.getTags().stream()
                .map(Tag::getName)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        List<CertificateFileResponse> files = c.getFiles().stream()
                .sorted(Comparator.comparing((CertificateFile f) -> !f.isPrimary()))
                .map(CertificateFileResponse::of)
                .toList();
        return new CertificateResponse(c.getId(), c.getTitle(), c.getIssuer(), c.getIssueDate(),
                c.getExpirationDate(), c.getCredentialId(), c.getVerificationUrl(), c.getNotes(), c.isPublic(),
                c.getDisplayOrder(), tagNames, files, c.getCreatedAt(), c.getUpdatedAt());
    }
}

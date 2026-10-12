package dev.filipe.mycertificates.certificate;

import dev.filipe.mycertificates.tag.Tag;
import java.time.Instant;
import java.time.LocalDate;
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
        Instant createdAt,
        Instant updatedAt) {

    static CertificateResponse of(Certificate c) {
        List<String> tagNames = c.getTags().stream()
                .map(Tag::getName)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        return new CertificateResponse(c.getId(), c.getTitle(), c.getIssuer(), c.getIssueDate(),
                c.getExpirationDate(), c.getCredentialId(), c.getVerificationUrl(), c.getNotes(), c.isPublic(),
                c.getDisplayOrder(), tagNames, c.getCreatedAt(), c.getUpdatedAt());
    }
}

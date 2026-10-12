package dev.filipe.mycertificates.catalog;

import dev.filipe.mycertificates.certificate.Certificate;
import dev.filipe.mycertificates.file.CertificateFile;
import dev.filipe.mycertificates.tag.Tag;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * A certificate as visitors see it. On purpose this type has no notes, expiration date, owner or
 * visibility fields, so they can't be sent by mistake (specs/BACKEND.md §3).
 */
public record PublicCertificate(
        UUID id,
        String title,
        String issuer,
        LocalDate issueDate,
        String credentialId,
        String verificationUrl,
        List<String> tags,
        /** Main file first. */
        List<PublicFile> files) {

    public record PublicFile(UUID id, String originalName, String contentType, long sizeBytes, boolean isPrimary,
            boolean hasThumbnail) {

        static PublicFile of(CertificateFile f) {
            return new PublicFile(f.getId(), f.getOriginalName(), f.getContentType(), f.getSizeBytes(), f.isPrimary(),
                    f.getThumbnailKey() != null);
        }
    }

    static PublicCertificate of(Certificate c) {
        return new PublicCertificate(
                c.getId(),
                c.getTitle(),
                c.getIssuer(),
                c.getIssueDate(),
                c.getCredentialId(),
                c.getVerificationUrl(),
                c.getTags().stream().map(Tag::getName).sorted(String.CASE_INSENSITIVE_ORDER).toList(),
                c.getFiles().stream()
                        .sorted(Comparator.comparing((CertificateFile f) -> !f.isPrimary()))
                        .map(PublicFile::of)
                        .toList());
    }
}

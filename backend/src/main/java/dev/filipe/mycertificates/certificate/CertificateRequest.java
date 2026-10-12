package dev.filipe.mycertificates.certificate;

import dev.filipe.mycertificates.tag.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

/** Body of POST and PUT /api/admin/certificates. Tags are names; unknown names are created. */
public record CertificateRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 200) String issuer,
        @NotNull LocalDate issueDate,
        LocalDate expirationDate,
        @Size(max = 200) String credentialId,
        // Only http(s): the public page turns this into a link, so "javascript:" URLs must never get in.
        @Size(max = 500)
        @Pattern(regexp = "^https?://\\S+$", flags = Pattern.Flag.CASE_INSENSITIVE,
                message = "must be a link starting with http:// or https://")
        String verificationUrl,
        @Size(max = 10_000) String notes,
        Boolean isPublic, // optional: missing means hidden (Jackson 3 rejects a missing primitive boolean)
        @Size(max = 20) List<@NotBlank @Size(max = Tag.MAX_NAME_LENGTH) String> tags) {
}

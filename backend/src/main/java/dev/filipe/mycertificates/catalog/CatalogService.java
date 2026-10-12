package dev.filipe.mycertificates.catalog;

import dev.filipe.mycertificates.auth.CurrentOwner;
import dev.filipe.mycertificates.auth.ShareTokens;
import dev.filipe.mycertificates.auth.User;
import dev.filipe.mycertificates.auth.UserRepository;
import dev.filipe.mycertificates.certificate.Certificate;
import dev.filipe.mycertificates.certificate.CertificateRepository;
import dev.filipe.mycertificates.common.AppProperties;
import dev.filipe.mycertificates.common.NotFoundException;
import dev.filipe.mycertificates.file.CertificateFile;
import dev.filipe.mycertificates.file.FileService;
import dev.filipe.mycertificates.file.StoredFile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The public catalog behind the share link, and the owner's view of that link.
 * Every public lookup goes through {@link #publicCertificate}: the token must match the owner AND the certificate
 * must be public. Anything else is a 404, never a 403, so nothing reveals that a hidden certificate exists.
 */
@Service
@Transactional
public class CatalogService {

    public record CatalogLink(String shareToken, String url) {
    }

    /** Title, description and image for link previews (Open Graph tags). */
    public record LinkPreview(String title, String description, String url, String imageUrl) {

        public static final LinkPreview GENERIC =
                new LinkPreview("Certifications", "A catalog of professional certifications.", null, null);
    }

    private final UserRepository users;
    private final CertificateRepository certificates;
    private final FileService fileService;
    private final CurrentOwner currentOwner;
    private final AppProperties properties;

    public CatalogService(UserRepository users, CertificateRepository certificates, FileService fileService,
            CurrentOwner currentOwner, AppProperties properties) {
        this.users = users;
        this.certificates = certificates;
        this.fileService = fileService;
        this.currentOwner = currentOwner;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public PublicCatalog catalog(String shareToken) {
        User owner = ownerOf(shareToken);
        return new PublicCatalog(owner.getDisplayName(),
                certificates.findByOwnerAndIsPublicTrueOrderByDisplayOrderAscCreatedAtDesc(owner).stream()
                        .map(PublicCertificate::of)
                        .toList());
    }

    @Transactional(readOnly = true)
    public PublicCertificate certificate(String shareToken, UUID certificateId) {
        return PublicCertificate.of(publicCertificate(shareToken, certificateId));
    }

    @Transactional(readOnly = true)
    public StoredFile file(String shareToken, UUID fileId, boolean thumbnail) {
        CertificateFile file = publicFile(shareToken, fileId);
        return thumbnail ? fileService.thumbnailOf(file) : fileService.contentOf(file);
    }

    /** For the catalog page's link preview. Empty for an unknown token. */
    @Transactional(readOnly = true)
    public Optional<LinkPreview> preview(String shareToken) {
        return users.findByShareToken(shareToken).map(owner -> {
            var visible = certificates.findByOwnerAndIsPublicTrueOrderByDisplayOrderAscCreatedAtDesc(owner);
            String base = baseUrl();
            String url = base + "/c/" + shareToken;
            // The first public certificate with a thumbnail illustrates the link.
            String image = visible.stream()
                    .flatMap(c -> PublicCertificate.of(c).files().stream().limit(1))
                    .filter(PublicCertificate.PublicFile::hasThumbnail)
                    .findFirst()
                    .map(f -> base + "/api/public/catalogs/" + shareToken + "/files/" + f.id() + "/thumbnail")
                    .orElse(null);
            String description = visible.size() == 1
                    ? "1 professional certification of " + owner.getDisplayName() + "."
                    : visible.size() + " professional certifications of " + owner.getDisplayName() + ".";
            return new LinkPreview(owner.getDisplayName() + " — Certifications", description, url, image);
        });
    }

    @Transactional(readOnly = true)
    public CatalogLink link() {
        return linkFor(currentOwner.get());
    }

    /** The old link stops working right away. */
    public CatalogLink regenerateLink() {
        User owner = currentOwner.get();
        owner.setShareToken(ShareTokens.generate());
        return linkFor(users.save(owner));
    }

    private CatalogLink linkFor(User owner) {
        return new CatalogLink(owner.getShareToken(), baseUrl() + "/c/" + owner.getShareToken());
    }

    private String baseUrl() {
        return properties.baseUrl().replaceAll("/+$", "");
    }

    private User ownerOf(String shareToken) {
        return users.findByShareToken(shareToken).orElseThrow(PublicNotFound::new);
    }

    private Certificate publicCertificate(String shareToken, UUID certificateId) {
        return certificates.findByIdAndOwnerAndIsPublicTrue(certificateId, ownerOf(shareToken))
                .orElseThrow(PublicNotFound::new);
    }

    private CertificateFile publicFile(String shareToken, UUID fileId) {
        User owner = ownerOf(shareToken);
        return fileService.findById(fileId)
                .filter(f -> f.getCertificate().isPublic())
                .filter(f -> f.getCertificate().getOwner().getId().equals(owner.getId()))
                .orElseThrow(PublicNotFound::new);
    }

    /** Same answer for a wrong token, a hidden certificate or an unknown id. */
    static class PublicNotFound extends NotFoundException {

        PublicNotFound() {
            super("Not found");
        }
    }
}

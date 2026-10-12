package dev.filipe.mycertificates.catalog;

import java.util.List;

/** GET /api/public/catalogs/{shareToken}: the owner's name and their public certificates, in order. */
public record PublicCatalog(String displayName, List<PublicCertificate> certificates) {
}

package dev.filipe.mycertificates.certificate;

import dev.filipe.mycertificates.auth.User;
import dev.filipe.mycertificates.tag.Tag;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

/** Filters for the admin list: search text, tag and public/hidden. */
final class CertificateSpecifications {

    private CertificateSpecifications() {
    }

    static Specification<Certificate> ownedBy(User owner) {
        return (root, query, cb) -> cb.equal(root.get("owner"), owner);
    }

    /** Title or issuer contains the text, ignoring case. */
    static Specification<Certificate> matches(String text) {
        String pattern = "%" + text.toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("title")), pattern, '\\'),
                cb.like(cb.lower(root.get("issuer")), pattern, '\\'));
    }

    static Specification<Certificate> hasTag(String tagName) {
        return (root, query, cb) -> {
            Subquery<Integer> subquery = query.subquery(Integer.class);
            var certificate = subquery.correlate(root);
            Join<Certificate, Tag> tag = certificate.join("tags");
            subquery.select(cb.literal(1)).where(cb.equal(cb.lower(tag.get("name")), tagName.trim().toLowerCase()));
            return cb.exists(subquery);
        };
    }

    static Specification<Certificate> isPublic(boolean isPublic) {
        return (root, query, cb) -> cb.equal(root.get("isPublic"), isPublic);
    }
}

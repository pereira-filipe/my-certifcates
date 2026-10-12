package dev.filipe.mycertificates.certificate;

import dev.filipe.mycertificates.auth.CurrentOwner;
import dev.filipe.mycertificates.auth.User;
import dev.filipe.mycertificates.common.FieldValidationException;
import dev.filipe.mycertificates.common.NotFoundException;
import dev.filipe.mycertificates.file.FileService;
import dev.filipe.mycertificates.tag.TagService;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Certificate management. Returns DTOs, built inside the transaction (open-in-view is off). */
@Service
@Transactional
public class CertificateService {

    private final CertificateRepository certificates;
    private final TagService tagService;
    private final CurrentOwner currentOwner;
    private final FileService fileService;

    public CertificateService(CertificateRepository certificates, TagService tagService, CurrentOwner currentOwner,
            FileService fileService) {
        this.certificates = certificates;
        this.tagService = tagService;
        this.currentOwner = currentOwner;
        this.fileService = fileService;
    }

    /** All of the owner's certificates (public and hidden), in display order. Every filter is optional. */
    @Transactional(readOnly = true)
    public List<CertificateResponse> list(String query, String tag, Boolean isPublic) {
        Specification<Certificate> spec = CertificateSpecifications.ownedBy(currentOwner.get());
        if (StringUtils.hasText(query)) {
            spec = spec.and(CertificateSpecifications.matches(query.trim()));
        }
        if (StringUtils.hasText(tag)) {
            spec = spec.and(CertificateSpecifications.hasTag(tag));
        }
        if (isPublic != null) {
            spec = spec.and(CertificateSpecifications.isPublic(isPublic));
        }
        return certificates.findAll(spec, Sort.by("displayOrder").and(Sort.by("createdAt").descending()))
                .stream().map(CertificateResponse::of).toList();
    }

    @Transactional(readOnly = true)
    public CertificateResponse get(UUID id) {
        return CertificateResponse.of(find(currentOwner.get(), id));
    }

    /** New certificates go to the top of the order (specs/BACKEND.md §2). */
    public CertificateResponse create(CertificateRequest request) {
        User owner = currentOwner.get();
        int displayOrder = certificates.findMinDisplayOrder(owner).map(min -> min - 1).orElse(0);
        Certificate certificate = new Certificate(owner, displayOrder);
        apply(owner, certificate, request);
        return CertificateResponse.of(certificates.save(certificate));
    }

    public CertificateResponse update(UUID id, CertificateRequest request) {
        User owner = currentOwner.get();
        Certificate certificate = find(owner, id);
        apply(owner, certificate, request);
        return CertificateResponse.of(certificate);
    }

    public void delete(UUID id) {
        Certificate certificate = find(currentOwner.get(), id);
        fileService.deleteStoredFilesAfterCommit(certificate);
        certificates.delete(certificate);
    }

    public CertificateResponse setVisibility(UUID id, boolean isPublic) {
        Certificate certificate = find(currentOwner.get(), id);
        certificate.setPublic(isPublic);
        return CertificateResponse.of(certificate);
    }

    /** Sets the order to the given list, which must contain each of the owner's certificates exactly once. */
    public void reorder(List<UUID> ids) {
        List<Certificate> all = certificates.findByOwner(currentOwner.get());
        if (ids.size() != all.size() || new HashSet<>(ids).size() != ids.size()) {
            throw new FieldValidationException("ids", "must list each of your certificates exactly once");
        }
        Map<UUID, Certificate> byId = all.stream().collect(Collectors.toMap(Certificate::getId, Function.identity()));
        if (!byId.keySet().containsAll(ids)) {
            throw new FieldValidationException("ids", "must list each of your certificates exactly once");
        }
        for (int i = 0; i < ids.size(); i++) {
            byId.get(ids.get(i)).setDisplayOrder(i);
        }
    }

    private Certificate find(User owner, UUID id) {
        return certificates.findByIdAndOwner(id, owner).orElseThrow(() -> new NotFoundException("Certificate not found"));
    }

    private void apply(User owner, Certificate certificate, CertificateRequest request) {
        if (request.expirationDate() != null && request.expirationDate().isBefore(request.issueDate())) {
            throw new FieldValidationException("expirationDate", "must not be before the issue date");
        }
        certificate.update(
                request.title().trim(),
                request.issuer().trim(),
                request.issueDate(),
                request.expirationDate(),
                blankToNull(request.credentialId()),
                blankToNull(request.verificationUrl()),
                blankToNull(request.notes()),
                Boolean.TRUE.equals(request.isPublic()),
                tagService.resolve(owner, request.tags() == null ? List.of() : request.tags()));
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}

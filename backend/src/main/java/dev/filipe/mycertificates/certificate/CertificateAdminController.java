package dev.filipe.mycertificates.certificate;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The owner's certificate management (specs/BACKEND.md §3, "Owner area"). */
@RestController
@RequestMapping("/api/admin/certificates")
public class CertificateAdminController {

    public record VisibilityRequest(@NotNull Boolean isPublic) {
    }

    private final CertificateService certificateService;

    public CertificateAdminController(CertificateService certificateService) {
        this.certificateService = certificateService;
    }

    @GetMapping
    List<CertificateResponse> list(@RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(name = "public", required = false) Boolean isPublic) {
        return certificateService.list(q, tag, isPublic);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    CertificateResponse create(@Valid @RequestBody CertificateRequest body) {
        return certificateService.create(body);
    }

    @GetMapping("/{id}")
    CertificateResponse get(@PathVariable UUID id) {
        return certificateService.get(id);
    }

    @PutMapping("/{id}")
    CertificateResponse update(@PathVariable UUID id, @Valid @RequestBody CertificateRequest body) {
        return certificateService.update(id, body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        certificateService.delete(id);
    }

    @PatchMapping("/{id}/visibility")
    CertificateResponse setVisibility(@PathVariable UUID id, @Valid @RequestBody VisibilityRequest body) {
        return certificateService.setVisibility(id, body.isPublic());
    }

    @PutMapping("/order")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void reorder(@RequestBody @NotNull List<UUID> ids) {
        certificateService.reorder(ids);
    }
}

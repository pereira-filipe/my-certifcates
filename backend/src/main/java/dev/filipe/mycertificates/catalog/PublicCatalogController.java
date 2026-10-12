package dev.filipe.mycertificates.catalog;

import dev.filipe.mycertificates.file.FileResponses;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** What recruiters reach through the share link. No login (specs/BACKEND.md §3, "Public catalog"). */
@RestController
@RequestMapping("/api/public/catalogs/{shareToken}")
public class PublicCatalogController {

    private final CatalogService catalogService;

    public PublicCatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    PublicCatalog catalog(@PathVariable String shareToken) {
        return catalogService.catalog(shareToken);
    }

    @GetMapping("/certificates/{certificateId}")
    PublicCertificate certificate(@PathVariable String shareToken, @PathVariable UUID certificateId) {
        return catalogService.certificate(shareToken, certificateId);
    }

    @GetMapping("/files/{fileId}")
    ResponseEntity<Resource> file(@PathVariable String shareToken, @PathVariable UUID fileId,
            @RequestParam(defaultValue = "false") boolean download) {
        return FileResponses.of(catalogService.file(shareToken, fileId, false), download);
    }

    @GetMapping("/files/{fileId}/thumbnail")
    ResponseEntity<Resource> thumbnail(@PathVariable String shareToken, @PathVariable UUID fileId) {
        return FileResponses.of(catalogService.file(shareToken, fileId, true), false);
    }
}

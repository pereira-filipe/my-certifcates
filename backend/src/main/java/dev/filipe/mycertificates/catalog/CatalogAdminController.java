package dev.filipe.mycertificates.catalog;

import dev.filipe.mycertificates.catalog.CatalogService.CatalogLink;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The owner's share link (specs/BACKEND.md §3). */
@RestController
@RequestMapping("/api/admin/catalog")
public class CatalogAdminController {

    private final CatalogService catalogService;

    public CatalogAdminController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    CatalogLink link() {
        return catalogService.link();
    }

    @PostMapping("/regenerate-link")
    CatalogLink regenerateLink() {
        return catalogService.regenerateLink();
    }
}

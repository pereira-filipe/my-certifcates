package dev.filipe.mycertificates.web;

import dev.filipe.mycertificates.catalog.CatalogService;
import dev.filipe.mycertificates.catalog.CatalogService.LinkPreview;
import java.nio.charset.StandardCharsets;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.util.HtmlUtils;

/**
 * Serves the React app for its routes, so frontend and API share one domain (specs/BACKEND.md §7).
 * For catalog links the page gets the owner's name in its title and Open Graph tags, because LinkedIn and
 * WhatsApp read those without running JavaScript.
 */
@Controller
public class SpaController {

    private static final String DEFAULT_TITLE = "<title>My Certificates</title>";

    public static final MediaType HTML_UTF8 = new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8);

    private final IndexHtml indexHtml;
    private final CatalogService catalogService;

    public SpaController(IndexHtml indexHtml, CatalogService catalogService) {
        this.indexHtml = indexHtml;
        this.catalogService = catalogService;
    }

    @GetMapping(value = {"/", "/login", "/admin", "/admin/**"}, produces = MediaType.TEXT_HTML_VALUE)
    ResponseEntity<String> app() {
        return html(page(), 200);
    }

    @GetMapping(value = {"/c/{shareToken}", "/c/{shareToken}/{certificateId}"}, produces = MediaType.TEXT_HTML_VALUE)
    ResponseEntity<String> catalog(@PathVariable String shareToken) {
        LinkPreview preview = catalogService.preview(shareToken).orElse(LinkPreview.GENERIC);
        String title = escape(preview.title());
        StringBuilder tags = new StringBuilder()
                .append("<meta name=\"description\" content=\"").append(escape(preview.description())).append("\" />\n")
                .append("    <meta property=\"og:type\" content=\"website\" />\n")
                .append("    <meta property=\"og:title\" content=\"").append(title).append("\" />\n")
                .append("    <meta property=\"og:description\" content=\"").append(escape(preview.description())).append("\" />\n");
        if (preview.url() != null) {
            tags.append("    <meta property=\"og:url\" content=\"").append(escape(preview.url())).append("\" />\n");
        }
        if (preview.imageUrl() != null) {
            tags.append("    <meta property=\"og:image\" content=\"").append(escape(preview.imageUrl())).append("\" />\n")
                    .append("    <meta name=\"twitter:card\" content=\"summary_large_image\" />\n");
        } else {
            tags.append("    <meta name=\"twitter:card\" content=\"summary\" />\n");
        }
        String page = page().replace(DEFAULT_TITLE, "<title>" + title + "</title>\n    " + tags.toString().strip());
        return html(page, 200);
    }

    private String page() {
        return indexHtml.get().orElseThrow(FrontendNotBuilt::new);
    }

    static ResponseEntity<String> html(String body, int status) {
        // The page itself must always be fresh; its scripts and styles have hashed names and cache for long.
        return ResponseEntity.status(status)
                .contentType(HTML_UTF8)
                .cacheControl(CacheControl.noCache())
                .body(body);
    }

    /** Escapes only what HTML needs (<, >, &, quotes); accents and dashes stay readable (the page is UTF-8). */
    private static String escape(String text) {
        return HtmlUtils.htmlEscape(text, "UTF-8");
    }

    /** In development the frontend runs on Vite, not here. */
    static class FrontendNotBuilt extends dev.filipe.mycertificates.common.NotFoundException {

        FrontendNotBuilt() {
            super("The frontend is not built into this app (in development, open the Vite dev server)");
        }
    }
}

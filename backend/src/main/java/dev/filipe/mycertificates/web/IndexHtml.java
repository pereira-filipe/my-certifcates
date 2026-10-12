package dev.filipe.mycertificates.web;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * The built frontend's index.html, copied into the jar by the Docker build (specs/BACKEND.md §7).
 * Absent in development, where Vite serves the frontend.
 */
@Component
public class IndexHtml {

    private final Optional<String> html;

    public IndexHtml() {
        this(new ClassPathResource("static/index.html"));
    }

    IndexHtml(ClassPathResource resource) {
        try {
            html = resource.exists()
                    ? Optional.of(resource.getContentAsString(StandardCharsets.UTF_8))
                    : Optional.empty();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public Optional<String> get() {
        return html;
    }
}

package dev.filipe.mycertificates.file;

import org.springframework.core.io.Resource;

/** File bytes plus what's needed for the HTTP response headers. */
public record StoredFile(Resource resource, String contentType, String fileName) {
}

package dev.filipe.mycertificates.file;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** HTTP responses for stored files, shared by the admin and (later) the public endpoints. */
public final class FileResponses {

    private FileResponses() {
    }

    /**
     * Streams the file. Inline (shown in the browser) unless {@code download} is true.
     * A file never changes under the same id, so browsers may keep it for a day; "private" keeps it out of
     * shared caches.
     */
    public static ResponseEntity<Resource> of(StoredFile file, boolean download) {
        ContentDisposition disposition = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(file.fileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePrivate())
                .body(file.resource());
    }
}

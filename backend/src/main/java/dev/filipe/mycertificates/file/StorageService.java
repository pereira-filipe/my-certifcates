package dev.filipe.mycertificates.file;

import java.io.InputStream;
import org.springframework.core.io.Resource;

/**
 * Where file bytes live. Only keys like {@code certificates/{certId}/{name}.pdf} are passed around — never paths
 * or URLs — so moving from the local folder to S3 is a configuration change (specs/BACKEND.md §4).
 */
public interface StorageService {

    void save(String key, InputStream data, String contentType);

    Resource load(String key);

    /** Does nothing if the key doesn't exist. */
    void delete(String key);
}

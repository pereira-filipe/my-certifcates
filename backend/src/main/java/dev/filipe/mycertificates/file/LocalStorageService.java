package dev.filipe.mycertificates.file;

import dev.filipe.mycertificates.common.AppProperties;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.DirectoryNotEmptyException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

/** Phase 1 storage: files in a folder (APP_STORAGE_LOCAL_DIR), git-ignored. */
@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    private final Path root;

    public LocalStorageService(AppProperties properties) {
        this.root = Path.of(properties.storage().localDir()).toAbsolutePath().normalize();
    }

    @Override
    public void save(String key, InputStream data, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            // Write to a temp file first so a half-written file never appears under the real key.
            Path temp = Files.createTempFile(target.getParent(), ".upload-", ".tmp");
            try {
                Files.copy(data, temp, StandardCopyOption.REPLACE_EXISTING);
                Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(temp);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Could not save " + key, e);
        }
    }

    @Override
    public Resource load(String key) {
        return new FileSystemResource(resolve(key));
    }

    @Override
    public void delete(String key) {
        Path path = resolve(key);
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not delete " + key, e);
        }
        removeEmptyFolders(path.getParent());
    }

    /** Removes the certificate's folder (and parents) once its last file is gone, never the root itself. */
    private void removeEmptyFolders(Path folder) {
        while (folder != null && !folder.equals(root) && folder.startsWith(root)) {
            try {
                Files.deleteIfExists(folder);
            } catch (DirectoryNotEmptyException e) {
                return;
            } catch (IOException e) {
                return; // only tidying up; the file itself is already gone
            }
            folder = folder.getParent();
        }
    }

    /** Keys must stay inside the storage folder: "..", absolute paths and the like are refused. */
    Path resolve(String key) {
        Path path = root.resolve(key).normalize();
        if (key.isBlank() || key.contains("..") || key.startsWith("/") || !path.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return path;
    }
}

package dev.filipe.mycertificates.file;

import dev.filipe.mycertificates.auth.CurrentOwner;
import dev.filipe.mycertificates.auth.User;
import dev.filipe.mycertificates.certificate.Certificate;
import dev.filipe.mycertificates.certificate.CertificateRepository;
import dev.filipe.mycertificates.common.FieldValidationException;
import dev.filipe.mycertificates.common.NotFoundException;
import jakarta.persistence.EntityManager;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

/**
 * Upload, download and delete certificate files (specs/BACKEND.md §4).
 * Bytes go to {@link StorageService}; the database only keeps keys. Stored bytes are removed only after the
 * database change is committed, and new bytes are removed again if it rolls back, so the two never disagree.
 */
@Service
@Transactional
public class FileService {

    static final int MAX_FILES_PER_CERTIFICATE = 10;

    private static final Logger log = LoggerFactory.getLogger(FileService.class);

    private final CertificateFileRepository files;
    private final CertificateRepository certificates;
    private final StorageService storage;
    private final ThumbnailService thumbnails;
    private final CurrentOwner currentOwner;
    private final EntityManager entityManager;

    public FileService(CertificateFileRepository files, CertificateRepository certificates, StorageService storage,
            ThumbnailService thumbnails, CurrentOwner currentOwner, EntityManager entityManager) {
        this.files = files;
        this.certificates = certificates;
        this.storage = storage;
        this.thumbnails = thumbnails;
        this.currentOwner = currentOwner;
        this.entityManager = entityManager;
    }

    public CertificateFileResponse upload(UUID certificateId, MultipartFile upload, boolean makePrimary) {
        Certificate certificate = certificates.findByIdAndOwner(certificateId, currentOwner.get())
                .orElseThrow(() -> new NotFoundException("Certificate not found"));
        if (upload.isEmpty()) {
            throw new FieldValidationException("file", "The file is empty");
        }
        List<CertificateFile> existing = files.findByCertificateOrderByCreatedAtAsc(certificate);
        if (existing.size() >= MAX_FILES_PER_CERTIFICATE) {
            throw new FieldValidationException("file",
                    "A certificate can have at most " + MAX_FILES_PER_CERTIFICATE + " files");
        }

        Path temp = null;
        try {
            temp = Files.createTempFile("upload-", ".bin");
            upload.transferTo(temp);
            FileType type = detectType(temp)
                    .orElseThrow(() -> new FieldValidationException("file", "Only PDF, PNG, JPG or WEBP files are allowed"));

            // File names on disk/S3 are random; the original name is only kept in the database.
            String keyBase = "certificates/" + certificate.getId() + "/" + UUID.randomUUID();
            String storageKey = keyBase + "." + type.extension();
            try (InputStream in = Files.newInputStream(temp)) {
                storage.save(storageKey, in, type.contentType());
            }
            List<String> written = new ArrayList<>(List.of(storageKey));
            deleteIfRolledBack(written);

            String thumbnailKey = null;
            Optional<byte[]> thumbnail = thumbnails.create(temp, type);
            if (thumbnail.isPresent()) {
                thumbnailKey = keyBase + "-thumb.png";
                storage.save(thumbnailKey, new ByteArrayInputStream(thumbnail.get()), "image/png");
                written.add(thumbnailKey);
            }

            CertificateFile file = new CertificateFile(certificate, storageKey, thumbnailKey,
                    cleanName(upload.getOriginalFilename(), type), type.contentType(), upload.getSize());
            boolean hasPrimary = existing.stream().anyMatch(CertificateFile::isPrimary);
            if (makePrimary && hasPrimary) {
                clearPrimary(existing);
            }
            file.setPrimary(makePrimary || !hasPrimary); // the first file is always the main one
            return CertificateFileResponse.of(files.saveAndFlush(file));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            deleteQuietly(temp);
        }
    }

    @Transactional(readOnly = true)
    public StoredFile load(UUID fileId) {
        CertificateFile file = findOwned(fileId);
        return stored(file.getStorageKey(), file.getContentType(), file.getOriginalName());
    }

    @Transactional(readOnly = true)
    public StoredFile loadThumbnail(UUID fileId) {
        CertificateFile file = findOwned(fileId);
        if (file.getThumbnailKey() == null) {
            throw new NotFoundException("No thumbnail");
        }
        return stored(file.getThumbnailKey(), "image/png", "thumbnail.png");
    }

    public CertificateFileResponse makePrimary(UUID fileId) {
        CertificateFile file = findOwned(fileId);
        if (!file.isPrimary()) {
            clearPrimary(files.findByCertificateOrderByCreatedAtAsc(file.getCertificate()));
            file.setPrimary(true);
        }
        return CertificateFileResponse.of(file);
    }

    /** Deleting the main file makes the oldest remaining file the main one. */
    public void delete(UUID fileId) {
        CertificateFile file = findOwned(fileId);
        boolean wasPrimary = file.isPrimary();
        Certificate certificate = file.getCertificate();
        files.delete(file);
        files.flush();
        if (wasPrimary) {
            files.findByCertificateOrderByCreatedAtAsc(certificate).stream().findFirst()
                    .ifPresent(oldest -> oldest.setPrimary(true));
        }
        deleteAfterCommit(keysOf(List.of(file)));
    }

    /** Called when a certificate is deleted: its rows go with it, its bytes after commit. */
    public void deleteStoredFilesAfterCommit(Certificate certificate) {
        deleteAfterCommit(keysOf(certificate.getFiles()));
    }

    private CertificateFile findOwned(UUID fileId) {
        return files.findOwned(fileId, currentOwner.get()).orElseThrow(() -> new NotFoundException("File not found"));
    }

    private StoredFile stored(String key, String contentType, String fileName) {
        var resource = storage.load(key);
        if (!resource.exists()) {
            log.warn("Stored file missing for key {}", key);
            throw new NotFoundException("File not found");
        }
        return new StoredFile(resource, contentType, fileName);
    }

    /** The unique index allows one main file per certificate, so the old one is cleared and flushed first. */
    private void clearPrimary(Collection<CertificateFile> certificateFiles) {
        certificateFiles.forEach(f -> f.setPrimary(false));
        entityManager.flush();
    }

    private static Optional<FileType> detectType(Path file) throws IOException {
        try (InputStream in = Files.newInputStream(file)) {
            return FileType.detect(in.readNBytes(FileType.HEADER_LENGTH));
        }
    }

    /** Keeps only the file name part, without control characters, at most 255 characters. */
    static String cleanName(String originalName, FileType type) {
        String name = originalName == null ? "" : originalName;
        name = name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1);
        name = name.replaceAll("\\p{Cntrl}", "").trim();
        if (name.isEmpty()) {
            name = "certificate." + type.extension();
        }
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }

    private static List<String> keysOf(Collection<CertificateFile> certificateFiles) {
        List<String> keys = new ArrayList<>();
        for (CertificateFile f : certificateFiles) {
            keys.add(f.getStorageKey());
            if (f.getThumbnailKey() != null) keys.add(f.getThumbnailKey());
        }
        return keys;
    }

    private void deleteAfterCommit(List<String> keys) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteKeys(keys);
            }
        });
    }

    /** {@code keys} may still grow (thumbnail) after this is registered. */
    private void deleteIfRolledBack(List<String> keys) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) deleteKeys(keys);
            }
        });
    }

    private void deleteKeys(List<String> keys) {
        for (String key : keys) {
            try {
                storage.delete(key);
            } catch (RuntimeException e) {
                log.warn("Could not delete stored file {}: {}", key, e.getMessage());
            }
        }
    }

    private static void deleteQuietly(Path path) {
        if (path == null) return;
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Could not delete temp file {}", path);
        }
    }
}

package dev.filipe.mycertificates.file;

import dev.filipe.mycertificates.certificate.Certificate;
import dev.filipe.mycertificates.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "certificate_files")
public class CertificateFile extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "certificate_id")
    private Certificate certificate;

    @Column(name = "storage_key", nullable = false)
    private String storageKey;

    @Column(name = "thumbnail_key")
    private String thumbnailKey;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "is_primary", nullable = false)
    private boolean isPrimary;

    protected CertificateFile() {
    }

    public CertificateFile(Certificate certificate, String storageKey, String thumbnailKey, String originalName,
            String contentType, long sizeBytes) {
        this.certificate = certificate;
        this.storageKey = storageKey;
        this.thumbnailKey = thumbnailKey;
        this.originalName = originalName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
    }

    public Certificate getCertificate() {
        return certificate;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getThumbnailKey() {
        return thumbnailKey;
    }

    public String getOriginalName() {
        return originalName;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public boolean isPrimary() {
        return isPrimary;
    }

    public void setPrimary(boolean isPrimary) {
        this.isPrimary = isPrimary;
    }
}

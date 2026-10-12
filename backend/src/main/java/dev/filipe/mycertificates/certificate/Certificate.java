package dev.filipe.mycertificates.certificate;

import dev.filipe.mycertificates.auth.User;
import dev.filipe.mycertificates.common.BaseEntity;
import dev.filipe.mycertificates.file.CertificateFile;
import dev.filipe.mycertificates.tag.Tag;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "certificates")
public class Certificate extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String issuer;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    @Column(name = "credential_id")
    private String credentialId;

    @Column(name = "verification_url")
    private String verificationUrl;

    private String notes;

    @Column(name = "is_public", nullable = false)
    private boolean isPublic;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @ManyToMany
    @JoinTable(name = "certificate_tags",
            joinColumns = @JoinColumn(name = "certificate_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new LinkedHashSet<>();

    /** Added and removed through FileService; deleted together with the certificate. */
    @OneToMany(mappedBy = "certificate", cascade = CascadeType.REMOVE)
    @OrderBy("createdAt")
    private List<CertificateFile> files = new ArrayList<>();

    protected Certificate() {
    }

    public Certificate(User owner, int displayOrder) {
        this.owner = owner;
        this.displayOrder = displayOrder;
    }

    /** Replaces every editable field (PUT semantics). */
    public void update(String title, String issuer, LocalDate issueDate, LocalDate expirationDate,
            String credentialId, String verificationUrl, String notes, boolean isPublic, Set<Tag> tags) {
        this.title = title;
        this.issuer = issuer;
        this.issueDate = issueDate;
        this.expirationDate = expirationDate;
        this.credentialId = credentialId;
        this.verificationUrl = verificationUrl;
        this.notes = notes;
        this.isPublic = isPublic;
        this.tags.clear();
        this.tags.addAll(tags);
    }

    public User getOwner() {
        return owner;
    }

    public String getTitle() {
        return title;
    }

    public String getIssuer() {
        return issuer;
    }

    public LocalDate getIssueDate() {
        return issueDate;
    }

    public LocalDate getExpirationDate() {
        return expirationDate;
    }

    public String getCredentialId() {
        return credentialId;
    }

    public String getVerificationUrl() {
        return verificationUrl;
    }

    public String getNotes() {
        return notes;
    }

    public boolean isPublic() {
        return isPublic;
    }

    public void setPublic(boolean isPublic) {
        this.isPublic = isPublic;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    public Set<Tag> getTags() {
        return tags;
    }

    public List<CertificateFile> getFiles() {
        return files;
    }
}

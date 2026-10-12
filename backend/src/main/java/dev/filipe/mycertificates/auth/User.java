package dev.filipe.mycertificates.auth;

import dev.filipe.mycertificates.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "share_token", nullable = false, unique = true)
    private String shareToken;

    protected User() {
    }

    public User(String email, String passwordHash, String displayName, String shareToken) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.shareToken = shareToken;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getShareToken() {
        return shareToken;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}

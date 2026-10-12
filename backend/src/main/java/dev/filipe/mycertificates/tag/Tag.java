package dev.filipe.mycertificates.tag;

import dev.filipe.mycertificates.auth.User;
import dev.filipe.mycertificates.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "tags")
public class Tag extends BaseEntity {

    public static final int MAX_NAME_LENGTH = 50;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(nullable = false)
    private String name;

    protected Tag() {
    }

    public Tag(User owner, String name) {
        this.owner = owner;
        this.name = name;
    }

    public User getOwner() {
        return owner;
    }

    public String getName() {
        return name;
    }

    public void rename(String name) {
        this.name = name;
    }
}

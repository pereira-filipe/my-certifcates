package dev.filipe.mycertificates.tag;

import dev.filipe.mycertificates.auth.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TagRepository extends JpaRepository<Tag, UUID> {

    Optional<Tag> findByIdAndOwner(UUID id, User owner);

    Optional<Tag> findByOwnerAndNameIgnoreCase(User owner, String name);

    /** Each tag with how many certificates use it, sorted by name. */
    @Query("""
            select new dev.filipe.mycertificates.tag.TagUsage(t.id, t.name,
                (select count(c) from Certificate c join c.tags ct where ct = t))
            from Tag t where t.owner = :owner order by lower(t.name)
            """)
    List<TagUsage> findUsage(User owner);
}

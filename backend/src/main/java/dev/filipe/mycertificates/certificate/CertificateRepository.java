package dev.filipe.mycertificates.certificate;

import dev.filipe.mycertificates.auth.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface CertificateRepository extends JpaRepository<Certificate, UUID>,
        JpaSpecificationExecutor<Certificate> {

    Optional<Certificate> findByIdAndOwner(UUID id, User owner);

    List<Certificate> findByOwner(User owner);

    /** What visitors see: public certificates only, in the owner's order. */
    List<Certificate> findByOwnerAndIsPublicTrueOrderByDisplayOrderAscCreatedAtDesc(User owner);

    Optional<Certificate> findByIdAndOwnerAndIsPublicTrue(UUID id, User owner);

    @Query("select min(c.displayOrder) from Certificate c where c.owner = :owner")
    Optional<Integer> findMinDisplayOrder(User owner);
}

package dev.filipe.mycertificates.file;

import dev.filipe.mycertificates.auth.User;
import dev.filipe.mycertificates.certificate.Certificate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CertificateFileRepository extends JpaRepository<CertificateFile, UUID> {

    /** A file, but only if it belongs to one of this owner's certificates. */
    @Query("select f from CertificateFile f where f.id = :id and f.certificate.owner = :owner")
    Optional<CertificateFile> findOwned(UUID id, User owner);

    List<CertificateFile> findByCertificateOrderByCreatedAtAsc(Certificate certificate);

    long countByCertificate(Certificate certificate);
}

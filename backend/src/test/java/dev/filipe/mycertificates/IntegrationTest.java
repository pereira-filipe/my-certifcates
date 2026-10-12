package dev.filipe.mycertificates;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for tests that need the whole app and a real PostgreSQL (Testcontainers).
 * All subclasses share one Spring context, so the database container starts only once.
 * Skipped when Docker isn't available locally; CI always has Docker.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
public abstract class IntegrationTest {

    @Autowired
    protected MockMvc mockMvc;
}

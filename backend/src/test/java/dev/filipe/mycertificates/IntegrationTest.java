package dev.filipe.mycertificates;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for tests that need the whole app and a real PostgreSQL (Testcontainers).
 * All subclasses share one Spring context, so the database container starts only once.
 * Runs with the "test" profile (owner owner@example.com, see application-test.yml).
 * Skipped when Docker isn't available locally; CI always has Docker.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
public abstract class IntegrationTest {

    protected static final String OWNER_EMAIL = "owner@example.com";
    protected static final String OWNER_PASSWORD = "correct-horse-battery";

    /** Uploaded files go to a temporary folder, shared by all integration tests. */
    protected static final Path STORAGE_DIR = createStorageDir();

    @Autowired
    protected MockMvc mockMvc;

    @DynamicPropertySource
    static void storageProperties(DynamicPropertyRegistry registry) {
        registry.add("app.storage.local-dir", STORAGE_DIR::toString);
    }

    private static Path createStorageDir() {
        try {
            Path dir = Files.createTempDirectory("my-certificates-test-storage");
            dir.toFile().deleteOnExit();
            return dir;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Autowired
    protected JdbcTemplate jdbc;

    /** Logs in as the test owner and returns the session to pass to later requests. */
    protected MockHttpSession loginAsOwner() throws Exception {
        return (MockHttpSession) mockMvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + OWNER_EMAIL + "\",\"password\":\"" + OWNER_PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getRequest().getSession(false);
    }

    /** Removes certificates and tags (the owner account stays). */
    protected void deleteCertificatesAndTags() {
        jdbc.update("DELETE FROM certificates");
        jdbc.update("DELETE FROM tags");
    }

    /**
     * Sends a CSRF token the way the browser does: same value in the XSRF-TOKEN cookie and the X-XSRF-TOKEN header.
     * (Spring Security's {@code csrf()} test helper isn't used because it swaps the app's token repository
     * for every later test.)
     */
    protected static RequestPostProcessor csrf() {
        return request -> {
            String token = "test-csrf-token";
            request.setCookies(new Cookie("XSRF-TOKEN", token));
            request.addHeader("X-XSRF-TOKEN", token);
            return request;
        };
    }
}

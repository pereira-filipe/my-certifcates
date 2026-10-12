package dev.filipe.mycertificates.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.endsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import dev.filipe.mycertificates.IntegrationTest;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;

/** The public link must never show hidden certificates, their files, notes or expiration dates. */
class CatalogIntegrationTest extends IntegrationTest {

    private static final String SECRET_NOTE = "secret-note-do-not-leak";

    private MockHttpSession session;
    private String token;
    private String publicId;
    private String hiddenId;
    private String publicFileId;
    private String hiddenFileId;
    private Runnable restoreToken;

    /** The regenerate test replaces the token too; either way the original comes back. */
    @AfterEach
    void restoreToken() {
        restoreToken.run();
    }

    @BeforeEach
    void setUp() throws Exception {
        deleteCertificatesAndTags();
        token = "test-token-0123456789abcdefghij";
        restoreToken = useShareToken(token);
        session = loginAsOwner();
        hiddenId = create("Hidden one", false);
        publicId = create("Public one", true);
        publicFileId = upload(publicId);
        hiddenFileId = upload(hiddenId);
    }

    private String create(String title, boolean isPublic) throws Exception {
        String json = mockMvc.perform(post("/api/admin/certificates").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","issuer":"Oracle","issueDate":"2025-03-10","expirationDate":"2030-01-01",
                                 "notes":"%s","credentialId":"ABC-123","verificationUrl":"https://verify.example/1",
                                 "tags":["Java"],"isPublic":%s}
                                """.formatted(title, SECRET_NOTE, isPublic)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.id");
    }

    private String upload(String certificateId) throws Exception {
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(20, 10, BufferedImage.TYPE_INT_RGB), "png", png);
        String json = mockMvc.perform(multipart("/api/admin/certificates/" + certificateId + "/files")
                        .file(new MockMultipartFile("file", "proof.png", "image/png", png.toByteArray()))
                        .session(session).with(csrf()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.id");
    }

    private String base() {
        return "/api/public/catalogs/" + token;
    }

    @Test
    void catalogShowsOnlyPublicCertificatesWithPublicFields() throws Exception {
        String json = mockMvc.perform(get(base()))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Robots-Tag", "noindex, nofollow"))
                .andExpect(jsonPath("$.displayName").value("owner"))
                .andExpect(jsonPath("$.certificates[*].title", contains("Public one")))
                .andExpect(jsonPath("$.certificates[0].credentialId").value("ABC-123"))
                .andExpect(jsonPath("$.certificates[0].verificationUrl").value("https://verify.example/1"))
                .andExpect(jsonPath("$.certificates[0].tags", contains("Java")))
                .andExpect(jsonPath("$.certificates[0].files[0].id").value(publicFileId))
                .andReturn().getResponse().getContentAsString();

        // Checked on the raw text, so a renamed field can't slip through either.
        assertThat(json).doesNotContain(SECRET_NOTE, "notes", "expiration", "2030-01-01", "isPublic",
                "owner_id", "ownerId", "Hidden one", hiddenFileId, OWNER_EMAIL);
    }

    @Test
    void publicCertificateAndItsFilesAreReachable() throws Exception {
        String json = mockMvc.perform(get(base() + "/certificates/" + publicId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Public one"))
                .andReturn().getResponse().getContentAsString();
        assertThat(json).doesNotContain(SECRET_NOTE, "expiration", "2030-01-01");

        mockMvc.perform(get(base() + "/files/" + publicFileId))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(header().string("X-Robots-Tag", "noindex, nofollow"));
        mockMvc.perform(get(base() + "/files/" + publicFileId).param("download", "true"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment")));
        mockMvc.perform(get(base() + "/files/" + publicFileId + "/thumbnail"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"));
    }

    @Test
    void hiddenCertificatesAndTheirFilesAre404() throws Exception {
        for (String path : List.of(
                "/certificates/" + hiddenId,
                "/files/" + hiddenFileId,
                "/files/" + hiddenFileId + "/thumbnail")) {
            mockMvc.perform(get(base() + path))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.error").value("NOT_FOUND"))
                    .andExpect(jsonPath("$.message").value("Not found"));
        }
    }

    @Test
    void hidingACertificateClosesItImmediately() throws Exception {
        mockMvc.perform(patch("/api/admin/certificates/" + publicId + "/visibility").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"isPublic\":false}"))
                .andExpect(status().isOk());

        mockMvc.perform(get(base())).andExpect(jsonPath("$.certificates", empty()));
        mockMvc.perform(get(base() + "/certificates/" + publicId)).andExpect(status().isNotFound());
        mockMvc.perform(get(base() + "/files/" + publicFileId)).andExpect(status().isNotFound());
    }

    @Test
    void wrongTokensAndUnknownIdsLookTheSame() throws Exception {
        for (String path : List.of(
                "/api/public/catalogs/wrong-token",
                "/api/public/catalogs/wrong-token/certificates/" + publicId,
                "/api/public/catalogs/wrong-token/files/" + publicFileId,
                base() + "/certificates/" + UUID.randomUUID(),
                base() + "/certificates/not-a-uuid",
                base() + "/files/" + UUID.randomUUID(),
                "/api/public/does-not-exist")) {
            mockMvc.perform(get(path))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404));
        }
    }

    @Test
    void regeneratingTheLinkKillsTheOldOne() throws Exception {
        mockMvc.perform(get("/api/admin/catalog").session(session))
                .andExpect(jsonPath("$.shareToken").value(token))
                .andExpect(jsonPath("$.url").value("http://localhost:5173/c/" + token));

        String json = mockMvc.perform(post("/api/admin/catalog/regenerate-link").session(session).with(csrf()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String newToken = JsonPath.read(json, "$.shareToken");
        assertThat(newToken).hasSize(32).isNotEqualTo(token);
        assertThat((String) JsonPath.read(json, "$.url")).isEqualTo("http://localhost:5173/c/" + newToken);

        mockMvc.perform(get(base())).andExpect(status().isNotFound());
        mockMvc.perform(get(base() + "/files/" + publicFileId)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/catalogs/" + newToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.certificates[*].title", contains("Public one")));
    }

    @Test
    void theLinkIsOnlyForTheOwner() throws Exception {
        mockMvc.perform(get("/api/admin/catalog")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/admin/catalog/regenerate-link").with(csrf())).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/certificates")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminAndPublicIdsDontMix() throws Exception {
        // An admin file URL without login is closed, even for a public certificate's file.
        mockMvc.perform(get("/api/admin/files/" + publicFileId)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(base() + "/files/" + publicFileId)).andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", endsWith("proof.png")));
    }
}

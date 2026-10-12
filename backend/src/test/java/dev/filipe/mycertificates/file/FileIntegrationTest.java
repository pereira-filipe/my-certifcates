package dev.filipe.mycertificates.file;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

class FileIntegrationTest extends IntegrationTest {

    private MockHttpSession session;
    private String certificateId;

    @BeforeEach
    void setUp() throws Exception {
        deleteCertificatesAndTags();
        session = loginAsOwner();
        String json = mockMvc.perform(post("/api/admin/certificates").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"T\",\"issuer\":\"I\",\"issueDate\":\"2025-01-01\"}"))
                .andReturn().getResponse().getContentAsString();
        certificateId = JsonPath.read(json, "$.id");
    }

    private ResultActions upload(String name, byte[] bytes, boolean primary) throws Exception {
        return mockMvc.perform(multipart("/api/admin/certificates/" + certificateId + "/files")
                .file(new MockMultipartFile("file", name, "application/octet-stream", bytes))
                .param("primary", String.valueOf(primary))
                .session(session).with(csrf()));
    }

    private String uploadId(String name, byte[] bytes) throws Exception {
        return JsonPath.read(upload(name, bytes, false).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$.id");
    }

    private List<String> storedFiles() throws Exception {
        try (Stream<java.nio.file.Path> paths = Files.walk(STORAGE_DIR.resolve("certificates/" + certificateId))) {
            return paths.filter(Files::isRegularFile).map(p -> p.getFileName().toString()).toList();
        } catch (java.nio.file.NoSuchFileException e) {
            return List.of();
        }
    }

    @Test
    void uploadsAPdfWithAThumbnailAndServesIt() throws Exception {
        byte[] pdf = TestFiles.pdf();
        upload("../../My Certificate.pdf", pdf, false)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalName").value("My Certificate.pdf"))
                .andExpect(jsonPath("$.contentType").value("application/pdf"))
                .andExpect(jsonPath("$.sizeBytes").value(pdf.length))
                .andExpect(jsonPath("$.isPrimary").value(true))
                .andExpect(jsonPath("$.hasThumbnail").value(true));

        String fileId = JsonPath.read(mockMvc.perform(get("/api/admin/certificates/" + certificateId).session(session))
                .andReturn().getResponse().getContentAsString(), "$.files[0].id");

        mockMvc.perform(get("/api/admin/files/" + fileId).session(session))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Content-Disposition", containsString("inline")))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().bytes(pdf));
        mockMvc.perform(get("/api/admin/files/" + fileId).param("download", "true").session(session))
                .andExpect(header().string("Content-Disposition", containsString("attachment")));

        byte[] thumbnail = mockMvc.perform(get("/api/admin/files/" + fileId + "/thumbnail").session(session))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andReturn().getResponse().getContentAsByteArray();
        var image = ImageIO.read(new ByteArrayInputStream(thumbnail));
        assertThat(image.getWidth()).isLessThanOrEqualTo(ThumbnailService.MAX_WIDTH);
        assertThat(image.getHeight()).isGreaterThan(image.getWidth()); // A4 is portrait

        // Stored under random names, never the original one.
        assertThat(storedFiles()).hasSize(2).noneMatch(n -> n.contains("My Certificate"));
    }

    @Test
    void acceptsEachImageTypeAndMakesThumbnails() throws Exception {
        for (var entry : List.of(
                new Object[] {"photo.png", TestFiles.image("png", 2000, 1000)},
                new Object[] {"photo.jpg", TestFiles.image("jpg", 300, 200)},
                new Object[] {"photo.webp", TestFiles.webp()})) {
            upload((String) entry[0], (byte[]) entry[1], false)
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.hasThumbnail").value(true));
        }
    }

    @Test
    void checksTheRealContentNotTheName() throws Exception {
        upload("certificate.pdf", "<html><script>alert(1)</script></html>".getBytes(), false)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.file").value("Only PDF, PNG, JPG or WEBP files are allowed"));
        upload("empty.pdf", new byte[0], false).andExpect(status().isBadRequest());
        assertThat(storedFiles()).isEmpty();
    }

    @Test
    void firstFileIsMainAndMainCanMove() throws Exception {
        String first = uploadId("a.png", TestFiles.image("png", 10, 10));
        String second = uploadId("b.png", TestFiles.image("png", 10, 10));

        mockMvc.perform(get("/api/admin/certificates/" + certificateId).session(session))
                .andExpect(jsonPath("$.files[*].id", contains(first, second)))
                .andExpect(jsonPath("$.files[*].isPrimary", contains(true, false)));

        mockMvc.perform(patch("/api/admin/files/" + second + "/primary").session(session).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPrimary").value(true));
        mockMvc.perform(get("/api/admin/certificates/" + certificateId).session(session))
                .andExpect(jsonPath("$.files[*].id", contains(second, first)))
                .andExpect(jsonPath("$.files[*].isPrimary", contains(true, false)));

        upload("c.png", TestFiles.image("png", 10, 10), true).andExpect(jsonPath("$.isPrimary").value(true));
        mockMvc.perform(get("/api/admin/certificates/" + certificateId).session(session))
                .andExpect(jsonPath("$.files[*].isPrimary", contains(true, false, false)));
    }

    @Test
    void deletingTheMainFilePromotesTheOldestAndRemovesTheBytes() throws Exception {
        String first = uploadId("a.png", TestFiles.image("png", 10, 10));
        String second = uploadId("b.png", TestFiles.image("png", 10, 10));
        String third = uploadId("c.png", TestFiles.image("png", 10, 10));
        assertThat(storedFiles()).hasSize(6); // file + thumbnail each

        mockMvc.perform(delete("/api/admin/files/" + first).session(session).with(csrf()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/certificates/" + certificateId).session(session))
                .andExpect(jsonPath("$.files[*].id", contains(second, third)))
                .andExpect(jsonPath("$.files[0].isPrimary").value(true));
        assertThat(storedFiles()).hasSize(4);
        mockMvc.perform(get("/api/admin/files/" + first).session(session)).andExpect(status().isNotFound());
    }

    @Test
    void deletingTheCertificateRemovesAllItsBytes() throws Exception {
        uploadId("a.pdf", TestFiles.pdf());
        uploadId("b.png", TestFiles.image("png", 10, 10));
        assertThat(storedFiles()).hasSize(4);

        mockMvc.perform(delete("/api/admin/certificates/" + certificateId).session(session).with(csrf()))
                .andExpect(status().isNoContent());

        assertThat(storedFiles()).isEmpty();
    }

    @Test
    void limitsFilesPerCertificate() throws Exception {
        byte[] png = TestFiles.image("png", 2, 2);
        for (int i = 0; i < FileService.MAX_FILES_PER_CERTIFICATE; i++) {
            upload("f" + i + ".png", png, false).andExpect(status().isCreated());
        }
        upload("one-too-many.png", png, false).andExpect(status().isBadRequest());
    }

    @Test
    void unknownFilesAndMissingThumbnailsAre404() throws Exception {
        mockMvc.perform(get("/api/admin/files/" + UUID.randomUUID()).session(session)).andExpect(status().isNotFound());
        upload("x.png", TestFiles.image("png", 2, 2), false).andExpect(status().isCreated());
        mockMvc.perform(multipart("/api/admin/certificates/" + UUID.randomUUID() + "/files")
                        .file(new MockMultipartFile("file", "x.png", "image/png", TestFiles.image("png", 2, 2)))
                        .session(session).with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void needsLogin() throws Exception {
        mockMvc.perform(multipart("/api/admin/certificates/" + certificateId + "/files")
                        .file(new MockMultipartFile("file", "x.png", "image/png", TestFiles.image("png", 2, 2)))
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/files/" + UUID.randomUUID())).andExpect(status().isUnauthorized());
    }
}

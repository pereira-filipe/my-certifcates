package dev.filipe.mycertificates.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import dev.filipe.mycertificates.IntegrationTest;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;

/** The built frontend served by Spring Boot (a stand-in index.html lives in src/test/resources/static). */
class SpaIntegrationTest extends IntegrationTest {

    private static final String TOKEN = "spa-test-token-0123456789abcdef";

    private Runnable restoreToken;

    @BeforeEach
    void setUp() {
        deleteCertificatesAndTags();
        restoreToken = useShareToken(TOKEN);
    }

    @AfterEach
    void restoreOwner() {
        restoreToken.run();
        jdbc.update("UPDATE users SET display_name = 'owner' WHERE email = ?", OWNER_EMAIL);
    }

    @Test
    void appRoutesServeTheFrontend() throws Exception {
        for (String path : new String[] {"/", "/login", "/admin", "/admin/certificates/new", "/admin/settings"}) {
            mockMvc.perform(get(path).accept(MediaType.TEXT_HTML))
                    .andExpect(status().isOk())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                    .andExpect(header().string("Cache-Control", containsString("no-cache")))
                    .andExpect(content().string(containsString("<div id=\"root\">")));
        }
    }

    @Test
    void unknownPagesGetTheAppWith404ButTheApiKeepsJson() throws Exception {
        mockMvc.perform(get("/no/such/page").accept(MediaType.TEXT_HTML))
                .andExpect(status().isNotFound())
                .andExpect(content().string(containsString("<div id=\"root\">")));
        mockMvc.perform(get("/api/public/nothing").accept(MediaType.TEXT_HTML, MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    void catalogLinksGetThePreviewTags() throws Exception {
        MockHttpSession session = loginAsOwner();
        String json = mockMvc.perform(post("/api/admin/certificates").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"AWS\",\"issuer\":\"Amazon\",\"issueDate\":\"2025-01-01\",\"isPublic\":true}"))
                .andReturn().getResponse().getContentAsString();
        String certificateId = JsonPath.read(json, "$.id");
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(40, 30, BufferedImage.TYPE_INT_RGB), "png", png);
        String fileJson = mockMvc.perform(multipart("/api/admin/certificates/" + certificateId + "/files")
                        .file(new MockMultipartFile("file", "a.png", "image/png", png.toByteArray()))
                        .session(session).with(csrf()))
                .andReturn().getResponse().getContentAsString();
        String fileId = JsonPath.read(fileJson, "$.id");

        String html = mockMvc.perform(get("/c/" + TOKEN + "/" + certificateId).accept(MediaType.TEXT_HTML))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(html)
                .contains("<title>owner — Certifications</title>")
                .contains("<meta property=\"og:title\" content=\"owner — Certifications\" />")
                .contains("<meta property=\"og:description\" content=\"1 professional certification of owner.\" />")
                .contains("<meta property=\"og:url\" content=\"http://localhost:5173/c/" + TOKEN + "\" />")
                .contains("<meta property=\"og:image\" content=\"http://localhost:5173/api/public/catalogs/"
                        + TOKEN + "/files/" + fileId + "/thumbnail\" />")
                .contains("<div id=\"root\">");
    }

    @Test
    void theOwnersNameIsEscaped() throws Exception {
        jdbc.update("UPDATE users SET display_name = ? WHERE email = ?", "<script>alert(1)</script> & \"Conceição\"", OWNER_EMAIL);

        String html = mockMvc.perform(get("/c/" + TOKEN).accept(MediaType.TEXT_HTML))
                .andReturn().getResponse().getContentAsString();

        assertThat(html).doesNotContain("<script>alert(1)</script>")
                .contains("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Conceição&quot; — Certifications");
    }

    @Test
    void unknownCatalogsGetGenericTags() throws Exception {
        String html = mockMvc.perform(get("/c/not-a-token").accept(MediaType.TEXT_HTML))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(html).contains("<title>Certifications</title>").doesNotContain("og:image", "og:url");
    }

    @Test
    void securityHeadersAreSent() throws Exception {
        mockMvc.perform(get("/admin").accept(MediaType.TEXT_HTML))
                .andExpect(header().string("Content-Security-Policy", containsString("script-src 'self'")))
                .andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors 'none'")))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"));
    }
}

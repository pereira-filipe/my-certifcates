package dev.filipe.mycertificates.certificate;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import dev.filipe.mycertificates.IntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

class CertificateAdminIntegrationTest extends IntegrationTest {

    private static final String BASE = "/api/admin/certificates";

    private MockHttpSession session;

    @BeforeEach
    void setUp() throws Exception {
        deleteCertificatesAndTags();
        session = loginAsOwner();
    }

    private static String body(String title, String issuer, String extra) {
        return """
                {"title":"%s","issuer":"%s","issueDate":"2025-03-10"%s}
                """.formatted(title, issuer, extra.isEmpty() ? "" : "," + extra);
    }

    private String create(String json) throws Exception {
        String response = mockMvc.perform(post(BASE).session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.id");
    }

    @Test
    void createsACertificateWithDefaultsAndTags() throws Exception {
        mockMvc.perform(post(BASE).session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(body(" AWS Solutions Architect ", "Amazon",
                                "\"tags\":[\" Cloud \",\"cloud\",\"AWS\"],\"credentialId\":\"  \",\"notes\":\"private\"")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("AWS Solutions Architect"))
                .andExpect(jsonPath("$.issueDate").value("2025-03-10"))
                .andExpect(jsonPath("$.isPublic").value(false))
                .andExpect(jsonPath("$.credentialId").doesNotExist())
                .andExpect(jsonPath("$.notes").value("private"))
                .andExpect(jsonPath("$.tags", contains("AWS", "Cloud")));
    }

    @Test
    void validationErrorsPointAtTheFields() throws Exception {
        mockMvc.perform(post(BASE).session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"issuer\":\"x\",\"verificationUrl\":\"javascript:alert(1)\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fields.title").exists())
                .andExpect(jsonPath("$.fields.issueDate").exists())
                .andExpect(jsonPath("$.fields.verificationUrl").value("must be a link starting with http:// or https://"));
    }

    @Test
    void expirationCannotBeBeforeIssueDate() throws Exception {
        mockMvc.perform(post(BASE).session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(body("A", "B", "\"expirationDate\":\"2024-01-01\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.expirationDate").value("must not be before the issue date"));
    }

    @Test
    void newCertificatesGoToTheTop() throws Exception {
        create(body("First", "X", ""));
        create(body("Second", "X", ""));

        mockMvc.perform(get(BASE).session(session))
                .andExpect(jsonPath("$[*].title", contains("Second", "First")));
    }

    @Test
    void listFiltersBySearchTagAndVisibility() throws Exception {
        create(body("Java Programmer", "Oracle", "\"tags\":[\"Java\"],\"isPublic\":true"));
        create(body("Cloud Practitioner", "Amazon", "\"tags\":[\"Cloud\"]"));
        create(body("100% Coverage", "Test_Org", ""));

        mockMvc.perform(get(BASE).session(session).param("q", "ORACLE"))
                .andExpect(jsonPath("$[*].title", contains("Java Programmer")));
        mockMvc.perform(get(BASE).session(session).param("tag", "cloud"))
                .andExpect(jsonPath("$[*].title", contains("Cloud Practitioner")));
        mockMvc.perform(get(BASE).session(session).param("public", "true"))
                .andExpect(jsonPath("$[*].title", contains("Java Programmer")));
        mockMvc.perform(get(BASE).session(session).param("public", "false"))
                .andExpect(jsonPath("$", hasSize(2)));
        // % and _ are searched literally, not as wildcards.
        mockMvc.perform(get(BASE).session(session).param("q", "%"))
                .andExpect(jsonPath("$[*].title", contains("100% Coverage")));
        mockMvc.perform(get(BASE).session(session).param("q", "t_o"))
                .andExpect(jsonPath("$[*].title", contains("100% Coverage")));
    }

    @Test
    void updateReplacesFieldsAndTags() throws Exception {
        String id = create(body("Old", "X", "\"tags\":[\"A\",\"B\"],\"notes\":\"n\""));

        mockMvc.perform(put(BASE + "/" + id).session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(body("New", "Y", "\"tags\":[\"C\"],\"verificationUrl\":\"https://verify.example/1\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New"))
                .andExpect(jsonPath("$.notes").doesNotExist())
                .andExpect(jsonPath("$.verificationUrl").value("https://verify.example/1"))
                .andExpect(jsonPath("$.tags", contains("C")));
    }

    @Test
    void unknownOrMalformedIdsAre404() throws Exception {
        mockMvc.perform(get(BASE + "/" + UUID.randomUUID()).session(session)).andExpect(status().isNotFound());
        mockMvc.perform(get(BASE + "/not-a-uuid").session(session)).andExpect(status().isNotFound());
        mockMvc.perform(delete(BASE + "/" + UUID.randomUUID()).session(session).with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteRemovesTheCertificate() throws Exception {
        String id = create(body("Gone", "X", ""));

        mockMvc.perform(delete(BASE + "/" + id).session(session).with(csrf())).andExpect(status().isNoContent());
        mockMvc.perform(get(BASE + "/" + id).session(session)).andExpect(status().isNotFound());
    }

    @Test
    void visibilityCanBeToggled() throws Exception {
        String id = create(body("Toggle", "X", ""));

        mockMvc.perform(patch(BASE + "/" + id + "/visibility").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"isPublic\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPublic").value(true));
    }

    @Test
    void reorderNeedsEveryCertificateExactlyOnce() throws Exception {
        String a = create(body("A", "X", ""));
        String b = create(body("B", "X", ""));
        String c = create(body("C", "X", ""));

        mockMvc.perform(put(BASE + "/order").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("[\"%s\",\"%s\",\"%s\"]".formatted(a, b, c)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get(BASE).session(session)).andExpect(jsonPath("$[*].title", contains("A", "B", "C")));

        for (String invalid : new String[] {"[\"%s\",\"%s\"]".formatted(a, b),
                "[\"%s\",\"%s\",\"%s\"]".formatted(a, a, b),
                "[\"%s\",\"%s\",\"%s\"]".formatted(a, b, UUID.randomUUID())}) {
            mockMvc.perform(put(BASE + "/order").session(session).with(csrf())
                            .contentType(MediaType.APPLICATION_JSON).content(invalid))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void needsLogin() throws Exception {
        mockMvc.perform(get(BASE)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(BASE).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body("A", "B", "")))
                .andExpect(status().isUnauthorized());
    }
}

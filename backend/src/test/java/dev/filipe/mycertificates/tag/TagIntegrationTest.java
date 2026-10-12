package dev.filipe.mycertificates.tag;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import dev.filipe.mycertificates.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

class TagIntegrationTest extends IntegrationTest {

    private MockHttpSession session;

    @BeforeEach
    void setUp() throws Exception {
        deleteCertificatesAndTags();
        session = loginAsOwner();
    }

    private String createTag(String name) throws Exception {
        String json = mockMvc.perform(post("/api/admin/tags").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.id");
    }

    private String createCertificate(String tagsJson) throws Exception {
        String json = mockMvc.perform(post("/api/admin/certificates").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"T\",\"issuer\":\"I\",\"issueDate\":\"2025-01-01\",\"tags\":" + tagsJson + "}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.id");
    }

    @Test
    void listsTagsWithUsageSortedByName() throws Exception {
        createTag("zeta");
        createCertificate("[\"Java\",\"cloud\"]");
        createCertificate("[\"Cloud\"]");

        mockMvc.perform(get("/api/admin/tags").session(session))
                .andExpect(jsonPath("$[*].name", contains("cloud", "Java", "zeta")))
                .andExpect(jsonPath("$[0].certificateCount").value(2))
                .andExpect(jsonPath("$[2].certificateCount").value(0));
    }

    @Test
    void namesAreUniqueIgnoringCase() throws Exception {
        createTag("Cloud");

        mockMvc.perform(post("/api/admin/tags").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\" CLOUD \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").value("A tag with this name already exists"));
    }

    @Test
    void renameShowsOnCertificates() throws Exception {
        String certificateId = createCertificate("[\"Clod\"]");
        String tagId = JsonPath.read(mockMvc.perform(get("/api/admin/tags").session(session))
                .andReturn().getResponse().getContentAsString(), "$[0].id");

        mockMvc.perform(put("/api/admin/tags/" + tagId).session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Cloud\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/certificates/" + certificateId).session(session))
                .andExpect(jsonPath("$.tags", contains("Cloud")));
    }

    @Test
    void deletingATagRemovesItFromCertificates() throws Exception {
        String certificateId = createCertificate("[\"Old\"]");
        String tagId = JsonPath.read(mockMvc.perform(get("/api/admin/tags").session(session))
                .andReturn().getResponse().getContentAsString(), "$[0].id");

        mockMvc.perform(delete("/api/admin/tags/" + tagId).session(session).with(csrf()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/certificates/" + certificateId).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tags", empty()));
    }
}

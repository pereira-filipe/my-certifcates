package dev.filipe.mycertificates.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.filipe.mycertificates.IntegrationTest;
import org.junit.jupiter.api.Test;

class PingIntegrationTest extends IntegrationTest {

    @Test
    void pingIsPublic() throws Exception {
        mockMvc.perform(get("/api/public/ping"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void unknownPublicPathUsesTheErrorFormat() throws Exception {
        mockMvc.perform(get("/api/public/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    void adminPathsAreClosed() throws Exception {
        mockMvc.perform(get("/api/admin/certificates")).andExpect(status().is4xxClientError());
    }
}

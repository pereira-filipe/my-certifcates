package dev.filipe.mycertificates.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.filipe.mycertificates.IntegrationTest;
import jakarta.servlet.http.Cookie;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class AuthIntegrationTest extends IntegrationTest {

    private static final String EMAIL = OWNER_EMAIL;
    private static final String PASSWORD = OWNER_PASSWORD;

    @Autowired
    private LoginAttemptService loginAttempts;

    @Autowired
    private UserRepository users;

    @BeforeEach
    void resetRateLimit() {
        loginAttempts.clear();
    }

    private static MockHttpServletRequestBuilder login(String email, String password) {
        return post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}");
    }

    private MockHttpSession loggedInSession() throws Exception {
        MvcResult result = mockMvc.perform(login(EMAIL, PASSWORD).with(csrf()))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void ownerAccountIsCreatedOnStartup() {
        User owner = users.findByEmailIgnoreCase(EMAIL).orElseThrow();
        assertThat(owner.getPasswordHash()).startsWith("$2").doesNotContain(PASSWORD);
        assertThat(owner.getShareToken()).hasSize(32);
        assertThat(owner.getDisplayName()).isEqualTo("owner");
    }

    @Test
    void loginStartsASession() throws Exception {
        MockHttpSession session = loggedInSession();

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.displayName").value("owner"));
    }

    @Test
    void emailIsCaseInsensitive() throws Exception {
        mockMvc.perform(login("  Owner@Example.com ", PASSWORD).with(csrf())).andExpect(status().isOk());
    }

    @Test
    void wrongPasswordAndUnknownEmailGiveTheSameError() throws Exception {
        for (MockHttpServletRequestBuilder request : new MockHttpServletRequestBuilder[] {
                login(EMAIL, "wrong-password-123"), login("nobody@example.com", PASSWORD)}) {
            mockMvc.perform(request.with(csrf()))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"))
                    .andExpect(jsonPath("$.message").value("Invalid email or password"));
        }
    }

    @Test
    void blankFieldsAreAValidationError() throws Exception {
        mockMvc.perform(login("", "").with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.email").exists())
                .andExpect(jsonPath("$.fields.password").exists());
    }

    @Test
    void meWithoutLoginIs401Json() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    void adminEndpointsNeedLogin() throws Exception {
        mockMvc.perform(get("/api/admin/certificates")).andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithoutCsrfTokenIsRejected() throws Exception {
        mockMvc.perform(login(EMAIL, PASSWORD))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("CSRF_TOKEN_INVALID"));
    }

    @Test
    void browserFlowCsrfCookieThenHeader() throws Exception {
        // What the SPA does: any GET hands out the XSRF-TOKEN cookie, which is sent back as a header.
        List<String> setCookies = mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getHeaders("Set-Cookie");
        String setCookie = setCookies.stream().filter(c -> c.startsWith("XSRF-TOKEN=")).findFirst().orElseThrow();
        assertThat(setCookie).doesNotContainIgnoringCase("HttpOnly");
        String token = setCookie.substring("XSRF-TOKEN=".length(), setCookie.indexOf(';'));

        mockMvc.perform(login(EMAIL, PASSWORD).cookie(new Cookie("XSRF-TOKEN", token)).header("X-XSRF-TOKEN", token))
                .andExpect(status().isOk());
    }

    @Test
    void logoutEndsTheSession() throws Exception {
        MockHttpSession session = loggedInSession();

        mockMvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void fiveFailuresBlockEvenTheRightPassword() throws Exception {
        for (int i = 0; i < LoginAttemptService.MAX_FAILURES; i++) {
            mockMvc.perform(login(EMAIL, "wrong-password-123").with(csrf())).andExpect(status().isUnauthorized());
        }

        mockMvc.perform(login(EMAIL, PASSWORD).with(csrf()))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.error").value("LOGIN_BLOCKED"));
    }
}

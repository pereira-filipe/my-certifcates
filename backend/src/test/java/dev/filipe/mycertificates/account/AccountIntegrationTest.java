package dev.filipe.mycertificates.account;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.filipe.mycertificates.IntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;

class AccountIntegrationTest extends IntegrationTest {

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Other test classes log in with the original password and name. */
    @AfterEach
    void restoreOwner() {
        jdbc.update("UPDATE users SET password_hash = ?, display_name = 'owner' WHERE email = ?",
                passwordEncoder.encode(OWNER_PASSWORD), OWNER_EMAIL);
    }

    @Test
    void updatesTheDisplayName() throws Exception {
        MockHttpSession session = loginAsOwner();

        mockMvc.perform(put("/api/admin/account").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"displayName\":\"  Filipe Pereira \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Filipe Pereira"));

        mockMvc.perform(get("/api/auth/me").session(session)).andExpect(jsonPath("$.displayName").value("Filipe Pereira"));
    }

    @Test
    void changesThePasswordOnlyWithTheCurrentOne() throws Exception {
        MockHttpSession session = loginAsOwner();

        mockMvc.perform(put("/api/admin/account/password").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"wrong\",\"newPassword\":\"a-brand-new-password\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.currentPassword").value("is incorrect"));

        mockMvc.perform(put("/api/admin/account/password").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + OWNER_PASSWORD + "\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.newPassword").exists());

        mockMvc.perform(put("/api/admin/account/password").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + OWNER_PASSWORD + "\",\"newPassword\":\"a-brand-new-password\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + OWNER_EMAIL + "\",\"password\":\"a-brand-new-password\"}"))
                .andExpect(status().isOk());
    }
}

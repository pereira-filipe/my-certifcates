package dev.filipe.mycertificates.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import dev.filipe.mycertificates.common.AppProperties;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class OwnerBootstrapTest {

    private final UserRepository users = mock(UserRepository.class);

    private OwnerBootstrap bootstrap(String email, String password, String... profiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        AppProperties properties = new AppProperties(new AppProperties.Owner(email, password), null, null);
        return new OwnerBootstrap(users, new BCryptPasswordEncoder(), properties, environment);
    }

    @Test
    void prodRefusesToStartWithoutOwnerSettings() {
        assertThatThrownBy(() -> bootstrap("", "", "prod").run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_OWNER_EMAIL");
    }

    @Test
    void devOnlyWarnsWithoutOwnerSettings() {
        bootstrap("", "", "dev").run(new DefaultApplicationArguments());
        verify(users, never()).save(any());
    }

    @Test
    void rejectsShortPasswords() {
        assertThatThrownBy(() -> bootstrap("me@example.com", "short", "dev").run(new DefaultApplicationArguments()))
                .hasMessageContaining("at least 12");
    }

    @Test
    void doesNothingWhenTheOwnerExists() {
        when(users.count()).thenReturn(1L);
        bootstrap("me@example.com", "long-enough-password").run(new DefaultApplicationArguments());
        verify(users, never()).save(any());
    }
}

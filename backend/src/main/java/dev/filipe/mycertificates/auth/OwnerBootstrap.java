package dev.filipe.mycertificates.auth;

import dev.filipe.mycertificates.common.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Creates the owner account on first startup from APP_OWNER_EMAIL / APP_OWNER_PASSWORD
 * (specs/BACKEND.md §5). Does nothing once a user exists.
 */
@Component
public class OwnerBootstrap implements ApplicationRunner {

    public static final int MIN_PASSWORD_LENGTH = 12;

    private static final Logger log = LoggerFactory.getLogger(OwnerBootstrap.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties properties;
    private final Environment environment;

    public OwnerBootstrap(UserRepository users, PasswordEncoder passwordEncoder, AppProperties properties,
            Environment environment) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
        this.environment = environment;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }

        String email = properties.owner().email();
        String password = properties.owner().password();
        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            if (environment.acceptsProfiles(Profiles.of("prod"))) {
                throw new IllegalStateException("No owner account yet: set APP_OWNER_EMAIL and APP_OWNER_PASSWORD");
            }
            log.warn("No owner account yet. Set APP_OWNER_EMAIL and APP_OWNER_PASSWORD (e.g. in .env) to create it.");
            return;
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException("APP_OWNER_PASSWORD must have at least " + MIN_PASSWORD_LENGTH + " characters");
        }

        String normalizedEmail = email.trim().toLowerCase();
        // Shown on the catalog header until changed in Settings.
        int at = normalizedEmail.indexOf('@');
        String displayName = at > 0 ? normalizedEmail.substring(0, at) : normalizedEmail;
        users.save(new User(normalizedEmail, passwordEncoder.encode(password), displayName, ShareTokens.generate()));
        log.info("Created the owner account for {}", normalizedEmail);
    }
}

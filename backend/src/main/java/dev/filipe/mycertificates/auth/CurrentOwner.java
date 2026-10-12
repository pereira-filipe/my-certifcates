package dev.filipe.mycertificates.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** The logged-in owner. Every admin query is scoped to this user. */
@Component
public class CurrentOwner {

    private final UserRepository users;

    public CurrentOwner(UserRepository users) {
        this.users = users;
    }

    public User get() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("No logged-in owner");
        }
        return users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Logged-in user no longer exists"));
    }
}

package dev.filipe.mycertificates.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** The {@code app.*} settings from application.yml (filled from env vars, see specs/BACKEND.md §7). */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Owner owner, Storage storage, String baseUrl) {

    public record Owner(String email, String password) {
    }

    public record Storage(String type, String localDir) {
    }
}

package dev.filipe.mycertificates.auth;

import java.security.SecureRandom;
import java.util.Base64;

/** Random, unguessable tokens for the public catalog link (specs/BACKEND.md §8). */
public final class ShareTokens {

    private static final SecureRandom RANDOM = new SecureRandom();

    private ShareTokens() {
    }

    /** 24 random bytes → 32 URL-safe characters. */
    public static String generate() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}

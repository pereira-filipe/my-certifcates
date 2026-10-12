package dev.filipe.mycertificates.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Login rate limit (specs/BACKEND.md §5): after 5 failed attempts from one IP or for one email
 * within 15 minutes, that IP/email is blocked for 15 minutes.
 * Kept in memory: fine for a single app instance; counters reset on restart.
 */
@Service
public class LoginAttemptService {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int PRUNE_THRESHOLD = 10_000;

    private record Attempts(int failures, Instant windowStart, Instant blockedUntil) {
    }

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginAttemptService() {
        this(Clock.systemUTC());
    }

    LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    /** How long until the IP or email may try again; empty when not blocked. */
    public Optional<Duration> blockedFor(String ip, String email) {
        Instant now = clock.instant();
        return java.util.stream.Stream.of(ipKey(ip), emailKey(email))
                .map(attempts::get)
                .filter(a -> a != null && a.blockedUntil() != null && a.blockedUntil().isAfter(now))
                .map(a -> Duration.between(now, a.blockedUntil()))
                .max(Duration::compareTo);
    }

    public void recordFailure(String ip, String email) {
        if (attempts.size() > PRUNE_THRESHOLD) {
            prune();
        }
        Instant now = clock.instant();
        for (String key : new String[] {ipKey(ip), emailKey(email)}) {
            attempts.compute(key, (k, current) -> {
                if (current == null || current.windowStart().plus(WINDOW).isBefore(now)) {
                    return new Attempts(1, now, null);
                }
                int failures = current.failures() + 1;
                Instant blockedUntil = failures >= MAX_FAILURES ? now.plus(WINDOW) : null;
                return new Attempts(failures, current.windowStart(), blockedUntil);
            });
        }
    }

    public void recordSuccess(String ip, String email) {
        attempts.remove(ipKey(ip));
        attempts.remove(emailKey(email));
    }

    /** For tests. */
    public void clear() {
        attempts.clear();
    }

    private void prune() {
        Instant now = clock.instant();
        attempts.values().removeIf(a -> a.windowStart().plus(WINDOW).isBefore(now)
                && (a.blockedUntil() == null || a.blockedUntil().isBefore(now)));
    }

    private static String ipKey(String ip) {
        return "ip:" + ip;
    }

    private static String emailKey(String email) {
        return "email:" + email.trim().toLowerCase();
    }
}

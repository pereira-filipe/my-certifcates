package dev.filipe.mycertificates.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class LoginAttemptServiceTest {

    /** A clock the test can move forward. */
    static class TestClock extends Clock {

        Instant now = Instant.parse("2026-01-01T10:00:00Z");

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private final TestClock clock = new TestClock();
    private final LoginAttemptService service = new LoginAttemptService(clock);

    private void fail(String ip, String email, int times) {
        for (int i = 0; i < times; i++) {
            service.recordFailure(ip, email);
        }
    }

    @Test
    void blocksAfterFiveFailuresForFifteenMinutes() {
        fail("1.1.1.1", "a@example.com", 4);
        assertThat(service.blockedFor("1.1.1.1", "a@example.com")).isEmpty();

        fail("1.1.1.1", "a@example.com", 1);
        assertThat(service.blockedFor("1.1.1.1", "a@example.com")).contains(Duration.ofMinutes(15));

        clock.now = clock.now.plus(Duration.ofMinutes(15)).plusSeconds(1);
        assertThat(service.blockedFor("1.1.1.1", "a@example.com")).isEmpty();
    }

    @Test
    void blocksTheEmailFromAnyIp() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("10.0.0." + i, "A@Example.com");
        }
        assertThat(service.blockedFor("99.9.9.9", "a@example.com")).isPresent();
    }

    @Test
    void blocksTheIpForAnyEmail() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("1.1.1.1", "user" + i + "@example.com");
        }
        assertThat(service.blockedFor("1.1.1.1", "new@example.com")).isPresent();
    }

    @Test
    void failuresOutsideTheWindowStartOver() {
        fail("1.1.1.1", "a@example.com", 4);
        clock.now = clock.now.plus(Duration.ofMinutes(16));
        fail("1.1.1.1", "a@example.com", 1);
        assertThat(service.blockedFor("1.1.1.1", "a@example.com")).isEmpty();
    }

    @Test
    void successResetsTheCounters() {
        fail("1.1.1.1", "a@example.com", 4);
        service.recordSuccess("1.1.1.1", "a@example.com");
        fail("1.1.1.1", "a@example.com", 4);
        assertThat(service.blockedFor("1.1.1.1", "a@example.com")).isEmpty();
    }
}

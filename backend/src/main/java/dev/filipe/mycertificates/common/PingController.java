package dev.filipe.mycertificates.common;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Temporary M1 check that the frontend can reach the backend. Remove once real public endpoints exist (B5). */
@RestController
public class PingController {

    @GetMapping("/api/public/ping")
    Map<String, String> ping() {
        return Map.of("status", "ok");
    }
}

package dev.filipe.mycertificates.tag;

import java.util.UUID;

/** A tag and how many certificates use it (GET /api/admin/tags). */
public record TagUsage(UUID id, String name, long certificateCount) {
}

package dev.filipe.mycertificates.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/**
 * The single error format for every API error (specs/BACKEND.md §3):
 * {@code { "status": 400, "error": "VALIDATION_ERROR", "message": "...", "fields": { ... } }}.
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiError(int status, String error, String message, Map<String, String> fields) {

    public ApiError(int status, String error, String message) {
        this(status, error, message, Map.of());
    }
}

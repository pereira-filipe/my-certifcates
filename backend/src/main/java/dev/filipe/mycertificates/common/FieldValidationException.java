package dev.filipe.mycertificates.common;

import java.util.Map;

/** A rule that Bean Validation can't express (e.g. comparing two fields). Answered as 400 VALIDATION_ERROR. */
public class FieldValidationException extends RuntimeException {

    private final Map<String, String> fields;

    public FieldValidationException(String field, String message) {
        super(message);
        this.fields = Map.of(field, message);
    }

    public Map<String, String> getFields() {
        return fields;
    }
}

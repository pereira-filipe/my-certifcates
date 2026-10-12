package dev.filipe.mycertificates.common;

/** Something doesn't exist, or the caller isn't allowed to know it exists. Always answered with 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}

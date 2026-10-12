package dev.filipe.mycertificates.file;

import java.util.Arrays;
import java.util.Optional;

/**
 * The allowed file types (specs/BACKEND.md §4), recognised by their first bytes ("magic bytes"),
 * never by the file name or the browser's Content-Type, which anyone can fake.
 */
public enum FileType {

    PDF("application/pdf", "pdf"),
    PNG("image/png", "png"),
    JPEG("image/jpeg", "jpg"),
    WEBP("image/webp", "webp");

    private static final byte[] PDF_MAGIC = {'%', 'P', 'D', 'F', '-'};
    private static final byte[] PNG_MAGIC = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] RIFF = {'R', 'I', 'F', 'F'};
    private static final byte[] WEBP_MARK = {'W', 'E', 'B', 'P'};

    /** How many bytes {@link #detect} needs. */
    public static final int HEADER_LENGTH = 12;

    private final String contentType;
    private final String extension;

    FileType(String contentType, String extension) {
        this.contentType = contentType;
        this.extension = extension;
    }

    public String contentType() {
        return contentType;
    }

    public String extension() {
        return extension;
    }

    public boolean isImage() {
        return this != PDF;
    }

    public static Optional<FileType> detect(byte[] header) {
        if (startsWith(header, 0, PDF_MAGIC)) return Optional.of(PDF);
        if (startsWith(header, 0, PNG_MAGIC)) return Optional.of(PNG);
        if (startsWith(header, 0, JPEG_MAGIC)) return Optional.of(JPEG);
        if (startsWith(header, 0, RIFF) && startsWith(header, 8, WEBP_MARK)) return Optional.of(WEBP);
        return Optional.empty();
    }

    public static Optional<FileType> fromContentType(String contentType) {
        return Arrays.stream(values()).filter(t -> t.contentType.equals(contentType)).findFirst();
    }

    private static boolean startsWith(byte[] data, int offset, byte[] prefix) {
        if (data.length < offset + prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (data[offset + i] != prefix[i]) return false;
        }
        return true;
    }
}

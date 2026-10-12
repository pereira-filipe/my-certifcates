package dev.filipe.mycertificates.file;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class FileTypeTest {

    private static byte[] header(byte[] data) {
        return Arrays.copyOf(data, Math.min(data.length, FileType.HEADER_LENGTH));
    }

    @Test
    void recognisesEachAllowedType() {
        assertThat(FileType.detect(header(TestFiles.pdf()))).contains(FileType.PDF);
        assertThat(FileType.detect(header(TestFiles.image("png", 2, 2)))).contains(FileType.PNG);
        assertThat(FileType.detect(header(TestFiles.image("jpg", 2, 2)))).contains(FileType.JPEG);
        assertThat(FileType.detect(header(TestFiles.webp()))).contains(FileType.WEBP);
    }

    @Test
    void refusesEverythingElse() {
        for (String content : new String[] {"<html><script>", "<svg xmlns=", "GIF89a......", "RIFF....WAVE", "", "%PD"}) {
            assertThat(FileType.detect(content.getBytes(StandardCharsets.US_ASCII))).as(content).isEmpty();
        }
    }
}

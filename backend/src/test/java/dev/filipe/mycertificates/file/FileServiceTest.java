package dev.filipe.mycertificates.file;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class FileServiceTest {

    @Test
    void cleansOriginalNames() {
        assertThat(FileService.cleanName("C:\\Users\\me\\AWS cert.pdf", FileType.PDF)).isEqualTo("AWS cert.pdf");
        assertThat(FileService.cleanName("../../etc/passwd", FileType.PDF)).isEqualTo("passwd");
        assertThat(FileService.cleanName("bad\nname\u0000.png", FileType.PNG)).isEqualTo("badname.png");
        assertThat(FileService.cleanName("   ", FileType.JPEG)).isEqualTo("certificate.jpg");
        assertThat(FileService.cleanName(null, FileType.WEBP)).isEqualTo("certificate.webp");
        assertThat(FileService.cleanName("x".repeat(300) + ".pdf", FileType.PDF)).hasSize(255).endsWith(".pdf");
    }
}

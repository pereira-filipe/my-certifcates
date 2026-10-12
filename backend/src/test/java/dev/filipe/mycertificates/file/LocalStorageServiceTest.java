package dev.filipe.mycertificates.file;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.filipe.mycertificates.common.AppProperties;
import java.io.ByteArrayInputStream;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalStorageServiceTest {

    @TempDir
    Path root;

    private LocalStorageService storage() {
        return new LocalStorageService(new AppProperties(null, new AppProperties.Storage("local", root.toString()), null));
    }

    @Test
    void savesLoadsAndDeletesByKey() throws Exception {
        LocalStorageService storage = storage();
        storage.save("certificates/a/b.pdf", new ByteArrayInputStream(new byte[] {1, 2, 3}), "application/pdf");

        assertThat(storage.load("certificates/a/b.pdf").getContentAsByteArray()).containsExactly(1, 2, 3);
        assertThat(root.resolve("certificates/a/b.pdf")).exists();

        storage.save("certificates/c/d.pdf", new ByteArrayInputStream(new byte[] {4}), "application/pdf");

        storage.delete("certificates/a/b.pdf");
        storage.delete("certificates/a/b.pdf"); // deleting twice is fine
        assertThat(storage.load("certificates/a/b.pdf").exists()).isFalse();
        // Empty folders are removed, folders that still hold files and the root stay.
        assertThat(root.resolve("certificates/a")).doesNotExist();
        assertThat(root.resolve("certificates/c/d.pdf")).exists();

        storage.delete("certificates/c/d.pdf");
        assertThat(root.resolve("certificates")).doesNotExist();
        assertThat(root).exists();
    }

    @Test
    void keysCannotEscapeTheFolder() {
        LocalStorageService storage = storage();
        for (String key : new String[] {"../secret", "certificates/../../x", "/etc/passwd", ""}) {
            assertThatThrownBy(() -> storage.load(key)).as(key).isInstanceOf(IllegalArgumentException.class);
        }
    }
}

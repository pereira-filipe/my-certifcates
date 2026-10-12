package dev.filipe.mycertificates.file;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Optional;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * PNG previews for the catalog cards: page 1 of a PDF, or a scaled-down image (specs/BACKEND.md §4).
 * Any failure just means "no thumbnail" — it never fails the upload.
 */
@Service
public class ThumbnailService {

    /** Wide enough for a sharp card on high-density screens. */
    static final int MAX_WIDTH = 640;

    /** Refuse to decode absurd pixel counts (a small file can claim a huge image and exhaust memory). */
    private static final long MAX_SOURCE_PIXELS = 50_000_000L;

    private static final Logger log = LoggerFactory.getLogger(ThumbnailService.class);

    public Optional<byte[]> create(Path file, FileType type) {
        try {
            BufferedImage source = type == FileType.PDF ? renderFirstPage(file) : readImage(file);
            return source == null ? Optional.empty() : Optional.of(toPng(scale(source)));
        } catch (IOException | RuntimeException e) {
            log.warn("Could not create a thumbnail ({}): {}", type, e.getMessage());
            return Optional.empty();
        }
    }

    private static BufferedImage renderFirstPage(Path file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.toFile())) {
            if (document.getNumberOfPages() == 0) {
                return null;
            }
            PDRectangle box = document.getPage(0).getCropBox();
            // Pick the scale from the page size, so huge pages don't produce huge images.
            float scale = Math.min(2f, MAX_WIDTH / Math.max(1f, box.getWidth()));
            return new PDFRenderer(document).renderImage(0, scale, ImageType.RGB);
        }
    }

    private static BufferedImage readImage(Path file) throws IOException {
        try (ImageInputStream input = ImageIO.createImageInputStream(file.toFile())) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                return null;
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                if ((long) reader.getWidth(0) * reader.getHeight(0) > MAX_SOURCE_PIXELS) {
                    log.warn("Image too large for a thumbnail: {}x{}", reader.getWidth(0), reader.getHeight(0));
                    return null;
                }
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        }
    }

    private static BufferedImage scale(BufferedImage source) {
        int width = Math.min(MAX_WIDTH, source.getWidth());
        int height = Math.max(1, Math.round(source.getHeight() * (width / (float) source.getWidth())));
        BufferedImage target = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = target.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setColor(Color.WHITE); // transparent images get a white background
            g.fillRect(0, 0, width, height);
            g.drawImage(source, 0, 0, width, height, null);
        } finally {
            g.dispose();
        }
        return target;
    }

    private static byte[] toPng(BufferedImage image) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}

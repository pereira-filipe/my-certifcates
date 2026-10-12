package dev.filipe.mycertificates.file;

import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** The owner's certificate files (specs/BACKEND.md §3). */
@RestController
public class FileAdminController {

    private final FileService fileService;

    public FileAdminController(FileService fileService) {
        this.fileService = fileService;
    }

    @PostMapping("/api/admin/certificates/{certificateId}/files")
    @ResponseStatus(HttpStatus.CREATED)
    CertificateFileResponse upload(@PathVariable UUID certificateId, @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "false") boolean primary) {
        return fileService.upload(certificateId, file, primary);
    }

    @GetMapping("/api/admin/files/{fileId}")
    ResponseEntity<Resource> download(@PathVariable UUID fileId,
            @RequestParam(defaultValue = "false") boolean download) {
        return FileResponses.of(fileService.load(fileId), download);
    }

    @GetMapping("/api/admin/files/{fileId}/thumbnail")
    ResponseEntity<Resource> thumbnail(@PathVariable UUID fileId) {
        return FileResponses.of(fileService.loadThumbnail(fileId), false);
    }

    @PatchMapping("/api/admin/files/{fileId}/primary")
    CertificateFileResponse makePrimary(@PathVariable UUID fileId) {
        return fileService.makePrimary(fileId);
    }

    @DeleteMapping("/api/admin/files/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID fileId) {
        fileService.delete(fileId);
    }
}

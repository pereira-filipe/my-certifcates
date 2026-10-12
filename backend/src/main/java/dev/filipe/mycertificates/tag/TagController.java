package dev.filipe.mycertificates.tag;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/tags")
public class TagController {

    public record TagRequest(@NotBlank @Size(max = Tag.MAX_NAME_LENGTH) String name) {
    }

    public record TagResponse(UUID id, String name) {

        static TagResponse of(Tag tag) {
            return new TagResponse(tag.getId(), tag.getName());
        }
    }

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping
    List<TagUsage> list() {
        return tagService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    TagResponse create(@Valid @RequestBody TagRequest body) {
        return TagResponse.of(tagService.create(body.name()));
    }

    @PutMapping("/{id}")
    TagResponse rename(@PathVariable UUID id, @Valid @RequestBody TagRequest body) {
        return TagResponse.of(tagService.rename(id, body.name()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        tagService.delete(id);
    }
}

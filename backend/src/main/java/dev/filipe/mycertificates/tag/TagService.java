package dev.filipe.mycertificates.tag;

import dev.filipe.mycertificates.auth.CurrentOwner;
import dev.filipe.mycertificates.auth.User;
import dev.filipe.mycertificates.common.FieldValidationException;
import dev.filipe.mycertificates.common.NotFoundException;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TagService {

    private final TagRepository tags;
    private final CurrentOwner currentOwner;

    public TagService(TagRepository tags, CurrentOwner currentOwner) {
        this.tags = tags;
        this.currentOwner = currentOwner;
    }

    @Transactional(readOnly = true)
    public List<TagUsage> list() {
        return tags.findUsage(currentOwner.get());
    }

    public Tag create(String name) {
        User owner = currentOwner.get();
        String normalized = normalize(name);
        ensureUnique(owner, normalized, null);
        return tags.save(new Tag(owner, normalized));
    }

    public Tag rename(UUID id, String name) {
        User owner = currentOwner.get();
        Tag tag = find(owner, id);
        String normalized = normalize(name);
        ensureUnique(owner, normalized, id);
        tag.rename(normalized);
        return tag;
    }

    /** The tag is also removed from every certificate (ON DELETE CASCADE on certificate_tags). */
    public void delete(UUID id) {
        tags.delete(find(currentOwner.get(), id));
    }

    /** Finds the owner's tags by name, creating the ones that don't exist yet. Case-insensitive, no duplicates. */
    public Set<Tag> resolve(User owner, Collection<String> names) {
        Map<String, String> unique = new LinkedHashMap<>();
        for (String name : names) {
            String normalized = normalize(name);
            if (!normalized.isEmpty()) {
                unique.putIfAbsent(normalized.toLowerCase(), normalized);
            }
        }
        Set<Tag> result = new LinkedHashSet<>();
        for (String name : unique.values()) {
            result.add(tags.findByOwnerAndNameIgnoreCase(owner, name).orElseGet(() -> tags.save(new Tag(owner, name))));
        }
        return result;
    }

    private Tag find(User owner, UUID id) {
        return tags.findByIdAndOwner(id, owner).orElseThrow(() -> new NotFoundException("Tag not found"));
    }

    private void ensureUnique(User owner, String name, UUID exceptId) {
        tags.findByOwnerAndNameIgnoreCase(owner, name)
                .filter(existing -> !existing.getId().equals(exceptId))
                .ifPresent(existing -> {
                    throw new FieldValidationException("name", "A tag with this name already exists");
                });
    }

    /** Trims and collapses inner whitespace: "  Cloud   Security " → "Cloud Security". */
    static String normalize(String name) {
        return name == null ? "" : name.trim().replaceAll("\\s+", " ");
    }
}

package dev.filipe.mycertificates.account;

import dev.filipe.mycertificates.auth.CurrentOwner;
import dev.filipe.mycertificates.auth.User;
import dev.filipe.mycertificates.auth.UserRepository;
import dev.filipe.mycertificates.common.FieldValidationException;
import java.nio.charset.StandardCharsets;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AccountService {

    private final CurrentOwner currentOwner;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public AccountService(CurrentOwner currentOwner, UserRepository users, PasswordEncoder passwordEncoder) {
        this.currentOwner = currentOwner;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    public User updateDisplayName(String displayName) {
        User owner = currentOwner.get();
        owner.setDisplayName(displayName.trim());
        return users.save(owner);
    }

    public void changePassword(String currentPassword, String newPassword) {
        User owner = currentOwner.get();
        if (!passwordEncoder.matches(currentPassword, owner.getPasswordHash())) {
            throw new FieldValidationException("currentPassword", "is incorrect");
        }
        if (newPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new FieldValidationException("newPassword", "is too long");
        }
        owner.setPasswordHash(passwordEncoder.encode(newPassword));
        users.save(owner);
    }
}

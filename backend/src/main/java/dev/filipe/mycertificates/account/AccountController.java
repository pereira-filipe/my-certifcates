package dev.filipe.mycertificates.account;

import dev.filipe.mycertificates.auth.AuthController.MeResponse;
import dev.filipe.mycertificates.auth.OwnerBootstrap;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The owner's profile and password (specs/BACKEND.md §3). */
@RestController
@RequestMapping("/api/admin/account")
public class AccountController {

    public record ProfileRequest(@NotBlank @Size(max = 100) String displayName) {
    }

    /** BCrypt only uses the first 72 bytes, so longer passwords are refused rather than silently cut. */
    public record PasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = OwnerBootstrap.MIN_PASSWORD_LENGTH, max = 72) String newPassword) {
    }

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PutMapping
    MeResponse updateProfile(@Valid @RequestBody ProfileRequest body) {
        return MeResponse.of(accountService.updateDisplayName(body.displayName()));
    }

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void changePassword(@Valid @RequestBody PasswordRequest body) {
        accountService.changePassword(body.currentPassword(), body.newPassword());
    }
}

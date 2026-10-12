package dev.filipe.mycertificates.auth;

import dev.filipe.mycertificates.common.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Duration;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Login and "who am I". Logout is handled by Spring Security at POST /api/auth/logout (see SecurityConfig). */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    public record MeResponse(String email, String displayName) {

        static MeResponse of(User user) {
            return new MeResponse(user.getEmail(), user.getDisplayName());
        }
    }

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final LoginAttemptService loginAttempts;
    private final UserRepository users;
    private final SecurityContextHolderStrategy contextHolder = SecurityContextHolder.getContextHolderStrategy();

    public AuthController(AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository, LoginAttemptService loginAttempts,
            UserRepository users) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.loginAttempts = loginAttempts;
        this.users = users;
    }

    @PostMapping("/login")
    ResponseEntity<?> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request,
            HttpServletResponse response) {
        String ip = request.getRemoteAddr();

        Optional<Duration> blocked = loginAttempts.blockedFor(ip, body.email());
        if (blocked.isPresent()) {
            long minutes = Math.max(1, (blocked.get().toSeconds() + 59) / 60);
            return ResponseEntity.status(429)
                    .header(HttpHeaders.RETRY_AFTER, String.valueOf(blocked.get().toSeconds()))
                    .body(new ApiError(429, "LOGIN_BLOCKED",
                            "Too many failed attempts. Try again in " + minutes + " minutes."));
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(body.email().trim(), body.password()));
        } catch (AuthenticationException ex) {
            loginAttempts.recordFailure(ip, body.email());
            // Never say whether the email or the password was wrong.
            return ResponseEntity.status(401)
                    .body(new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password"));
        }
        loginAttempts.recordSuccess(ip, body.email());

        // New session id on login (prevents session fixation), then store the login in the session.
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        SecurityContext context = contextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        contextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        return ResponseEntity.ok(MeResponse.of(currentUser(authentication)));
    }

    @GetMapping("/me")
    MeResponse me(Authentication authentication) {
        return MeResponse.of(currentUser(authentication));
    }

    private User currentUser(Authentication authentication) {
        return users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Logged-in user no longer exists"));
    }
}

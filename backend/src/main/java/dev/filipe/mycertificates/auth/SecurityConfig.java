package dev.filipe.mycertificates.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Minimal rules for the skeleton: public endpoints open, everything else closed.
 * Login, sessions and CSRF are added in B2 (specs/BACKEND.md §5).
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**", "/actuator/health", "/error").permitAll()
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**").permitAll()
                .anyRequest().authenticated());
        return http.build();
    }
}

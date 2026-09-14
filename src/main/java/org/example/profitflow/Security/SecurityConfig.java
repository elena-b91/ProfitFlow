package org.example.profitflow.Security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Permite utilizarea @PreAuthorize în controllere
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;

    @Bean
    public JwtAuthFilter jwtAuthenticationFilter() {
        return new JwtAuthFilter(tokenProvider, userDetailsService);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(); // Standardul de aur pentru hash-ul parolelor
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Allow all CORS requests
                .cors(cors -> cors.configurationSource(request -> {
                    var config = new org.springframework.web.cors.CorsConfiguration();
                    config.setAllowedOrigins(java.util.Arrays.asList("*"));
                    config.setAllowedMethods(java.util.Arrays.asList("*"));
                    config.setAllowedHeaders(java.util.Arrays.asList("*"));
                    config.setMaxAge(3600L);
                    return config;
                }))
                .csrf(csrf -> csrf.disable())
                // Stateless session for JWT
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Configurarea rutei folosind noul format Lambda obligatoriu
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll() // Public (Login/Register)
                        .requestMatchers("/api/dev/**").permitAll()  // Development helper endpoints

                        // 1. REGULA REPARATĂ: Oricine e autentificat ca CHELNER sau MANAGER poate VEDEA meniul (GET)
                        .requestMatchers(HttpMethod.GET, "/api/menu-items/**").hasAnyRole("CHELNER", "MANAGER")

                        // 2. Doar MANAGER-ul poate MODIFICA meniul (POST, PUT, DELETE)
                        .requestMatchers(HttpMethod.POST, "/api/menu-items/**").hasRole("MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/api/menu-items/**").hasRole("MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/api/menu-items/**").hasRole("MANAGER")

                        // 3. Restul restricțiilor pentru Manager
                        .requestMatchers("/api/analytics/**").hasRole("MANAGER")
                        .requestMatchers("/api/ingredients/**").hasRole("MANAGER")
                        .requestMatchers("/api/users/**").hasRole("MANAGER")

                        // 4. Restricție pentru comenzi (Chelner + Manager pot crea comenzi)
                        .requestMatchers(HttpMethod.POST, "/api/orders").hasAnyRole("CHELNER", "MANAGER")

                        // Orice altă cerere cere autentificare directă
                        .anyRequest().authenticated()
                );

        // Adăugăm filtrul tău redenumit (JwtAuthFilter) înaintea filtrului standard
        http.addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
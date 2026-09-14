package org.example.profitflow.Controller;

import lombok.RequiredArgsConstructor;
import org.example.profitflow.Model.Role;
import org.example.profitflow.Model.User;
import org.example.profitflow.Repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Development helper endpoints to bootstrap an initial manager user for local testing.
 * Remove or secure these endpoints before deploying to production.
 */
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DevController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/create-manager")
    public ResponseEntity<String> createManager(@RequestParam String username, @RequestParam String password) {
        Optional<User> existing = userRepository.findByUsername(username);
        if (existing.isPresent()) {
            return ResponseEntity.ok("Manager already exists: " + username);
        }

        User m = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .firstName("Manager")
                .lastName("User")
                .role(Role.MANAGER)
                .build();

        userRepository.save(m);
        return ResponseEntity.ok("Created manager: " + username);
    }
}

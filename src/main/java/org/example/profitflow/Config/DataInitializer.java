package org.example.profitflow.Config;

import lombok.RequiredArgsConstructor;
import org.example.profitflow.Model.Role;
import org.example.profitflow.Model.User;
import org.example.profitflow.Repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByUsername("manager").isEmpty()) {
            userRepository.save(User.builder()
                    .username("manager")
                    .password(passwordEncoder.encode("manager123"))
                    .firstName("Manager")
                    .lastName("User")
                    .role(Role.MANAGER)
                    .build());
        }

        if (userRepository.findByUsername("waiter").isEmpty()) {
            userRepository.save(User.builder()
                    .username("waiter")
                    .password(passwordEncoder.encode("waiter123"))
                    .firstName("Waiter")
                    .lastName("User")
                    .role(Role.CHELNER)
                    .build());
        }
    }
}

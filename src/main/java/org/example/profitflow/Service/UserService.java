package org.example.profitflow.Service;

import org.example.profitflow.Dto.UserRequest;
import org.example.profitflow.Model.Role;
import org.example.profitflow.Model.User;
import org.example.profitflow.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User createUser(UserRequest userRequest) {
        User user = User.builder()
                .username(userRequest.getUsername())
                .password(passwordEncoder.encode(userRequest.getPassword()))
                .firstName(userRequest.getFirstName())
                .lastName(userRequest.getLastName())
                .role(Role.valueOf(userRequest.getRole()))
                .build();
        return userRepository.save(user);
    }

    public User updateUser(Long id, UserRequest userRequest) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setUsername(userRequest.getUsername());
                    user.setFirstName(userRequest.getFirstName());
                    user.setLastName(userRequest.getLastName());
                    if (userRequest.getPassword() != null && !userRequest.getPassword().isBlank()) {
                        user.setPassword(passwordEncoder.encode(userRequest.getPassword()));
                    }
                    if (userRequest.getRole() != null && !userRequest.getRole().isBlank()) {
                        user.setRole(Role.valueOf(userRequest.getRole()));
                    }
                    return userRepository.save(user);
                })
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}

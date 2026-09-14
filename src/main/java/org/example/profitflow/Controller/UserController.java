package org.example.profitflow.Controller;

import org.example.profitflow.Dto.UserRequest;
import org.example.profitflow.Dto.UserResponse;
import org.example.profitflow.Model.User;
import org.example.profitflow.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Creates a new user (employee) in the system.
     * Accessible by the Manager to onboard new staff.
     */
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@RequestBody UserRequest userRequest) {
        User savedUser = userService.createUser(userRequest);
        return new ResponseEntity<>(toResponse(savedUser), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers().stream().map(this::toResponse).toList());
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @RequestBody UserRequest userRequest) {
        User updatedUser = userService.updateUser(id, userRequest);
        return ResponseEntity.ok(toResponse(updatedUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getFirstName(), user.getLastName(), user.getRole().name());
    }
}
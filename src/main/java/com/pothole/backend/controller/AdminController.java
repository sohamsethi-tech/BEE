package com.pothole.backend.controller;

import com.pothole.backend.model.User;
import com.pothole.backend.repository.UserRepository;
import com.pothole.backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final AuthService    authService;

    public AdminController(UserRepository userRepository, AuthService authService) {
        this.userRepository = userRepository;
        this.authService    = authService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> users() {
        List<Map<String, Object>> list = userRepository.findAll().stream()
                .map(u -> Map.of(
                        "id",        (Object) u.getId(),
                        "name",      u.getName(),
                        "email",     u.getEmail(),
                        "role",      u.getRole().name(),
                        "createdAt", u.getCreatedAt().toString()
                )).toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/users/{id}/promote")
    public ResponseEntity<?> promote(@PathVariable Long id) {
        try {
            authService.promoteToAdmin(id);
            return ResponseEntity.ok(Map.of("message", "User promoted to ADMIN"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted"));
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        long total  = userRepository.count();
        long admins = userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.Role.ADMIN).count();
        return ResponseEntity.ok(Map.of(
                "totalUsers", total,
                "adminCount", admins,
                "userCount",  total - admins
        ));
    }
}

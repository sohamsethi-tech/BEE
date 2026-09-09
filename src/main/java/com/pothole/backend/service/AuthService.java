package com.pothole.backend.service;

import com.pothole.backend.dto.AuthDTOs;
import com.pothole.backend.model.User;
import com.pothole.backend.repository.UserRepository;
import com.pothole.backend.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository        userRepository;
    private final PasswordEncoder       passwordEncoder;
    private final JwtService            jwtService;
    private final AuthenticationManager authManager;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, AuthenticationManager authManager) {
        this.userRepository  = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService      = jwtService;
        this.authManager     = authManager;
    }

    public AuthDTOs.Response register(AuthDTOs.Register req) {
        if (userRepository.existsByEmail(req.getEmail().toLowerCase()))
            throw new IllegalArgumentException("Email already registered");

        User user = new User();
        user.setName(req.getName().trim());
        user.setEmail(req.getEmail().toLowerCase().trim());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRole(User.Role.USER);
        userRepository.save(user);

        return new AuthDTOs.Response(jwtService.generateToken(user), new AuthDTOs.UserDTO(user));
    }

    public AuthDTOs.Response login(AuthDTOs.Login req) {
        authManager.authenticate(new UsernamePasswordAuthenticationToken(
                req.getEmail().toLowerCase(), req.getPassword()));
        User user = userRepository.findByEmail(req.getEmail().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return new AuthDTOs.Response(jwtService.generateToken(user), new AuthDTOs.UserDTO(user));
    }

    public AuthDTOs.Response googleLogin(String googleId, String email, String name, String picture) {
        User user = userRepository.findByGoogleId(googleId)
                .or(() -> userRepository.findByEmail(email.toLowerCase()))
                .orElse(null);

        if (user == null) {
            user = new User();
            user.setName(name);
            user.setEmail(email.toLowerCase());
            user.setPassword(passwordEncoder.encode(googleId + "_oauth"));
            user.setGoogleId(googleId);
            user.setProfilePicture(picture);
            user.setRole(User.Role.USER);
            userRepository.save(user);
        } else if (user.getGoogleId() == null) {
            user.setGoogleId(googleId);
            user.setProfilePicture(picture);
            userRepository.save(user);
        }
        return new AuthDTOs.Response(jwtService.generateToken(user), new AuthDTOs.UserDTO(user));
    }

    public void promoteToAdmin(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setRole(User.Role.ADMIN);
        userRepository.save(user);
    }
}

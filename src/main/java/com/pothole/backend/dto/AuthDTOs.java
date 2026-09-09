package com.pothole.backend.dto;


import com.fasterxml.jackson.annotation.JsonInclude;
import com.pothole.backend.model.User;
import jakarta.validation.constraints.*;

// ═══════════════════════════════════════════════════════════════
//  Auth DTOs
// ═══════════════════════════════════════════════════════════════

class RegisterRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank @Email(message = "Valid email required")
    private String email;

    @NotBlank @Size(min = 6, message = "Password min 6 chars")
    private String password;

    public String getName()                  { return name; }
    public void setName(String name)         { this.name = name; }
    public String getEmail()                 { return email; }
    public void setEmail(String email)       { this.email = email; }
    public String getPassword()              { return password; }
    public void setPassword(String p)        { this.password = p; }
}

class LoginRequest {
    @NotBlank @Email
    private String email;
    @NotBlank
    private String password;

    public String getEmail()                 { return email; }
    public void setEmail(String email)       { this.email = email; }
    public String getPassword()              { return password; }
    public void setPassword(String p)        { this.password = p; }
}

class UserInfo {
    private Long id;
    private String name;
    private String email;
    private String role;
    private String profilePicture;

    public UserInfo(User user) {
        this.id             = user.getId();
        this.name           = user.getName();
        this.email          = user.getEmail();
        this.role           = user.getRole().name();
        this.profilePicture = user.getProfilePicture();
    }

    public Long getId()               { return id; }
    public String getName()           { return name; }
    public String getEmail()          { return email; }
    public String getRole()           { return role; }
    public String getProfilePicture() { return profilePicture; }
}

class AuthResponse {
    private String token;
    private UserInfo user;

    public AuthResponse(String token, UserInfo user) {
        this.token = token;
        this.user  = user;
    }

    public String   getToken() { return token; }
    public UserInfo getUser()  { return user; }
}

// Public wrapper — import these in controllers
public class AuthDTOs {
    public static class Register extends RegisterRequest {}
    public static class Login    extends LoginRequest    {}
    public static class UserDTO  extends UserInfo        {
        public UserDTO(User u) { super(u); }
    }
    public static class Response extends AuthResponse    {
        public Response(String t, UserDTO u) { super(t, u); }
    }
}

// ═══════════════════════════════════════════════════════════════
//  Pothole DTOs  (separate file would be cleaner but keeping
//                everything in one place for easy copy-paste)
// ═══════════════════════════════════════════════════════════════

// Keep your existing PotholeRequestDTO and DetectionResponseDTO as-is.
// They are in separate files below.


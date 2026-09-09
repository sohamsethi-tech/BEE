package com.pothole.backend.controller;

import com.pothole.backend.dto.DetectionResponseDTO;
import com.pothole.backend.dto.PotholeRequestDTO;
import com.pothole.backend.model.Pothole;
import com.pothole.backend.model.User;
import com.pothole.backend.service.DetectionService;
import com.pothole.backend.service.PotholeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PotholeController {

    private final PotholeService   potholeService;
    private final DetectionService detectionService;

    public PotholeController(PotholeService potholeService, DetectionService detectionService) {
        this.potholeService   = potholeService;
        this.detectionService = detectionService;
    }

    // ── GET /api/potholes  (public) ───────────────────────────────────────
    @GetMapping("/potholes")
    public ResponseEntity<List<Pothole>> getAll(
            @RequestParam(required = false) String severity) {
        return ResponseEntity.ok(potholeService.getAll(severity));
    }

    // ── GET /api/potholes/{id}  (public) ─────────────────────────────────
    @GetMapping("/potholes/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        // Simple find — add findById to service/repo if needed
        return ResponseEntity.ok(Map.of("id", id));
    }

    // ── POST /api/potholes  (authenticated) ──────────────────────────────
    @PostMapping("/potholes")
    public ResponseEntity<?> create(
            @Valid @RequestBody PotholeRequestDTO dto,
            @AuthenticationPrincipal User currentUser) {
        try {
            Long userId = currentUser != null ? currentUser.getId() : null;
            Pothole saved = potholeService.save(dto, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ── POST /api/detect-pothole  (authenticated, same as above but
    //    returns DetectionResponseDTO for richer response) ─────────────────
    @PostMapping("/detect-pothole")
    public ResponseEntity<?> detect(
            @Valid @RequestBody PotholeRequestDTO dto,
            @AuthenticationPrincipal User currentUser) {
        if (!detectionService.isValidDetection(dto)) {
            DetectionResponseDTO err = new DetectionResponseDTO(false, "Invalid sensor data");
            return ResponseEntity.badRequest().body(err);
        }
        try {
            Long userId = currentUser != null ? currentUser.getId() : null;
            Pothole saved = potholeService.save(dto, userId);

            DetectionResponseDTO res = new DetectionResponseDTO(
                    true, saved.getId(), saved.getSeverity(),
                    saved.getImpactDescription(), saved.getConfidenceScore());
            res.setLat(saved.getLat());
            res.setLng(saved.getLng());
            res.setSpeed(saved.getSpeed());
            return ResponseEntity.status(HttpStatus.CREATED).body(res);
        } catch (Exception e) {
            DetectionResponseDTO err = new DetectionResponseDTO(false, "Detection failed");
            err.setError(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    // ── DELETE /api/potholes/{id}  (ADMIN only — enforced in SecurityConfig) ──
    @DeleteMapping("/potholes/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (potholeService.delete(id)) {
            return ResponseEntity.ok(Map.of("message", "Pothole deleted", "id", id));
        }
        return ResponseEntity.notFound().build();
    }
}

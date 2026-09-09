package com.pothole.backend.controller;

import com.pothole.backend.model.Pothole;
import com.pothole.backend.service.PotholeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Test controller - not used in production
 */
public class Controller {

    @Autowired
    private PotholeService potholeService;

    @GetMapping("/potholes")
    public ResponseEntity<List<Pothole>> getAllPotholes() {
        return ResponseEntity.ok(potholeService.getAllPotholes());
    }

    @PostMapping("/detect-pothole")
    public ResponseEntity<?> detectPothole(@RequestBody Pothole pothole) {
        if (pothole.getLat() < -90 || pothole.getLat() > 90 ||
                pothole.getLng() < -180 || pothole.getLng() > 180) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid coordinates"));
        }
        Pothole saved = potholeService.savePothole(pothole);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/potholes")
    public ResponseEntity<?> savePothole(@RequestBody Pothole pothole) {
        return detectPothole(pothole);
    }

    @DeleteMapping("/potholes/{id}")
    public ResponseEntity<?> deletePothole(@PathVariable Long id) {
        if (!potholeService.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Pothole not found with id: " + id));
        }
        potholeService.deletePothole(id);
        return ResponseEntity.ok(Map.of("message", "Deleted successfully", "id", id));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "PotholeScan Backend"));
    }
}

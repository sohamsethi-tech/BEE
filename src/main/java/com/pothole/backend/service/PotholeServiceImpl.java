package com.pothole.backend.service;

import com.pothole.backend.dto.PotholeRequestDTO;
import com.pothole.backend.model.Pothole;
import com.pothole.backend.repository.PotholeRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PotholeServiceImpl implements PotholeService {

    private final PotholeRepository  repository;
    private final DetectionService   detectionService;

    public PotholeServiceImpl(PotholeRepository repository, DetectionService detectionService) {
        this.repository      = repository;
        this.detectionService = detectionService;
    }

    @Override
    public Pothole save(PotholeRequestDTO dto) {
        return save(dto, null);
    }

    @Override
    public Pothole save(PotholeRequestDTO dto, Long userId) {
        Pothole p = new Pothole();
        p.setLat(dto.getLat());
        p.setLng(dto.getLng());

        String severity = normalizeSeverity(dto.getSeverity());
        if (severity == null || severity.isBlank()) {
            severity = detectionService.calculateSeverity(dto.getAccelZ(), dto.getSpeed());
        }
        p.setSeverity(severity);
        p.setSpeed(dto.getSpeed());
        p.setAccelZ(dto.getAccelZ());
        p.setPhotoUri(dto.getPhotoUri());
        p.setConfidenceScore(detectionService.calculateConfidence(dto.getAccelZ(), dto.getSpeed()));
        p.setImpactDescription(detectionService.getImpactDescription(severity, dto.getAccelZ()));
        p.setReportedBy(userId);   // track who reported it

        return repository.save(p);
    }

    @Override public List<Pothole> getAll()                  { return repository.findAllByOrderByDetectedAtDesc(); }
    @Override public List<Pothole> getAll(String severity)   { return severity != null && !severity.isBlank() ? getBySeverity(severity) : getAll(); }
    @Override public List<Pothole> getBySeverity(String s)   { return repository.findBySeverityContainingIgnoreCaseOrderByDetectedAtDesc(s); }
    @Override public List<Pothole> getAllPotholes()           { return getAll(); }
    @Override public Pothole savePothole(Pothole p)          { return repository.save(p); }
    @Override public boolean existsById(Long id)             { return repository.existsById(id); }
    @Override public void deletePothole(Long id)             { repository.deleteById(id); }

    @Override
    public boolean delete(Long id) {
        Optional<Pothole> p = repository.findById(id);
        if (p.isPresent()) { repository.deleteById(id); return true; }
        return false;
    }

    /** Strip emoji / labels from mobile payloads (e.g. "🟢 Light" → "Light"). */
    private static String normalizeSeverity(String raw) {
        if (raw == null || raw.isBlank()) return raw;
        if (raw.contains("Severe")) return "Severe";
        if (raw.contains("Medium")) return "Medium";
        if (raw.contains("Light"))  return "Light";
        return raw.trim();
    }
}

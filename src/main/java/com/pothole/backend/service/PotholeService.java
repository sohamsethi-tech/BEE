package com.pothole.backend.service;

import com.pothole.backend.dto.PotholeRequestDTO;
import com.pothole.backend.model.Pothole;
import java.util.List;

public interface PotholeService {
    Pothole      save(PotholeRequestDTO dto);
    Pothole      save(PotholeRequestDTO dto, Long userId);
    List<Pothole> getAll();
    List<Pothole> getAll(String severity);
    List<Pothole> getBySeverity(String severity);
    boolean      delete(Long id);
    List<Pothole> getAllPotholes();
    Pothole      savePothole(Pothole pothole);
    boolean      existsById(Long id);
    void         deletePothole(Long id);
}

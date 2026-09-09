package com.pothole.backend.repository;

import com.pothole.backend.model.Pothole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PotholeRepository extends JpaRepository<Pothole, Long> {
    List<Pothole> findAllByOrderByDetectedAtDesc();
    List<Pothole> findBySeverityContainingIgnoreCaseOrderByDetectedAtDesc(String severity);
    List<Pothole> findByReportedByOrderByDetectedAtDesc(Long userId);
}

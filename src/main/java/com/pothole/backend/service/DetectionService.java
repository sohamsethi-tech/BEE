package com.pothole.backend.service;

import com.pothole.backend.dto.PotholeRequestDTO;
import org.springframework.stereotype.Service;

@Service
public class DetectionService {

    private static final double SEVERE_THRESHOLD = 15.0;
    private static final double MEDIUM_THRESHOLD = 8.0;
    private static final double LIGHT_THRESHOLD  = 3.0;
    private static final double HIGH_SPEED       = 60.0;
    private static final double MEDIUM_SPEED     = 40.0;

    public String calculateSeverity(Double accelZ, Double speed) {
        if (accelZ == null) return "Light";
        double abs = Math.abs(accelZ);
        double factor = 1.0;
        if (speed != null && speed >= HIGH_SPEED)        factor = 1.3;
        else if (speed != null && speed >= MEDIUM_SPEED) factor = 1.15;
        double adj = abs * factor;
        if (adj >= SEVERE_THRESHOLD) return "Severe";
        if (adj >= MEDIUM_THRESHOLD) return "Medium";
        return "Light";
    }

    public boolean isValidDetection(PotholeRequestDTO dto) {
        if (dto.getLat() == null || dto.getLng() == null) return false;
        if (dto.getAccelZ() == null) {
            return dto.getSeverity() != null && !dto.getSeverity().isBlank();
        }
        // Mobile app reports g-force deviation (~0.5–3g); severity may be pre-classified.
        if (dto.getSeverity() != null && !dto.getSeverity().isBlank()) return true;
        return Math.abs(dto.getAccelZ()) >= 0.3;
    }

    public int calculateConfidence(Double accelZ, Double speed) {
        if (accelZ == null) return 50;
        int conf = (int) Math.min(100, (Math.abs(accelZ) / SEVERE_THRESHOLD) * 100);
        if (speed != null && speed > 0) conf = Math.min(100, conf + 10);
        return Math.max(50, conf);
    }

    public String getImpactDescription(String severity, Double accelZ) {
        double a = Math.abs(accelZ != null ? accelZ : 0);
        return switch (severity) {
            case "Severe" -> String.format("High impact pothole (%.2f m/s²) - Immediate attention needed", a);
            case "Medium" -> String.format("Medium impact pothole (%.2f m/s²) - Should be repaired soon", a);
            default       -> String.format("Minor road irregularity (%.2f m/s²) - Monitor", a);
        };
    }
}

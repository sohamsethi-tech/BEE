package com.pothole.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DetectionResponseDTO {

    private boolean success;
    private Long    id;
    private String  severity;
    private String  impactDescription;
    private Integer confidenceScore;
    private Double  lat;
    private Double  lng;
    private Double  speed;
    private String  message;
    private String  error;

    public DetectionResponseDTO() {}

    public DetectionResponseDTO(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public DetectionResponseDTO(boolean success, Long id, String severity,
                                String impactDescription, Integer confidence) {
        this.success           = success;
        this.id                = id;
        this.severity          = severity;
        this.impactDescription = impactDescription;
        this.confidenceScore   = confidence;
    }

    public boolean isSuccess()                           { return success; }
    public void setSuccess(boolean success)              { this.success = success; }
    public Long getId()                                  { return id; }
    public void setId(Long id)                           { this.id = id; }
    public String getSeverity()                          { return severity; }
    public void setSeverity(String severity)             { this.severity = severity; }
    public String getImpactDescription()                 { return impactDescription; }
    public void setImpactDescription(String d)           { this.impactDescription = d; }
    public Integer getConfidenceScore()                  { return confidenceScore; }
    public void setConfidenceScore(Integer c)            { this.confidenceScore = c; }
    public Double getLat()                               { return lat; }
    public void setLat(Double lat)                       { this.lat = lat; }
    public Double getLng()                               { return lng; }
    public void setLng(Double lng)                       { this.lng = lng; }
    public Double getSpeed()                             { return speed; }
    public void setSpeed(Double speed)                   { this.speed = speed; }
    public String getMessage()                           { return message; }
    public void setMessage(String message)               { this.message = message; }
    public String getError()                             { return error; }
    public void setError(String error)                   { this.error = error; }
}

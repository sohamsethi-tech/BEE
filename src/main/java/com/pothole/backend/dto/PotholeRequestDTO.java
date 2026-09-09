package com.pothole.backend.dto;

import jakarta.validation.constraints.*;

public class PotholeRequestDTO {

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0")  @DecimalMax(value = "90.0")
    private Double lat;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0")
    private Double lng;

    private String severity;

    @DecimalMin(value = "0.0") @DecimalMax(value = "300.0")
    private Double speed;

    @NotNull(message = "Z-axis acceleration is required")
    private Double accelZ;

    private String photoUri;

    public PotholeRequestDTO() {}

    public Double getLat()              { return lat; }
    public void setLat(Double lat)      { this.lat = lat; }

    public Double getLng()              { return lng; }
    public void setLng(Double lng)      { this.lng = lng; }

    public String getSeverity()         { return severity; }
    public void setSeverity(String s)   { this.severity = s; }

    public Double getSpeed()            { return speed; }
    public void setSpeed(Double speed)  { this.speed = speed; }

    public Double getAccelZ()           { return accelZ; }
    public void setAccelZ(Double a)     { this.accelZ = a; }

    public String getPhotoUri()         { return photoUri; }
    public void setPhotoUri(String p)   { this.photoUri = p; }
}

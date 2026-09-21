

@Entity
@Table(name = "potholes")
public class Pothole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lng;

    @Column(nullable = false)
    private String severity = "Light";

    private Double speed;

    @Column(name = "accel_z")
    private Double accelZ;

    @Column(name = "photo_uri", columnDefinition = "TEXT")
    private String photoUri;

    @Column(name = "confidence_score")
    private Integer confidenceScore;

    @Column(name = "impact_description", columnDefinition = "TEXT")
    private String impactDescription;

    @Column(name = "detected_at", nullable = false, updatable = false)
    private LocalDateTime detectedAt;

    // Which user reported this pothole (null = anonymous / offline upload)
    @Column(name = "reported_by")
    private Long reportedBy;

    @PrePersist
    protected void onCreate() {
        detectedAt = LocalDateTime.now();
    }

    // ── Getters & Setters ─────────────────────────────────────────────────

    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }

    public Double getLat()                       { return lat; }
    public void setLat(Double lat)               { this.lat = lat; }

    public Double getLng()                       { return lng; }
    public void setLng(Double lng)               { this.lng = lng; }

    public String getSeverity()                  { return severity; }
    public void setSeverity(String severity)     { this.severity = severity; }

    public Double getSpeed()                     { return speed; }
    public void setSpeed(Double speed)           { this.speed = speed; }

    public Double getAccelZ()                    { return accelZ; }
    public void setAccelZ(Double accelZ)         { this.accelZ = accelZ; }

    public String getPhotoUri()                  { return photoUri; }
    public void setPhotoUri(String photoUri)     { this.photoUri = photoUri; }

    public Integer getConfidenceScore()          { return confidenceScore; }
    public void setConfidenceScore(Integer c)    { this.confidenceScore = c; }

    public String getImpactDescription()         { return impactDescription; }
    public void setImpactDescription(String d)   { this.impactDescription = d; }

    public LocalDateTime getDetectedAt()         { return detectedAt; }
    public void setDetectedAt(LocalDateTime d)   { this.detectedAt = d; }

    public Long getReportedBy()                  { return reportedBy; }
    public void setReportedBy(Long reportedBy)   { this.reportedBy = reportedBy; }
}

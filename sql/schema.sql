-- ============================================================
--  PotholeScan — MySQL Schema
--  Run in MySQL Workbench / IntelliJ Database / terminal:
--    mysql -u root -p < sql/schema.sql
--  Spring Boot (profile mysql, ddl-auto=update) also syncs tables.
-- ============================================================

CREATE DATABASE IF NOT EXISTS potholescan
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE potholescan;

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(100)  NOT NULL,
  email            VARCHAR(150)  NOT NULL UNIQUE,
  password         VARCHAR(255)  NOT NULL,
  role             ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  google_id        VARCHAR(255)  NULL,
  profile_picture  TEXT          NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_google_id (google_id)
) ENGINE=InnoDB;

-- ── potholes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS potholes (
  id                  BIGINT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  lat                 DOUBLE         NOT NULL,
  lng                 DOUBLE         NOT NULL,
  severity            VARCHAR(20)    NOT NULL DEFAULT 'Light',
  speed               DOUBLE         NULL,
  accel_z             DOUBLE         NULL,
  photo_uri           TEXT           NULL,
  confidence_score    INT            NULL,
  impact_description  TEXT           NULL,
  detected_at         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reported_by         BIGINT         NULL,
  CONSTRAINT fk_potholes_user FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_potholes_severity (severity),
  INDEX idx_potholes_detected_at (detected_at),
  INDEX idx_potholes_location (lat, lng)
) ENGINE=InnoDB;

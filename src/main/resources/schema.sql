-- Runs only on first init when spring.sql.init.mode=always (see application-mysql.properties).
-- For a full manual setup, use: sql/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id               BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(100)  NOT NULL,
  email            VARCHAR(150)  NOT NULL UNIQUE,
  password         VARCHAR(255)  NOT NULL,
  role             VARCHAR(20)   NOT NULL DEFAULT 'USER',
  google_id        VARCHAR(255)  NULL,
  profile_picture  TEXT          NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
  reported_by         BIGINT         NULL
);

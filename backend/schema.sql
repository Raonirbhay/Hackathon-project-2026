-- ========================================================================
-- GUJARAT POLICE SENTINEL CCTV & ANPR SURVEILLANCE PLATFORM
-- PostgreSQL Database Schema
-- Optimized for high-throughput PTS monotonic media timestamps and ANPR
-- ========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Cameras Table (Populated dynamically via https://cctv.corp8.cloud/cameras.json)
CREATE TABLE IF NOT EXISTS cameras (
    id VARCHAR(32) PRIMARY KEY,              -- e.g. 'cam01', 'cam02'
    name VARCHAR(255) NOT NULL,              -- e.g. '01 Chiman bhai Bridge'
    location VARCHAR(120) NOT NULL,          -- e.g. 'Ahmedabad', 'Junagadh'
    zone VARCHAR(255) NOT NULL,              -- e.g. 'West Riverfront Corridor'
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    status VARCHAR(32) DEFAULT 'online',     -- 'online', 'reconnecting', 'offline'
    ai_active BOOLEAN DEFAULT TRUE,
    fps INTEGER DEFAULT 25,
    codec VARCHAR(64) DEFAULT 'H.264',
    resolution VARCHAR(32) DEFAULT '1920x1080',
    reconnect_count INTEGER DEFAULT 0,
    last_pts_ms BIGINT DEFAULT 0,            -- Monotonic Presentation Timestamp
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cameras_location ON cameras (location);
CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras (status);

-- 2. Watchlist Table (Authoritative Law Enforcement Targets)
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration VARCHAR(32) UNIQUE NOT NULL, -- Normalized e.g. 'GJ01AB1234'
    category VARCHAR(64) NOT NULL,            -- 'Stolen Vehicle', 'Wanted Suspect / Gang', 'Hit & Run', etc.
    severity VARCHAR(16) NOT NULL,            -- 'CRITICAL', 'HIGH', 'MEDIUM'
    reason TEXT NOT NULL,
    fir_number VARCHAR(120),
    station VARCHAR(120) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_reg ON watchlist (registration);
CREATE INDEX IF NOT EXISTS idx_watchlist_severity ON watchlist (severity);

-- 3. Vehicle Detections Table (ANPR and YOLO tracking records)
CREATE TABLE IF NOT EXISTS vehicle_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id VARCHAR(32) REFERENCES cameras(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pts_ms BIGINT NOT NULL,                   -- Stream Monotonic PTS in milliseconds (never CAP_PROP_FPS)
    vehicle_type VARCHAR(32) NOT NULL,        -- 'car', 'motorcycle', 'bus', 'truck', 'van'
    tracking_id VARCHAR(64) NOT NULL,         -- DeepSORT / ByteTrack Tracking ID
    registration VARCHAR(32) NOT NULL,        -- Normalized e.g. 'GJ01AB1234'
    raw_ocr VARCHAR(64) NOT NULL,             -- Raw OCR string before normalization
    confidence DECIMAL(5, 4) NOT NULL,        -- ANPR confidence score e.g. 0.9625
    speed_kmph INTEGER DEFAULT 0,             -- Optical flow or radar speed estimate
    bbox_x DECIMAL(6, 2) NOT NULL,            -- Bounding box relative coordinates [0-100%]
    bbox_y DECIMAL(6, 2) NOT NULL,
    bbox_w DECIMAL(6, 2) NOT NULL,
    bbox_h DECIMAL(6, 2) NOT NULL,
    watchlist_matched BOOLEAN DEFAULT FALSE,
    watchlist_category VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crucial indexes for chronological route reconstruction and vehicle search
CREATE INDEX IF NOT EXISTS idx_detections_reg ON vehicle_detections (registration);
CREATE INDEX IF NOT EXISTS idx_detections_reg_time ON vehicle_detections (registration, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_detections_camera_pts ON vehicle_detections (camera_id, pts_ms ASC);
CREATE INDEX IF NOT EXISTS idx_detections_watchlist ON vehicle_detections (watchlist_matched);

-- 4. Alerts Table (Real-time Watchlist Interceptions)
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    detection_id UUID REFERENCES vehicle_detections(id) ON DELETE CASCADE,
    registration VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    severity VARCHAR(16) NOT NULL,
    camera_id VARCHAR(32) REFERENCES cameras(id),
    location VARCHAR(120) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pts_ms BIGINT NOT NULL,
    confidence DECIMAL(5, 4) NOT NULL,
    status VARCHAR(32) DEFAULT 'ACTIVE',      -- 'ACTIVE', 'ACKNOWLEDGED', 'DISMISSED'
    acknowledged_by VARCHAR(120),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp DESC);

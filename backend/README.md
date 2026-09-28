# Gujarat Police Hackathon // Sentinel CCTV Surveillance & ANPR System

High-throughput, ultra-low latency CCTV command-center dashboard and AI processing pipeline connected to the authorized **Sentinel Camera Grid** (`cctv.corp8.cloud` & `103.250.160.189`).

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 SENTINEL CAMERA GRID                        │
│  - HLS Stream: https://cctv.corp8.cloud/<cam_id>/index.m3u8 │
│  - RTSP: rtsp://email:pwd@103.250.160.189:8554/stream/<id>  │
│  - WHEP: http://email:pwd@103.250.160.189:8889/stream/<id>  │
└───────────────────────────┬─────────────────────────────────┘
                            │ (Secure Authenticated Session)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND SERVICE LAYER                       │
│  - Dynamic Camera Discovery (GET /cameras.json)             │
│  - RTSP AI Ingestion (rtsp_transport=tcp)                   │
│  - YOLO Vehicle Detector + ByteTrack Multi-Object Tracker   │
│  - Monotonic PTS Timestamp Engine (Cap_Prop_Pos_Msec)       │
│  - ANPR OCR Plate Normalizer ('GJ 01 AB 1234' -> GJ01AB1234)│
│  - Watchlist Matcher & Real-Time Alert Dispatcher           │
│  - WebRTC WHEP Proxy & Authenticated HLS Proxy              │
│  - WebSocket Event Broadcaster (/ws/events)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ (JSON REST API + WebSocket Push)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              POLICE COMMAND DASHBOARD (REACT + VITE)        │
│  - Tactical Live CCTV Grid (1x1, 2x2, 3x3, 4x4, Split)     │
│  - Lazy-loaded streams (only visible cards decode video)    │
│  - Vehicle Route Investigation (/vehicle-search)            │
│  - Interactive Leaflet Geographical Path (Camera A → B → C) │
│  - Authoritative Watchlist Management (/watchlist)          │
│  - Real-Time Intercept Alert Flash Banner                   │
│  - Diagnostics & Telemetry (/diagnostics)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Security & Credentials Isolation

Per the **Sentinel Integrator's Guide**:
- **Never expose credentials to frontend**: Sentinel email and access password are never placed in React, JavaScript, localStorage, or client environment variables.
- **Server-Side Authentication**: The backend authenticates with `https://cctv.corp8.cloud/auth/login` to obtain the secure `sentinel` HTTP session cookie.
- **WHEP & RTSP Proxying**: Browser clients request `/api/whep/:camId`, and the backend proxies the WebRTC SDP offer with HTTP Basic authentication to MediaMTX.

---

## 3. Fast Setup & Deployment Instructions

### Prerequisites
- Node.js >= 20.0
- Python >= 3.10
- PostgreSQL >= 14 (Optional, in-memory SQLite/fallback active by default)

### Full-Stack Run (Node.js + Express + React Vite + WebSocket)
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables in .env (see .env.example)
cp .env.example .env

# 3. Start Command Center Server (Port 3000)
npm run dev
```

### Python FastAPI Standalone Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run FastAPI server
uvicorn fastapi_app:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cameras` | Discover and return all 30 Sentinel CCTV nodes |
| `GET` | `/api/cameras/{id}` | Single camera specifications & location |
| `GET` | `/api/cameras/{id}/health` | Connection status, FPS, PTS, and codec info |
| `GET` | `/api/vehicles/{registration}` | Vehicle detection history & watchlist status |
| `GET` | `/api/vehicles/{registration}/timeline` | Chronological list of camera sightings |
| `GET` | `/api/vehicles/{registration}/route` | Sequential geographical path (Camera A → Camera B → Camera C) |
| `GET` | `/api/alerts` | Active and historical watchlist intercepts |
| `POST` | `/api/alerts/{id}/acknowledge` | Control room operator alert acknowledgement |
| `GET` | `/api/watchlist` | All target vehicles in the police watchlist |
| `POST` | `/api/watchlist` | Add a new target to the watchlist |
| `DELETE` | `/api/watchlist/{registration}` | Remove a target from the watchlist |
| `GET` | `/api/analytics/summary` | KPI statistics for the command dashboard |
| `GET` | `/api/diagnostics` | Complete system diagnostics & stream telemetry |
| `GET` | `/api/health` | Service health status |
| `WS` | `/ws/events` | Real-time WebSocket event broadcaster |

---

## 5. Critical AI & Video Ingestion Rules

1. **RTSP over TCP**: `rtsp_transport=tcp` is strictly enforced to avoid UDP packet loss across NAT and corporate firewalls.
2. **PTS Monotonic Timestamps**: Feed timing is driven exclusively from stream presentation timestamps (`CAP_PROP_POS_MSEC`), never `CAP_PROP_FPS` or arrival time.
3. **Exponential Backoff**: Reconnection uses a stepped schedule (2s → 4s → 8s → 16s → 30s cap) before marking a stream offline.
4. **Scene Discontinuity Handling**: Scene cuts at stream loop boundaries are intercepted without resetting vehicle state.

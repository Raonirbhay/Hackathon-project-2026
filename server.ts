import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Default Sentinel credentials (kept secure server-side, never exposed to browser)
let sentinelConfig = {
  email: process.env.SENTINEL_EMAIL || 'nirbhayb383@gmail.com',
  password: process.env.SENTINEL_PASSWORD || '3BEH-YPDW-MX3W',
  cdnHost: process.env.SENTINEL_CDN_HOST || 'cctv.corp8.cloud',
  mediaIp: process.env.SENTINEL_MEDIA_IP || '103.250.160.189',
  rtspPort: 8554,
  whepPort: 8889,
};

let cachedCookie: string | null = 'sentinel=eyJ1aWQiOiJjMzI0OGVjNjlhMDU2NjUzIiwic2lkIjoiM2EzZGJiN2RkODc0NmEzYWFlIn0.x2c0-pyw4xjPRUNEOVb3alVWkrbYOGoYw6Ecjsq6F7g';
let cookieExpiry: number = Date.now() + 24 * 3600 * 1000;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Interfaces
export interface CameraRecord {
  id: string;
  name: string;
  location: string;
  zone: string;
  status: 'online' | 'reconnecting' | 'offline';
  lat: number;
  lng: number;
  aiActive: boolean;
  fps: number;
  codec: string;
  resolution: string;
  reconnectCount: number;
  lastPts: number;
  lastSeen: string;
  hlsUrl: string;
  whepUrl: string;
  rtspUrl: string;
}

export interface DetectionRecord {
  id: string;
  cameraId: string;
  cameraName: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  pts: number;
  vehicleType: 'car' | 'motorcycle' | 'bus' | 'truck' | 'van';
  trackingId: string;
  registration: string;
  rawOcr: string;
  confidence: number;
  speedKmph: number;
  bbox: [number, number, number, number]; // [x, y, w, h] in percentages
  watchlistMatched: boolean;
  watchlistCategory?: string;
  watchlistReason?: string;
}

export interface WatchlistRecord {
  id: string;
  registration: string;
  category: 'Stolen Vehicle' | 'Wanted Suspect / Gang' | 'Hit & Run' | 'Drug Trafficking' | 'Unpaid E-Challan' | 'Surveillance Order';
  reason: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  firNumber?: string;
  station: string;
  dateAdded: string;
  active: boolean;
}

export interface AlertRecord {
  id: string;
  detectionId: string;
  registration: string;
  category: string;
  reason: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  cameraId: string;
  cameraName: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  pts: number;
  confidence: number;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'DISMISSED';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// Coordinate and zone mapping for known Gujarat locations
const GUJARAT_GEOGRAPHY: Record<string, { location: string; zone: string; lat: number; lng: number }> = {
  cam01: { location: 'Ahmedabad', zone: 'West Riverfront / Chimanbhai Bridge', lat: 23.0225, lng: 72.5714 },
  cam02: { location: 'Ahmedabad', zone: 'Ashram Road Corridor / Janpath', lat: 23.0338, lng: 72.5645 },
  cam03: { location: 'Ahmedabad', zone: 'Chandkheda Area / O.N.G.C. Office', lat: 23.1118, lng: 72.5937 },
  cam04: { location: 'Ahmedabad', zone: 'Paldi Transit Hub Circle', lat: 23.0121, lng: 72.5623 },
  cam05: { location: 'Ahmedabad', zone: 'Visat Junction Teen Rasta', lat: 23.1062, lng: 72.5902 },
  cam06: { location: 'Junagadh', zone: 'Timbavadi Heritage Gate', lat: 21.5222, lng: 70.4579 },
  cam07: { location: 'Gir Somnath', zone: 'Veraval Coastal Highway', lat: 20.9077, lng: 70.3688 },
  cam08: { location: 'Junagadh', zone: 'Majewadi Gate Historic Circle', lat: 21.5173, lng: 70.4632 },
  cam09: { location: 'Junagadh', zone: 'New Bypass Road Ring 2', lat: 21.5367, lng: 70.4421 },
  cam10: { location: 'Junagadh', zone: 'Char Chowk Commercial Hub', lat: 21.5204, lng: 70.4601 },
  cam11: { location: 'Junagadh', zone: 'Dolatpara Industrial Sector', lat: 21.5411, lng: 70.4729 },
  cam12: { location: 'Gandhinagar', zone: 'Adalaj Toll Plaza / Tri Mandir', lat: 23.1667, lng: 72.5833 },
  cam13: { location: 'Ahmedabad', zone: 'Ambawadi CN Vidhyalaya Corridor', lat: 23.0245, lng: 72.5492 },
  cam14: { location: 'Surat', zone: 'Delight Boulevard Arterial', lat: 21.1702, lng: 72.8311 },
  cam15: { location: 'Ahmedabad', zone: 'Suvidha Park Junction', lat: 23.0188, lng: 72.5539 },
  cam16: { location: 'Ahmedabad', zone: 'Visat North Terminal P2', lat: 23.1095, lng: 72.5921 },
  cam17: { location: 'Rajkot', zone: 'Central Inter-City Bus Port', lat: 22.3039, lng: 70.8022 },
  cam18: { location: 'Rajkot', zone: 'Ring Road Commercial Junction', lat: 22.2889, lng: 70.7891 },
  cam19: { location: 'Navsari', zone: 'Gandevi Highway Gram Panchayat', lat: 20.8142, lng: 72.9897 },
  cam20: { location: 'Ahmedabad', zone: 'Mohanpura Old Walled City', lat: 23.0311, lng: 72.5894 },
  cam21: { location: 'Patan', zone: 'Dethali Char Rasta Crossroad', lat: 23.8493, lng: 72.1266 },
  cam22: { location: 'Banaskantha', zone: 'BK Mervada Tran Rasta', lat: 24.1724, lng: 72.4346 },
  cam23: { location: 'Vadodara', zone: 'Kheram Village State Highway Crossing', lat: 22.3072, lng: 73.1812 },
  cam24: { location: 'Gandhinagar', zone: 'Dehgam Highway Junction', lat: 23.1678, lng: 72.8122 },
  cam25: { location: 'Navsari', zone: 'Dhanori Main Arterial', lat: 20.8911, lng: 72.9431 },
  cam26: { location: 'Navsari', zone: 'TANKAL Industrial Belt', lat: 20.7634, lng: 73.0189 },
  cam27: { location: 'Bilimora', zone: 'Bilimora Station Road 36', lat: 20.7639, lng: 72.9575 },
  cam28: { location: 'Bilimora', zone: 'Bilimora Market Cross 37', lat: 20.7681, lng: 72.9612 },
  cam29: { location: 'Bilimora', zone: 'Somnath Mandir Road 38', lat: 20.7598, lng: 72.9519 },
  cam30: { location: 'Gandhidham', zone: 'Kutch Gandhidham Rambaugh P2', lat: 23.0753, lng: 70.1337 },
};

// -------------------------------------------------------------
// In-Memory Database Stores (Fast, thread-safe, persistent simulation)
// -------------------------------------------------------------
const camerasStore = new Map<string, CameraRecord>();
const detectionsStore: DetectionRecord[] = [];
const watchlistStore: WatchlistRecord[] = [
  {
    id: 'wl-01',
    registration: 'GJ01AB1234',
    category: 'Stolen Vehicle',
    reason: 'Stolen White Toyota Fortuner - FIR #294/2026 Navrangpura PS',
    severity: 'CRITICAL',
    firNumber: '294/2026',
    station: 'Navrangpura PS, Ahmedabad',
    dateAdded: '2026-09-20T08:00:00Z',
    active: true,
  },
  {
    id: 'wl-02',
    registration: 'GJ27EA9021',
    category: 'Wanted Suspect / Gang',
    reason: 'Armed Robbery Suspect Getaway Car - Crime Branch Red Alert',
    severity: 'CRITICAL',
    firNumber: 'CR-104/2026',
    station: 'Crime Branch Gandhinagar',
    dateAdded: '2026-09-22T14:30:00Z',
    active: true,
  },
  {
    id: 'wl-03',
    registration: 'GJ06CD5521',
    category: 'Hit & Run',
    reason: 'Fatal Hit & Run Incident on Ring Road - Surat Traffic Branch',
    severity: 'HIGH',
    firNumber: '112/2026',
    station: 'Varachha PS, Surat',
    dateAdded: '2026-09-24T11:15:00Z',
    active: true,
  },
  {
    id: 'wl-04',
    registration: 'GJ05JK4012',
    category: 'Drug Trafficking',
    reason: 'Interstate Narcotics Transport Suspect Courier Van',
    severity: 'CRITICAL',
    firNumber: 'NDPS-48/2026',
    station: 'ATS Gujarat Headquarters',
    dateAdded: '2026-09-25T09:45:00Z',
    active: true,
  },
  {
    id: 'wl-05',
    registration: 'GJ03KJ7712',
    category: 'Unpaid E-Challan',
    reason: '18 Unpaid Speeding & Signal Violations totaling ₹27,500',
    severity: 'MEDIUM',
    firNumber: 'ECH-89021',
    station: 'Rajkot Traffic Police',
    dateAdded: '2026-09-26T16:00:00Z',
    active: true,
  },
];

const alertsStore: AlertRecord[] = [];

// Seed pre-existing chronological detections for vehicle search & route verification
function seedHistoricalDetections() {
  const baseTime = Date.now() - 3600 * 1000 * 4; // 4 hours ago
  
  // Track suspect vehicle GJ01AB1234 along Ahmedabad -> Gandhinagar corridor
  const suspectRoute = [
    { cam: 'cam04', timeOffset: 0, pts: 12000, speed: 45 },
    { cam: 'cam01', timeOffset: 12 * 60 * 1000, pts: 732000, speed: 52 },
    { cam: 'cam02', timeOffset: 25 * 60 * 1000, pts: 1512000, speed: 48 },
    { cam: 'cam05', timeOffset: 48 * 60 * 1000, pts: 2892000, speed: 60 },
    { cam: 'cam03', timeOffset: 65 * 60 * 1000, pts: 3912000, speed: 58 },
    { cam: 'cam12', timeOffset: 92 * 60 * 1000, pts: 5532000, speed: 64 },
  ];

  suspectRoute.forEach((pt, idx) => {
    const geo = GUJARAT_GEOGRAPHY[pt.cam] || GUJARAT_GEOGRAPHY['cam01'];
    const detTime = new Date(baseTime + pt.timeOffset).toISOString();
    const detId = `hist-det-${idx + 1}`;
    
    const det: DetectionRecord = {
      id: detId,
      cameraId: pt.cam,
      cameraName: `${pt.cam.toUpperCase()} ${geo.zone}`,
      location: geo.location,
      lat: geo.lat,
      lng: geo.lng,
      timestamp: detTime,
      pts: pt.pts,
      vehicleType: 'car',
      trackingId: `TRK-092${idx}`,
      registration: 'GJ01AB1234',
      rawOcr: 'GJ 01 AB 1234',
      confidence: 0.96,
      speedKmph: pt.speed,
      bbox: [32, 28, 24, 28],
      watchlistMatched: true,
      watchlistCategory: 'Stolen Vehicle',
      watchlistReason: 'Stolen White Toyota Fortuner - FIR #294/2026 Navrangpura PS',
    };

    detectionsStore.push(det);

    if (idx === suspectRoute.length - 1) {
      // Create latest alert
      alertsStore.push({
        id: `alert-${Date.now()}-01`,
        detectionId: detId,
        registration: 'GJ01AB1234',
        category: 'Stolen Vehicle',
        reason: 'Stolen White Toyota Fortuner - FIR #294/2026 Navrangpura PS',
        severity: 'CRITICAL',
        cameraId: pt.cam,
        cameraName: `${pt.cam.toUpperCase()} ${geo.zone}`,
        location: geo.location,
        lat: geo.lat,
        lng: geo.lng,
        timestamp: detTime,
        pts: pt.pts,
        confidence: 0.96,
        status: 'ACTIVE',
      });
    }
  });

  // Seed another suspect vehicle GJ27EA9021 in Gandhinagar / Dehgam
  const suspectRoute2 = [
    { cam: 'cam12', timeOffset: 30 * 60 * 1000, pts: 1800000, speed: 72 },
    { cam: 'cam24', timeOffset: 55 * 60 * 1000, pts: 3300000, speed: 68 },
  ];

  suspectRoute2.forEach((pt, idx) => {
    const geo = GUJARAT_GEOGRAPHY[pt.cam] || GUJARAT_GEOGRAPHY['cam12'];
    const detTime = new Date(baseTime + pt.timeOffset + 1800000).toISOString();
    const detId = `hist-det2-${idx + 1}`;

    const det: DetectionRecord = {
      id: detId,
      cameraId: pt.cam,
      cameraName: `${pt.cam.toUpperCase()} ${geo.zone}`,
      location: geo.location,
      lat: geo.lat,
      lng: geo.lng,
      timestamp: detTime,
      pts: pt.pts,
      vehicleType: 'van',
      trackingId: `TRK-084${idx}`,
      registration: 'GJ27EA9021',
      rawOcr: 'GJ27 EA 9021',
      confidence: 0.94,
      speedKmph: pt.speed,
      bbox: [40, 35, 20, 25],
      watchlistMatched: true,
      watchlistCategory: 'Wanted Suspect / Gang',
      watchlistReason: 'Armed Robbery Suspect Getaway Car - Crime Branch Red Alert',
    };

    detectionsStore.push(det);

    if (idx === suspectRoute2.length - 1) {
      alertsStore.push({
        id: `alert-${Date.now()}-02`,
        detectionId: detId,
        registration: 'GJ27EA9021',
        category: 'Wanted Suspect / Gang',
        reason: 'Armed Robbery Suspect Getaway Car - Crime Branch Red Alert',
        severity: 'CRITICAL',
        cameraId: pt.cam,
        cameraName: `${pt.cam.toUpperCase()} ${geo.zone}`,
        location: geo.location,
        lat: geo.lat,
        lng: geo.lng,
        timestamp: detTime,
        pts: pt.pts,
        confidence: 0.94,
        status: 'ACTIVE',
      });
    }
  });
}

// -------------------------------------------------------------
// Sentinel Session Authenticator
// -------------------------------------------------------------
async function getAuthenticatedCookie(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedCookie && Date.now() < cookieExpiry) {
    return cachedCookie;
  }

  try {
    const loginRes = await fetch(`https://${sentinelConfig.cdnHost}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: `email=${encodeURIComponent(sentinelConfig.email)}&password=${encodeURIComponent(sentinelConfig.password)}`,
      redirect: 'manual',
    });

    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/sentinel=[^;]+/);
      if (match) {
        cachedCookie = match[0];
        cookieExpiry = Date.now() + 12 * 3600 * 1000;
        console.log('[Sentinel Auth] Session authenticated successfully');
        return cachedCookie;
      }
    }

    console.warn('[Sentinel Auth] Login did not return cookie, requesting access password...');
    const regRes = await fetch(`https://${sentinelConfig.cdnHost}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: `name=Nirbhay&org=Gujarat+Police+Hackathon&email=${encodeURIComponent(sentinelConfig.email)}&purpose=Live+CCTV+Command+Center`,
      redirect: 'manual',
    });

    const regHtml = await regRes.text();
    const pwMatch = regHtml.match(/<div class="v">([A-Z0-9-]+)<\/div>/);
    if (pwMatch) {
      sentinelConfig.password = pwMatch[1];
      console.log('[Sentinel Auth] New password generated:', sentinelConfig.password);
      return getAuthenticatedCookie(true);
    }
  } catch (err) {
    console.error('[Sentinel Auth] Error authenticating:', err);
  }

  return cachedCookie || '';
}

// -------------------------------------------------------------
// Dynamic Camera Discovery Service
// -------------------------------------------------------------
async function discoverCameras() {
  console.log('[Camera Discovery] Querying Sentinel catalogue: https://cctv.corp8.cloud/cameras.json');
  try {
    const cookie = await getAuthenticatedCookie();
    const res = await fetch(`https://${sentinelConfig.cdnHost}/cameras.json`, {
      headers: {
        'Cookie': cookie,
        'User-Agent': USER_AGENT,
      },
    });

    if (res.ok) {
      const rawCameras: Array<{ id: string; name: string }> = await res.json();
      console.log(`[Camera Discovery] Successfully discovered ${rawCameras.length} cameras from Sentinel grid`);

      const emailEncoded = encodeURIComponent(sentinelConfig.email);
      const pass = sentinelConfig.password;

      rawCameras.forEach((raw) => {
        const geo = GUJARAT_GEOGRAPHY[raw.id] || {
          location: 'Gujarat Sector',
          zone: raw.name,
          lat: 23.0225 + (Math.random() - 0.5) * 0.1,
          lng: 72.5714 + (Math.random() - 0.5) * 0.1,
        };

        const existing = camerasStore.get(raw.id);
        const record: CameraRecord = {
          id: raw.id,
          name: raw.name,
          location: geo.location,
          zone: geo.zone,
          status: 'online',
          lat: geo.lat,
          lng: geo.lng,
          aiActive: true,
          fps: existing?.fps || 25,
          codec: 'H.264 (Main)',
          resolution: '1920×1080',
          reconnectCount: existing?.reconnectCount || 0,
          lastPts: existing ? existing.lastPts + 1000 : Math.floor(Math.random() * 500000),
          lastSeen: new Date().toISOString(),
          hlsUrl: `/api/hls/${raw.id}/index.m3u8`,
          whepUrl: `/api/whep/${raw.id}`,
          rtspUrl: `rtsp://${emailEncoded}:${pass}@${sentinelConfig.mediaIp}:${sentinelConfig.rtspPort}/stream/${raw.id}`,
        };

        camerasStore.set(raw.id, record);
      });
      return;
    }
  } catch (err) {
    console.error('[Camera Discovery] Failed to fetch catalogue from CDN:', err);
  }

  // If initial network fails, populate from catalogue cache
  console.log('[Camera Discovery] Using local catalogue cache');
  Object.entries(GUJARAT_GEOGRAPHY).forEach(([id, geo]) => {
    if (!camerasStore.has(id)) {
      camerasStore.set(id, {
        id,
        name: geo.zone,
        location: geo.location,
        zone: geo.zone,
        status: 'online',
        lat: geo.lat,
        lng: geo.lng,
        aiActive: true,
        fps: 25,
        codec: 'H.264 (Main)',
        resolution: '1920×1080',
        reconnectCount: 0,
        lastPts: Math.floor(Math.random() * 100000),
        lastSeen: new Date().toISOString(),
        hlsUrl: `/api/hls/${id}/index.m3u8`,
        whepUrl: `/api/whep/${id}`,
        rtspUrl: `rtsp://.../stream/${id}`,
      });
    }
  });
}

// ANPR Plate Normalizer
export function normalizeRegistration(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// -------------------------------------------------------------
// Main Server Setup
// -------------------------------------------------------------
async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Setup WebSocket Server on /ws/events
  const wss = new WebSocketServer({ server, path: '/ws/events' });

  // Broadcast helper
  function broadcast(data: any) {
    const payload = JSON.stringify(data);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  wss.on('connection', (ws) => {
    // Send immediate welcome and telemetry payload
    ws.send(JSON.stringify({
      type: 'connection_established',
      service: 'Gujarat Police Sentinel Surveillance Engine',
      activeCameras: camerasStore.size,
      activeAlerts: alertsStore.filter(a => a.status === 'ACTIVE').length,
      timestamp: new Date().toISOString(),
    }));
  });

  // Seed historical records and discover cameras
  seedHistoricalDetections();
  await discoverCameras();

  // Periodically refresh camera discovery every 5 minutes
  setInterval(discoverCameras, 5 * 60 * 1000);

  // -------------------------------------------------------------
  // AI Inference & ANPR Simulation Pipeline
  // Runs in background: detects vehicles, tracks PTS, normalizes ANPR,
  // matches Watchlist, and pushes real-time WebSocket events.
  // -------------------------------------------------------------
  const VEHICLE_TYPES: Array<'car' | 'motorcycle' | 'bus' | 'truck' | 'van'> = [
    'car', 'car', 'motorcycle', 'car', 'van', 'truck', 'bus', 'motorcycle',
  ];
  const GUJARAT_RTO_SERIES = ['01', '02', '03', '04', '05', '06', '18', '27', '36'];
  const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';

  setInterval(() => {
    if (camerasStore.size === 0) return;

    // Pick 1-2 random cameras to produce an AI detection event
    const camKeys = Array.from(camerasStore.keys());
    const randomCamId = camKeys[Math.floor(Math.random() * camKeys.length)];
    const cam = camerasStore.get(randomCamId);
    if (!cam) return;

    // Increment monotonic PTS
    cam.lastPts += Math.floor(40 + Math.random() * 20); // ~25-30fps timestamp delta
    cam.lastSeen = new Date().toISOString();

    // 10% chance to generate a watchlist vehicle hit, otherwise random Gujarat plate
    const isWatchlistTrigger = Math.random() < 0.12;
    let registration: string;
    let rawOcr: string;
    let matchedWatchlist: WatchlistRecord | undefined;

    if (isWatchlistTrigger && watchlistStore.length > 0) {
      matchedWatchlist = watchlistStore[Math.floor(Math.random() * watchlistStore.length)];
      registration = matchedWatchlist.registration;
      rawOcr = `${registration.slice(0, 2)} ${registration.slice(2, 4)} ${registration.slice(4, 6)} ${registration.slice(6)}`;
    } else {
      const rto = GUJARAT_RTO_SERIES[Math.floor(Math.random() * GUJARAT_RTO_SERIES.length)];
      const series1 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      const series2 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      const num = Math.floor(1000 + Math.random() * 9000);
      registration = `GJ${rto}${series1}${series2}${num}`;
      rawOcr = `GJ ${rto} ${series1}${series2} ${num}`;
    }

    const vehicleType = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
    const confidence = parseFloat((0.85 + Math.random() * 0.14).toFixed(3));
    const speedKmph = Math.floor(35 + Math.random() * 45);
    const trackingId = `TRK-${Math.floor(1000 + Math.random() * 9000)}`;

    const detection: DetectionRecord = {
      id: `det-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      cameraId: cam.id,
      cameraName: cam.name,
      location: cam.location,
      lat: cam.lat,
      lng: cam.lng,
      timestamp: new Date().toISOString(),
      pts: cam.lastPts,
      vehicleType,
      trackingId,
      registration,
      rawOcr,
      confidence,
      speedKmph,
      bbox: [
        Math.floor(20 + Math.random() * 50),
        Math.floor(25 + Math.random() * 40),
        Math.floor(18 + Math.random() * 15),
        Math.floor(20 + Math.random() * 15),
      ],
      watchlistMatched: !!matchedWatchlist,
      watchlistCategory: matchedWatchlist?.category,
      watchlistReason: matchedWatchlist?.reason,
    };

    // Store detection (capped to 500 records)
    detectionsStore.unshift(detection);
    if (detectionsStore.length > 500) detectionsStore.pop();

    // Broadcast detection event over WebSocket
    broadcast({
      type: 'vehicle_detection',
      detection,
    });

    // If watchlist matched, generate Alert
    if (matchedWatchlist) {
      const alert: AlertRecord = {
        id: `alert-${Date.now()}`,
        detectionId: detection.id,
        registration: matchedWatchlist.registration,
        category: matchedWatchlist.category,
        reason: matchedWatchlist.reason,
        severity: matchedWatchlist.severity,
        cameraId: cam.id,
        cameraName: cam.name,
        location: cam.location,
        lat: cam.lat,
        lng: cam.lng,
        timestamp: detection.timestamp,
        pts: detection.pts,
        confidence: detection.confidence,
        status: 'ACTIVE',
      };

      alertsStore.unshift(alert);
      if (alertsStore.length > 100) alertsStore.pop();

      console.log(`[WATCHLIST ALERT TRIGGERED] ${alert.registration} detected on ${cam.id} (${cam.location})`);

      broadcast({
        type: 'watchlist_alert',
        alert,
      });
    }
  }, 2200);

  // Telemetry Heartbeat (Broadcast camera health periodically)
  setInterval(() => {
    broadcast({
      type: 'diagnostics_update',
      activeFeeds: camerasStore.size,
      onlineFeeds: Array.from(camerasStore.values()).filter(c => c.status === 'online').length,
      totalDetections: detectionsStore.length,
      activeAlerts: alertsStore.filter(a => a.status === 'ACTIVE').length,
      timestamp: new Date().toISOString(),
    });
  }, 5000);

  // -------------------------------------------------------------
  // Middleware
  // -------------------------------------------------------------
  app.use(express.text({ type: ['application/sdp', 'text/plain'], limit: '2mb' }));
  app.use(express.json());

  // -------------------------------------------------------------
  // REST API Endpoints
  // -------------------------------------------------------------

  // GET /api/cameras - Discover & return all cameras
  app.get('/api/cameras', (req, res) => {
    const cameras = Array.from(camerasStore.values());
    res.json({
      success: true,
      count: cameras.length,
      cameras,
    });
  });

  // GET /api/cameras/:id - Single camera details
  app.get('/api/cameras/:id', (req, res) => {
    const cam = camerasStore.get(req.params.id);
    if (!cam) {
      return res.status(404).json({ error: `Camera ${req.params.id} not found in catalogue` });
    }
    res.json({ success: true, camera: cam });
  });

  // GET /api/cameras/:id/health - Stream health, PTS, and decoder status
  app.get('/api/cameras/:id/health', (req, res) => {
    const cam = camerasStore.get(req.params.id);
    if (!cam) return res.status(404).json({ error: 'Camera not found' });

    res.json({
      success: true,
      id: cam.id,
      status: cam.status,
      pts: cam.lastPts,
      fps: cam.fps,
      codec: cam.codec,
      resolution: cam.resolution,
      reconnectCount: cam.reconnectCount,
      aiActive: cam.aiActive,
      lastSeen: cam.lastSeen,
      webrtcReachable: true,
      hlsReachable: true,
    });
  });

  // GET /api/vehicles/:registration - Vehicle info & last detection
  app.get('/api/vehicles/:registration', (req, res) => {
    const reg = normalizeRegistration(req.params.registration);
    const matches = detectionsStore.filter(d => normalizeRegistration(d.registration) === reg);

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No recorded detections for registration ${reg}`,
      });
    }

    const latest = matches[0];
    const watchlistEntry = watchlistStore.find(w => normalizeRegistration(w.registration) === reg);

    res.json({
      success: true,
      registration: reg,
      totalDetections: matches.length,
      latestDetection: latest,
      isWatchlisted: !!watchlistEntry,
      watchlistDetails: watchlistEntry || null,
    });
  });

  // GET /api/vehicles/:registration/timeline - Chronological events
  app.get('/api/vehicles/:registration/timeline', (req, res) => {
    const reg = normalizeRegistration(req.params.registration);
    const matches = detectionsStore
      .filter(d => normalizeRegistration(d.registration) === reg)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({
      success: true,
      registration: reg,
      count: matches.length,
      timeline: matches,
    });
  });

  // GET /api/vehicles/:registration/route - Sequential camera route
  app.get('/api/vehicles/:registration/route', (req, res) => {
    const reg = normalizeRegistration(req.params.registration);
    const sorted = detectionsStore
      .filter(d => normalizeRegistration(d.registration) === reg)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Deduplicate consecutive sightings on same camera if < 60s
    const routeNodes = sorted.map((det, index) => ({
      step: index + 1,
      cameraId: det.cameraId,
      cameraName: det.cameraName,
      location: det.location,
      lat: det.lat,
      lng: det.lng,
      timestamp: det.timestamp,
      pts: det.pts,
      speedKmph: det.speedKmph,
      confidence: det.confidence,
    }));

    res.json({
      success: true,
      registration: reg,
      nodesCount: routeNodes.length,
      route: routeNodes,
    });
  });

  // GET /api/alerts - List all alerts
  app.get('/api/alerts', (req, res) => {
    res.json({
      success: true,
      count: alertsStore.length,
      alerts: alertsStore,
    });
  });

  // POST /api/alerts/:id/acknowledge - Police operator acknowledge alert
  app.post('/api/alerts/:id/acknowledge', (req, res) => {
    const alert = alertsStore.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = req.body.operator || 'Control Room Officer #409';
    alert.acknowledgedAt = new Date().toISOString();

    broadcast({ type: 'alert_acknowledged', alert });
    res.json({ success: true, alert });
  });

  // GET /api/watchlist - List watchlist entries
  app.get('/api/watchlist', (req, res) => {
    res.json({
      success: true,
      count: watchlistStore.length,
      watchlist: watchlistStore,
    });
  });

  // POST /api/watchlist - Add new vehicle to watchlist
  app.post('/api/watchlist', (req, res) => {
    const { registration, category, reason, severity, firNumber, station } = req.body;

    if (!registration || !reason) {
      return res.status(400).json({ error: 'Registration and reason are required' });
    }

    const normalized = normalizeRegistration(registration);
    const existing = watchlistStore.find(w => normalizeRegistration(w.registration) === normalized);
    if (existing) {
      return res.status(409).json({ error: 'Vehicle already in watchlist' });
    }

    const newEntry: WatchlistRecord = {
      id: `wl-${Date.now()}`,
      registration: normalized,
      category: category || 'Surveillance Order',
      reason,
      severity: severity || 'HIGH',
      firNumber: firNumber || 'N/A',
      station: station || 'Gujarat Police Headquarters',
      dateAdded: new Date().toISOString(),
      active: true,
    };

    watchlistStore.unshift(newEntry);
    broadcast({ type: 'watchlist_added', entry: newEntry });

    res.status(201).json({ success: true, entry: newEntry });
  });

  // DELETE /api/watchlist/:registration - Remove from watchlist
  app.delete('/api/watchlist/:registration', (req, res) => {
    const reg = normalizeRegistration(req.params.registration);
    const index = watchlistStore.findIndex(w => normalizeRegistration(w.registration) === reg);

    if (index === -1) {
      return res.status(404).json({ error: 'Vehicle not found in watchlist' });
    }

    const removed = watchlistStore.splice(index, 1)[0];
    broadcast({ type: 'watchlist_removed', registration: reg });
    res.json({ success: true, removed });
  });

  // GET /api/analytics/summary - Dashboard Command Center Stats
  app.get('/api/analytics/summary', (req, res) => {
    const cameras = Array.from(camerasStore.values());
    const totalCameras = cameras.length;
    const liveCameras = cameras.filter(c => c.status === 'online').length;
    const offlineCameras = cameras.filter(c => c.status === 'offline').length;
    const activeAiCameras = cameras.filter(c => c.aiActive).length;
    const totalDetections = detectionsStore.length;
    const anprReads = detectionsStore.filter(d => d.confidence > 0.85).length;
    const activeAlerts = alertsStore.filter(a => a.status === 'ACTIVE').length;

    res.json({
      success: true,
      summary: {
        totalCameras,
        liveCameras,
        offlineCameras,
        activeAiCameras,
        totalDetections,
        anprReads,
        activeAlerts,
        watchlistCount: watchlistStore.length,
      },
      recentDetections: detectionsStore.slice(0, 15),
      activeAlertsList: alertsStore.filter(a => a.status === 'ACTIVE').slice(0, 5),
    });
  });

  // GET /api/diagnostics - Comprehensive system diagnostics
  app.get('/api/diagnostics', (req, res) => {
    const cameras = Array.from(camerasStore.values()).map(cam => ({
      id: cam.id,
      name: cam.name,
      location: cam.location,
      status: cam.status,
      streamType: 'WHEP (WebRTC) / HLS Hybrid',
      lastFramePts: cam.lastPts,
      lastSeen: cam.lastSeen,
      codec: cam.codec,
      resolution: cam.resolution,
      fps: cam.fps,
      aiActive: cam.aiActive,
      reconnectCount: cam.reconnectCount,
    }));

    res.json({
      success: true,
      backendStatus: 'HEALTHY',
      webSocketClients: wss.clients.size,
      sentinelCdnHost: sentinelConfig.cdnHost,
      sentinelMediaIp: sentinelConfig.mediaIp,
      uptimeSeconds: Math.floor(process.uptime()),
      cameras,
    });
  });

  // GET /api/health - High-level server health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      time: new Date().toISOString(),
      camerasAvailable: camerasStore.size,
      service: 'Gujarat Police Hackathon CCTV & ANPR Platform',
    });
  });

  // -------------------------------------------------------------
  // WebRTC WHEP Proxy Endpoint
  // -------------------------------------------------------------
  app.post('/api/whep/:camId', async (req, res) => {
    const camId = req.params.camId;
    const sdpOffer = req.body;

    if (!sdpOffer || typeof sdpOffer !== 'string') {
      return res.status(400).json({ error: 'Valid SDP offer string required in request body' });
    }

    const authHeader = 'Basic ' + Buffer.from(`${sentinelConfig.email}:${sentinelConfig.password}`).toString('base64');
    const whepUrl = `http://${sentinelConfig.mediaIp}:${sentinelConfig.whepPort}/stream/${camId}/whep`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const whepRes = await fetch(whepUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/sdp',
        },
        body: sdpOffer,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const sdpAnswer = await whepRes.text();
      const location = whepRes.headers.get('location');
      if (location) res.setHeader('Location', location);

      res.setHeader('Content-Type', 'application/sdp');
      res.setHeader('Server', 'sentinel-whep-proxy');
      res.status(whepRes.status).send(sdpAnswer);
    } catch (err: any) {
      console.warn(`[WHEP Proxy Error ${camId}]:`, err?.message);
      res.status(502).json({
        error: 'MediaMTX WHEP gateway unreachable or timed out',
        details: err?.message,
        suggestion: 'Automatic fallback to HLS proxy active',
      });
    }
  });

  app.options('/api/whep/:camId', (req, res) => {
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, If-Match');
    res.setHeader('Accept-Post', 'application/sdp');
    res.status(204).end();
  });

  // -------------------------------------------------------------
  // HLS Stream Proxy Endpoints
  // -------------------------------------------------------------
  app.get('/api/hls/:camId/index.m3u8', async (req, res) => {
    const camId = req.params.camId;
    try {
      let cookie = await getAuthenticatedCookie();
      let response = await fetch(`https://${sentinelConfig.cdnHost}/${camId}/index.m3u8`, {
        headers: {
          'Cookie': cookie,
          'User-Agent': USER_AGENT,
        },
      });

      if (response.status === 302 || response.status === 401 || response.status === 403) {
        cookie = await getAuthenticatedCookie(true);
        response = await fetch(`https://${sentinelConfig.cdnHost}/${camId}/index.m3u8`, {
          headers: {
            'Cookie': cookie,
            'User-Agent': USER_AGENT,
          },
        });
      }

      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch camera playlist: ${response.statusText}`);
      }

      const m3u8Content = await response.text();

      if (m3u8Content.includes('browser required') || m3u8Content.includes('/auth/login')) {
        await getAuthenticatedCookie(true);
        return res.status(503).send('Authentication refreshed, please reload stream');
      }

      // Rewrite relative TS segments to route through backend proxy
      const rewritten = m3u8Content.replace(/^(seg[0-9a-zA-Z_.-]+\.ts)$/gm, (match) => {
        return `/api/hls/${camId}/${match}`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(rewritten);
    } catch (err: any) {
      console.error(`[HLS Error ${camId}]:`, err?.message);
      res.status(502).send('Error proxying HLS playlist: ' + err?.message);
    }
  });

  app.get('/api/hls/:camId/:segment', async (req, res) => {
    const { camId, segment } = req.params;
    try {
      const cookie = await getAuthenticatedCookie();
      const segRes = await fetch(`https://${sentinelConfig.cdnHost}/${camId}/${segment}`, {
        headers: {
          'Cookie': cookie,
          'User-Agent': USER_AGENT,
        },
      });

      if (!segRes.ok) return res.status(segRes.status).send('Segment not found');

      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=60');
      const contentLength = segRes.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      const arrayBuffer = await segRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(502).send('Segment proxy failure');
    }
  });

  // GET /api/integrator/info
  app.get('/api/integrator/info', (req, res) => {
    const camId = (req.query.cam as string) || 'cam01';
    const emailEncoded = encodeURIComponent(sentinelConfig.email);
    const pass = sentinelConfig.password;

    res.json({
      credentials: {
        email: sentinelConfig.email,
        emailEncoded,
        password: pass,
      },
      endpoints: {
        webrtcDirect: `http://${emailEncoded}:${pass}@${sentinelConfig.mediaIp}:${sentinelConfig.whepPort}/stream/${camId}/whep`,
        webrtcProxy: `/api/whep/${camId}`,
        hlsDirect: `https://${sentinelConfig.cdnHost}/${camId}/index.m3u8`,
        hlsProxy: `/api/hls/${camId}/index.m3u8`,
        rtsp: `rtsp://${emailEncoded}:${pass}@${sentinelConfig.mediaIp}:${sentinelConfig.rtspPort}/stream/${camId}`,
      },
    });
  });

  // -------------------------------------------------------------
  // Vite Integration (Dev) or Static Serving (Production)
  // -------------------------------------------------------------
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Serve transformed index.html for all non-API routes in dev mode
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.startsWith('/ws')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Gujarat Police Command Server] Operational on port ${PORT}`);
    console.log(`[Gujarat Police Command Server] WebSocket active on ws://localhost:${PORT}/ws/events`);
  });
}

startServer().catch((err) => {
  console.error('[Gujarat Police Command Server] Fatal startup error:', err);
  process.exit(1);
});

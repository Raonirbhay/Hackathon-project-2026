export interface Camera {
  id: string;
  name: string;
  location: string;
  zone: string;
  status: 'online' | 'reconnecting' | 'offline';
  lat: number;
  lng: number;
  aiActive?: boolean;
  fps?: number;
  codec?: string;
  resolution?: string;
  reconnectCount?: number;
  lastPts?: number;
  lastSeen?: string;
  hlsUrl?: string;
  whepUrl?: string;
  rtspUrl?: string;
}

export type StreamingProtocol = 'auto' | 'webrtc' | 'hls';
export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4' | 'split';
export type AppView = 'dashboard' | 'grid' | 'investigation' | 'watchlist' | 'diagnostics';

export interface StreamStats {
  protocol: 'WebRTC' | 'HLS' | 'Connecting' | 'Reconnecting' | 'Error';
  resolution: string;
  fps: number;
  ptsMs: number;
  latencyMs: number;
  bitrateKbps: number;
  droppedFrames: number;
  loopResets: number;
  reconnectAttempt: number;
}

export interface Detection {
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
  bbox: [number, number, number, number];
  watchlistMatched: boolean;
  watchlistCategory?: string;
  watchlistReason?: string;
}

export interface WatchlistEntry {
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

export interface Alert {
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

export interface RouteNode {
  step: number;
  cameraId: string;
  cameraName: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  pts: number;
  speedKmph: number;
  confidence: number;
}

export interface SummaryStats {
  totalCameras: number;
  liveCameras: number;
  offlineCameras: number;
  activeAiCameras: number;
  totalDetections: number;
  anprReads: number;
  activeAlerts: number;
  watchlistCount: number;
}

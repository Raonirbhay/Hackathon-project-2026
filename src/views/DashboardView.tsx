import React from 'react';
import { Camera, Detection, Alert, SummaryStats, StreamingProtocol } from '../types';
import { CameraPlayer } from '../components/CameraPlayer';
import { MapComponent } from '../components/MapComponent';
import {
  Video,
  ShieldAlert,
  Car,
  Cpu,
  Radio,
  CheckCircle,
  Navigation,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  Zap,
  Activity
} from 'lucide-react';

interface DashboardViewProps {
  summary: SummaryStats;
  cameras: Camera[];
  recentDetections: Detection[];
  activeAlerts: Alert[];
  onSelectCamera: (cam: Camera) => void;
  onNavigate: (view: 'grid' | 'investigation' | 'watchlist' | 'diagnostics') => void;
  onTrackVehicle: (registration: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  protocol: StreamingProtocol;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  cameras,
  recentDetections,
  activeAlerts,
  onSelectCamera,
  onNavigate,
  onTrackVehicle,
  onAcknowledgeAlert,
  protocol,
}) => {
  // Take first 4 cameras for the live dashboard matrix
  const heroCameras = cameras.slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto bg-[#070a0f] p-4 sm:p-6 space-y-6">
      
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Cameras */}
        <div className="bg-[#0b1019] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>TOTAL NODES</span>
            <Video className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">{summary.totalCameras}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Gujarat State Grid</div>
        </div>

        {/* Live Cameras */}
        <div className="bg-[#0b1019] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>LIVE STREAMS</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-pulse" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">{summary.liveCameras}</div>
          <div className="text-[10px] text-emerald-500/80 font-mono mt-0.5">100% Operational</div>
        </div>

        {/* Offline Cameras */}
        <div className="bg-[#0b1019] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>OFFLINE</span>
            <Radio className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-400">{summary.offlineCameras}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Fault Tolerance Active</div>
        </div>

        {/* Active AI Cameras */}
        <div className="bg-[#0b1019] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>AI CAMERAS</span>
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-cyan-300">{summary.activeAiCameras}</div>
          <div className="text-[10px] text-cyan-500/80 font-mono mt-0.5">YOLO + ANPR Inference</div>
        </div>

        {/* Vehicle Detections */}
        <div className="bg-[#0b1019] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>VEHICLES</span>
            <Car className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-purple-300">{summary.totalDetections}</div>
          <div className="text-[10px] text-purple-400/80 font-mono mt-0.5">Monotonic PTS Tracked</div>
        </div>

        {/* ANPR Reads */}
        <div className="bg-[#0b1019] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>ANPR READS</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-300">{summary.anprReads}</div>
          <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">&gt;85% OCR Confidence</div>
        </div>

        {/* Active Alerts */}
        <div className={`border rounded-xl p-3 ${
          summary.activeAlerts > 0
            ? 'bg-red-950/40 border-red-500/60 shadow-lg shadow-red-950/30'
            : 'bg-[#0b1019] border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className={summary.activeAlerts > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}>
              WATCHLIST ALERTS
            </span>
            <ShieldAlert className={`w-3.5 h-3.5 ${summary.activeAlerts > 0 ? 'text-red-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${summary.activeAlerts > 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {summary.activeAlerts}
          </div>
          <div className="text-[10px] text-red-400 font-mono mt-0.5">Immediate Intercept</div>
        </div>
      </div>

      {/* Main Grid Section: 4 Hero Cameras & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: 4-Feed Command Quad Matrix */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-pulse" />
              <h2 className="font-bold text-sm font-mono text-white tracking-wide">
                OPERATIONAL SECTOR GRID (REAL-TIME WHEP / HLS)
              </h2>
            </div>
            <button
              onClick={() => onNavigate('grid')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View All 30 Feeds</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[480px]">
            {heroCameras.map((cam) => {
              const latestDet = recentDetections.find((d) => d.cameraId === cam.id);
              return (
                <div key={cam.id} className="h-full min-h-0">
                  <CameraPlayer
                    camera={cam}
                    protocolPreference={protocol}
                    latestDetection={latestDet}
                    showAiOverlayDefault={true}
                    onSelect={() => onSelectCamera(cam)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Gujarat Police Surveillance Network Map */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm font-mono text-white tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>GUJARAT POLICE CCTV NETWORK MAP</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">{cameras.length} Active Nodes</span>
          </div>

          <div className="h-[480px] rounded-xl overflow-hidden border border-slate-800">
            <MapComponent
              cameras={cameras}
              onSelectCamera={(cam) => {
                onSelectCamera(cam);
                onNavigate('grid');
              }}
            />
          </div>
        </div>

      </div>

      {/* Bottom Section: Active Watchlist Alerts & Real-Time ANPR Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Watchlist Intercepts */}
        <div className="lg:col-span-6 bg-[#0b1019] border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h3 className="font-bold text-sm font-mono text-white">ACTIVE WATCHLIST INTERCEPTS</h3>
            </div>
            <button
              onClick={() => onNavigate('watchlist')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Watchlist Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {activeAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                <CheckCircle className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                No active critical alerts. Perimeter secure.
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-red-950/20 border border-red-800/40 hover:border-red-600 rounded-lg p-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">
                        {alert.severity}
                      </span>
                      <span className="font-bold text-red-300 text-sm select-all">
                        {alert.registration}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-300">{alert.category}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1">{alert.reason}</div>
                    
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                      <span className="text-cyan-400">{alert.cameraId.toUpperCase()} ({alert.location})</span>
                      <span>PTS: {alert.pts}ms</span>
                      <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onTrackVehicle(alert.registration)}
                      className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Track Route</span>
                    </button>
                    <button
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-Time ANPR Vehicle Detections Feed */}
        <div className="lg:col-span-6 bg-[#0b1019] border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm font-mono text-white">REAL-TIME ANPR RECOGNITION STREAM</h3>
            </div>
            <button
              onClick={() => onNavigate('investigation')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Vehicle Search</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 font-mono text-xs">
            {recentDetections.slice(0, 8).map((det) => (
              <div
                key={det.id}
                className="bg-[#090d14] border border-slate-800/80 hover:border-slate-700 rounded-lg p-2.5 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    det.vehicleType === 'car' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/50' :
                    det.vehicleType === 'motorcycle' ? 'bg-amber-950 text-amber-300 border border-amber-700/50' :
                    det.vehicleType === 'truck' ? 'bg-purple-950 text-purple-300 border border-purple-700/50' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {det.vehicleType}
                  </span>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onTrackVehicle(det.registration)}
                        className="font-bold text-white hover:text-cyan-300 text-xs transition-colors cursor-pointer"
                      >
                        {det.registration}
                      </button>
                      {det.watchlistMatched && (
                        <span className="bg-red-950 text-red-400 border border-red-700 text-[9px] px-1 rounded font-bold">
                          WATCHLIST
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {det.cameraName} · {det.speedKmph} km/h · Conf: {(det.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-400">
                  <div>PTS: {det.pts}ms</div>
                  <div className="text-slate-500">{new Date(det.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

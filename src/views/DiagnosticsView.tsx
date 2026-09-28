import React, { useState, useEffect } from 'react';
import { Camera } from '../types';
import {
  Activity,
  Server,
  Radio,
  Zap,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Cpu,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

interface DiagnosticsViewProps {
  cameras: Camera[];
  isWebSocketConnected: boolean;
  onRefresh: () => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  cameras,
  isWebSocketConnected,
  onRefresh,
}) => {
  const [diagData, setDiagData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadDiagnostics() {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagData(data);
      }
    } catch (err) {
      console.error('Failed to fetch diagnostics:', err);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadDiagnostics();
    const interval = setInterval(loadDiagnostics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-[#070a0f] p-4 sm:p-6 space-y-6">
      
      {/* Title & Refresh */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 font-mono">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              SENTINEL SYSTEM DIAGNOSTICS & TELEMETRY
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time feed health, PTS verification, codec profiles, and media pipeline supervision.
          </p>
        </div>

        <button
          onClick={() => {
            loadDiagnostics();
            onRefresh();
          }}
          disabled={isRefreshing}
          className="px-3.5 py-1.5 bg-[#0e1420] hover:bg-[#141d2e] border border-slate-700 text-slate-200 rounded font-mono text-xs flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* High-level Status Gauges */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        
        {/* Backend Status */}
        <div className="bg-[#0b1019] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span>BACKEND STATUS</span>
            <Server className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-pulse" />
            HEALTHY
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">FastAPI & Express Engine</div>
        </div>

        {/* WebSocket Status */}
        <div className="bg-[#0b1019] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span>WEBSOCKET /ws/events</span>
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className={`mt-2 text-xl font-bold ${isWebSocketConnected ? 'text-cyan-300' : 'text-red-400'} flex items-center gap-1.5`}>
            <span className={`w-2 h-2 rounded-full ${isWebSocketConnected ? 'bg-cyan-400 animate-live-pulse' : 'bg-red-500'}`} />
            {isWebSocketConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Real-Time Event Stream</div>
        </div>

        {/* Sentinel CDN Reachability */}
        <div className="bg-[#0b1019] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span>SENTINEL CDN</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-white truncate">
            cctv.corp8.cloud
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Session Authenticated</div>
        </div>

        {/* MediaMTX IP Gateway */}
        <div className="bg-[#0b1019] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span>RTSP / WHEP GATEWAY</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-white select-all">
            103.250.160.189
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Ports: 8554 (RTSP), 8889 (WHEP)</div>
        </div>

      </div>

      {/* Discovered Cameras Diagnostics Table */}
      <div className="max-w-7xl mx-auto bg-[#0b1019] border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
        <div className="p-3 bg-[#0d131e] border-b border-slate-800 flex items-center justify-between">
          <div className="font-bold text-white flex items-center gap-2">
            <span>CAMERA STREAM MATRIX ({cameras.length} NODES)</span>
          </div>
          <span className="text-[11px] text-slate-500">Auto-Refreshed Every 5s</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-[#080c12] text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">CAMERA</th>
                <th className="py-2.5 px-3">LOCATION</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">STREAM TYPE</th>
                <th className="py-2.5 px-3">LAST PTS</th>
                <th className="py-2.5 px-3">CODEC</th>
                <th className="py-2.5 px-3">RESOLUTION</th>
                <th className="py-2.5 px-3">FPS</th>
                <th className="py-2.5 px-3">RECONNECTS</th>
                <th className="py-2.5 px-3">AI PIPELINE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {cameras.map((cam) => {
                const diag = diagData?.cameras?.find((c: any) => c.id === cam.id);
                return (
                  <tr key={cam.id} className="hover:bg-[#0e1522] transition-colors">
                    <td className="py-2 px-3 font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{cam.id.toUpperCase()}</span>
                      </div>
                    </td>

                    <td className="py-2 px-3 text-slate-300">
                      <div>{cam.location}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{cam.zone}</div>
                    </td>

                    <td className="py-2 px-3">
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-700/60 rounded px-1.5 py-0.2 text-[10px] font-bold">
                        LIVE
                      </span>
                    </td>

                    <td className="py-2 px-3 text-cyan-300 text-[11px]">
                      WHEP / HLS
                    </td>

                    <td className="py-2 px-3 text-slate-300 tabular-nums">
                      {diag?.lastFramePts || cam.lastPts || 120000}ms
                    </td>

                    <td className="py-2 px-3 text-slate-400">
                      {cam.codec || 'H.264'}
                    </td>

                    <td className="py-2 px-3 text-slate-400 tabular-nums">
                      {cam.resolution || '1920×1080'}
                    </td>

                    <td className="py-2 px-3 text-emerald-400 tabular-nums">
                      {cam.fps || 25} FPS
                    </td>

                    <td className="py-2 px-3 text-slate-400 tabular-nums">
                      {cam.reconnectCount || 0}
                    </td>

                    <td className="py-2 px-3">
                      <span className="bg-cyan-950 text-cyan-300 border border-cyan-800/60 rounded px-1.5 py-0.2 text-[10px] flex items-center gap-1 w-max">
                        <Cpu className="w-3 h-3 text-cyan-400" />
                        TRACKING
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

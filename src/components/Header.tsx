import React, { useState, useEffect } from 'react';
import { AppView, StreamingProtocol, Alert } from '../types';
import {
  LayoutDashboard,
  Grid2X2,
  Navigation,
  ShieldAlert,
  Activity,
  Zap,
  Radio,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Layers,
  ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  protocol: StreamingProtocol;
  onProtocolChange: (proto: StreamingProtocol) => void;
  onOpenIntegratorGuide: () => void;
  isAutoPatrol: boolean;
  onToggleAutoPatrol: () => void;
  isGlobalMuted: boolean;
  onToggleGlobalMute: () => void;
  activeCameraCount: number;
  totalCameraCount: number;
  activeAlertsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  protocol,
  onProtocolChange,
  onOpenIntegratorGuide,
  isAutoPatrol,
  onToggleAutoPatrol,
  isGlobalMuted,
  onToggleGlobalMute,
  activeCameraCount,
  totalCameraCount,
  activeAlertsCount,
}) => {
  const [timeUtc, setTimeUtc] = useState('');
  const [timeIst, setTimeIst] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeUtc(now.toISOString().slice(11, 19) + ' UTC');
      setTimeIst(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-[#0a0e14] border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between z-30 select-none font-mono shrink-0">
      
      {/* Brand & Emblem */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onViewChange('dashboard')}>
          <div className="w-8 h-8 rounded bg-gradient-to-br from-red-600 via-blue-700 to-indigo-900 flex items-center justify-center font-bold text-white shadow-md shadow-red-950/40 text-xs border border-red-500/40">
            GP
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm tracking-wider text-white">GUJARAT POLICE</span>
              <span className="text-red-500 font-semibold text-xs">//</span>
              <span className="text-cyan-400 text-xs font-semibold tracking-wide hidden md:inline">SURAKSHA SENTINEL</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse" />
                ONLINE
              </span>
              <span>·</span>
              <span>{activeCameraCount} LIVE FEEDS</span>
            </div>
          </div>
        </div>

        {/* Tactical Clocks (Desktop only) */}
        <div className="hidden xl:flex items-center gap-2 ml-3 pl-3 border-l border-slate-800 text-[11px] text-slate-400">
          <div className="bg-[#0e1420] px-2 py-0.5 rounded border border-slate-800/80">
            <span className="text-slate-500 mr-1">UTC:</span>
            <span className="text-slate-200">{timeUtc}</span>
          </div>
          <div className="bg-[#0e1420] px-2 py-0.5 rounded border border-slate-800/80">
            <span className="text-slate-500 mr-1">STATION:</span>
            <span className="text-cyan-300 font-bold">{timeIst}</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Views */}
      <nav className="flex items-center bg-[#0d131e] border border-slate-800/90 rounded-lg p-0.5 text-xs">
        <button
          onClick={() => onViewChange('dashboard')}
          className={`px-2.5 sm:px-3 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
            currentView === 'dashboard'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        <button
          onClick={() => onViewChange('grid')}
          className={`px-2.5 sm:px-3 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
            currentView === 'grid'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid2X2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Live Grid</span>
        </button>

        <button
          onClick={() => onViewChange('investigation')}
          className={`px-2.5 sm:px-3 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
            currentView === 'investigation'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ANPR & Route</span>
        </button>

        <button
          onClick={() => onViewChange('watchlist')}
          className={`px-2.5 sm:px-3 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer relative ${
            currentView === 'watchlist'
              ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-xs font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Watchlist</span>
          {activeAlertsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-0.5" />
          )}
        </button>

        <button
          onClick={() => onViewChange('diagnostics')}
          className={`px-2.5 sm:px-3 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
            currentView === 'diagnostics'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Diagnostics</span>
        </button>
      </nav>

      {/* Right Controls: Protocol, Patrol, Integrator Guide */}
      <div className="flex items-center gap-2">
        {/* Protocol Selector */}
        <div className="hidden lg:flex items-center bg-[#0e1420] border border-slate-800/90 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => onProtocolChange('auto')}
            title="Auto WebRTC WHEP with HLS Fallback"
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
              protocol === 'auto' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold' : 'text-slate-400'
            }`}
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Auto</span>
          </button>
          <button
            onClick={() => onProtocolChange('webrtc')}
            title="Force WebRTC WHEP (Sub-Second Latency)"
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
              protocol === 'webrtc' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold' : 'text-slate-400'
            }`}
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>WHEP</span>
          </button>
          <button
            onClick={() => onProtocolChange('hls')}
            title="Force HLS (CDN High-Compatibility)"
            className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
              protocol === 'hls' ? 'bg-amber-950 text-amber-300 border border-amber-700/60 font-semibold' : 'text-slate-400'
            }`}
          >
            <Radio className="w-3 h-3 text-amber-400" />
            <span>HLS</span>
          </button>
        </div>

        {/* Auto-Patrol */}
        <button
          onClick={onToggleAutoPatrol}
          title={isAutoPatrol ? 'Stop Patrol' : 'Start Auto Patrol (15s rotation)'}
          className={`p-1.5 rounded border text-xs transition-colors cursor-pointer ${
            isAutoPatrol
              ? 'bg-purple-950 text-purple-300 border-purple-500/80 animate-pulse'
              : 'bg-[#0e1420] text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
        >
          {isAutoPatrol ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Global Mute */}
        <button
          onClick={onToggleGlobalMute}
          title={isGlobalMuted ? 'Unmute' : 'Mute'}
          className={`p-1.5 rounded border text-xs transition-colors cursor-pointer ${
            isGlobalMuted ? 'bg-[#0e1420] text-slate-400 border-slate-800' : 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
          }`}
        >
          {isGlobalMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
        </button>

        {/* Integrator Guide */}
        <button
          onClick={onOpenIntegratorGuide}
          className="px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-950/40 cursor-pointer transition-all"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Guide</span>
        </button>
      </div>

    </header>
  );
};

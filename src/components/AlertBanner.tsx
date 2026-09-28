import React from 'react';
import { Alert } from '../types';
import { ShieldAlert, MapPin, Clock, CheckCircle, Navigation, X } from 'lucide-react';

interface AlertBannerProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => void;
  onTrackVehicle: (registration: string) => void;
  onDismiss: (alertId: string) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alerts,
  onAcknowledge,
  onTrackVehicle,
  onDismiss,
}) => {
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  if (activeAlerts.length === 0) return null;

  const current = activeAlerts[0];

  return (
    <div className="bg-red-950/95 border-b-2 border-red-500 text-white px-4 py-2.5 shadow-xl relative z-40 animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
        
        {/* Left: Icon & Alert Notice */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-600/30 border border-red-500 flex items-center justify-center shrink-0 animate-ping" style={{ animationDuration: '1.5s' }}>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-red-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wider">
                CRITICAL WATCHLIST INTERCEPT
              </span>
              <span className="text-white font-bold text-sm tracking-widest text-red-200">
                {current.registration}
              </span>
              <span className="text-red-400">·</span>
              <span className="text-red-300 font-semibold">{current.category}</span>
            </div>
            
            <div className="text-[11px] text-red-200/90 mt-0.5 flex items-center gap-3 flex-wrap">
              <span>{current.reason}</span>
              <span className="text-red-400">|</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-300" />
                {current.cameraId.toUpperCase()} ({current.location})
              </span>
              <span className="text-red-400">|</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-red-300" />
                PTS {current.pts}ms
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {activeAlerts.length > 1 && (
            <span className="bg-red-900/80 text-red-200 border border-red-700/60 rounded px-2 py-1 text-[11px]">
              +{activeAlerts.length - 1} MORE
            </span>
          )}

          <button
            onClick={() => onTrackVehicle(current.registration)}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Track Route</span>
          </button>

          <button
            onClick={() => onAcknowledge(current.id)}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acknowledge</span>
          </button>

          <button
            onClick={() => onDismiss(current.id)}
            className="p-1 rounded text-red-300 hover:text-white hover:bg-red-900/50 transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

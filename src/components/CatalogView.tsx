import React, { useState } from 'react';
import { Camera } from '../types';
import {
  Search,
  MapPin,
  Play,
  Copy,
  Check,
  Radio,
  Zap,
  Terminal,
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react';

interface CatalogViewProps {
  cameras: Camera[];
  onSelectCamera: (cam: Camera) => void;
  onOpenIntegratorGuide: (cam: Camera) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  cameras,
  onSelectCamera,
  onOpenIntegratorGuide,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const emailEncoded = 'nirbhayb383%40gmail.com';
  const pass = '3BEH-YPDW-MX3W';

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cities = ['All', ...Array.from(new Set(cameras.map((c) => c.location))).sort()];

  const filtered = cameras.filter((cam) => {
    const matchesSearch =
      cam.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cam.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cam.zone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCity = selectedCity === 'All' || cam.location === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="flex-1 bg-[#070a0f] p-4 sm:p-6 overflow-y-auto">
      {/* Page Title & Search Bar */}
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold font-mono text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>SENTINEL CAMERA CATALOGUE ({cameras.length} NODES)</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Synchronous physical camera streams published live across Gujarat transit and heritage zones.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search camera catalogue..."
                className="w-full bg-[#0d131e] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono text-xs">
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                selectedCity === city
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 font-semibold'
                  : 'bg-[#0f1724] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {city} {city === 'All' ? `(${cameras.length})` : `(${cameras.filter(c => c.location === city).length})`}
            </button>
          ))}
        </div>

        {/* Cameras Grid Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cam) => {
            const rtspUrl = `rtsp://${emailEncoded}:${pass}@103.250.160.189:8554/stream/${cam.id}`;
            const hlsUrl = `https://cctv.corp8.cloud/${cam.id}/index.m3u8`;

            return (
              <div
                key={cam.id}
                className="bg-[#0b1019] border border-slate-800/80 hover:border-cyan-500/50 rounded-xl p-4 transition-all duration-150 flex flex-col justify-between group shadow-sm hover:shadow-cyan-900/10"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-pulse" />
                        <span className="font-bold text-sm text-cyan-300">{cam.id.toUpperCase()}</span>
                        <span className="text-slate-500 text-xs">/</span>
                        <span className="text-xs text-slate-300 font-medium">{cam.location}</span>
                      </div>
                      <h3 className="font-medium text-sm text-white mt-1 group-hover:text-cyan-200 transition-colors">
                        {cam.name}
                      </h3>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-600/40 shrink-0">
                      ONLINE
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{cam.zone}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Coordinates: {cam.lat?.toFixed(4)}°N, {cam.lng?.toFixed(4)}°E
                    </div>
                  </div>
                </div>

                {/* Actions & Quick Endpoints */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectCamera(cam)}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Launch Stream</span>
                    </button>

                    <button
                      onClick={() => onOpenIntegratorGuide(cam)}
                      className="bg-[#101724] hover:bg-[#162338] text-slate-300 hover:text-white border border-slate-700/80 font-mono text-xs py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
                      title="View AI Integrator API commands"
                    >
                      API Guide
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                    <button
                      onClick={() => copyText(rtspUrl, `rtsp_${cam.id}`)}
                      className="hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy RTSP URL"
                    >
                      {copiedKey === `rtsp_${cam.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Terminal className="w-3 h-3 text-cyan-400" />}
                      <span>RTSP</span>
                    </button>

                    <button
                      onClick={() => copyText(hlsUrl, `hls_${cam.id}`)}
                      className="hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy HLS URL"
                    >
                      {copiedKey === `hls_${cam.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Radio className="w-3 h-3 text-amber-400" />}
                      <span>HLS</span>
                    </button>

                    <span className="text-[10px] text-slate-500">TCP Required</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

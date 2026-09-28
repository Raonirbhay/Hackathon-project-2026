import React, { useState, useMemo } from 'react';
import { Camera } from '../types';
import {
  Search,
  Filter,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
  CheckCircle2,
  Video
} from 'lucide-react';

interface SidebarProps {
  cameras: Camera[];
  selectedCameraId: string;
  onSelectCamera: (cam: Camera) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  cameras,
  selectedCameraId,
  onSelectCamera,
  isOpen,
  onToggle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');

  // Extract unique cities
  const cities = useMemo(() => {
    const list = Array.from(new Set(cameras.map((c) => c.location)));
    return ['All', ...list.sort()];
  }, [cameras]);

  // Filter cameras
  const filteredCameras = useMemo(() => {
    return cameras.filter((cam) => {
      const matchesSearch =
        cam.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cam.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cam.zone.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCity = selectedCity === 'All' || cam.location === selectedCity;

      return matchesSearch && matchesCity;
    });
  }, [cameras, searchQuery, selectedCity]);

  return (
    <aside
      className={`h-[calc(100vh-3.5rem)] bg-[#090d14] border-r border-slate-800 flex flex-col transition-all duration-200 z-20 shrink-0 ${
        isOpen ? 'w-80' : 'w-12'
      }`}
    >
      {/* Top Toggle & Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-[#0c111a]">
        {isOpen ? (
          <>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-200">
              <Video className="w-4 h-4 text-cyan-400" />
              <span>CAMERA FEEDS ({filteredCameras.length}/{cameras.length})</span>
            </div>
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={onToggle}
            title="Expand camera list"
            className="w-full flex justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <>
          {/* Search Box */}
          <div className="p-3 border-b border-slate-800/80 bg-[#080c12]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search camera or city..."
                className="w-full bg-[#0e1420] border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* City Filter Pills */}
            <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-1 scrollbar-none font-mono text-[11px]">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-2 py-0.5 rounded whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCity === city
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/50'
                      : 'bg-[#101724] text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Camera List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredCameras.map((cam) => {
              const isSelected = cam.id === selectedCameraId;
              return (
                <div
                  key={cam.id}
                  onClick={() => onSelectCamera(cam)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer font-mono ${
                    isSelected
                      ? 'bg-[#121c2d] border-cyan-500/70 shadow-xs ring-1 ring-cyan-500/20'
                      : 'bg-[#0b1019] border-slate-800/80 hover:bg-[#0f1724] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-pulse" />
                      <span className={`font-bold ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                        {cam.id.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{cam.location}</span>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-300 truncate">
                    {cam.name}
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-1 truncate max-w-[170px]">
                      <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                      <span className="truncate">{cam.zone}</span>
                    </div>
                    <span className="text-emerald-500 font-semibold">LIVE</span>
                  </div>
                </div>
              );
            })}

            {filteredCameras.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500 font-mono">
                No cameras found matching "{searchQuery}"
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

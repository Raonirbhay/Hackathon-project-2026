import React, { useState, useMemo } from 'react';
import { Camera, GridLayout, StreamingProtocol, Detection } from '../types';
import { CameraPlayer } from '../components/CameraPlayer';
import {
  Grid2X2,
  Grid3X3,
  Maximize,
  LayoutGrid,
  Columns,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  MapPin,
  Cpu
} from 'lucide-react';

interface LiveGridViewProps {
  cameras: Camera[];
  selectedCameraId: string;
  onSelectCamera: (cam: Camera) => void;
  protocol: StreamingProtocol;
  recentDetections: Detection[];
}

export const LiveGridView: React.FC<LiveGridViewProps> = ({
  cameras,
  selectedCameraId,
  onSelectCamera,
  protocol,
  recentDetections,
}) => {
  const [layout, setLayout] = useState<GridLayout>('2x2');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [page, setPage] = useState(0);

  const cities = useMemo(() => {
    const set = new Set(cameras.map((c) => c.location));
    return ['All', ...Array.from(set).sort()];
  }, [cameras]);

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

  // Page size depending on layout
  const pageSize = useMemo(() => {
    if (layout === '1x1') return 1;
    if (layout === '2x2') return 4;
    if (layout === '3x3') return 9;
    if (layout === '4x4') return 16;
    return 5; // split
  }, [layout]);

  const totalPages = Math.ceil(filteredCameras.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const visibleCameras = filteredCameras.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId) || visibleCameras[0] || cameras[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#05080e] overflow-hidden">
      
      {/* Control Toolbar */}
      <div className="p-3 bg-[#0a0e14] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
        
        {/* Search & City Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search camera or area..."
              className="w-full bg-[#0e1420] border border-slate-800 rounded-md pl-8 pr-3 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => {
                  setSelectedCity(city);
                  setPage(0);
                }}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer text-[11px] ${
                  selectedCity === city
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                    : 'bg-[#101724] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Layout Selector & Pagination */}
        <div className="flex items-center gap-3">
          
          {/* Layout Controls */}
          <div className="flex items-center bg-[#0e1420] border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => { setLayout('1x1'); setPage(0); }}
              title="1x1 Master Focus"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                layout === '1x1' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setLayout('2x2'); setPage(0); }}
              title="2x2 Quad Matrix"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                layout === '2x2' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid2X2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setLayout('3x3'); setPage(0); }}
              title="3x3 Surveillance Wall (9 cameras)"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                layout === '3x3' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setLayout('4x4'); setPage(0); }}
              title="4x4 Command Matrix (16 cameras)"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                layout === '4x4' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setLayout('split'); setPage(0); }}
              title="Split Focus & Queue"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                layout === 'split' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 bg-[#0e1420] border border-slate-800 rounded-lg px-2 py-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-0.5 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-slate-300 text-[11px]">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-0.5 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Grid Content Stage */}
      <div className="flex-1 p-2 overflow-hidden flex flex-col">
        
        {/* LAYOUT 1x1: Master Focus */}
        {layout === '1x1' && selectedCamera && (
          <div className="flex-1 h-full min-h-0">
            <CameraPlayer
              camera={selectedCamera}
              protocolPreference={protocol}
              isFocused={true}
              showAiOverlayDefault={true}
              latestDetection={recentDetections.find((d) => d.cameraId === selectedCamera.id)}
            />
          </div>
        )}

        {/* LAYOUT 2x2: Quad Matrix */}
        {layout === '2x2' && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2 h-full min-h-0 overflow-hidden">
            {visibleCameras.map((cam) => (
              <div key={cam.id} className="w-full h-full min-h-0">
                <CameraPlayer
                  camera={cam}
                  protocolPreference={protocol}
                  isFocused={cam.id === selectedCameraId}
                  onSelect={() => onSelectCamera(cam)}
                  latestDetection={recentDetections.find((d) => d.cameraId === cam.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* LAYOUT 3x3: Wall Matrix */}
        {layout === '3x3' && (
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 grid-rows-3 gap-1.5 h-full min-h-0 overflow-hidden">
            {visibleCameras.map((cam) => (
              <div key={cam.id} className="w-full h-full min-h-0">
                <CameraPlayer
                  camera={cam}
                  protocolPreference={protocol}
                  isFocused={cam.id === selectedCameraId}
                  onSelect={() => onSelectCamera(cam)}
                  latestDetection={recentDetections.find((d) => d.cameraId === cam.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* LAYOUT 4x4: Command Matrix */}
        {layout === '4x4' && (
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 grid-rows-4 gap-1.5 h-full min-h-0 overflow-hidden">
            {visibleCameras.map((cam) => (
              <div key={cam.id} className="w-full h-full min-h-0">
                <CameraPlayer
                  camera={cam}
                  protocolPreference={protocol}
                  isFocused={cam.id === selectedCameraId}
                  onSelect={() => onSelectCamera(cam)}
                  latestDetection={recentDetections.find((d) => d.cameraId === cam.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* LAYOUT Split: Focus Hero + Side Queue */}
        {layout === 'split' && selectedCamera && (
          <div className="flex-1 flex flex-col lg:flex-row gap-2 h-full min-h-0 overflow-hidden">
            <div className="flex-1 h-full min-h-0">
              <CameraPlayer
                camera={selectedCamera}
                protocolPreference={protocol}
                isFocused={true}
                showAiOverlayDefault={true}
                latestDetection={recentDetections.find((d) => d.cameraId === selectedCamera.id)}
              />
            </div>

            <div className="w-full lg:w-80 flex flex-row lg:flex-col gap-2 overflow-auto shrink-0 max-h-full">
              {cameras
                .filter((c) => c.id !== selectedCamera.id)
                .slice(0, 4)
                .map((auxCam) => (
                  <div key={auxCam.id} className="w-60 lg:w-full h-44 shrink-0">
                    <CameraPlayer
                      camera={auxCam}
                      protocolPreference={protocol}
                      onSelect={() => onSelectCamera(auxCam)}
                      latestDetection={recentDetections.find((d) => d.cameraId === auxCam.id)}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

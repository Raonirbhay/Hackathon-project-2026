import React, { useState, useEffect } from 'react';
import { RouteNode, Detection, WatchlistEntry } from '../types';
import { MapComponent } from '../components/MapComponent';
import {
  Search,
  Navigation,
  Clock,
  MapPin,
  Calendar,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Layers,
  Car,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface VehicleInvestigationViewProps {
  initialRegistration?: string;
  onClearInitialRegistration?: () => void;
}

export const VehicleInvestigationView: React.FC<VehicleInvestigationViewProps> = ({
  initialRegistration = '',
  onClearInitialRegistration,
}) => {
  const [searchInput, setSearchInput] = useState(initialRegistration || 'GJ01AB1234');
  const [currentReg, setCurrentReg] = useState(initialRegistration || 'GJ01AB1234');
  const [timeline, setTimeline] = useState<Detection[]>([]);
  const [routeNodes, setRouteNodes] = useState<RouteNode[]>([]);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickSamples = [
    { reg: 'GJ01AB1234', label: 'Stolen Fortuner (Navrangpura)', tag: 'CRITICAL' },
    { reg: 'GJ27EA9021', label: 'Robbery Suspect Getaway', tag: 'CRITICAL' },
    { reg: 'GJ06CD5521', label: 'Fatal Hit & Run (Surat)', tag: 'HIGH' },
    { reg: 'GJ05JK4012', label: 'Courier Courier Suspect', tag: 'CRITICAL' },
    { reg: 'GJ03KJ7712', label: '18x Unpaid E-Challans', tag: 'MEDIUM' },
  ];

  // Fetch timeline and route whenever currentReg changes
  useEffect(() => {
    if (!currentReg) return;

    async function loadVehicleData() {
      setIsLoading(true);
      setError(null);

      try {
        const [infoRes, timelineRes, routeRes] = await Promise.all([
          fetch(`/api/vehicles/${currentReg}`),
          fetch(`/api/vehicles/${currentReg}/timeline`),
          fetch(`/api/vehicles/${currentReg}/route`),
        ]);

        if (infoRes.ok) {
          const infoData = await infoRes.json();
          setVehicleInfo(infoData);
        } else {
          setVehicleInfo(null);
        }

        if (timelineRes.ok) {
          const timelineData = await timelineRes.json();
          setTimeline(timelineData.timeline || []);
        } else {
          setTimeline([]);
        }

        if (routeRes.ok) {
          const routeData = await routeRes.json();
          setRouteNodes(routeData.route || []);
        } else {
          setRouteNodes([]);
        }

        if (!infoRes.ok && !timelineRes.ok) {
          setError(`No recorded sightings for registration "${currentReg}" across Sentinel CCTV nodes.`);
        }
      } catch (err: any) {
        setError('Failed to fetch vehicle surveillance records: ' + err?.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadVehicleData();
  }, [currentReg]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const normalized = searchInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCurrentReg(normalized);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#070a0f] p-4 sm:p-6 space-y-6">
      
      {/* Header & Plate Query Search Bar */}
      <div className="max-w-7xl mx-auto space-y-4">
        <div>
          <div className="flex items-center gap-2 font-mono">
            <Navigation className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              VEHICLE SURVEILLANCE & ANPR ROUTE INVESTIGATION
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Query Sentinel CCTV detection logs and trace chronologically authenticated camera transit paths.
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter Registration No. (e.g. GJ 01 AB 1234)..."
              className="w-full bg-[#0d131e] border border-slate-700/80 rounded-lg pl-10 pr-4 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 tracking-wider font-semibold"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Search className="w-4 h-4" />
            <span>Search Detections</span>
          </button>
        </form>

        {/* Quick Sample Target Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="text-slate-500">Active Watchlist Targets:</span>
          {quickSamples.map((sample) => (
            <button
              key={sample.reg}
              onClick={() => {
                setSearchInput(sample.reg);
                setCurrentReg(sample.reg);
              }}
              className={`px-2.5 py-1 rounded-md border text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentReg === sample.reg
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80 font-bold'
                  : 'bg-[#101724] text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <span className="text-white font-bold">{sample.reg}</span>
              <span className="text-slate-500">({sample.label})</span>
              <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                sample.tag === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-amber-950 text-amber-300'
              }`}>
                {sample.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Target Details Card */}
      {vehicleInfo && (
        <div className="max-w-7xl mx-auto bg-[#0b1019] border border-slate-800 rounded-xl p-4 font-mono text-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="bg-[#121c2d] border border-cyan-500/60 text-cyan-300 font-bold text-lg px-3 py-1 rounded tracking-widest">
                {vehicleInfo.registration}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">
                    {vehicleInfo.latestDetection?.vehicleType?.toUpperCase() || 'VEHICLE'}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">Total Recorded Sightings: {vehicleInfo.totalDetections}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Last Seen: {vehicleInfo.latestDetection?.cameraName} ({vehicleInfo.latestDetection?.location})
                </div>
              </div>
            </div>

            {vehicleInfo.isWatchlisted && vehicleInfo.watchlistDetails && (
              <div className="bg-red-950/60 border border-red-600/60 rounded-lg p-2.5 max-w-md">
                <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>POLICE WATCHLIST HIT: {vehicleInfo.watchlistDetails.category.toUpperCase()}</span>
                </div>
                <div className="text-[11px] text-red-200 mt-0.5">
                  {vehicleInfo.watchlistDetails.reason}
                </div>
                <div className="text-[10px] text-red-400/80 mt-1">
                  FIR: {vehicleInfo.watchlistDetails.firNumber} · Station: {vehicleInfo.watchlistDetails.station}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Route Map + Chronological Timeline */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Sequential Interactive Route Map */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-white tracking-wide">
                AUTHENTICATED CAMERA TRANSIT ROUTE ({routeNodes.length} NODES)
              </h2>
            </div>
            <span className="text-slate-500 text-[11px]">Strict Detection Sequence</span>
          </div>

          <div className="h-[520px] rounded-xl overflow-hidden border border-slate-800">
            {routeNodes.length > 0 ? (
              <MapComponent routeNodes={routeNodes} />
            ) : (
              <div className="h-full bg-[#0b1019] flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2">
                <Navigation className="w-8 h-8 opacity-40" />
                <span>No geographical route nodes found for registration</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chronological Sightings Timeline */}
        <div className="lg:col-span-5 bg-[#0b1019] border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-white tracking-wide">CHRONOLOGICAL SIGHTINGS</h2>
            </div>
            <span className="text-slate-500">{timeline.length} Events</span>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 font-mono text-xs">
            {timeline.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No chronological detection events recorded.
              </div>
            ) : (
              timeline.map((event, idx) => (
                <div
                  key={event.id}
                  className="bg-[#090d14] border border-slate-800/90 rounded-lg p-3 relative pl-6 border-l-4 border-l-cyan-500"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="bg-cyan-950 text-cyan-300 font-bold px-1.5 py-0.5 rounded text-[10px] border border-cyan-700/50">
                        STEP {idx + 1}
                      </span>
                      <span className="font-bold text-white">{event.cameraId.toUpperCase()}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-300 truncate max-w-[140px]">{event.location}</span>
                    </div>

                    <span className="text-emerald-400 text-[11px] font-semibold">
                      {event.speedKmph} km/h
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1 truncate">
                    {event.cameraName}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>PTS: <strong className="text-slate-300">{event.pts}ms</strong></span>
                      <span>·</span>
                      <span>CONF: <strong className="text-slate-300">{(event.confidence * 100).toFixed(1)}%</strong></span>
                    </div>

                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

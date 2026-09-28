import React, { useState } from 'react';
import { WatchlistEntry } from '../types';
import {
  ShieldAlert,
  Plus,
  Trash2,
  Search,
  Navigation,
  Check,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
  X
} from 'lucide-react';

interface WatchlistViewProps {
  watchlist: WatchlistEntry[];
  onAddWatchlist: (entry: Partial<WatchlistEntry>) => Promise<boolean>;
  onRemoveWatchlist: (registration: string) => void;
  onTrackVehicle: (registration: string) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlist,
  onAddWatchlist,
  onRemoveWatchlist,
  onTrackVehicle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [formReg, setFormReg] = useState('');
  const [formCategory, setFormCategory] = useState<WatchlistEntry['category']>('Stolen Vehicle');
  const [formSeverity, setFormSeverity] = useState<WatchlistEntry['severity']>('CRITICAL');
  const [formReason, setFormReason] = useState('');
  const [formFir, setFormFir] = useState('');
  const [formStation, setFormStation] = useState('Gujarat Police Control Room');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'All',
    'Stolen Vehicle',
    'Wanted Suspect / Gang',
    'Hit & Run',
    'Drug Trafficking',
    'Unpaid E-Challan',
    'Surveillance Order',
  ];

  const filteredWatchlist = watchlist.filter((entry) => {
    const matchesSearch =
      entry.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.firNumber && entry.firNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      entry.station.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || entry.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReg.trim() || !formReason.trim()) return;

    setIsSubmitting(true);
    const success = await onAddWatchlist({
      registration: formReg.trim().toUpperCase(),
      category: formCategory,
      severity: formSeverity,
      reason: formReason.trim(),
      firNumber: formFir.trim() || 'N/A',
      station: formStation.trim(),
    });

    setIsSubmitting(false);
    if (success) {
      setFormReg('');
      setFormReason('');
      setFormFir('');
      setIsAddModalOpen(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#070a0f] p-4 sm:p-6 space-y-6">
      
      {/* Title & Action Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 font-mono">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              GUJARAT POLICE SURAKSHA WATCHLIST ({watchlist.length} TARGETS)
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Authoritative law enforcement vehicle database. Automated ANPR real-time matching across 30 Sentinel CCTV nodes.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-red-950/40 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Suspect Vehicle</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
        
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plate, FIR, or reason..."
            className="w-full bg-[#0d131e] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer text-[11px] ${
                selectedCategory === cat
                  ? 'bg-red-950 text-red-300 border border-red-600/60 font-bold'
                  : 'bg-[#0f1724] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Watchlist Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWatchlist.map((entry) => (
          <div
            key={entry.id}
            className="bg-[#0b1019] border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-colors font-mono text-xs group"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-lg font-bold text-white tracking-widest select-all group-hover:text-red-300 transition-colors">
                    {entry.registration}
                  </span>
                  <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    {entry.category}
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    entry.severity === 'CRITICAL'
                      ? 'bg-red-950 text-red-400 border-red-700/80'
                      : entry.severity === 'HIGH'
                      ? 'bg-amber-950 text-amber-400 border-amber-700/80'
                      : 'bg-blue-950 text-blue-400 border-blue-700/80'
                  }`}
                >
                  {entry.severity}
                </span>
              </div>

              <div className="mt-3 bg-[#080c12] p-2.5 rounded border border-slate-800/80 text-slate-300 text-[11px] leading-relaxed">
                {entry.reason}
              </div>

              <div className="mt-3 space-y-1 text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-slate-600 shrink-0" />
                  <span>FIR: {entry.firNumber || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 text-slate-600 shrink-0" />
                  <span className="truncate">{entry.station}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-600 shrink-0" />
                  <span>Logged: {new Date(entry.dateAdded).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <button
                onClick={() => onTrackVehicle(entry.registration)}
                className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Track on Map</span>
              </button>

              <button
                onClick={() => onRemoveWatchlist(entry.registration)}
                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors cursor-pointer rounded hover:bg-red-950/40"
                title="Remove from watchlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Suspect Vehicle Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in font-mono text-xs">
          <div className="bg-[#0b1019] border border-slate-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-sm text-white">ADD TARGET TO POLICE WATCHLIST</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">REGISTRATION NUMBER *</label>
                <input
                  type="text"
                  required
                  value={formReg}
                  onChange={(e) => setFormReg(e.target.value.toUpperCase())}
                  placeholder="e.g. GJ 01 AB 1234"
                  className="w-full bg-[#080c12] border border-slate-800 rounded p-2 text-white font-bold tracking-wider uppercase focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">CATEGORY</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-[#080c12] border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="Stolen Vehicle">Stolen Vehicle</option>
                    <option value="Wanted Suspect / Gang">Wanted Suspect / Gang</option>
                    <option value="Hit & Run">Hit & Run</option>
                    <option value="Drug Trafficking">Drug Trafficking</option>
                    <option value="Unpaid E-Challan">Unpaid E-Challan</option>
                    <option value="Surveillance Order">Surveillance Order</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">SEVERITY LEVEL</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as any)}
                    className="w-full bg-[#080c12] border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="CRITICAL">CRITICAL (Immediate Red Alert)</option>
                    <option value="HIGH">HIGH (Intercept at Barricade)</option>
                    <option value="MEDIUM">MEDIUM (Challan Notice)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">INCIDENT REASON / DESCRIPTION *</label>
                <textarea
                  required
                  rows={2}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Armed robbery getaway car reported fleeing towards SG Highway..."
                  className="w-full bg-[#080c12] border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">FIR / CASE NUMBER</label>
                  <input
                    type="text"
                    value={formFir}
                    onChange={(e) => setFormFir(e.target.value)}
                    placeholder="FIR #492/2026"
                    className="w-full bg-[#080c12] border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">REPORTING POLICE STATION</label>
                  <input
                    type="text"
                    value={formStation}
                    onChange={(e) => setFormStation(e.target.value)}
                    placeholder="Navrangpura PS, Ahmedabad"
                    className="w-full bg-[#080c12] border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Registering...' : 'Register Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, AppView, StreamingProtocol, Detection, Alert, WatchlistEntry, SummaryStats } from './types';
import { DEFAULT_CAMERAS } from './data/defaultCameras';
import { Header } from './components/Header';
import { AlertBanner } from './components/AlertBanner';
import { IntegratorDrawer } from './components/IntegratorDrawer';
import { DashboardView } from './views/DashboardView';
import { LiveGridView } from './views/LiveGridView';
import { VehicleInvestigationView } from './views/VehicleInvestigationView';
import { WatchlistView } from './views/WatchlistView';
import { DiagnosticsView } from './views/DiagnosticsView';

const INITIAL_WATCHLIST: WatchlistEntry[] = [
  {
    id: 'wl-01',
    registration: 'GJ01AB1234',
    category: 'Stolen Vehicle',
    reason: 'Stolen White Toyota Fortuner - FIR #294/2026 Navrangpura PS',
    severity: 'CRITICAL',
    firNumber: '294/2026',
    station: 'Navrangpura PS, Ahmedabad',
    dateAdded: '2026-09-20T08:00:00Z',
    active: true,
  },
  {
    id: 'wl-02',
    registration: 'GJ27EA9021',
    category: 'Wanted Suspect / Gang',
    reason: 'Armed Robbery Suspect Getaway Car - Crime Branch Red Alert',
    severity: 'CRITICAL',
    firNumber: 'CR-104/2026',
    station: 'Crime Branch Gandhinagar',
    dateAdded: '2026-09-22T14:30:00Z',
    active: true,
  },
  {
    id: 'wl-03',
    registration: 'GJ06CD5521',
    category: 'Hit & Run',
    reason: 'Fatal Hit & Run Incident on Ring Road - Surat Traffic Branch',
    severity: 'HIGH',
    firNumber: '112/2026',
    station: 'Varachha PS, Surat',
    dateAdded: '2026-09-24T11:15:00Z',
    active: true,
  },
];

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [cameras, setCameras] = useState<Camera[]>(DEFAULT_CAMERAS);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('cam01');
  const [protocol, setProtocol] = useState<StreamingProtocol>('auto');
  const [isIntegratorOpen, setIsIntegratorOpen] = useState(false);
  const [isAutoPatrol, setIsAutoPatrol] = useState(false);
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // Real-time state
  const [recentDetections, setRecentDetections] = useState<Detection[]>([
    {
      id: 'det-init-1',
      cameraId: 'cam01',
      cameraName: '01 Chiman bhai Bridge',
      location: 'Ahmedabad',
      lat: 23.0225,
      lng: 72.5714,
      timestamp: new Date().toISOString(),
      pts: 142000,
      vehicleType: 'car',
      trackingId: 'TRK-0920',
      registration: 'GJ01AB1234',
      rawOcr: 'GJ 01 AB 1234',
      confidence: 0.96,
      speedKmph: 52,
      bbox: [32, 28, 24, 28],
      watchlistMatched: true,
      watchlistCategory: 'Stolen Vehicle',
      watchlistReason: 'Stolen White Toyota Fortuner - FIR #294/2026 Navrangpura PS',
    },
    {
      id: 'det-init-2',
      cameraId: 'cam02',
      cameraName: '02 Janpath',
      location: 'Ahmedabad',
      lat: 23.0338,
      lng: 72.5645,
      timestamp: new Date(Date.now() - 60000).toISOString(),
      pts: 82000,
      vehicleType: 'van',
      trackingId: 'TRK-4412',
      registration: 'GJ27EA9021',
      rawOcr: 'GJ27 EA 9021',
      confidence: 0.94,
      speedKmph: 64,
      bbox: [40, 32, 22, 26],
      watchlistMatched: true,
      watchlistCategory: 'Wanted Suspect / Gang',
      watchlistReason: 'Armed Robbery Suspect Getaway Car',
    },
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'alert-init-1',
      detectionId: 'det-init-1',
      registration: 'GJ01AB1234',
      category: 'Stolen Vehicle',
      reason: 'Stolen White Toyota Fortuner - FIR #294/2026 Navrangpura PS',
      severity: 'CRITICAL',
      cameraId: 'cam01',
      cameraName: '01 Chiman bhai Bridge',
      location: 'Ahmedabad',
      lat: 23.0225,
      lng: 72.5714,
      timestamp: new Date().toISOString(),
      pts: 142000,
      confidence: 0.96,
      status: 'ACTIVE',
    },
  ]);

  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(INITIAL_WATCHLIST);
  const [summary, setSummary] = useState<SummaryStats>({
    totalCameras: 30,
    liveCameras: 30,
    offlineCameras: 0,
    activeAiCameras: 30,
    totalDetections: 12,
    anprReads: 12,
    activeAlerts: 1,
    watchlistCount: 3,
  });

  const [investigationTarget, setInvestigationTarget] = useState<string>('GJ01AB1234');

  // Load backend state (non-blocking, never shows blank screen)
  const refreshAllData = useCallback(async () => {
    try {
      const [camsRes, summaryRes, alertsRes, watchlistRes] = await Promise.all([
        fetch('/api/cameras').catch(() => null),
        fetch('/api/analytics/summary').catch(() => null),
        fetch('/api/alerts').catch(() => null),
        fetch('/api/watchlist').catch(() => null),
      ]);

      if (camsRes && camsRes.ok) {
        const camsData = await camsRes.json();
        if (camsData.cameras && camsData.cameras.length > 0) {
          setCameras(camsData.cameras);
        }
      }

      if (summaryRes && summaryRes.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData.summary) setSummary(summaryData.summary);
        if (summaryData.recentDetections && summaryData.recentDetections.length > 0) {
          setRecentDetections(summaryData.recentDetections);
        }
      }

      if (alertsRes && alertsRes.ok) {
        const alertsData = await alertsRes.json();
        if (alertsData.alerts && alertsData.alerts.length > 0) {
          setAlerts(alertsData.alerts);
        }
      }

      if (watchlistRes && watchlistRes.ok) {
        const wlData = await watchlistRes.json();
        if (wlData.watchlist && wlData.watchlist.length > 0) {
          setWatchlist(wlData.watchlist);
        }
      }
    } catch (err) {
      console.warn('Backend sync noticed (offline/dev mode active):', err);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Connect to Real-Time WebSocket (/ws/events)
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/events`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    function connectWs() {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsWebSocketConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'vehicle_detection' && data.detection) {
              setRecentDetections((prev) => [data.detection, ...prev.slice(0, 49)]);
              setSummary((s) => ({
                ...s,
                totalDetections: s.totalDetections + 1,
                anprReads: data.detection.confidence > 0.85 ? s.anprReads + 1 : s.anprReads,
              }));
            }

            if (data.type === 'watchlist_alert' && data.alert) {
              setAlerts((prev) => [data.alert, ...prev.slice(0, 49)]);
              setSummary((s) => ({
                ...s,
                activeAlerts: s.activeAlerts + 1,
              }));
            }

            if (data.type === 'alert_acknowledged' && data.alert) {
              setAlerts((prev) =>
                prev.map((a) => (a.id === data.alert.id ? { ...a, status: 'ACKNOWLEDGED' } : a))
              );
              setSummary((s) => ({
                ...s,
                activeAlerts: Math.max(0, s.activeAlerts - 1),
              }));
            }

            if (data.type === 'watchlist_added' && data.entry) {
              setWatchlist((prev) => [data.entry, ...prev]);
              setSummary((s) => ({ ...s, watchlistCount: s.watchlistCount + 1 }));
            }

            if (data.type === 'watchlist_removed' && data.registration) {
              setWatchlist((prev) => prev.filter((w) => w.registration !== data.registration));
              setSummary((s) => ({ ...s, watchlistCount: Math.max(0, s.watchlistCount - 1) }));
            }
          } catch (e) {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          setIsWebSocketConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          setIsWebSocketConnected(false);
        };
      } catch (err) {
        setIsWebSocketConnected(false);
        reconnectTimeout = setTimeout(connectWs, 4000);
      }
    }

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  // Auto-Patrol rotation (Cycles selected camera every 15s)
  useEffect(() => {
    if (!isAutoPatrol || cameras.length === 0) return;

    const interval = setInterval(() => {
      setSelectedCameraId((currentId) => {
        const currentIndex = cameras.findIndex((c) => c.id === currentId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        return cameras[nextIndex].id;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [isAutoPatrol, cameras]);

  // Alert Actions
  const handleAcknowledgeAlert = async (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a))
    );
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: 'Control Room Officer #409' }),
      });
    } catch {
      // Handled in client state
    }
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: 'DISMISSED' } : a)));
  };

  const handleTrackVehicle = (registration: string) => {
    setInvestigationTarget(registration);
    setCurrentView('investigation');
  };

  // Watchlist Actions
  const handleAddWatchlist = async (entry: Partial<WatchlistEntry>): Promise<boolean> => {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlist((prev) => [data.entry, ...prev]);
        return true;
      }
    } catch {
      // Fallback local update
    }

    const newLocal: WatchlistEntry = {
      id: `wl-${Date.now()}`,
      registration: entry.registration || 'UNKNOWN',
      category: entry.category || 'Surveillance Order',
      reason: entry.reason || 'Manual Registration',
      severity: entry.severity || 'HIGH',
      firNumber: entry.firNumber || 'N/A',
      station: entry.station || 'Control Room',
      dateAdded: new Date().toISOString(),
      active: true,
    };
    setWatchlist((prev) => [newLocal, ...prev]);
    return true;
  };

  const handleRemoveWatchlist = async (registration: string) => {
    setWatchlist((prev) => prev.filter((w) => w.registration !== registration));
    try {
      await fetch(`/api/watchlist/${registration}`, {
        method: 'DELETE',
      });
    } catch {
      // Handled in client state
    }
  };

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId) || cameras[0] || DEFAULT_CAMERAS[0];
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');

  return (
    <div className="h-screen w-screen bg-[#070a0f] text-slate-200 flex flex-col overflow-hidden select-none font-sans">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        protocol={protocol}
        onProtocolChange={setProtocol}
        onOpenIntegratorGuide={() => setIsIntegratorOpen(true)}
        isAutoPatrol={isAutoPatrol}
        onToggleAutoPatrol={() => setIsAutoPatrol(!isAutoPatrol)}
        isGlobalMuted={isGlobalMuted}
        onToggleGlobalMute={() => setIsGlobalMuted(!isGlobalMuted)}
        activeCameraCount={cameras.length}
        totalCameraCount={30}
        activeAlertsCount={activeAlerts.length}
      />

      {/* Critical Watchlist Alert Notification Banner */}
      <AlertBanner
        alerts={alerts}
        onAcknowledge={handleAcknowledgeAlert}
        onTrackVehicle={handleTrackVehicle}
        onDismiss={handleDismissAlert}
      />

      {/* Main Viewport */}
      <main className="flex-1 flex overflow-hidden relative">
        {currentView === 'dashboard' && (
          <DashboardView
            summary={summary}
            cameras={cameras}
            recentDetections={recentDetections}
            activeAlerts={activeAlerts}
            onSelectCamera={(cam) => {
              setSelectedCameraId(cam.id);
              setCurrentView('grid');
            }}
            onNavigate={(view) => setCurrentView(view)}
            onTrackVehicle={handleTrackVehicle}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            protocol={protocol}
          />
        )}

        {currentView === 'grid' && (
          <LiveGridView
            cameras={cameras}
            selectedCameraId={selectedCameraId}
            onSelectCamera={(cam) => setSelectedCameraId(cam.id)}
            protocol={protocol}
            recentDetections={recentDetections}
          />
        )}

        {currentView === 'investigation' && (
          <VehicleInvestigationView
            initialRegistration={investigationTarget}
            onClearInitialRegistration={() => setInvestigationTarget('')}
          />
        )}

        {currentView === 'watchlist' && (
          <WatchlistView
            watchlist={watchlist}
            onAddWatchlist={handleAddWatchlist}
            onRemoveWatchlist={handleRemoveWatchlist}
            onTrackVehicle={handleTrackVehicle}
          />
        )}

        {currentView === 'diagnostics' && (
          <DiagnosticsView
            cameras={cameras}
            isWebSocketConnected={isWebSocketConnected}
            onRefresh={refreshAllData}
          />
        )}
      </main>

      {/* Integrator Reference Drawer */}
      {selectedCamera && (
        <IntegratorDrawer
          isOpen={isIntegratorOpen}
          onClose={() => setIsIntegratorOpen(false)}
          selectedCamera={selectedCamera}
        />
      )}
    </div>
  );
}

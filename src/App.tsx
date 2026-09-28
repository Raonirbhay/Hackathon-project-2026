/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, AppView, StreamingProtocol, Detection, Alert, WatchlistEntry, SummaryStats } from './types';
import { Header } from './components/Header';
import { AlertBanner } from './components/AlertBanner';
import { IntegratorDrawer } from './components/IntegratorDrawer';
import { DashboardView } from './views/DashboardView';
import { LiveGridView } from './views/LiveGridView';
import { VehicleInvestigationView } from './views/VehicleInvestigationView';
import { WatchlistView } from './views/WatchlistView';
import { DiagnosticsView } from './views/DiagnosticsView';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('cam01');
  const [protocol, setProtocol] = useState<StreamingProtocol>('auto');
  const [isIntegratorOpen, setIsIntegratorOpen] = useState(false);
  const [isAutoPatrol, setIsAutoPatrol] = useState(false);
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // Real-time state
  const [recentDetections, setRecentDetections] = useState<Detection[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalCameras: 30,
    liveCameras: 30,
    offlineCameras: 0,
    activeAiCameras: 30,
    totalDetections: 0,
    anprReads: 0,
    activeAlerts: 0,
    watchlistCount: 5,
  });

  const [investigationTarget, setInvestigationTarget] = useState<string>('GJ01AB1234');

  // Load initial dataset from backend API
  const refreshAllData = useCallback(async () => {
    try {
      const [camsRes, summaryRes, alertsRes, watchlistRes] = await Promise.all([
        fetch('/api/cameras'),
        fetch('/api/analytics/summary'),
        fetch('/api/alerts'),
        fetch('/api/watchlist'),
      ]);

      if (camsRes.ok) {
        const camsData = await camsRes.json();
        if (camsData.cameras) {
          setCameras(camsData.cameras);
          if (camsData.cameras.length > 0 && !selectedCameraId) {
            setSelectedCameraId(camsData.cameras[0].id);
          }
        }
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData.summary) setSummary(summaryData.summary);
        if (summaryData.recentDetections) setRecentDetections(summaryData.recentDetections);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        if (alertsData.alerts) setAlerts(alertsData.alerts);
      }

      if (watchlistRes.ok) {
        const wlData = await watchlistRes.json();
        if (wlData.watchlist) setWatchlist(wlData.watchlist);
      }
    } catch (err) {
      console.error('Failed to load initial backend state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCameraId]);

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
          console.log('[WebSocket] Connected to /ws/events');
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
            console.error('WebSocket parse error:', e);
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
        console.error('WebSocket connection error:', err);
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
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: 'Control Room Officer #409' }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a))
        );
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
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
    } catch (err) {
      console.error('Failed to add to watchlist:', err);
    }
    return false;
  };

  const handleRemoveWatchlist = async (registration: string) => {
    try {
      const res = await fetch(`/api/watchlist/${registration}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setWatchlist((prev) => prev.filter((w) => w.registration !== registration));
      }
    } catch (err) {
      console.error('Failed to remove from watchlist:', err);
    }
  };

  const selectedCamera = cameras.find((c) => c.id === selectedCameraId) || cameras[0];

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#070a0f] flex flex-col items-center justify-center gap-3 text-cyan-400 font-mono">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <div className="text-sm font-semibold tracking-wider">CONNECTING TO GUJARAT POLICE SENTINEL SURAKSHA...</div>
        <div className="text-xs text-slate-500">Discovering 30 camera nodes & initializing ANPR engine</div>
      </div>
    );
  }

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

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Camera, RouteNode } from '../types';
import { MapPin, Navigation, AlertTriangle } from 'lucide-react';

interface MapComponentProps {
  cameras?: Camera[];
  routeNodes?: RouteNode[];
  selectedCameraId?: string;
  onSelectCamera?: (cam: Camera) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  cameras = [],
  routeNodes = [],
  selectedCameraId,
  onSelectCamera,
  center = [22.2587, 71.1924], // Gujarat Center
  zoom = 8,
  height = '100%',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize Map safely
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    try {
      // Clear any prior leaflet internal ID on the container (critical for React StrictMode / HMR)
      if ((container as any)._leaflet_id) {
        (container as any)._leaflet_id = null;
      }

      if (!mapInstanceRef.current) {
        const map = L.map(container, {
          zoomControl: false,
          attributionControl: false,
        }).setView(center, zoom);

        // Dark tactical CartoDB tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);

        mapInstanceRef.current = map;
        layerGroupRef.current = L.layerGroup().addTo(map);
      }
    } catch (err: any) {
      console.warn('[MapComponent] Leaflet init notice:', err?.message);
      setInitError(err?.message || 'Leaflet initialization error');
    }

    return () => {
      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      } catch (err) {
        // Safe unmount
      }
    };
  }, []);

  // Update Markers and Route Layers safely
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    try {
      layers.clearLayers();

      // Mode 1: Route Tracking
      if (routeNodes.length > 0) {
        const latLngs: L.LatLngExpression[] = [];

        routeNodes.forEach((node, idx) => {
          if (!node.lat || !node.lng) return;
          const pos: [number, number] = [node.lat, node.lng];
          latLngs.push(pos);

          const isLatest = idx === routeNodes.length - 1;
          const color = isLatest ? '#ef4444' : '#06b6d4';

          const icon = L.divIcon({
            className: 'custom-route-icon',
            html: `
              <div style="
                background: ${color};
                color: white;
                width: 26px;
                height: 26px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: monospace;
                font-size: 11px;
                font-weight: bold;
                border: 2px solid #ffffff;
                box-shadow: 0 0 10px ${color};
              ">
                ${node.step}
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });

          const marker = L.marker(pos, { icon });
          marker.bindPopup(`
            <div style="font-family: monospace; font-size: 11px; color: #0f172a; padding: 2px;">
              <div style="font-weight: bold; color: #0284c7;">STEP ${node.step}: ${node.cameraId.toUpperCase()}</div>
              <div>${node.cameraName || ''}</div>
              <div style="color: #64748b;">${node.location}</div>
              <div style="margin-top: 4px; border-top: 1px solid #cbd5e1; padding-top: 2px;">
                <div>Speed: <strong>${node.speedKmph || 50} km/h</strong></div>
                <div>PTS: <strong>${node.pts}ms</strong></div>
                <div>Time: <strong>${new Date(node.timestamp).toLocaleTimeString()}</strong></div>
              </div>
            </div>
          `);
          layers.addLayer(marker);
        });

        if (latLngs.length > 1) {
          const polyline = L.polyline(latLngs, {
            color: '#38bdf8',
            weight: 3.5,
            opacity: 0.85,
            dashArray: '6, 6',
          });
          layers.addLayer(polyline);
          map.fitBounds(polyline.getBounds(), { padding: [35, 35] });
        } else if (latLngs.length === 1) {
          map.setView(latLngs[0], 12);
        }
        return;
      }

      // Mode 2: Camera Grid Nodes Map
      if (cameras.length > 0) {
        cameras.forEach((cam) => {
          if (!cam.lat || !cam.lng) return;
          const isSelected = cam.id === selectedCameraId;
          const color = cam.status === 'online' ? (isSelected ? '#06b6d4' : '#10b981') : '#ef4444';

          const icon = L.divIcon({
            className: 'custom-cam-icon',
            html: `
              <div style="
                background: ${isSelected ? '#0e7490' : '#0f172a'};
                border: 2px solid ${color};
                color: ${color};
                width: 22px;
                height: 22px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: monospace;
                font-size: 9px;
                font-weight: bold;
                box-shadow: 0 0 ${isSelected ? '10px' : '4px'} ${color}80;
                cursor: pointer;
              ">
                ${cam.id.replace('cam', '')}
              </div>
            `,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });

          const marker = L.marker([cam.lat, cam.lng], { icon });
          marker.on('click', () => {
            if (onSelectCamera) onSelectCamera(cam);
          });

          marker.bindPopup(`
            <div style="font-family: monospace; font-size: 11px; color: #0f172a; padding: 2px;">
              <div style="font-weight: bold; color: #0f766e;">${cam.id.toUpperCase()}: ${cam.name}</div>
              <div style="color: #64748b;">${cam.location} - ${cam.zone}</div>
              <div style="margin-top: 3px; font-weight: bold; color: ${cam.status === 'online' ? '#16a34a' : '#dc2626'};">
                ${cam.status.toUpperCase()}
              </div>
            </div>
          `);

          layers.addLayer(marker);
        });
      }
    } catch (err: any) {
      console.warn('[MapComponent] Layer update notice:', err?.message);
    }
  }, [cameras, routeNodes, selectedCameraId, onSelectCamera]);

  if (initError) {
    return (
      <div
        style={{ height, width: '100%' }}
        className="bg-[#0b0f17] border border-slate-800 rounded-lg flex flex-col items-center justify-center p-4 text-center font-mono text-xs text-slate-400 gap-2"
      >
        <MapPin className="w-6 h-6 text-cyan-500" />
        <div className="font-semibold text-white">Gujarat Police Geographical Map</div>
        <div className="text-[11px] text-slate-500">
          {cameras.length} CCTV Nodes Active across Gujarat Sectors
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%', minHeight: '260px' }}
      className="bg-[#0b0f17] border border-slate-800 rounded-lg overflow-hidden relative"
    />
  );
};

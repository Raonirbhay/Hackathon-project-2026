import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Camera, RouteNode } from '../types';

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
  center = [22.2587, 71.1924], // Gujarat Geographic Center
  zoom = 8,
  height = '100%',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(center, zoom);

      // Dark tactical CartoDB tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Add zoom control to top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers and Route Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // Mode 1: Route Nodes Visualization (Vehicle Route Tracking)
    if (routeNodes.length > 0) {
      const latLngs: L.LatLngExpression[] = [];

      routeNodes.forEach((node, idx) => {
        const pos: [number, number] = [node.lat, node.lng];
        latLngs.push(pos);

        const isLatest = idx === routeNodes.length - 1;
        const color = isLatest ? '#ef4444' : '#06b6d4';

        // Custom HTML marker badge
        const icon = L.divIcon({
          className: 'custom-route-icon',
          html: `
            <div style="
              background: ${color};
              color: white;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              font-weight: bold;
              border: 2px solid #ffffff;
              box-shadow: 0 0 12px ${color};
            ">
              ${node.step}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker(pos, { icon });
        const timeStr = new Date(node.timestamp).toLocaleTimeString();
        marker.bindPopup(`
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #1e293b;">
            <div style="font-weight: bold; color: #0284c7;">STEP ${node.step}: ${node.cameraId.toUpperCase()}</div>
            <div>${node.cameraName}</div>
            <div style="color: #64748b; font-size: 11px;">Location: ${node.location}</div>
            <div style="margin-top: 4px; border-top: 1px solid #cbd5e1; padding-top: 4px;">
              <div>Time: <strong>${timeStr}</strong></div>
              <div>PTS: <strong>${node.pts}ms</strong></div>
              <div>Estimated Speed: <strong>${node.speedKmph} km/h</strong></div>
              <div>ANPR Confidence: <strong>${(node.confidence * 100).toFixed(1)}%</strong></div>
            </div>
          </div>
        `);
        layers.addLayer(marker);
      });

      // Draw polyline connecting detection steps
      if (latLngs.length > 1) {
        const polyline = L.polyline(latLngs, {
          color: '#38bdf8',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
        });
        layers.addLayer(polyline);
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      } else if (latLngs.length === 1) {
        map.setView(latLngs[0], 13);
      }
      return;
    }

    // Mode 2: Camera Grid Nodes Map
    if (cameras.length > 0) {
      cameras.forEach((cam) => {
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
              font-family: 'JetBrains Mono', monospace;
              font-size: 9px;
              font-weight: bold;
              box-shadow: 0 0 ${isSelected ? '12px' : '6px'} ${color}80;
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
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #1e293b;">
            <div style="font-weight: bold; color: #0f766e;">${cam.id.toUpperCase()}: ${cam.name}</div>
            <div style="color: #64748b;">${cam.location} - ${cam.zone}</div>
            <div style="margin-top: 4px; font-size: 11px;">
              Status: <span style="color: ${cam.status === 'online' ? '#16a34a' : '#dc2626'}; font-weight: bold;">
                ${cam.status.toUpperCase()}
              </span>
            </div>
          </div>
        `);

        layers.addLayer(marker);
      });
    }
  }, [cameras, routeNodes, selectedCameraId, onSelectCamera]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}
      className="bg-[#0b0f17] border border-slate-800"
    />
  );
};

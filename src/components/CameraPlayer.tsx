import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Camera, StreamingProtocol, StreamStats, Detection } from '../types';
import {
  Maximize2,
  Minimize2,
  Camera as CameraIcon,
  Volume2,
  VolumeX,
  RefreshCw,
  Zap,
  Activity,
  Scan,
  ZoomIn,
  ZoomOut,
  Radio,
  Video,
  Square,
  AlertCircle,
  Wifi,
  WifiOff,
  Cpu
} from 'lucide-react';

interface CameraPlayerProps {
  camera: Camera;
  protocolPreference?: StreamingProtocol;
  isFocused?: boolean;
  onSelect?: () => void;
  showAiOverlayDefault?: boolean;
  latestDetection?: Detection;
  isActive?: boolean; // Virtualization flag: only stream when active/visible
}

export const CameraPlayer: React.FC<CameraPlayerProps> = ({
  camera,
  protocolPreference = 'auto',
  isFocused = false,
  onSelect,
  showAiOverlayDefault = false,
  latestDetection,
  isActive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const reconnectTimerRef = useRef<any>(null);

  // Connection State: LIVE -> RECONNECTING -> OFFLINE
  const [connectionStatus, setConnectionStatus] = useState<'LIVE' | 'RECONNECTING' | 'OFFLINE'>('LIVE');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Telemetry stats
  const [stats, setStats] = useState<StreamStats>({
    protocol: 'Connecting',
    resolution: '-- x --',
    fps: 0,
    ptsMs: 0,
    latencyMs: 0,
    bitrateKbps: 0,
    droppedFrames: 0,
    loopResets: 0,
    reconnectAttempt: 0,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showAiOverlay, setShowAiOverlay] = useState(showAiOverlayDefault);
  const [showHud, setShowHud] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Telemetry refs
  const frameCountRef = useRef(0);
  const lastFpsCalcTimeRef = useRef(performance.now());
  const lastPtsRef = useRef(0);
  const loopCountRef = useRef(0);

  // Teardown connections
  const teardownConnections = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
    }
  }, []);

  // Forward declarations for mutual fallback
  const startHls = useCallback(() => {
    teardownConnections();
    const video = videoRef.current;
    if (!video || !isActive) return;

    setStats((prev) => ({ ...prev, protocol: 'Connecting', latencyMs: 2200 }));
    setErrorMessage(null);

    const hlsUrl = `/api/hls/${camera.id}/index.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 4,
        maxBufferLength: 6,
        maxMaxBufferLength: 12,
        backBufferLength: 0,
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setConnectionStatus('LIVE');
        setReconnectAttempt(0);
        setStats((prev) => ({ ...prev, protocol: 'HLS', latencyMs: 2100 }));
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              handleReconnect('HLS network timeout');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              // Handle scene discontinuity loop point gracefully
              loopCountRef.current += 1;
              setStats((prev) => ({ ...prev, loopResets: loopCountRef.current }));
              hls.recoverMediaError();
              break;
            default:
              handleReconnect('Fatal HLS decode failure');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
        setConnectionStatus('LIVE');
      });
    }
  }, [camera.id, isActive, teardownConnections]);

  // Exponential Backoff Reconnection: 2s -> 4s -> 8s -> 16s -> 30s cap
  const handleReconnect = useCallback((reason: string) => {
    console.warn(`[Stream Reconnect ${camera.id}]: ${reason}`);
    teardownConnections();

    setReconnectAttempt((attempt) => {
      const nextAttempt = attempt + 1;
      setStats((prev) => ({ ...prev, reconnectAttempt: nextAttempt }));

      if (nextAttempt >= 6) {
        // After 5 attempts, transition to OFFLINE
        setConnectionStatus('OFFLINE');
        setErrorMessage(`Stream offline after ${attempt} attempts. Manual refresh required.`);
        return nextAttempt;
      }

      setConnectionStatus('RECONNECTING');
      // Backoff schedule: 2s, 4s, 8s, 16s, max 30s
      const delayMs = Math.min(30000, Math.pow(2, nextAttempt) * 1000);
      setErrorMessage(`Reconnecting in ${delayMs / 1000}s (Attempt ${nextAttempt}/5)...`);

      reconnectTimerRef.current = setTimeout(() => {
        if (protocolPreference === 'hls') {
          startHls();
        } else {
          startWebRTC();
        }
      }, delayMs);

      return nextAttempt;
    });
  }, [camera.id, protocolPreference, startHls, teardownConnections]);

  // WebRTC WHEP connection
  const startWebRTC = useCallback(async () => {
    teardownConnections();
    const video = videoRef.current;
    if (!video || !isActive) return;

    setStats((prev) => ({ ...prev, protocol: 'Connecting', latencyMs: 140 }));
    setErrorMessage(null);

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      pcRef.current = pc;

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          video.srcObject = event.streams[0];
        } else {
          video.srcObject = new MediaStream([event.track]);
        }
        video.play().catch(() => {});
        setConnectionStatus('LIVE');
        setReconnectAttempt(0);
        setStats((prev) => ({ ...prev, protocol: 'WebRTC', latencyMs: 120 }));
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setConnectionStatus('LIVE');
          setReconnectAttempt(0);
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          if (protocolPreference === 'auto') {
            console.log(`[Auto-Protocol] Switching ${camera.id} to HLS fallback`);
            startHls();
          } else {
            handleReconnect('WebRTC peer disconnected');
          }
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const whepRes = await fetch(`/api/whep/${camera.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!whepRes.ok) throw new Error(`WHEP returned ${whepRes.status}`);

      const answerSdp = await whepRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    } catch (err: any) {
      if (protocolPreference === 'auto') {
        startHls();
      } else {
        handleReconnect(err?.message || 'WHEP connection failure');
      }
    }
  }, [camera.id, isActive, protocolPreference, handleReconnect, startHls, teardownConnections]);

  // Main Stream Lifecycle Initiator
  useEffect(() => {
    if (!isActive) {
      teardownConnections();
      return;
    }

    if (protocolPreference === 'hls') {
      startHls();
    } else {
      startWebRTC();
    }

    return () => {
      teardownConnections();
    };
  }, [camera.id, isActive, protocolPreference, startHls, startWebRTC, teardownConnections]);

  // RequestVideoFrameCallback Telemetry Loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    let animId: number | undefined;
    let rfcId: number | undefined;

    const updateFrameStats = (_now: number, metadata?: any) => {
      frameCountRef.current += 1;
      const currentTime = performance.now();
      const elapsed = currentTime - lastFpsCalcTimeRef.current;

      if (elapsed >= 1000) {
        const computedFps = Math.round((frameCountRef.current * 1000) / elapsed);
        frameCountRef.current = 0;
        lastFpsCalcTimeRef.current = currentTime;

        const currentPts = metadata?.mediaTime ? Math.round(metadata.mediaTime * 1000) : Math.round(video.currentTime * 1000);

        // Detect loop cuts
        if (currentPts < lastPtsRef.current && lastPtsRef.current > 5000) {
          loopCountRef.current += 1;
        }
        lastPtsRef.current = currentPts;

        setStats((prev) => ({
          ...prev,
          fps: computedFps > 0 ? computedFps : (video.paused ? 0 : 25),
          ptsMs: currentPts,
          resolution: video.videoWidth > 0 ? `${video.videoWidth}×${video.videoHeight}` : prev.resolution,
          loopResets: loopCountRef.current,
          droppedFrames: metadata?.presentedFrames ? Math.max(0, (metadata.presentedFrames - frameCountRef.current)) : prev.droppedFrames,
          bitrateKbps: Math.round(1800 + Math.random() * 400),
        }));
      }

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && video) {
        // @ts-ignore
        rfcId = video.requestVideoFrameCallback(updateFrameStats);
      }
    };

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      // @ts-ignore
      rfcId = video.requestVideoFrameCallback(updateFrameStats);
    } else {
      const interval = setInterval(() => updateFrameStats(performance.now()), 500);
      return () => clearInterval(interval);
    }

    return () => {
      if (rfcId && 'cancelVideoFrameCallback' in HTMLVideoElement.prototype) {
        // @ts-ignore
        video.cancelVideoFrameCallback(rfcId);
      }
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isActive]);

  // Snapshot Capture
  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Gujarat Police Surveillance Watermark
    ctx.fillStyle = 'rgba(10, 14, 20, 0.85)';
    ctx.fillRect(0, canvas.height - 44, canvas.width, 44);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(24, canvas.height - 22, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText(`GUJARAT POLICE // ${camera.id.toUpperCase()} - ${camera.name.toUpperCase()} [${camera.location}]`, 42, canvas.height - 18);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`PTS: ${stats.ptsMs}ms | ${new Date().toISOString()} | ${stats.protocol}`, canvas.width - 20, canvas.height - 18);

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `GJ_POLICE_${camera.id}_${Date.now()}.png`;
    a.href = dataUrl;
    a.click();
  };

  // Video Clip Recording
  const toggleRecording = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        let stream: MediaStream | null = null;
        if (video.srcObject instanceof MediaStream) {
          stream = video.srcObject;
        } else if ('captureStream' in video) {
          // @ts-ignore
          stream = video.captureStream();
        }

        if (!stream) return;

        const recorder = new MediaRecorder(stream);
        recordedChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `GJ_POLICE_CLIP_${camera.id}_${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          setRecordingSeconds(0);
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error('Recording failed:', err);
      }
    }
  };

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={onSelect}
      className={`relative group bg-[#090d14] rounded-lg overflow-hidden border transition-all duration-200 select-none flex flex-col h-full ${
        isFocused
          ? 'border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40'
          : 'border-slate-800/80 hover:border-slate-700'
      }`}
    >
      {/* Video Viewport */}
      <div className="relative w-full flex-1 min-h-[190px] bg-black overflow-hidden flex items-center justify-center">
        {isActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            onPlaying={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-contain cursor-crosshair transition-transform duration-75"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 font-mono text-xs gap-2">
            <Video className="w-8 h-8 opacity-40" />
            <span>Virtual Camera Node {camera.id.toUpperCase()}</span>
            <span className="text-[10px] text-slate-700">Click to activate live media feed</span>
          </div>
        )}

        <div className="surveillance-overlay absolute inset-0 pointer-events-none opacity-30" />

        {/* AI Computer Vision & Tracking Box */}
        {showAiOverlay && isPlaying && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden font-mono text-[10px]">
            {latestDetection ? (
              <div
                className="absolute border-2 border-emerald-400/90 rounded-sm bg-emerald-500/10 transition-all duration-300"
                style={{
                  top: `${latestDetection.bbox[1]}%`,
                  left: `${latestDetection.bbox[0]}%`,
                  width: `${latestDetection.bbox[2]}%`,
                  height: `${latestDetection.bbox[3]}%`,
                }}
              >
                <div className="absolute -top-5 left-0 bg-emerald-950/95 text-emerald-300 px-1.5 py-0.5 border border-emerald-500/60 rounded-xs flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {latestDetection.vehicleType.toUpperCase()} #{latestDetection.trackingId} · {latestDetection.speedKmph} km/h
                </div>
                <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-cyan-300 font-bold text-[9px]">
                  {latestDetection.registration}
                </div>
              </div>
            ) : (
              <div className="absolute top-[28%] left-[32%] w-[24%] h-[28%] border-2 border-emerald-400/90 rounded-sm bg-emerald-500/10">
                <div className="absolute -top-5 left-0 bg-emerald-950/95 text-emerald-300 px-1.5 py-0.5 border border-emerald-500/60 rounded-xs flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CAR #TRK-4921 · 54 km/h
                </div>
                <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-cyan-300 font-bold text-[9px]">
                  GJ01AB1234
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reconnecting Overlay */}
        {connectionStatus === 'RECONNECTING' && (
          <div className="absolute inset-0 bg-[#090d14]/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center gap-2 font-mono text-xs">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
            <div className="font-semibold text-amber-300">STREAM RECONNECTING</div>
            <div className="text-[11px] text-slate-400">{errorMessage}</div>
          </div>
        )}

        {/* Offline Overlay */}
        {connectionStatus === 'OFFLINE' && (
          <div className="absolute inset-0 bg-red-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center gap-2 font-mono text-xs">
            <WifiOff className="w-6 h-6 text-red-400" />
            <div className="font-semibold text-red-300">STREAM OFFLINE</div>
            <div className="text-[11px] text-slate-300">{errorMessage}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReconnectAttempt(0);
                startWebRTC();
              }}
              className="mt-2 px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[11px] cursor-pointer"
            >
              Manual Reconnect
            </button>
          </div>
        )}

        {/* Header Strip */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2 bg-[#090d14]/90 backdrop-blur-xs border border-slate-700/60 rounded px-2 py-1 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'LIVE'
                    ? 'bg-emerald-400 animate-live-pulse'
                    : connectionStatus === 'RECONNECTING'
                    ? 'bg-amber-400 animate-spin'
                    : 'bg-red-500'
                }`}
              />
              <span className="font-bold text-white tracking-wide">{camera.id.toUpperCase()}</span>
            </div>
            <span className="text-slate-500">/</span>
            <span className="text-slate-300 truncate max-w-[130px] sm:max-w-[180px]">{camera.name}</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            {/* Status Pill: LIVE / RECONNECTING / OFFLINE */}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                connectionStatus === 'LIVE'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/50'
                  : connectionStatus === 'RECONNECTING'
                  ? 'bg-amber-950/90 text-amber-300 border-amber-600/50 animate-pulse'
                  : 'bg-red-950/90 text-red-300 border-red-600/50'
              }`}
            >
              {connectionStatus}
            </span>

            {/* Protocol Badge */}
            {stats.protocol === 'WebRTC' && (
              <span className="bg-cyan-950/90 text-cyan-300 border border-cyan-600/50 rounded px-1.5 py-0.5 text-[10px] hidden sm:inline">
                WHEP &lt;{stats.latencyMs}ms
              </span>
            )}
            {stats.protocol === 'HLS' && (
              <span className="bg-amber-950/90 text-amber-300 border border-amber-600/50 rounded px-1.5 py-0.5 text-[10px] hidden sm:inline">
                HLS
              </span>
            )}
          </div>
        </div>

        {/* Telemetry HUD Bottom-Left */}
        {showHud && isPlaying && (
          <div className="absolute bottom-2 left-2 pointer-events-none z-10 flex flex-wrap items-center gap-2 bg-[#090d14]/85 backdrop-blur-xs border border-slate-800/80 rounded px-2 py-0.5 text-[10px] font-mono text-slate-400">
            <span className="text-slate-300">{stats.resolution}</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400">{stats.fps} FPS</span>
            <span className="text-slate-600">·</span>
            <span>PTS {stats.ptsMs}ms</span>
            {stats.loopResets > 0 && <span className="text-purple-400">LOOPS: {stats.loopResets}</span>}
          </div>
        )}

        {/* Hover Toolbar Bottom-Right */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 bg-[#090d14]/90 backdrop-blur-xs border border-slate-700/80 rounded p-1 shadow-md">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAiOverlay(!showAiOverlay);
            }}
            title={showAiOverlay ? 'Hide AI overlay' : 'Show AI vehicle tracking'}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              showAiOverlay ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              captureSnapshot();
            }}
            title="Take snapshot"
            className="p-1.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <CameraIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRecording();
            }}
            title={isRecording ? 'Stop recording' : 'Record clip'}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isRecording ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Video className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
            className="p-1.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            title="Fullscreen"
            className="p-1.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Card Footer: Location, AI Status, and Last Detection */}
      <div className="px-3 py-1.5 bg-[#0b1019] border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-slate-400 truncate">
          <span className="text-white font-medium truncate">{camera.location}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-500 text-[11px] truncate">{camera.zone}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* AI Status */}
          <span className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-950/70 border border-cyan-800/40 rounded px-1.5 py-0.2">
            <Cpu className="w-3 h-3 text-cyan-400" />
            AI ACTIVE
          </span>

          {/* Last Detection */}
          {latestDetection ? (
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-700/50">
              {latestDetection.registration}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">NO RECENT LPR</span>
          )}
        </div>
      </div>
    </div>
  );
};

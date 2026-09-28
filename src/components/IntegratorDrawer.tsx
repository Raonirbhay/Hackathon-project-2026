import React, { useState } from 'react';
import { Camera } from '../types';
import {
  X,
  Copy,
  Check,
  Code2,
  Terminal,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  Cpu,
  Layers,
  Zap,
  Radio
} from 'lucide-react';

interface IntegratorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCamera: Camera;
}

export const IntegratorDrawer: React.FC<IntegratorDrawerProps> = ({
  isOpen,
  onClose,
  selectedCamera,
}) => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'opencv' | 'ffmpeg' | 'gstreamer' | 'checklist'>('endpoints');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const email = 'nirbhayb383@gmail.com';
  const encodedEmail = 'nirbhayb383%40gmail.com';
  const password = '3BEH-YPDW-MX3W';
  const camId = selectedCamera.id;

  const rtspUrl = `rtsp://${encodedEmail}:${password}@103.250.160.189:8554/stream/${camId}`;
  const whepUrl = `http://${encodedEmail}:${password}@103.250.160.189:8889/stream/${camId}/whep`;
  const hlsUrl = `https://cctv.corp8.cloud/${camId}/index.m3u8`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const opencvCode = `import os, cv2

# RTSP with forced TCP for AI Inference (OpenCV / DeepStream / YOLO)
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
rtsp_endpoint = "${rtspUrl}"

cap = cv2.VideoCapture(rtsp_endpoint, cv2.CAP_FFMPEG)
print(f"Connecting to Sentinel {camId}...")

while True:
    ok, frame = cap.read()
    if not ok:
        print("Inter-frame gap or feed loop point - reconnecting with backoff...")
        break
    
    # Drive timing from PTS, NEVER arrival time!
    pts_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
    
    # Run your AI inference (e.g. YOLOv8 / DeepSORT)
    # results = model(frame)
    
    cv2.imshow("Sentinel Grid - ${camId}", frame)
    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()`;

  const ffmpegCode = `# FFmpeg direct test (Force TCP transport)
ffplay -rtsp_transport tcp "${rtspUrl}"

# Or HLS stream via CDN:
ffplay "${hlsUrl}"`;

  const gstreamerCode = `# GStreamer hardware-accelerated pipeline (NVIDIA / Intel / VAAPI)
gst-launch-1.0 rtspsrc location="${rtspUrl}" protocols=tcp latency=200 \\
  ! rtph264depay ! h264parse ! avdec_h264 ! videoconvert ! autovideosink`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0b0f17] border-l border-slate-800 h-full flex flex-col shadow-2xl text-slate-200 overflow-hidden font-sans">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1420]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="font-bold text-sm tracking-wide text-white font-mono flex items-center gap-2">
                SENTINEL // Integrator's Guide
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600/40 rounded px-1.5 py-0.5">
                  OPERATIONAL
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Consuming live camera streams for AI inference & dashboards
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Camera Badge Strip */}
        <div className="px-4 py-2.5 bg-[#090d14] border-b border-slate-800/80 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Target Camera:</span>
            <span className="text-cyan-300 font-bold">{camId.toUpperCase()}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300 truncate max-w-[260px]">{selectedCamera.name}</span>
          </div>
          <span className="text-slate-500 text-[11px]">{selectedCamera.location}</span>
        </div>

        {/* Authenticated Credentials Notice */}
        <div className="p-4 bg-[#111827]/70 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-medium mb-1 font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>Active Session Credentials</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
            <div className="bg-[#0a0e14] p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">REGISTERED OPERATOR</span>
              <span className="text-slate-200 select-all">{email}</span>
            </div>
            <div className="bg-[#0a0e14] p-2 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[10px]">ACCESS PASSWORD</span>
                <span className="text-cyan-300 font-bold tracking-wider select-all">{password}</span>
              </div>
              <button
                onClick={() => copyToClipboard(password, 'pw')}
                className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                title="Copy password"
              >
                {copiedKey === 'pw' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-[#0c111a] px-3 pt-2 gap-1 overflow-x-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'endpoints'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Direct Endpoints
          </button>
          <button
            onClick={() => setActiveTab('opencv')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'opencv'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Python OpenCV
          </button>
          <button
            onClick={() => setActiveTab('ffmpeg')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ffmpeg'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            FFmpeg
          </button>
          <button
            onClick={() => setActiveTab('gstreamer')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'gstreamer'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            GStreamer
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'checklist'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pre-Submission Checklist
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          
          {/* TAB 1: Endpoints */}
          {activeTab === 'endpoints' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 leading-relaxed">
                Every camera is published as a live stream with monotonic presentation timestamps (PTS).
                No seeking and no fast-forward. Treat each endpoint as a physical camera on an operational network.
              </div>

              {/* RTSP */}
              <div className="bg-[#101724] border border-slate-800 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>RTSP Endpoint (AI Inference & Computer Vision)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Port 8554 / TCP</span>
                </div>
                <div className="flex items-center gap-2 bg-[#090d14] p-2 rounded border border-slate-800/80 font-mono text-[11px] text-slate-300">
                  <span className="truncate flex-1 select-all">{rtspUrl}</span>
                  <button
                    onClick={() => copyToClipboard(rtspUrl, 'rtsp')}
                    className="p-1 text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                  >
                    {copiedKey === 'rtsp' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Intended for OpenCV, GStreamer, FFmpeg, DeepStream, YOLO pipelines. Always force TCP.
                </div>
              </div>

              {/* WebRTC WHEP */}
              <div className="bg-[#101724] border border-slate-800 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WebRTC WHEP (Sub-Second Low-Latency Preview)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Port 8889 / HTTP SDP</span>
                </div>
                <div className="flex items-center gap-2 bg-[#090d14] p-2 rounded border border-slate-800/80 font-mono text-[11px] text-slate-300">
                  <span className="truncate flex-1 select-all">{whepUrl}</span>
                  <button
                    onClick={() => copyToClipboard(whepUrl, 'whep')}
                    className="p-1 text-slate-400 hover:text-emerald-300 transition-colors shrink-0"
                  >
                    {copiedKey === 'whep' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  WebRTC HTTP Egress Protocol for browser sub-second latency. Handled automatically via server proxy.
                </div>
              </div>

              {/* HLS */}
              <div className="bg-[#101724] border border-slate-800 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span>HLS Stream (CDN High-Compatibility)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Port 443 / HTTPS</span>
                </div>
                <div className="flex items-center gap-2 bg-[#090d14] p-2 rounded border border-slate-800/80 font-mono text-[11px] text-slate-300">
                  <span className="truncate flex-1 select-all">{hlsUrl}</span>
                  <button
                    onClick={() => copyToClipboard(hlsUrl, 'hls')}
                    className="p-1 text-slate-400 hover:text-amber-300 transition-colors shrink-0"
                  >
                    {copiedKey === 'hls' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Standard HLS served over Cloudflare CDN for restricted networks and mobile dashboards.
                </div>
              </div>

              {/* Dynamic Camera Catalog Command */}
              <div className="bg-[#0e1420] border border-slate-800 rounded-lg p-3">
                <div className="text-xs font-mono text-slate-300 mb-1.5">Fetch Live Camera Catalogue via cURL:</div>
                <div className="bg-[#080c12] p-2 rounded font-mono text-xs text-emerald-300 flex items-center justify-between select-all">
                  <span>curl -s https://cctv.corp8.cloud/cameras.json</span>
                  <button
                    onClick={() => copyToClipboard('curl -s https://cctv.corp8.cloud/cameras.json', 'curlcat')}
                    className="p-1 text-slate-400 hover:text-emerald-300 transition-colors"
                  >
                    {copiedKey === 'curlcat' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Python OpenCV */}
          {activeTab === 'opencv' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Production Python OpenCV Pipeline for {camId}</span>
                <button
                  onClick={() => copyToClipboard(opencvCode, 'cvcode')}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  {copiedKey === 'cvcode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Code</span>
                </button>
              </div>
              <pre className="bg-[#090d14] p-3 rounded-lg border border-slate-800 text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed select-all">
                {opencvCode}
              </pre>
            </div>
          )}

          {/* TAB 3: FFmpeg */}
          {activeTab === 'ffmpeg' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>FFmpeg & ffplay CLI commands</span>
                <button
                  onClick={() => copyToClipboard(ffmpegCode, 'ffcode')}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  {copiedKey === 'ffcode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Commands</span>
                </button>
              </div>
              <pre className="bg-[#090d14] p-3 rounded-lg border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto leading-relaxed select-all">
                {ffmpegCode}
              </pre>
            </div>
          )}

          {/* TAB 4: GStreamer */}
          {activeTab === 'gstreamer' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Hardware Accelerated GStreamer Pipeline</span>
                <button
                  onClick={() => copyToClipboard(gstreamerCode, 'gstcode')}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  {copiedKey === 'gstcode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Pipeline</span>
                </button>
              </div>
              <pre className="bg-[#090d14] p-3 rounded-lg border border-slate-800 text-amber-300 font-mono text-xs overflow-x-auto leading-relaxed select-all">
                {gstreamerCode}
              </pre>
            </div>
          )}

          {/* TAB 5: Checklist */}
          {activeTab === 'checklist' && (
            <div className="space-y-2 text-xs">
              <div className="bg-[#101724] p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="font-bold text-white font-mono flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Sentinel Integrator Rules & Checklist</span>
                </div>
                <ul className="space-y-2 text-slate-300 list-disc list-inside">
                  <li><strong className="text-white">DO force RTSP over TCP:</strong> UDP fails across NAT/firewalls and produces corrupt frames that look like model bugs. Set <code className="text-cyan-300 font-mono">rtsp_transport=tcp</code>.</li>
                  <li><strong className="text-white">DON'T trust reported frame rate:</strong> <code className="text-cyan-300 font-mono">CAP_PROP_FPS</code> often mismatches real delivery. Use timestamps (PTS) for any speed/dwell/time metric.</li>
                  <li><strong className="text-white">DO drive timing from PTS, never arrival time:</strong> On connect, a buffered GOP replays so the first second can arrive faster than real time.</li>
                  <li><strong className="text-white">DON'T assume a constant frame rate:</strong> Inter-frame gaps are normal; tolerate them without treating them as a disconnect.</li>
                  <li><strong className="text-white">DO reconnect with backoff:</strong> Feeds are supervised and may restart. Exponential backoff (~2s → cap ~30s). Never tight-loop.</li>
                  <li><strong className="text-white">DON'T treat join-time decode warnings as fatal:</strong> Mixed H.264/H.265 may log <code className="text-cyan-300 font-mono">Could not find ref with POC</code> until the first IDR. Normal, self-corrects.</li>
                  <li><strong className="text-white">DO expect scene discontinuity:</strong> Each feed loops; at the loop point the scene cuts abruptly. Long-lived state must recover from a hard cut.</li>
                  <li><strong className="text-white">DON'T plan on downloading footage:</strong> There is no static file download; grid is consumed live.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0a0e14] border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Sentinel Camera Grid · Authorised Access Only</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Cpu, ShieldCheck, Activity, Database, Sparkles, Network, Radio, Layers } from 'lucide-react';

export const ArchitectureDoc: React.FC = () => {
  return (
    <div id="architecture-doc" className="flex flex-col gap-6 text-slate-200 max-w-5xl mx-auto w-full leading-relaxed">
      {/* Overview Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Reality Engine • Android Architecture Specification
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Telecom Default Dialer • Shizuku IPC Audio Hook • Groq LLaMA-3.1 Sliding Window • SQLCipher Room
            </p>
          </div>
        </div>
      </div>

      {/* 7 Architecture Pillar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. IPC Audio Bridge */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Radio className="w-4 h-4" />
            <span>1. IPC Audio Bridge & Shizuku Health Check</span>
          </div>
          <p className="text-xs text-slate-300">
            Binds to local Shizuku provider via <code className="text-emerald-300 font-mono">dev.rikka.shizuku:api</code> and <code className="text-emerald-300 font-mono">Shizuku.pingBinder()</code>. Initalizes <code className="text-slate-200 font-mono">AudioRecord</code> at 16000Hz Linear 16-bit PCM (Mono). Computes real-time acoustic RMS via <code className="text-slate-200 font-mono">sqrt(Σ sample² / N) / 32768</code>.
          </p>
        </div>

        {/* 2. Foreground Service Lifecycle */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
            <Layers className="w-4 h-4" />
            <span>2. Foreground Service & Power Management</span>
          </div>
          <p className="text-xs text-slate-300">
            <code className="text-sky-300 font-mono">FloatingOverlayService</code> runs with foreground types <code className="text-slate-200 font-mono">phoneCall | microphone</code>. Acquires a <code className="text-amber-300 font-mono">PowerManager.PARTIAL_WAKE_LOCK</code> with a strict 45-minute timeout (<code className="text-slate-200 font-mono">45 * 60 * 1000L</code>) to protect background socket processing during active calls.
          </p>
        </div>

        {/* 3. Sliding Window Token Management */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>3. 45s Sliding Window Token Optimization</span>
          </div>
          <p className="text-xs text-slate-300">
            Inside the Deepgram <code className="text-indigo-300 font-mono">WebSocketListener</code>, an in-memory <code className="text-slate-200 font-mono">ArrayDeque</code> maintains only the last 45 seconds of speech text by pruning entries where <code className="text-slate-200 font-mono">timestamp &lt; now - 45000L</code>. Only this truncated payload is transmitted to <code className="text-indigo-300 font-mono">llama-3.1-8b-instant</code> for live tactical inference.
          </p>
        </div>

        {/* 4. Chunked Summarizer & WorkManager */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Database className="w-4 h-4" />
            <span>4. Chunked Summarizer & Weekly Purge</span>
          </div>
          <p className="text-xs text-slate-300">
            When <code className="text-amber-300 font-mono">RealityCallService.onCallRemoved()</code> fires, <code className="text-slate-200 font-mono">ChunkedSummarizer</code> processes text blocks sequentially with a strict <code className="text-amber-300 font-mono">delay(12000)</code> pause between Groq API calls to prevent rate-limit 429 errors. <code className="text-slate-200 font-mono">DatabaseCleanupWorker</code> purges raw transcripts older than 30 days every week via Android <code className="text-slate-200 font-mono">WorkManager</code>.
          </p>
        </div>

        {/* 5. 4-Prompt Compose Overlay */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <Activity className="w-4 h-4" />
            <span>5. Material 3 Compose SYSTEM_ALERT_WINDOW HUD</span>
          </div>
          <p className="text-xs text-slate-300">
            Mounts a dark-mode ComposeView into <code className="text-purple-300 font-mono">WindowManager</code>: Top contact profile card with historical reliability score; Center live assessment meters & RMS gauge; Bottom 4 Dynamic Tactics: <strong>1. Bonding (Green)</strong>, <strong>2. Cognitive Probe (Red)</strong>, <strong>3. Mirroring (Blue)</strong>, and <strong>4. Pivot (Yellow)</strong>.
          </p>
        </div>

        {/* 6. Resilient Socket Loop */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Network className="w-4 h-4" />
            <span>6. Resilient WebSockets & Audio Streams</span>
          </div>
          <p className="text-xs text-slate-300">
            Connects to <code className="text-cyan-300 font-mono">wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&diarize=true</code> with exponential backoff auto-reconnect on socket disconnect. Stream chunks are transmitted in real-time ByteStrings directly from the audio loop.
          </p>
        </div>
      </div>
    </div>
  );
};

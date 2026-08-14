import React from 'react';
import { ContactProfile, LiveAssessment, TacticalPrompts, TranscriptEntry } from '../types';
import { Shield, Sparkles, X, MessageSquareQuote, Waves, Mic2, Volume2, Quote } from 'lucide-react';
import { motion } from 'motion/react';
import { RmsTimelineChart } from './RmsTimelineChart';

interface OverlayHUDProps {
  contact: ContactProfile;
  assessment: LiveAssessment;
  tactics: TacticalPrompts;
  transcript: TranscriptEntry[];
  rms: number;
  isCallActive: boolean;
  onClose?: () => void;
  onTriggerGroqRefresh?: () => void;
  isLoadingGroq?: boolean;
}

export const OverlayHUD: React.FC<OverlayHUDProps> = ({
  contact,
  assessment,
  tactics,
  transcript,
  rms,
  isCallActive,
  onClose,
  onTriggerGroqRefresh,
  isLoadingGroq = false
}) => {
  const transcriptRef = React.useRef<HTMLDivElement>(null);
  const transcriptEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to latest dialogue entry whenever transcript updates
  React.useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Derive last 45s sliding window entries
  const now = Date.now();
  const slidingWindowEntries = transcript.filter(t => now - t.timestamp <= 45000 || transcript.length <= 5);

  // Helper safely handling string or structured items
  const getVerbatim = (item: any) => (typeof item === 'object' && item?.verbatim ? item.verbatim : String(item || ''));
  const getTonality = (item: any) => (typeof item === 'object' && item?.tonality ? item.tonality : 'Natural, composed cadence');

  // Variants for smooth spring slide-in transition
  const overlayVariants = {
    inactive: { y: 24, opacity: 0.88, scale: 0.985 },
    active: { y: 0, opacity: 1, scale: 1 }
  };

  return (
    <motion.div
      id="floating-overlay-compose-view"
      variants={overlayVariants}
      animate={isCallActive ? "active" : "inactive"}
      transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.9 }}
      className={`w-full max-w-xl bg-slate-950/95 backdrop-blur-xl border rounded-2xl shadow-2xl p-4 text-slate-100 flex flex-col gap-3 font-sans transition-colors duration-300 ${
        isCallActive ? 'border-emerald-500/50 shadow-[0_12px_40px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30' : 'border-slate-700/70'
      }`}
    >
      {/* ==========================================
          1. TOP: Contact Profile & Reliability Badge
          ========================================== */}
      <div id="overlay-header" className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white">{contact.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {contact.phoneNumber}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Prefers: <strong className="text-slate-200">{contact.preferences.slice(0, 2).join(', ')}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Reliability</span>
            <div className="flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-300">{contact.reliabilityScore}%</span>
            </div>
          </div>
          {onClose && (
            <button
              id="btn-close-overlay"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Hide Floating Overlay"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ==========================================
          2. CENTER: Live Assessment Score Meter & RMS
          ========================================== */}
      <div id="overlay-assessment-meter" className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
        <div className="grid grid-cols-4 gap-2 text-center pb-2.5 border-b border-slate-800/80">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-medium">Rapport</span>
            <span className="text-sm font-bold text-emerald-400">{assessment.rapport}%</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-medium">Cognitive Load</span>
            <span className="text-sm font-bold text-red-400">{assessment.cognitiveLoad}%</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-medium">Urgency</span>
            <span className="text-sm font-bold text-amber-400">{assessment.urgency}%</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-medium">Truthfulness</span>
            <span className="text-sm font-bold text-cyan-400">{assessment.truthfulness}%</span>
          </div>
        </div>

        {/* Acoustic RMS Fluctuations (Last 60s - D3 Line Chart) */}
        <div className="pt-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-sky-400 font-mono">
              <Waves className="w-3.5 h-3.5 animate-pulse text-sky-400" />
              <span className="font-semibold">RMS Dynamics (Last 60s)</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${rms > 0.65 ? 'bg-red-400' : rms > 0.3 ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                <span>{(rms * 100).toFixed(0)}dB Live</span>
              </span>
              <span>•</span>
              <span>16kHz Mono</span>
            </div>
          </div>
          <RmsTimelineChart currentRms={rms} isCallActive={isCallActive} />
        </div>
      </div>

      {/* ==========================================
          3. SCROLLING TRANSCRIPT (45s Sliding Window)
          ========================================== */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1 px-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <MessageSquareQuote className="w-3.5 h-3.5 text-slate-400" />
            <span>Deepgram Stream (45s Sliding Window Deque)</span>
          </div>
          {onTriggerGroqRefresh && (
            <button
              id="btn-trigger-groq"
              onClick={onTriggerGroqRefresh}
              disabled={isLoadingGroq || !isCallActive}
              className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition"
            >
              <Sparkles className={`w-3 h-3 ${isLoadingGroq ? 'animate-spin' : ''}`} />
              <span>{isLoadingGroq ? 'Evaluating Groq LLaMA 3.1...' : 'Evaluate Now'}</span>
            </button>
          )}
        </div>

        <div
          id="sliding-transcript-container"
          ref={transcriptRef}
          className="h-24 overflow-y-auto bg-slate-900/90 rounded-lg p-2.5 text-xs font-mono border border-slate-800/80 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-slate-700 scroll-smooth"
        >
          {slidingWindowEntries.length === 0 ? (
            <div className="text-slate-500 italic flex items-center justify-center h-full">
              Listening for voice stream...
            </div>
          ) : (
            <>
              {slidingWindowEntries.map((t) => (
                <div key={t.id} className="flex gap-2">
                  <span className={t.speaker === 'caller' ? 'text-amber-400 font-semibold shrink-0' : 'text-cyan-400 font-semibold shrink-0'}>
                    [{t.speaker === 'caller' ? contact.name.split(' ')[0] : 'You'}]:
                  </span>
                  <span className="text-slate-200 break-words">{t.text}</span>
                </div>
              ))}
              <div ref={transcriptEndRef} className="h-0 w-0" />
            </>
          )}
        </div>
      </div>

      {/* ==========================================
          4. BOTTOM: 4 Dynamic Tactic UI Prompts (Verbatim & Tonality)
          ========================================== */}
      <div id="tactical-prompts-hud" className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
            <Mic2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Verbatim Scripts & Tonality Guidance</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
            Real-Time Engine Active
          </span>
        </div>

        {/* 1. Bonding (Green) */}
        <div
          id="tactic-card-bonding"
          className="flex flex-col gap-1.5 bg-slate-900/95 border border-emerald-500/40 rounded-xl p-3 shadow-sm hover:border-emerald-500/70 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e]"></span>
              <span>1. Bonding</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
              <Volume2 className="w-3 h-3 text-emerald-400" />
              <span>{getTonality(tactics.bonding)}</span>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-slate-100 text-xs pl-1">
            <Quote className="w-3.5 h-3.5 text-emerald-400/60 shrink-0 mt-0.5 rotate-180" />
            <span className="font-semibold text-white leading-relaxed">
              "{getVerbatim(tactics.bonding)}"
            </span>
          </div>
        </div>

        {/* 2. Cognitive Probe (Red) */}
        <div
          id="tactic-card-probe"
          className="flex flex-col gap-1.5 bg-slate-900/95 border border-red-500/40 rounded-xl p-3 shadow-sm hover:border-red-500/70 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_#ef4444]"></span>
              <span>2. Cognitive Probe</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-red-300 bg-red-950/80 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">
              <Volume2 className="w-3 h-3 text-red-400" />
              <span>{getTonality(tactics.cognitiveProbe)}</span>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-slate-100 text-xs pl-1">
            <Quote className="w-3.5 h-3.5 text-red-400/60 shrink-0 mt-0.5 rotate-180" />
            <span className="font-semibold text-white leading-relaxed">
              "{getVerbatim(tactics.cognitiveProbe)}"
            </span>
          </div>
        </div>

        {/* 3. Mirroring (Blue) */}
        <div
          id="tactic-card-mirroring"
          className="flex flex-col gap-1.5 bg-slate-900/95 border border-blue-500/40 rounded-xl p-3 shadow-sm hover:border-blue-500/70 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#3b82f6]"></span>
              <span>3. Mirroring</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-blue-300 bg-blue-950/80 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
              <Volume2 className="w-3 h-3 text-blue-400" />
              <span>{getTonality(tactics.mirroring)}</span>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-slate-100 text-xs pl-1">
            <Quote className="w-3.5 h-3.5 text-blue-400/60 shrink-0 mt-0.5 rotate-180" />
            <span className="font-semibold text-white leading-relaxed">
              "{getVerbatim(tactics.mirroring)}"
            </span>
          </div>
        </div>

        {/* 4. Pivot (Yellow) */}
        <div
          id="tactic-card-pivot"
          className="flex flex-col gap-1.5 bg-slate-900/95 border border-amber-500/40 rounded-xl p-3 shadow-sm hover:border-amber-500/70 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#eab308]"></span>
              <span>4. Pivot</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
              <Volume2 className="w-3 h-3 text-amber-400" />
              <span>{getTonality(tactics.pivot)}</span>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-slate-100 text-xs pl-1">
            <Quote className="w-3.5 h-3.5 text-amber-400/60 shrink-0 mt-0.5 rotate-180" />
            <span className="font-semibold text-white leading-relaxed">
              "{getVerbatim(tactics.pivot)}"
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

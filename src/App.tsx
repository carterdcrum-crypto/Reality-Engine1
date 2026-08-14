import React, { useState, useEffect, useRef } from 'react';
import { ContactProfile, LiveAssessment, TacticalPrompts, TranscriptEntry } from './types';
import { OverlayHUD } from './components/OverlayHUD';
import { DialerScreen } from './components/DialerScreen';
import { BioLock } from './components/BioLock';
import { AudioEngineSimulator } from './services/audioSimulator';
import { fetchLiveGroqTactics } from './services/groqService';
import { ShieldCheck, Lock, Phone } from 'lucide-react';

const INITIAL_CONTACT: ContactProfile = {
  id: 'c-001',
  name: 'Marcus Vance',
  phoneNumber: '+1-555-019-2834',
  reliabilityScore: 88,
  trustTier: 'High',
  preferences: ['Direct metrics', 'Hard milestones', 'Quick summaries'],
  dislikes: ['Vague delivery dates', 'Unverified security assertions'],
  historicalNotes: 'Key executive stakeholder on the platform rollout. Values data-backed estimates.',
  lastCallTimestamp: Date.now() - 86400000 * 2
};

const SAMPLE_PHRASES = [
  { speaker: 'caller', text: "We need absolute certainty on the security compliance audit before we can greenlight the Friday rollout." },
  { speaker: 'user', text: "Understood Marcus. Our team completed the SOC2 type II audit yesterday with zero high-severity findings." },
  { speaker: 'caller', text: "What about the database failover latency? That was the main bottleneck last quarter." },
  { speaker: 'user', text: "We ran stress tests with encrypted read replicas and latency stayed under 18ms across all regions." },
  { speaker: 'caller', text: "If you can guarantee under 20ms during peak load, I'm prepared to approve the deployment timeline." }
];

export default function App() {
  // Biometric Lock state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [contact, setContact] = useState<ContactProfile>(INITIAL_CONTACT);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [rms, setRms] = useState(0.12);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isLoadingGroq, setIsLoadingGroq] = useState(false);

  // Transcript state
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    {
      id: 't-init',
      timestamp: Date.now() - 10000,
      speaker: 'caller',
      text: 'Thanks for getting on the line. Let us review the platform readiness.',
      confidence: 0.96
    }
  ]);

  // Dynamic 4-Tactics state with verbatim scripts & tonality delivery instructions
  const [tactics, setTactics] = useState<TacticalPrompts>({
    bonding: {
      verbatim: "Marcus, I hear you loud and clear on the audit certainty. We treat platform compliance with that exact same rigor.",
      tonality: "Warm, collaborative, unhurried pacing"
    },
    cognitiveProbe: {
      verbatim: "What specific metric or condition from the last quarter is making you most hesitant right now?",
      tonality: "Curious, gentle, non-confrontational upward inflection"
    },
    mirroring: {
      verbatim: "...database failover latency?",
      tonality: "Curious upward inflection with a 1-second pause"
    },
    pivot: {
      verbatim: "If I share our stress-test latency report showing sub-18ms results, are you ready to lock in Friday's rollout?",
      tonality: "Decisive, grounded, steady cadence"
    }
  });

  // Live Assessment state
  const [assessment, setAssessment] = useState<LiveAssessment>({
    rapport: 82,
    cognitiveLoad: 44,
    truthfulness: 88,
    urgency: 65,
    dominantEmotion: 'Analytical'
  });

  const audioSimulatorRef = useRef<AudioEngineSimulator>(new AudioEngineSimulator());
  const phraseIndexRef = useRef(0);

  // Call duration counter
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCallActive) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isCallActive]);

  // Audio Engine Lifecycle
  useEffect(() => {
    const audio = audioSimulatorRef.current;
    if (isCallActive && !isMicActive) {
      audio.startSimulatedAudio((val) => setRms(val));
    }
    return () => {
      audio.stop();
    };
  }, [isCallActive, isMicActive]);

  // Toggle Microphone Audio Stream
  const handleToggleMic = async () => {
    const audio = audioSimulatorRef.current;
    if (!isMicActive) {
      const ok = await audio.startMicrophone((val) => setRms(val));
      setIsMicActive(ok);
    } else {
      audio.stop();
      setIsMicActive(false);
      if (isCallActive) {
        audio.startSimulatedAudio((val) => setRms(val));
      }
    }
  };

  // Start Call Session
  const handleStartCall = (number: string) => {
    setIsCallActive(true);
    setCallDuration(0);
    setTranscript([
      {
        id: `t-${Date.now()}`,
        timestamp: Date.now(),
        speaker: 'caller',
        text: `Call connected with ${contact.name}.`,
        confidence: 0.98
      }
    ]);
  };

  // End Call
  const handleEndCall = () => {
    setIsCallActive(false);
    audioSimulatorRef.current.stop();
    setIsMicActive(false);
  };

  // Simulate Dialogue Injection and evaluate live tactics
  const handleInjectPhrase = async () => {
    const nextPhrase = SAMPLE_PHRASES[phraseIndexRef.current % SAMPLE_PHRASES.length];
    phraseIndexRef.current += 1;

    const newEntry: TranscriptEntry = {
      id: `t-${Date.now()}`,
      timestamp: Date.now(),
      speaker: nextPhrase.speaker as 'user' | 'caller',
      text: nextPhrase.text,
      confidence: 0.95
    };

    const updatedTranscript = [...transcript, newEntry];
    setTranscript(updatedTranscript);

    // Trigger live evaluation with 45s sliding window
    await triggerTacticsEvaluation(updatedTranscript);
  };

  // Trigger Live AI Tactics
  const triggerTacticsEvaluation = async (currentTranscript: TranscriptEntry[]) => {
    setIsLoadingGroq(true);
    const now = Date.now();
    const sliding45s = currentTranscript
      .filter(t => now - t.timestamp <= 45000)
      .map(t => `[${t.speaker === 'caller' ? contact.name : 'User'}]: ${t.text}`)
      .join('\n');

    const result = await fetchLiveGroqTactics(sliding45s || currentTranscript.map(t => t.text).join('\n'), rms);
    setTactics(result.tactics);
    setAssessment(result.assessment);
    setIsLoadingGroq(false);
  };

  return (
    <div id="reality-engine-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* 1. Biometric Lock Guard */}
      {!isAuthenticated && (
        <BioLock onAuthenticated={() => setIsAuthenticated(true)} />
      )}

      {/* 2. Top Application Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-black text-lg">
              <Phone className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider text-white">REALITY ENGINE</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-medium">
                  Protected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Secure Live Dialer & Real-Time Tactical Guidance
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            <button
              id="btn-header-lock"
              onClick={() => setIsAuthenticated(false)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition border border-slate-700/80 shadow-sm"
              title="Lock with Biometrics"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock App</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Pure Frontend Client View (Dialer & Overlay HUD) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col items-center justify-center">
        <div className="w-full flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Left: Native Dialer Screen */}
          <div className="w-full lg:w-96 shrink-0">
            <DialerScreen
              isCallActive={isCallActive}
              onStartCall={handleStartCall}
              onEndCall={handleEndCall}
              callDuration={callDuration}
              contact={contact}
              onInjectSimulatedPhrase={handleInjectPhrase}
              isMicActive={isMicActive}
              onToggleMic={handleToggleMic}
              onLockApp={() => setIsAuthenticated(false)}
            />
          </div>

          {/* Right: Floating Tactical Overlay HUD */}
          <div className="w-full flex-1 flex flex-col items-center">
            <OverlayHUD
              contact={contact}
              assessment={assessment}
              tactics={tactics}
              transcript={transcript}
              rms={rms}
              isCallActive={isCallActive}
              onTriggerGroqRefresh={() => triggerTacticsEvaluation(transcript)}
              isLoadingGroq={isLoadingGroq}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

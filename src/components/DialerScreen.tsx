import React, { useState } from 'react';
import { Phone, PhoneOff, ShieldCheck, Mic, Sparkles, Lock, Star } from 'lucide-react';
import { ContactProfile } from '../types';

interface DialerScreenProps {
  isCallActive: boolean;
  onStartCall: (number: string) => void;
  onEndCall: () => void;
  callDuration: number;
  contact: ContactProfile;
  onInjectSimulatedPhrase: () => void;
  isMicActive: boolean;
  onToggleMic: () => void;
  onLockApp: () => void;
}

export const DialerScreen: React.FC<DialerScreenProps> = ({
  isCallActive,
  onStartCall,
  onEndCall,
  callDuration,
  contact,
  onInjectSimulatedPhrase,
  isMicActive,
  onToggleMic,
  onLockApp
}) => {
  const [dialNumber, setDialNumber] = useState('+1-555-019-2834');

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleKeypadPress = (val: string) => {
    if (!isCallActive) {
      setDialNumber(prev => prev + val);
    }
  };

  return (
    <div id="dialer-screen" className="flex flex-col gap-4 text-slate-100 max-w-md mx-auto w-full">
      {/* 1. Protected Status Header with BioLock action */}
      <div
        id="dialer-status-header"
        className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-white">Biometric Vault Active</div>
            <div className="text-[11px] text-emerald-400 font-medium">Ready for protected calls</div>
          </div>
        </div>

        <button
          id="btn-lock-session"
          onClick={onLockApp}
          title="Lock app with Biometrics"
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition border border-slate-700/60 shadow-sm"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Call Interface Container */}
      <div id="call-main-box" className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col items-center shadow-xl">
        {isCallActive ? (
          <div className="flex flex-col items-center gap-3 w-full py-4 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 font-bold text-2xl shadow-[0_0_25px_rgba(34,197,94,0.3)]">
              {contact.name.charAt(0)}
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">{contact.name}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{dialNumber}</p>
              <p className="text-sm text-emerald-400 font-mono font-bold mt-1.5">
                Live Call • {formatDuration(callDuration)}
              </p>
            </div>

            {/* In-Call Actions */}
            <div className="w-full flex items-center justify-center gap-2 mt-3">
              <button
                id="btn-inject-phrase"
                onClick={onInjectSimulatedPhrase}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-white text-xs font-semibold transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Simulate Dialogue</span>
              </button>

              <button
                id="btn-toggle-mic"
                onClick={onToggleMic}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition ${
                  isMicActive
                    ? 'bg-sky-950/60 border-sky-400 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                    : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Mic className={`w-3.5 h-3.5 ${isMicActive ? 'text-sky-400 animate-pulse' : 'text-slate-400'}`} />
                <span>{isMicActive ? 'Mic Active' : 'Enable Mic'}</span>
              </button>
            </div>

            {/* End Call Button */}
            <button
              id="btn-end-call"
              onClick={onEndCall}
              className="mt-4 w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950/80 transition active:scale-98"
            >
              <PhoneOff className="w-5 h-5" />
              <span>End Call</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-3.5">
            {/* Contact Card Preview */}
            <div className="flex items-center gap-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm">
                {contact.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{contact.name}</div>
                <div className="text-[11px] text-slate-400 font-mono">{contact.phoneNumber}</div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                <Star className="w-3 h-3 fill-emerald-400" />
                <span>{contact.reliabilityScore}%</span>
              </div>
            </div>

            {/* Dial Input Display */}
            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3">
              <input
                id="input-dial-number"
                type="text"
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value)}
                className="bg-transparent text-xl font-mono font-bold text-white focus:outline-none w-full tracking-wider"
                placeholder="Enter number..."
              />
              {dialNumber && (
                <button
                  onClick={() => setDialNumber('')}
                  className="text-xs text-slate-500 hover:text-slate-300 font-mono px-1.5"
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Dialpad Matrix */}
            <div className="grid grid-cols-3 gap-2 text-slate-200">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeypadPress(digit)}
                  className="py-3.5 bg-slate-950/70 hover:bg-slate-800 active:bg-slate-700 border border-slate-800/80 rounded-2xl font-bold text-lg transition-all flex flex-col items-center justify-center active:scale-95 shadow-sm"
                >
                  <span>{digit}</span>
                </button>
              ))}
            </div>

            {/* Start Call Button */}
            <button
              id="btn-start-call"
              onClick={() => onStartCall(dialNumber)}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/80 transition"
            >
              <Phone className="w-5 h-5 fill-white" />
              <span>Start Protected Call</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

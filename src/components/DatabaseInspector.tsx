import React, { useState } from 'react';
import { Database, ShieldCheck, Trash2, RefreshCw, FileText, CheckCircle2, Clock, Key } from 'lucide-react';
import { CallSummary, ContactProfile, TranscriptEntry } from '../types';
import { INJECTED_KEYS } from '../data/kotlinCodebase';

interface DatabaseInspectorProps {
  contact: ContactProfile;
  rawTranscripts: TranscriptEntry[];
  callSummaries: CallSummary[];
  isSummarizing: boolean;
  summarizerCountdown: number;
  currentChunkStep: { current: number; total: number } | null;
  onRunWorkManagerCleanup: () => void;
  cleanupResult: string | null;
}

export const DatabaseInspector: React.FC<DatabaseInspectorProps> = ({
  contact,
  rawTranscripts,
  callSummaries,
  isSummarizing,
  summarizerCountdown,
  currentChunkStep,
  onRunWorkManagerCleanup,
  cleanupResult
}) => {
  const [activeTab, setActiveTab] = useState<'summaries' | 'transcripts' | 'contacts'>('summaries');

  return (
    <div id="database-inspector" className="flex flex-col gap-4 text-slate-100 max-w-4xl mx-auto w-full">
      {/* Database Security Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white">SQLCipher AES-256 Encrypted Database</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono">
                ENCRYPTED
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
              <Key className="w-3.5 h-3.5 text-slate-500" />
              <span>Passphrase: <strong className="text-slate-300">{INJECTED_KEYS.sqlcipherDbPassword.slice(0, 16)}...</strong></span>
              <span>• DB: reality_engine_encrypted.db</span>
            </div>
          </div>
        </div>

        {/* WorkManager Trigger */}
        <button
          id="btn-run-workmanager-cleanup"
          onClick={onRunWorkManagerCleanup}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-amber-300 transition"
        >
          <Trash2 className="w-4 h-4 text-amber-400" />
          <span>Trigger Weekly WorkManager Cleanup</span>
        </button>
      </div>

      {/* Chunked Summarizer Status Card (if active) */}
      {isSummarizing && (
        <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/40 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
              <div>
                <div className="text-sm font-bold text-indigo-200">
                  ChunkedSummarizer Coroutine Running...
                </div>
                <div className="text-xs text-indigo-300 mt-0.5">
                  Processing chunk {currentChunkStep?.current} of {currentChunkStep?.total} through Groq LLaMA 3.1
                </div>
              </div>
            </div>

            {summarizerCountdown > 0 && (
              <div className="flex items-center gap-2 bg-indigo-900/80 px-3 py-1.5 rounded-lg border border-indigo-400/30">
                <Clock className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-mono font-bold text-amber-200">
                  delay(12000): {summarizerCountdown}s rate-limit pause
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cleanup Result Notification */}
      {cleanupResult && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{cleanupResult}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('summaries')}
          className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition ${
            activeTab === 'summaries'
              ? 'border-b-2 border-indigo-500 text-indigo-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Post-Call Aggregated Summaries ({callSummaries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transcripts')}
          className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition ${
            activeTab === 'transcripts'
              ? 'border-b-2 border-indigo-500 text-indigo-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Raw Transcripts Table ({rawTranscripts.length} rows)</span>
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 transition ${
            activeTab === 'contacts'
              ? 'border-b-2 border-indigo-500 text-indigo-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Contact Profiles & Reliability History</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'summaries' && (
          <div className="flex flex-col gap-3">
            {callSummaries.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-500 text-xs">
                No completed call summaries yet. Start and end a call session to execute ChunkedSummarizer!
              </div>
            ) : (
              callSummaries.map((summary) => (
                <div
                  key={summary.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <div className="font-bold text-sm text-white">{summary.contactName}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        Call Duration: {summary.durationSeconds}s • Tokens: {summary.totalTokensProcessed}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                        {summary.sentimentShift}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {new Date(summary.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-indigo-300 mb-1">Executive Summary:</div>
                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                      {summary.summaryText}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-amber-300 mb-1">Action Items & Commitments:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.actionItems.map((item, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                        >
                          • {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'transcripts' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>TABLE: raw_transcripts (Purged weekly after 30 days)</span>
              <span>{rawTranscripts.length} Active Records</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-800 font-mono text-xs">
              {rawTranscripts.map((t) => (
                <div key={t.id} className="p-2.5 flex items-center gap-3 hover:bg-slate-800/40">
                  <span className="text-slate-500 text-[10px]">
                    {new Date(t.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`font-semibold ${
                      t.speaker === 'caller' ? 'text-amber-400' : 'text-cyan-400'
                    }`}
                  >
                    [{t.speaker.toUpperCase()}]:
                  </span>
                  <span className="text-slate-200 flex-1">{t.text}</span>
                  <span className="text-[10px] text-slate-500">{(t.confidence * 100).toFixed(0)}% conf</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-950 text-emerald-300 font-bold flex items-center justify-center border border-emerald-500/40">
                  {contact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{contact.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{contact.phoneNumber}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Reliability Score</span>
                <div className="text-base font-bold text-emerald-400">{contact.reliabilityScore}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-semibold text-emerald-400 block mb-1">Preferences:</span>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {contact.preferences.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-semibold text-red-400 block mb-1">Dislikes / Red Lines:</span>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {contact.dislikes.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <span className="font-semibold text-indigo-400 block mb-1">Historical Notes:</span>
              <p className="text-slate-300 leading-relaxed">{contact.historicalNotes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

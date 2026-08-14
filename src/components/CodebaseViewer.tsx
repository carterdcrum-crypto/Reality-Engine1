import React, { useState } from 'react';
import { ANDROID_PROJECT_FILES, INJECTED_KEYS } from '../data/kotlinCodebase';
import { Copy, Check, FileCode, Search, ShieldCheck, Download, Code2, Layers } from 'lucide-react';

export const CodebaseViewer: React.FC = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredFiles = ANDROID_PROJECT_FILES.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          file.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          file.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || file.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const currentFile = ANDROID_PROJECT_FILES[selectedFileIndex] || ANDROID_PROJECT_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([currentFile.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = currentFile.name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div id="codebase-viewer" className="flex flex-col gap-4 text-slate-100 max-w-6xl mx-auto w-full">
      {/* Top Credentials Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-white">Injected Keys & Architecture Profile</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            All OkHttp headers, WebSockets, Groq LLaMA-3.1 engine, and SQLCipher configurations have been directly injected.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
            <span className="text-slate-500">Deepgram:</span> <span className="text-emerald-300">{INJECTED_KEYS.deepgramApiKey.slice(0, 8)}...</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
            <span className="text-slate-500">Groq:</span> <span className="text-indigo-300">{INJECTED_KEYS.groqApiKey.slice(0, 10)}...</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
            <span className="text-slate-500">SQLCipher:</span> <span className="text-amber-300">AES-256 (Injected)</span>
          </div>
        </div>
      </div>

      {/* Main Code Studio Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: File Tree Sidebar */}
        <div className="md:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search Kotlin files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1 text-[10px]">
            {['all', 'service', 'audio', 'network', 'db', 'ui', 'worker', 'manifest', 'gradle'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded-md capitalize transition ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* File List */}
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[500px] pr-1">
            {filteredFiles.map((file) => {
              const originalIndex = ANDROID_PROJECT_FILES.findIndex(f => f.path === file.path);
              const isSelected = selectedFileIndex === originalIndex;

              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIndex(originalIndex)}
                  className={`flex flex-col items-start p-2.5 rounded-xl text-left transition border ${
                    isSelected
                      ? 'bg-indigo-950/70 border-indigo-500/60 text-white shadow-sm'
                      : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="font-mono text-xs font-semibold truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate w-full">
                    {file.path}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code Preview Editor */}
        <div className="md:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          {/* File Header */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span className="font-mono text-xs font-bold text-white">{currentFile.path}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Description banner */}
          <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>{currentFile.description}</span>
          </div>

          {/* Code Text Area with Line Numbers */}
          <div className="p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px] overflow-y-auto bg-slate-950/90 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
            <pre className="whitespace-pre">
              {currentFile.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

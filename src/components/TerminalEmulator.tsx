import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal as TerminalIcon,
  X,
  Maximize2,
  Minimize2,
  Copy,
  Trash2,
  Play,
  Download,
  Check,
  ChevronRight,
  Shield,
  Network,
  Server,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { usePortfolio } from '../context/PortfolioContext.js';

interface TerminalLine {
  id: string;
  command?: string;
  output: string;
  type: 'input' | 'output' | 'system' | 'error';
  timestamp: string;
}

function parseAnsi(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, lIdx) => {
    const parts = line.split(/(\x1b\[[0-9;]*m)/g);
    let currentColorClass = '';
    let customColorStyle: React.CSSProperties = {};

    const lineContent = parts.map((part, pIdx) => {
      if (part.startsWith('\x1b[')) {
        if (part === '\x1b[0m') {
          currentColorClass = '';
          customColorStyle = {};
        } else if (part.includes('38;2;6,182,212')) {
          customColorStyle = { color: '#06b6d4' };
        } else if (part.includes('38;2;16,185,129')) {
          customColorStyle = { color: '#10b981' };
        } else if (part.includes('38;2;59,130,246')) {
          customColorStyle = { color: '#3b82f6' };
        } else if (part.includes('38;2;245,158,11')) {
          customColorStyle = { color: '#f59e0b' };
        } else if (part.includes('38;2;139,92,246')) {
          customColorStyle = { color: '#8b5cf6' };
        } else if (part.includes('38;2;156,163,175')) {
          customColorStyle = { color: '#9ca3af' };
        } else if (part === '\x1b[32m') {
          customColorStyle = { color: '#10b981' };
        } else if (part === '\x1b[33m') {
          customColorStyle = { color: '#fbbf24' };
        } else if (part === '\x1b[31m') {
          customColorStyle = { color: '#ef4444' };
        }
        return null;
      }

      return (
        <span key={pIdx} className={currentColorClass} style={customColorStyle}>
          {part}
        </span>
      );
    });

    return (
      <div key={lIdx} className="min-h-[1.25rem] leading-relaxed">
        {lineContent}
      </div>
    );
  });
}

const COMMAND_AUTOCOMPLETE = [
  'help',
  'neofetch',
  'uname -a',
  'sestatus',
  'getenforce',
  'systemctl status nginx',
  'systemctl list-units',
  'ip a',
  'ip route',
  'lsblk',
  'cisco show run',
  'cisco show ip route',
  'cisco show vlan',
  'kubectl get nodes',
  'kubectl get pods -A',
  'docker ps',
  'ping 1.1.1.1',
  'traceroute 8.8.8.8',
  './deploy_k8s.sh',
  './configure_ospf.sh',
  './selinux_audit.sh',
  './benchmark_storage.sh',
  'whoami',
  'uptime',
  'clear',
];

export const TerminalEmulator: React.FC = () => {
  const { isTerminalOpen, setIsTerminalOpen, activeCategory } = usePortfolio();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [copied, setCopied] = useState(false);

  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      output: `\x1b[38;2;6,182,212mSahil K Gupta - Enterprise Systems & Network CLI (RHCSA | CCNA | DevOps)\x1b[0m
Kernel: 5.14.0-427.18.1.el9_4.x86_64 | SELinux: Enforcing | WAN BGP: AS 65001
Type '\x1b[33mhelp\x1b[0m' or click any of the automation preset badges below.`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isTerminalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isTerminalOpen, lines]);

  const handleCommand = async (cmdToRun?: string) => {
    const rawCmd = cmdToRun !== undefined ? cmdToRun : inputVal;
    const cmd = rawCmd.trim();
    if (!cmd) return;

    setHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);
    setInputVal('');

    if (cmd.toLowerCase() === 'clear') {
      setLines([]);
      return;
    }

    const userLineId = `line-${Date.now()}`;
    setLines((prev) => [
      ...prev,
      {
        id: userLineId,
        command: cmd,
        output: '',
        type: 'input',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      const res = await api.execTerminal(cmd, activeCategory?.slug);
      if (res.output === '__CLEAR__') {
        setLines([]);
      } else {
        setLines((prev) => [
          ...prev,
          {
            id: `res-${Date.now()}`,
            output: res.output,
            type: res.exitCode === 0 ? 'output' : 'error',
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (err: any) {
      setLines((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          output: `Execution error: ${err.message || 'Server connection lost'}`,
          type: 'error',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  };

  const getPromptUser = () => {
    if (!activeCategory) return 'sahil@infra-cli';
    const slug = activeCategory.slug.toLowerCase();
    if (slug.includes('network')) return 'sahil@netops-cli';
    if (slug.includes('linux')) return 'sahil@rhel9-infra';
    if (slug.includes('devops')) return 'sahil@devops-runner';
    return 'sahil@infra-cli';
  };

  const getTerminalColors = () => {
    if (!activeCategory) return { text: 'text-[#00ff41]', label: 'text-[#00ff41]' };
    const slug = activeCategory.slug.toLowerCase();
    if (slug.includes('network')) return { text: 'text-[#00d4ff]', label: 'text-[#00d4ff]' };
    if (slug.includes('devops')) return { text: 'text-[#06b6d4]', label: 'text-[#06b6d4]' };
    return { text: 'text-[#00ff41]', label: 'text-[#00ff41]' }; // Linux default
  };

  const colors = getTerminalColors();
  const promptUser = getPromptUser();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputVal(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(-1);
        setInputVal('');
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx] || '');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const current = inputVal.toLowerCase().trim();
      if (!current) return;
      const match = COMMAND_AUTOCOMPLETE.find((c) => c.startsWith(current));
      if (match) {
        setInputVal(match);
      }
    }
  };

  const copyTranscript = () => {
    const transcript = lines
      .map((l) => (l.command ? `[sahil@rhel9-node01 ~]# ${l.command}` : l.output))
      .join('\n');
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTranscript = () => {
    const transcript = lines
      .map((l) => (l.command ? `[sahil@rhel9-node01 ~]# ${l.command}` : l.output))
      .join('\n');
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sahil-gupta-terminal-transcript-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isTerminalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`w-full flex flex-col rounded-xl bg-black border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden font-mono ${
            isFullScreen ? 'h-[96vh] max-w-[98vw]' : 'h-[650px] max-w-5xl'
          }`}
        >
          {/* Terminal Titlebar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#111114] border-b border-white/10 select-none">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsTerminalOpen(false)}
                  className="w-3 h-3 rounded-full bg-[#ff4100] hover:brightness-110"
                  title="Close Terminal"
                />
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="w-3 h-3 rounded-full bg-yellow-500/90 hover:brightness-110"
                  title="Toggle Fullscreen"
                />
                <button
                  onClick={() => setLines([])}
                  className="w-3 h-3 rounded-full bg-[#00ff41] hover:brightness-110"
                  title="Clear Screen"
                />
              </div>
              <div className="flex items-center space-x-2 text-xs text-white/90 font-medium">
                <TerminalIcon className="w-4 h-4 text-[#00ff41]" />
                <span>sahil@rhel9-infra-node01:~ (Bash 5.1.8 &bull; xterm-256color)</span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={copyTranscript}
                className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs flex items-center gap-1"
                title="Copy Terminal Transcript"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00ff41]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={downloadTranscript}
                className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs"
                title="Download .log file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setLines([])}
                className="p-1.5 rounded text-white/40 hover:text-[#ff4100] hover:bg-white/10 transition-colors text-xs"
                title="Clear Output"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs"
              >
                {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsTerminalOpen(false)}
                className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preset Command Strip */}
          <div className="px-3 py-2 bg-[#16161a] border-b border-white/10 flex items-center space-x-2 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider shrink-0">
              Execute Preset:
            </span>
            <button
              onClick={() => handleCommand('./deploy_k8s.sh')}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-black hover:bg-[#00d4ff]/10 text-[#00d4ff] border border-white/10 hover:border-[#00d4ff]/40 shrink-0 transition-colors text-[11px]"
            >
              <Play className="w-3 h-3 text-[#00d4ff]" />
              <span>./deploy_k8s.sh</span>
            </button>
            <button
              onClick={() => handleCommand('./configure_ospf.sh')}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-black hover:bg-[#00d4ff]/10 text-[#00d4ff] border border-white/10 hover:border-[#00d4ff]/40 shrink-0 transition-colors text-[11px]"
            >
              <Network className="w-3 h-3 text-[#00d4ff]" />
              <span>./configure_ospf.sh</span>
            </button>
            <button
              onClick={() => handleCommand('./selinux_audit.sh')}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-black hover:bg-[#00ff41]/10 text-[#00ff41] border border-white/10 hover:border-[#00ff41]/40 shrink-0 transition-colors text-[11px]"
            >
              <Shield className="w-3 h-3 text-[#00ff41]" />
              <span>./selinux_audit.sh</span>
            </button>
            <button
              onClick={() => handleCommand('neofetch')}
              className="px-2.5 py-1 rounded bg-black hover:bg-white/10 text-white/80 border border-white/10 shrink-0 transition-colors text-[11px]"
            >
              neofetch
            </button>
            <button
              onClick={() => handleCommand('sestatus')}
              className="px-2.5 py-1 rounded bg-black hover:bg-white/10 text-white/80 border border-white/10 shrink-0 transition-colors text-[11px]"
            >
              sestatus
            </button>
            <button
              onClick={() => handleCommand('cisco show run')}
              className="px-2.5 py-1 rounded bg-black hover:bg-white/10 text-white/80 border border-white/10 shrink-0 transition-colors text-[11px]"
            >
              cisco show run
            </button>
            <button
              onClick={() => handleCommand('kubectl get nodes')}
              className="px-2.5 py-1 rounded bg-black hover:bg-white/10 text-white/80 border border-white/10 shrink-0 transition-colors text-[11px]"
            >
              kubectl nodes
            </button>
            <button
              onClick={() => handleCommand('help')}
              className="px-2.5 py-1 rounded bg-black hover:bg-white/10 text-yellow-400 border border-white/10 shrink-0 transition-colors text-[11px]"
            >
              help
            </button>
          </div>

          {/* Terminal Console Logs */}
          <div
            className={`flex-1 p-4 overflow-y-auto text-xs space-y-3 font-mono bg-black ${colors.text} selection:bg-white/30 selection:text-white`}
            onClick={() => inputRef.current?.focus()}
          >
            {lines.map((line) => (
              <div key={line.id} className="space-y-1">
                {line.command && (
                  <div className="flex items-center space-x-2 text-white">
                    <span className={`${colors.label} font-bold`}>{promptUser}</span>
                    <span className="text-white/40">:</span>
                    <span className="text-[#00d4ff] font-bold">~</span>
                    <span className="text-white/40 font-bold">#</span>
                    <span className="text-white font-semibold">{line.command}</span>
                  </div>
                )}
                {line.output && (
                  <div className="text-white/90 font-mono whitespace-pre-wrap">
                    {parseAnsi(line.output)}
                  </div>
                )}
              </div>
            ))}

            {/* Active Command Input Line */}
            <div className="flex items-center space-x-2 text-white pt-1">
              <span className={`${colors.label} font-bold`}>{promptUser}</span>
              <span className="text-white/40">:</span>
              <span className="text-[#00d4ff] font-bold">~</span>
              <span className="text-white/40 font-bold">#</span>
              <input
                ref={inputRef}
                type="text"
                id="terminal-active-input"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-white outline-none border-none font-mono text-xs focus:ring-0 p-0 placeholder:text-white/20"
                placeholder="Type command here (e.g., help, sestatus, cisco show run, ./deploy_k8s.sh)..."
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            <div ref={bottomRef} />
          </div>

          {/* Terminal Status Footer */}
          <div className="px-4 py-2 bg-[#111114] border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
            <div className="flex items-center space-x-4">
              <span className="flex items-center gap-1.5 text-[#00ff41]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
                TTY: /dev/pts/0 (Interactive Linux WebTTY)
              </span>
              <span className="hidden sm:inline text-white/40">
                Press <kbd className="px-1 py-0.5 bg-black text-white/80 rounded border border-white/15">Tab</kbd> to autocomplete &bull; <kbd className="px-1 py-0.5 bg-black text-white/80 rounded border border-white/15">&uarr;/&darr;</kbd> for history
              </span>
            </div>
            <div className="text-white/40">
              Domain: <span className="text-[#00d4ff] font-semibold">{activeCategory?.name || 'Enterprise Infrastructure'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
